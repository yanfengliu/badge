import { describe, expect, it, vi } from "vitest";
import { SAYING_PROMPT_VERSION } from "@badge/saying-contract";
import {
  SAYING_DISCLOSURE,
  SAYING_DISCLOSURE_HEADER,
  SAYING_DISCLOSURE_PATH,
  SAYING_GENERATION_PATH,
  buildSayingDisclosureReview,
} from "@badge/saying-live-contract";

import { type SayingFetch } from "./live-saying-client";
import { createSayingRuntime } from "./saying-runtime";

const source = {
  title: "Yosemite",
  criterion: "Visit Yosemite National Park",
  sayingSuggestions: ["A local line."],
} as const;
const intent = {
  type: "generate" as const,
  recordId: "record-yosemite",
  promptInput: { title: source.title, criterion: source.criterion },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function successfulProposal() {
  return {
    response: { saying: "Worth every switchback." },
    provenance: {
      provider: "claude-code",
      model: SAYING_DISCLOSURE.model,
      promptVersion: SAYING_PROMPT_VERSION,
      generatedAt: "2026-08-23T22:00:00.000Z",
    },
  };
}

describe("saying runtime composition", () => {
  it.each(["fixture", "test"])("uses fixture previews in Vite %s mode", async (mode) => {
    const fetcher = vi.fn<SayingFetch>();
    const fixture = createSayingRuntime(mode, [source], fetcher);

    await fixture.controller.dispatch(intent);

    expect(fixture.kind).toBe("fixture");
    expect(fixture.disclosureGate).toBeNull();
    expect(fixture.controller.snapshot(intent.recordId).proposal).toBe("A local line.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps the first Generate free of provider-model calls until approval, then posts exact reviewed bytes once", async () => {
    const fetcher = vi.fn<SayingFetch>(async (input, init) => {
      if (input === SAYING_DISCLOSURE_PATH && init?.method === "GET") {
        return jsonResponse(SAYING_DISCLOSURE);
      }
      if (input === SAYING_GENERATION_PATH && init?.method === "POST") {
        return jsonResponse(successfulProposal());
      }
      throw new Error(`Unexpected saying request: ${String(input)}`);
    });
    const runtime = createSayingRuntime("development", [source], fetcher);
    const gate = runtime.disclosureGate!;

    await gate.request(intent);
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "GET")).toHaveLength(1);
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);

    gate.close();
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
    await gate.request(intent);
    await gate.approve();

    const firstPosts = fetcher.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(firstPosts).toHaveLength(1);
    expect(firstPosts[0]?.[1]?.body).toBe(
      buildSayingDisclosureReview(intent.promptInput).canonicalUserMessage,
    );
    expect(firstPosts[0]?.[1]?.headers).toMatchObject({
      [SAYING_DISCLOSURE_HEADER]: SAYING_DISCLOSURE.fingerprint,
    });

    await gate.request({ ...intent, type: "try-another" });
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "GET")).toHaveLength(2);
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
    expect(runtime.controller.snapshot(intent.recordId).proposal).toBe("Worth every switchback.");
  });

  it("reopens disclosure instead of falling back when the live provider rejects the fingerprint", async () => {
    const fetcher = vi.fn<SayingFetch>(async (input, init) => {
      if (input === SAYING_DISCLOSURE_PATH) return jsonResponse(SAYING_DISCLOSURE);
      if (input === SAYING_GENERATION_PATH) {
        return jsonResponse(
          {
            error: {
              code: "DISCLOSURE_REQUIRED",
              message: "The provider disclosure changed.",
            },
          },
          428,
        );
      }
      throw new Error(`Unexpected saying request: ${String(input)} ${String(init?.method)}`);
    });
    const runtime = createSayingRuntime("production", [source], fetcher);
    const gate = runtime.disclosureGate!;
    const unsubscribe = runtime.controller.subscribe(runtime.handleProposalSnapshot);

    await gate.request(intent);
    await gate.approve();
    await vi.waitFor(() => expect(gate.snapshot().phase).toBe("review"));

    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "GET")).toHaveLength(2);
    expect(gate.acknowledgedFingerprint()).toBeNull();
    expect(gate.snapshot().phase).toBe("review");
    expect(runtime.controller.snapshot(intent.recordId).proposal).toBeNull();
    unsubscribe();
  });

  it("aborts the older POST when a newer authorized request supersedes it", async () => {
    const postRequests: Array<{
      readonly signal: AbortSignal;
      readonly resolve: (response: Response) => void;
    }> = [];
    const fetcher = vi.fn<SayingFetch>(async (input, init) => {
      if (input === SAYING_DISCLOSURE_PATH) return jsonResponse(SAYING_DISCLOSURE);
      if (input !== SAYING_GENERATION_PATH || !init?.signal) {
        throw new Error(`Unexpected saying request: ${String(input)}`);
      }
      const signal = init.signal;
      return new Promise<Response>((resolve, reject) => {
        postRequests.push({ signal, resolve });
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    const runtime = createSayingRuntime("development", [source], fetcher);
    const gate = runtime.disclosureGate!;
    await gate.request(intent);

    const first = gate.approve();
    await Promise.resolve();
    expect(postRequests).toHaveLength(1);
    const second = gate.request({ ...intent, type: "try-another" });
    await Promise.resolve();

    expect(postRequests).toHaveLength(2);
    expect(postRequests[0]?.signal.aborted).toBe(true);
    postRequests[1]?.resolve(jsonResponse(successfulProposal()));
    await Promise.all([first, second]);
    expect(runtime.controller.snapshot(intent.recordId)).toMatchObject({
      status: "ready",
      proposal: "Worth every switchback.",
    });
  });

  it("surfaces live disclosure failure without a fixture fallback", async () => {
    const fetcher = vi.fn<SayingFetch>(async () =>
      jsonResponse({ error: { code: "PROVIDER_UNAVAILABLE", message: "Claude Code is unavailable." } }, 503),
    );
    const runtime = createSayingRuntime("development", [source], fetcher);

    await runtime.disclosureGate!.request(intent);

    expect(runtime.kind).toBe("live");
    expect(runtime.disclosureGate!.snapshot()).toMatchObject({
      phase: "error",
      error: "Claude Code is unavailable.",
    });
    expect(runtime.controller.snapshot(intent.recordId).proposal).toBeNull();
  });
});
