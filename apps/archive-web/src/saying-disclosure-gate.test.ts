import { describe, expect, it, vi } from "vitest";
import {
  SAYING_DISCLOSURE,
  buildSayingDisclosureReview,
  type SayingDisclosureReview,
} from "@badge/saying-live-contract";
import { starterBadges } from "@badge/catalogue-fixtures/archive";

import { SayingDisclosureGate, type SayingRegenerationIntent } from "./saying-disclosure-gate";

const yosemiteQuotation = starterBadges[0]!.historicalQuotations[1]!;
const yosemiteIntent: SayingRegenerationIntent = {
  type: "regenerate",
  recordId: "record-yosemite",
  expectedQuotationRevision: "11111111-1111-4111-8111-111111111111",
  promptInput: {
    title: "Yosemite",
    criterion: "Visit Yosemite National Park",
    allowedQuotations: [yosemiteQuotation],
  },
};

function authorizedSpy() {
  return vi.fn(async (intent: SayingRegenerationIntent, review: SayingDisclosureReview) => {
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

    const anotherIntent = { ...yosemiteIntent, type: "regenerate" as const };
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
    const second = gate.request({ ...yosemiteIntent, type: "regenerate" });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    gate.close();
    expect(signals[1]?.aborted).toBe(true);
    await Promise.all([first, second]);
    expect(authorized).not.toHaveBeenCalled();
    expect(gate.snapshot().phase).toBe("idle");
  });

  it.each([
    {
      label: "title",
      promptInput: { ...yosemiteIntent.promptInput, title: "\n" },
      message:
        "This badge has invalid quote input in title. Provide a non-empty badge title within the supported length before regenerating a quote.",
    },
    {
      label: "criterion",
      promptInput: { ...yosemiteIntent.promptInput, criterion: "\n" },
      message:
        "This badge has invalid quote input in criterion. Provide a non-empty achievement criterion within the supported length before regenerating a quote.",
    },
    {
      label: "direction",
      promptInput: { ...yosemiteIntent.promptInput, direction: {} },
      message:
        "This badge has invalid quote input in direction. Correct or remove the optional direction before regenerating a quote.",
    },
    {
      label: "allowedQuotations",
      promptInput: {
        ...yosemiteIntent.promptInput,
        allowedQuotations: [
          {
            id: "muir-yosemite",
            text: "The mountains are calling.",
            person: "John Muir",
            sourceTitle: "Letter",
            sourceUrl: "http://example.com/quotation",
          },
        ],
      },
      message:
        "This badge has invalid quote input in allowedQuotations. Provide a non-empty source-checked allowedQuotations list before regenerating a quote.",
    },
  ])("names invalid $label input locally and authorizes nothing", async ({ promptInput, message }) => {
    const loader = disclosureLoader();
    const authorized = authorizedSpy();
    const gate = new SayingDisclosureGate(loader, authorized);

    await gate.request({
      ...yosemiteIntent,
      promptInput: promptInput as SayingRegenerationIntent["promptInput"],
    });

    expect(loader).not.toHaveBeenCalled();
    expect(authorized).not.toHaveBeenCalled();
    expect(gate.snapshot()).toEqual({
      phase: "error",
      review: null,
      error: message,
    });
  });

  it("names every invalid request field in one actionable local error", async () => {
    const gate = new SayingDisclosureGate(disclosureLoader(), authorizedSpy());

    await gate.request({
      ...yosemiteIntent,
      promptInput: {
        title: "\n",
        criterion: "\n",
        direction: {},
        allowedQuotations: [],
      } as SayingRegenerationIntent["promptInput"],
    });

    expect(gate.snapshot().error).toBe(
      "This badge has invalid quote input in title, criterion, direction, and allowedQuotations. Provide a non-empty badge title within the supported length; provide a non-empty achievement criterion within the supported length; correct or remove the optional direction; and provide a non-empty source-checked allowedQuotations list before regenerating a quote.",
    );
  });
});
