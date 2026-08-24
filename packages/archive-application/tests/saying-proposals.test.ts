import { describe, expect, it, vi } from "vitest";
import {
  SAYING_PROMPT_VERSION,
  type SayingProvider,
  type SayingProviderRequest,
  type SayingProviderResult,
  type SayingRequest,
} from "@badge/saying-contract";

import { SayingProposalController, subscribeUntilDisposed } from "../src/saying-proposals";

const allowedQuotations = [
  {
    id: "muir-mountains-calling",
    text: "The mountains are calling and I must go.",
    person: "John Muir",
    sourceTitle: "Letter to Sarah Muir Galloway, 1873",
    sourceUrl: "https://www.nps.gov/articles/000/muir-quote.htm",
  },
  {
    id: "muir-mountaineers-home",
    text: "Therefore we are all, in some sense, mountaineers, and going to the mountains is going home.",
    person: "John Muir",
    sourceTitle: "Steep Trails",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
  {
    id: "muir-walk-nature",
    text: "But in every walk with Nature one receives far more than he seeks.",
    person: "John Muir",
    sourceTitle: "Steep Trails",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
] as const;

const promptInput = {
  title: "Yosemite",
  criterion: "Visit Yosemite National Park",
  allowedQuotations: [...allowedQuotations],
} satisfies SayingRequest;
const expectedQuotationRevision = "11111111-1111-4111-8111-111111111111";

function regenerate(recordId = "record-yosemite", input: SayingRequest = promptInput) {
  return { type: "regenerate" as const, recordId, expectedQuotationRevision, promptInput: input };
}

function result(index = 0): SayingProviderResult {
  const quotation = allowedQuotations[index]!;
  return {
    response: { kind: "quotation", saying: quotation.text, quotation },
    provenance: {
      provider: "test-provider",
      model: "test-model",
      promptVersion: SAYING_PROMPT_VERSION,
      generatedAt: "2026-08-23T12:00:00.000Z",
    },
  };
}

function deferredResult() {
  let resolve!: (value: SayingProviderResult) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<SayingProviderResult>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("SayingProposalController", () => {
  it("calls its provider only for the explicit regeneration command", async () => {
    const propose = vi.fn(async () => result());
    const controller = new SayingProposalController({ propose });

    expect(propose).toHaveBeenCalledTimes(0);
    await controller.dispatch({ type: "archive-opened" });
    await controller.dispatch({ type: "badge-selected", recordId: "record-yosemite" });
    await controller.dispatch({ type: "badge-activated", recordId: "record-yosemite" });
    await controller.dispatch({ type: "ceremony-replayed", recordId: "record-yosemite" });
    await controller.dispatch({ type: "archive-restored" });
    expect(propose).toHaveBeenCalledTimes(0);

    await controller.dispatch(regenerate());
    expect(propose).toHaveBeenCalledTimes(1);
    await controller.dispatch(regenerate());
    expect(propose).toHaveBeenCalledTimes(2);
  });

  it("turns invalid prompt data into visible controller error state without calling the provider", async () => {
    const propose = vi.fn(async () => result());
    const controller = new SayingProposalController({ propose });

    await controller.dispatch(
      regenerate("record-invalid", {
        title: "Bad\ntitle",
        criterion: "Complete it",
        allowedQuotations: [...allowedQuotations],
      }),
    );

    expect(propose).not.toHaveBeenCalled();
    expect(controller.snapshot("record-invalid")).toMatchObject({
      status: "error",
      proposal: null,
    });
    expect(controller.snapshot("record-invalid").error).toContain("control character");

    controller.dismiss("record-invalid");
    expect(controller.snapshot("record-invalid")).toMatchObject({
      status: "idle",
      proposal: null,
      error: null,
    });
  });

  it("aborts the older request and publishes only the latest result", async () => {
    const requests: SayingProviderRequest[] = [];
    const deferred = [deferredResult(), deferredResult()];
    const provider: SayingProvider = {
      propose(request) {
        requests.push(request);
        return deferred[requests.length - 1]!.promise;
      },
    };
    const controller = new SayingProposalController(provider);

    const first = controller.dispatch(regenerate());
    const second = controller.dispatch(regenerate());
    expect(requests[0]?.signal.aborted).toBe(true);

    deferred[1]!.resolve(result(1));
    await second;
    deferred[0]!.resolve(result(2));
    await first;

    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "ready",
      proposal: {
        kind: "quotation",
        saying: allowedQuotations[1]!.text,
        quotation: allowedQuotations[1],
      },
      expectedQuotationRevision,
      error: null,
    });
  });

  it("keeps an existing proposal when a retry fails", async () => {
    const propose = vi
      .fn<SayingProvider["propose"]>()
      .mockResolvedValueOnce(result())
      .mockRejectedValueOnce(new Error("Preview source unavailable."));
    const controller = new SayingProposalController({ propose });

    await controller.dispatch(regenerate());
    await controller.dispatch(regenerate());

    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "error",
      proposal: { kind: "quotation", saying: allowedQuotations[0]!.text },
      error: "Preview source unavailable.",
    });
  });

  it("rejects a provider-invented quotation and preserves the prior approved proposal", async () => {
    const fabricated: SayingProviderResult = {
      response: {
        kind: "quotation",
        saying: "History was conveniently invented here.",
        quotation: {
          id: "fabricated-history",
          text: "History was conveniently invented here.",
          person: "Imaginary Person",
          sourceTitle: "Imaginary Source",
          sourceUrl: "https://example.com/invented",
        },
      },
      provenance: result().provenance,
    };
    const propose = vi
      .fn<SayingProvider["propose"]>()
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce(fabricated);
    const controller = new SayingProposalController({ propose });

    await controller.dispatch(regenerate());
    await controller.dispatch(regenerate());

    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "error",
      proposal: { kind: "quotation", saying: allowedQuotations[0]!.text },
    });
    expect(controller.snapshot("record-yosemite").error).toContain("not one of the supplied quotations");
  });

  it("validates against an immutable private shortlist when a provider mutates its request", async () => {
    const provider: SayingProvider = {
      async propose(request) {
        const quotation = request.promptInput.allowedQuotations[0]!;
        quotation.text = "A provider-mutated line.";
        quotation.person = "Imaginary Person";
        quotation.sourceTitle = "Imaginary Source";
        quotation.sourceUrl = "https://example.com/provider-mutated";
        return {
          response: { kind: "quotation", saying: quotation.text, quotation },
          provenance: result().provenance,
        };
      },
    };
    const controller = new SayingProposalController(provider);

    await controller.dispatch(regenerate());

    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "error",
      proposal: null,
      request: null,
    });
    expect(controller.snapshot("record-yosemite").error).toContain(
      "does not exactly match the supplied quotation",
    );
    expect(promptInput.allowedQuotations[0]).toEqual(allowedQuotations[0]);
  });

  it("badge activation cancels pending work while keeping the prior proposal", async () => {
    const pending = deferredResult();
    const requests: SayingProviderRequest[] = [];
    const provider: SayingProvider = {
      propose(request) {
        requests.push(request);
        if (requests.length === 1) return Promise.resolve(result());
        return pending.promise;
      },
    };
    const controller = new SayingProposalController(provider);
    await controller.dispatch(regenerate());
    const retry = controller.dispatch(regenerate());

    await controller.dispatch({ type: "badge-activated", recordId: "record-yosemite" });
    expect(requests).toHaveLength(2);
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "ready",
      proposal: { kind: "quotation", saying: allowedQuotations[0]!.text },
    });

    pending.resolve(result(1));
    await retry;
    expect(controller.snapshot("record-yosemite").proposal).toMatchObject({
      kind: "quotation",
      saying: allowedQuotations[0]!.text,
    });
  });

  it("restore cancels work and clears prior proposal semantics for reused record IDs", async () => {
    const pending = deferredResult();
    const requests: SayingProviderRequest[] = [];
    const provider: SayingProvider = {
      propose(request) {
        requests.push(request);
        if (requests.length === 1) return Promise.resolve(result());
        return pending.promise;
      },
    };
    const controller = new SayingProposalController(provider);
    await controller.dispatch(regenerate());
    const retry = controller.dispatch(regenerate());

    await controller.dispatch({ type: "archive-restored" });
    expect(requests).toHaveLength(2);
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "idle",
      proposal: null,
      provenance: null,
      error: null,
    });

    pending.resolve(result(1));
    await retry;
    expect(controller.snapshot("record-yosemite").proposal).toBeNull();
  });

  it("cancelAll invalidates every in-flight record without invoking the provider", async () => {
    const pending = [deferredResult(), deferredResult()];
    const requests: SayingProviderRequest[] = [];
    const provider: SayingProvider = {
      propose(request) {
        requests.push(request);
        return pending[requests.length - 1]!.promise;
      },
    };
    const controller = new SayingProposalController(provider);
    const first = controller.dispatch(regenerate());
    const second = controller.dispatch(
      regenerate("record-degree", {
        title: "Degree",
        criterion: "Complete a degree",
        allowedQuotations: [...allowedQuotations],
      }),
    );

    controller.cancelAll();
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.signal.aborted)).toBe(true);
    pending[0]!.resolve(result(1));
    pending[1]!.resolve(result(2));
    await Promise.all([first, second]);
    expect(controller.snapshot("record-yosemite").proposal).toBeNull();
    expect(controller.snapshot("record-degree").proposal).toBeNull();
  });

  it("the subscription disposer used by hook unmount cancels pending work", async () => {
    const pending = deferredResult();
    const requests: SayingProviderRequest[] = [];
    const controller = new SayingProposalController({
      propose(request) {
        requests.push(request);
        return pending.promise;
      },
    });
    const listener = vi.fn();
    const dispose = subscribeUntilDisposed(controller, listener);
    const request = controller.dispatch(regenerate());

    dispose();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.signal.aborted).toBe(true);
    const callsAtDispose = listener.mock.calls.length;
    pending.resolve(result(1));
    await request;
    expect(listener).toHaveBeenCalledTimes(callsAtDispose);
  });
});
