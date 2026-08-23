import type { ArchiveApplication } from "@badge/archive-application";
import { activateAchievement } from "@badge/archive-domain";
import { describe, expect, it, vi } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import { validateStarterArchiveForOpen } from "./archive-startup.js";

describe("Archive startup compatibility gate", () => {
  function incompatibleEarnedState() {
    const expected = createStarterArchiveState();
    const target = expected.records[0];
    const earned = activateAchievement(
      expected,
      {
        recordId: target.recordId,
        occurredStart: "2026-08-20",
        occurredEnd: "2026-08-20",
        note: null,
        visibility: "private",
        saying: "Granite remembers.",
        visualPin: target.publishedVisual,
      },
      "2026-08-23T17:00:00.000Z",
    ).state;
    const incompatible = { ...earned, ownerId: "future-local-owner" };
    return { expected, incompatible, recordId: target.recordId };
  }

  it("routes combined incompatible and corrupt earned state through source repair first", async () => {
    const { expected, incompatible, recordId } = incompatibleEarnedState();
    const damagedSource = new Error("sealed source bytes are corrupt");
    const visual = vi.fn().mockRejectedValue(damagedSource);
    const archive = { visual } as unknown as ArchiveApplication;

    await expect(validateStarterArchiveForOpen(archive, expected, incompatible)).rejects.toBe(damagedSource);
    expect(visual).toHaveBeenCalledWith(recordId);
  });

  it("promotes readable incompatible state only after its earned visuals audit cleanly", async () => {
    const { expected, incompatible, recordId } = incompatibleEarnedState();
    const visual = vi.fn().mockResolvedValue({});
    const archive = { visual } as unknown as ArchiveApplication;

    await expect(validateStarterArchiveForOpen(archive, expected, incompatible, true)).rejects.toThrow(
      /recovery quarantined and repaired.*still incompatible.*saved safety backup/i,
    );
    expect(visual).toHaveBeenCalledWith(recordId);
  });
});
