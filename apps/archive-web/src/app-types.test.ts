import { describe, expect, it } from "vitest";
import { SAYING_RAW_UTF16_CODE_UNIT_LIMIT, toExactVisualPin } from "@badge/archive-domain";

import { activationInputFor, defaultActivationDraft, sayingValidationMessage } from "./app-types";
import { createStarterArchiveState } from "./archive-state";

describe("Archive saying inputs", () => {
  it("does not eagerly install a fixture saying in a new activation draft", () => {
    expect(defaultActivationDraft()).toEqual({
      occurredStart: "",
      occurredEnd: "",
      note: "",
      visibility: "inherit",
    });
  });

  it("activation consumes only the separately accepted saying", () => {
    const baseRecord = createStarterArchiveState().records[0]!;
    const record = { ...baseRecord, acceptedSaying: "The chosen line." };
    const draft = {
      ...defaultActivationDraft(),
      occurredStart: "2026-08-23",
      occurredEnd: "",
    };

    expect(activationInputFor(record, draft, toExactVisualPin(record.publishedVisual)).saying).toBe(
      "The chosen line.",
    );
    expect(
      activationInputFor({ ...record, acceptedSaying: null }, draft, toExactVisualPin(record.publishedVisual))
        .saying,
    ).toBe("");
  });

  it("reports the shared grapheme limit instead of relying on HTML code-unit truncation", () => {
    expect(sayingValidationMessage("Yosemite", "🏕️".repeat(120))).toBeNull();
    expect(sayingValidationMessage("Yosemite", "🏕️".repeat(801))).toBe(
      "Saying for Yosemite has 801 graphemes; use at most 800.",
    );
  });

  it("reports a raw-size refusal before attempting to segment a combining-mark flood", () => {
    const oversized = `a${"\u035c".repeat(SAYING_RAW_UTF16_CODE_UNIT_LIMIT)}`;

    expect(sayingValidationMessage("Yosemite", oversized)).toBe(
      "Saying for Yosemite is 6145 UTF-16 code units; use at most 6144 so it can be inspected safely.",
    );
  });
});
