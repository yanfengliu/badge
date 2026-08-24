import { describe, expect, it, vi } from "vitest";
import {
  SAYING_PROMPT_VERSION,
  type SayingProvider,
  type SayingProviderRequest,
  type SayingProviderResult,
  type SayingRequest,
} from "@badge/saying-contract";

import { SayingProposalController, subscribeUntilDisposed } from "../src/saying-proposals";

const promptInput = {
  title: "Yosemite",
  criterion: "Visit Yosemite National Park",
  allowedQuotations: [
    {
      id: "muir-yosemite-temple",
      text: "The mountains are calling and I must go.",
      person: "John Muir",
      sourceTitle: "Letter to Sarah Muir Galloway, 1873",
      sourceUrl: "https://www.nps.gov/articles/000/muir-quote.htm",
    },
  ],
} satisfies SayingRequest;

function result(saying: string): SayingProviderResult {
  return {
    response: { kind: "original", saying },
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
  it("calls its provider only for the two explicit generation commands", async () => {
    const propose = vi.fn(async () => result("Worth every switchback."));
    const controller = new SayingProposalController({ propose });

    expect(propose).toHaveBeenCalledTimes(0);
    await controller.dispatch({ type: "archive-opened" });
    await controller.dispatch({ type: "badge-selected", recordId: "record-yosemite" });
    await controller.dispatch({ type: "badge-activated", recordId: "record-yosemite" });
    await controller.dispatch({ type: "ceremony-replayed", recordId: "record-yosemite" });
    await controller.dispatch({ type: "archive-restored" });
    expect(propose).toHaveBeenCalledTimes(0);

    await controller.dispatch({ type: "generate", recordId: "record-yosemite", promptInput });
    expect(propose).toHaveBeenCalledTimes(1);
    await controller.dispatch({ type: "try-another", recordId: "record-yosemite", promptInput });
    expect(propose).toHaveBeenCalledTimes(2);
  });

  it("turns invalid prompt data into visible controller error state without calling the provider", async () => {
    const propose = vi.fn(async () => result("Should not appear."));
    const controller = new SayingProposalController({ propose });

    await controller.dispatch({
      type: "generate",
      recordId: "record-invalid",
      promptInput: { title: "Bad\ntitle", criterion: "Complete it" },
    });

    expect(propose).not.toHaveBeenCalled();
    expect(controller.snapshot("record-invalid")).toMatchObject({
      status: "error",
      proposal: null,
    });
    expect(controller.snapshot("record-invalid").error).toContain("control character");
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

    const first = controller.dispatch({
      type: "generate",
      recordId: "record-yosemite",
      promptInput,
    });
    const second = controller.dispatch({
      type: "try-another",
      recordId: "record-yosemite",
      promptInput,
    });
    expect(requests[0]?.signal.aborted).toBe(true);

    deferred[1]!.resolve(result("Granite keeps the long view."));
    await second;
    deferred[0]!.resolve(result("Stale first line."));
    await first;

    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "ready",
      proposal: { kind: "original", saying: "Granite keeps the long view." },
      error: null,
    });
  });

  it("keeps an existing proposal when a retry fails", async () => {
    const propose = vi
      .fn<SayingProvider["propose"]>()
      .mockResolvedValueOnce(result("Worth every switchback."))
      .mockRejectedValueOnce(new Error("Preview source unavailable."));
    const controller = new SayingProposalController({ propose });

    await controller.dispatch({ type: "generate", recordId: "record-yosemite", promptInput });
    await controller.dispatch({ type: "try-another", recordId: "record-yosemite", promptInput });

    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "error",
      proposal: { kind: "original", saying: "Worth every switchback." },
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
      provenance: result("unused").provenance,
    };
    const propose = vi
      .fn<SayingProvider["propose"]>()
      .mockResolvedValueOnce(result("Worth every switchback."))
      .mockResolvedValueOnce(fabricated);
    const controller = new SayingProposalController({ propose });

    await controller.dispatch({ type: "generate", recordId: "record-yosemite", promptInput });
    await controller.dispatch({ type: "try-another", recordId: "record-yosemite", promptInput });

    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "error",
      proposal: { kind: "original", saying: "Worth every switchback." },
    });
    expect(controller.snapshot("record-yosemite").error).toContain("not one of the supplied quotations");
  });

  it("badge activation cancels pending work while keeping the prior proposal", async () => {
    const pending = deferredResult();
    const requests: SayingProviderRequest[] = [];
    const provider: SayingProvider = {
      propose(request) {
        requests.push(request);
        if (requests.length === 1) return Promise.resolve(result("Worth every switchback."));
        return pending.promise;
      },
    };
    const controller = new SayingProposalController(provider);
    await controller.dispatch({ type: "generate", recordId: "record-yosemite", promptInput });
    const retry = controller.dispatch({
      type: "try-another",
      recordId: "record-yosemite",
      promptInput,
    });

    await controller.dispatch({ type: "badge-activated", recordId: "record-yosemite" });
    expect(requests).toHaveLength(2);
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "ready",
      proposal: { kind: "original", saying: "Worth every switchback." },
    });

    pending.resolve(result("A stale replacement."));
    await retry;
    expect(controller.snapshot("record-yosemite").proposal).toEqual({
      kind: "original",
      saying: "Worth every switchback.",
    });
  });

  it("restore cancels work and clears prior proposal semantics for reused record IDs", async () => {
    const pending = deferredResult();
    const requests: SayingProviderRequest[] = [];
    const provider: SayingProvider = {
      propose(request) {
        requests.push(request);
        if (requests.length === 1) return Promise.resolve(result("Worth every switchback."));
        return pending.promise;
      },
    };
    const controller = new SayingProposalController(provider);
    await controller.dispatch({ type: "generate", recordId: "record-yosemite", promptInput });
    const retry = controller.dispatch({
      type: "try-another",
      recordId: "record-yosemite",
      promptInput,
    });

    await controller.dispatch({ type: "archive-restored" });
    expect(requests).toHaveLength(2);
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(controller.snapshot("record-yosemite")).toMatchObject({
      status: "idle",
      proposal: null,
      provenance: null,
      error: null,
    });

    pending.resolve(result("A stale replacement."));
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
    const first = controller.dispatch({
      type: "generate",
      recordId: "record-yosemite",
      promptInput,
    });
    const second = controller.dispatch({
      type: "generate",
      recordId: "record-degree",
      promptInput: { title: "Degree", criterion: "Complete a degree" },
    });

    controller.cancelAll();
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.signal.aborted)).toBe(true);
    pending[0]!.resolve(result("Stale one."));
    pending[1]!.resolve(result("Stale two."));
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
    const request = controller.dispatch({
      type: "generate",
      recordId: "record-yosemite",
      promptInput,
    });

    dispose();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.signal.aborted).toBe(true);
    const callsAtDispose = listener.mock.calls.length;
    pending.resolve(result("Stale after unmount."));
    await request;
    expect(listener).toHaveBeenCalledTimes(callsAtDispose);
  });
});
