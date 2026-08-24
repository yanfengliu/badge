import { describe, expect, it, vi } from "vitest";
import {
  SAYING_DISCLOSURE,
  buildSayingDisclosureReview,
  type SayingDisclosureReview,
} from "@badge/saying-live-contract";

import { SayingDisclosureGate, type SayingGenerationIntent } from "./saying-disclosure-gate";

const yosemiteIntent: SayingGenerationIntent = {
  type: "generate",
  recordId: "record-yosemite",
  promptInput: {
    title: "Yosemite",
    criterion: "Visit Yosemite National Park",
  },
};

function authorizedSpy() {
  return vi.fn(async (intent: SayingGenerationIntent, review: SayingDisclosureReview) => {
    void intent;
    void review;
  });
}

function disclosureLoader() {
  return vi.fn(async (signal: AbortSignal) => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    return SAYING_DISCLOSURE;
  });
}

describe("SayingDisclosureGate", () => {
  it("opens an exact no-provider-model-call review and closing authorizes nothing", async () => {
    const loader = disclosureLoader();
    const authorized = authorizedSpy();
    const gate = new SayingDisclosureGate(loader, authorized);

    await gate.request(yosemiteIntent);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(authorized).not.toHaveBeenCalled();
    expect(gate.snapshot()).toEqual({
      phase: "review",
      review: buildSayingDisclosureReview(yosemiteIntent.promptInput),
      error: null,
    });

    gate.close();
    expect(gate.snapshot().phase).toBe("idle");
    expect(gate.acknowledgedFingerprint()).toBeNull();
    expect(authorized).not.toHaveBeenCalled();
  });

  it("authorizes once with the reviewed bytes, then skips GET for this page session", async () => {
    const loader = disclosureLoader();
    const authorized = authorizedSpy();
    const gate = new SayingDisclosureGate(loader, authorized);

    await gate.request(yosemiteIntent);
    await gate.approve();

    expect(authorized).toHaveBeenCalledTimes(1);
    expect(authorized.mock.calls[0]?.[1].canonicalUserMessage).toBe(
      buildSayingDisclosureReview(yosemiteIntent.promptInput).canonicalUserMessage,
    );
    expect(gate.acknowledgedFingerprint()).toBe(SAYING_DISCLOSURE.fingerprint);

    const anotherIntent = { ...yosemiteIntent, type: "try-another" as const };
    await gate.request(anotherIntent);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(authorized).toHaveBeenCalledTimes(2);
    expect(authorized.mock.calls[1]?.[0]).toEqual(anotherIntent);
  });

  it("clears acknowledgment and reopens when the provider rejects the fingerprint", async () => {
    const loader = disclosureLoader();
    const gate = new SayingDisclosureGate(loader, authorizedSpy());
    await gate.request(yosemiteIntent);
    await gate.approve();

    await gate.reopenForRecord(yosemiteIntent.recordId);

    expect(gate.acknowledgedFingerprint()).toBeNull();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(gate.snapshot().phase).toBe("review");
  });

  it("aborts superseded and closed disclosure GETs without authorizing either", async () => {
    const signals: AbortSignal[] = [];
    const loader = vi.fn(
      (signal: AbortSignal) =>
        new Promise<typeof SAYING_DISCLOSURE>((_resolve, reject) => {
          signals.push(signal);
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );
    const authorized = authorizedSpy();
    const gate = new SayingDisclosureGate(loader, authorized);

    const first = gate.request(yosemiteIntent);
    const second = gate.request({ ...yosemiteIntent, type: "try-another" });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    gate.close();
    expect(signals[1]?.aborted).toBe(true);
    await Promise.all([first, second]);
    expect(authorized).not.toHaveBeenCalled();
    expect(gate.snapshot().phase).toBe("idle");
  });

  it("rejects invalid input locally with no disclosure or provider call", async () => {
    const loader = disclosureLoader();
    const authorized = authorizedSpy();
    const gate = new SayingDisclosureGate(loader, authorized);

    await gate.request({
      ...yosemiteIntent,
      promptInput: { title: "\n", criterion: yosemiteIntent.promptInput.criterion },
    });

    expect(loader).not.toHaveBeenCalled();
    expect(authorized).not.toHaveBeenCalled();
    expect(gate.snapshot()).toMatchObject({
      phase: "error",
      review: null,
      error: expect.stringContaining("cannot be sent safely"),
    });
  });
});
