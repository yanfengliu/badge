import { describe, expect, it } from "vitest";
import { toExactVisualPin } from "@badge/archive-domain";

import { activationInputFor, canActivateWithSaying, defaultActivationDraft } from "./app-types";
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

  it("activation input cannot carry replacement saying text", () => {
    const baseRecord = createStarterArchiveState().records[0]!;
    const record = { ...baseRecord, acceptedSaying: "The chosen line." };
    const draft = {
      ...defaultActivationDraft(),
      occurredStart: "2026-08-23",
      occurredEnd: "",
    };

    expect(activationInputFor(record, draft, toExactVisualPin(record.publishedVisual))).not.toHaveProperty(
      "saying",
    );
  });

  it("requires a recognized source-checked quotation before activation", () => {
    expect(canActivateWithSaying({ sourceChecked: true, saving: false })).toBe(true);
    expect(canActivateWithSaying({ sourceChecked: false, saving: false })).toBe(false);
    expect(canActivateWithSaying({ sourceChecked: true, saving: true })).toBe(false);
  });
});
