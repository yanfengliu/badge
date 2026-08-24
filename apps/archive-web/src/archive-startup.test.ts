import { ArchivePersistenceError, type ArchiveApplication } from "@badge/archive-application";
import { activateAchievement } from "@badge/archive-domain";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import { initializeStarterArchive, validateStarterArchiveForOpen } from "./archive-startup.js";

afterEach(() => vi.unstubAllGlobals());

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

  it("marks earned-null state for non-restorable rescue instead of inventing a sealed quote", async () => {
    const expected = createStarterArchiveState();
    const target = expected.records[0]!;
    const earned = activateAchievement(
      expected,
      {
        recordId: target.recordId,
        occurredStart: "2026-08-20",
        occurredEnd: "2026-08-20",
        note: null,
        visibility: "private",
        visualPin: target.publishedVisual,
      },
      "2026-08-23T17:00:00.000Z",
    ).state;
    const earnedNull = {
      ...earned,
      records: earned.records.map((record) => ({ ...record, acceptedSaying: null })),
    };
    const archive = { visual: vi.fn().mockResolvedValue({}) } as unknown as ArchiveApplication;

    await expect(validateStarterArchiveForOpen(archive, expected, earnedNull)).rejects.toMatchObject({
      name: "StarterArchiveCompatibilityError",
      requiresStateRescue: true,
    });
    expect(earnedNull.records[0]!.acceptedSaying).toBeNull();
  });

  it("backfills only after the stored starter state passes compatibility review", async () => {
    const defaults = createStarterArchiveState();
    const loaded = {
      ...defaults,
      records: defaults.records.map((record) => ({ ...record, acceptedSaying: null })),
    };
    const initialize = vi.fn().mockResolvedValue(loaded);
    const initializeSayingDefaults = vi.fn().mockResolvedValue(defaults);
    const archive = { initialize, initializeSayingDefaults } as unknown as ArchiveApplication;
    const onAssetsLoaded = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([new Uint8Array([1])], { type: "image/png" }))),
    );

    await expect(initializeStarterArchive(archive, defaults, onAssetsLoaded)).resolves.toEqual(defaults);

    expect(initialize).toHaveBeenCalledOnce();
    expect(initializeSayingDefaults).toHaveBeenCalledWith(defaults, loaded);
    expect(onAssetsLoaded).toHaveBeenCalledOnce();
  });

  it("re-reads, revalidates, and converges when another tab installs defaults first", async () => {
    const defaults = createStarterArchiveState();
    const loaded = {
      ...defaults,
      records: defaults.records.map((record) => ({ ...record, acceptedSaying: null })),
    };
    const initialize = vi.fn().mockResolvedValue(loaded);
    const state = vi.fn().mockResolvedValue(defaults);
    const initializeSayingDefaults = vi
      .fn()
      .mockRejectedValueOnce(
        new ArchivePersistenceError(
          "INITIALIZATION_CONFLICT",
          "Another tab installed the source-checked defaults first.",
        ),
      )
      .mockResolvedValueOnce(defaults);
    const visual = vi.fn().mockResolvedValue({});
    const archive = { initialize, state, initializeSayingDefaults, visual } as unknown as ArchiveApplication;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([new Uint8Array([1])], { type: "image/png" }))),
    );

    await expect(initializeStarterArchive(archive, defaults, vi.fn())).resolves.toEqual(defaults);

    expect(state).toHaveBeenCalledOnce();
    expect(initializeSayingDefaults).toHaveBeenNthCalledWith(1, defaults, loaded);
    expect(initializeSayingDefaults).toHaveBeenNthCalledWith(2, defaults, defaults);
  });

  it("does not retry unrelated saying-default initialization failures", async () => {
    const defaults = createStarterArchiveState();
    const failure = new ArchivePersistenceError("TRANSACTION_FAILED", "IndexedDB write failed.");
    const initialize = vi.fn().mockResolvedValue(defaults);
    const initializeSayingDefaults = vi.fn().mockRejectedValue(failure);
    const state = vi.fn();
    const archive = { initialize, initializeSayingDefaults, state } as unknown as ArchiveApplication;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([new Uint8Array([1])], { type: "image/png" }))),
    );

    await expect(initializeStarterArchive(archive, defaults, vi.fn())).rejects.toBe(failure);
    expect(state).not.toHaveBeenCalled();
    expect(initializeSayingDefaults).toHaveBeenCalledOnce();
  });
});
