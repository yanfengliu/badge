import { describe, expect, it } from "vitest";
import { toExactVisualPin } from "@badge/archive-domain";

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
    expect(sayingValidationMessage("Yosemite", "🏕️".repeat(121))).toBe(
      "Saying for Yosemite has 121 graphemes; use at most 120.",
    );
  });
});
