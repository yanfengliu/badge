import {
  ArchivePersistenceError,
  type ArchiveApplication,
  type ArchiveSourceAssetInput,
} from "@badge/archive-application";
import { activateAchievement } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { legacyStarterRepairSources } from "@badge/catalogue-fixtures/legacy-repair";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import {
  initializeStarterArchive,
  initializeStarterVisualUpgrade,
  validateStarterArchiveForOpen,
} from "./archive-startup.js";
import { LEGACY_STARTER_VISUAL_LINEAGES } from "./starter-visual-upgrade.js";

afterEach(() => vi.unstubAllGlobals());

describe("Archive startup compatibility gate", () => {
  function legacyStarterState() {
    const current = createStarterArchiveState();
    const legacyById = new Map<string, (typeof LEGACY_STARTER_VISUAL_LINEAGES)[number]>(
      LEGACY_STARTER_VISUAL_LINEAGES.map((lineage) => [lineage.recordId, lineage]),
    );
    return {
      ...current,
      records: current.records.map((record) => {
        const legacy = legacyById.get(record.recordId);
        return legacy ? { ...record, publishedVisual: legacy.publishedVisual } : record;
      }),
    };
  }

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

  it("audits earned sources and compatibility before any visual-migration write", async () => {
    const { expected, incompatible, recordId } = incompatibleEarnedState();
    const damagedSource = new Error("sealed source bytes are corrupt");
    const visual = vi.fn().mockRejectedValue(damagedSource);
    const upgradeCatalogueVisuals = vi.fn();
    const archive = { visual, upgradeCatalogueVisuals } as unknown as ArchiveApplication;

    await expect(initializeStarterVisualUpgrade(archive, expected, incompatible, [])).rejects.toBe(
      damagedSource,
    );

    expect(visual).toHaveBeenCalledWith(recordId);
    expect(upgradeCatalogueVisuals).not.toHaveBeenCalled();
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
    const upgradeCatalogueVisuals = vi.fn().mockResolvedValue(loaded);
    const reconcileCatalogue = vi.fn().mockResolvedValue(loaded);
    const initializeSayingDefaults = vi.fn().mockResolvedValue(defaults);
    const archive = {
      initialize,
      upgradeCatalogueVisuals,
      reconcileCatalogue,
      initializeSayingDefaults,
    } as unknown as ArchiveApplication;
    const onAssetsLoaded = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([new Uint8Array([1])], { type: "image/png" }))),
    );

    await expect(initializeStarterArchive(archive, defaults, onAssetsLoaded)).resolves.toEqual(defaults);

    expect(initialize).toHaveBeenCalledOnce();
    expect(upgradeCatalogueVisuals).toHaveBeenCalledOnce();
    expect(reconcileCatalogue).toHaveBeenCalledWith(defaults, loaded);
    expect(initializeSayingDefaults).toHaveBeenCalledWith(defaults, loaded);
    expect(onAssetsLoaded).toHaveBeenCalledOnce();
  });

  it("does not retain a current source batch until repository validation succeeds", async () => {
    const expected = createStarterArchiveState();
    const failure = new ArchivePersistenceError(
      "VISUAL_SOURCE_INVALID",
      "The current source bytes do not match their trusted hash.",
    );
    const archive = {
      initialize: vi.fn().mockRejectedValue(failure),
    } as unknown as ArchiveApplication;
    const onAssetsLoaded = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([new Uint8Array([1])], { type: "image/png" }))),
    );

    await expect(initializeStarterArchive(archive, expected, onAssetsLoaded)).rejects.toBe(failure);

    expect(onAssetsLoaded).not.toHaveBeenCalled();
  });

  it("retains current sources but not a rejected deferred earned-legacy batch", async () => {
    const expected = createStarterArchiveState();
    const legacy = LEGACY_STARTER_VISUAL_LINEAGES[0]!;
    const loaded = {
      ...expected,
      records: expected.records.map((record) =>
        record.recordId === legacy.recordId
          ? {
              ...record,
              publishedVisual: legacy.publishedVisual,
              lifecycle: "earned" as const,
              activation: {
                occurredStart: "2026-08-20",
                occurredEnd: "2026-08-20",
                recordedAt: "2026-08-21T17:00:00.000Z",
                activatedAt: "2026-08-21T17:00:00.000Z",
                visualPin: legacy.publishedVisual,
              },
            }
          : record,
      ),
    };
    const failure = new ArchivePersistenceError(
      "VISUAL_SOURCE_INVALID",
      "The legacy source bytes do not match their trusted hash.",
    );
    const archive = {
      initialize: vi.fn().mockResolvedValueOnce(loaded).mockRejectedValueOnce(failure),
    } as unknown as ArchiveApplication;
    const onAssetsLoaded = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([new Uint8Array([1])], { type: "image/png" }))),
    );

    await expect(initializeStarterArchive(archive, expected, onAssetsLoaded)).rejects.toBe(failure);

    expect(onAssetsLoaded).toHaveBeenCalledOnce();
    expect(onAssetsLoaded.mock.calls[0]![0].map((asset: ArchiveSourceAssetInput) => asset.hash)).toEqual(
      starterBadges.map((badge) => badge.sourceAssetHash),
    );
  });

  it("upgrades unearned alpha.3 state without fetching its obsolete source", async () => {
    const expected = createStarterArchiveState();
    const legacy = LEGACY_STARTER_VISUAL_LINEAGES[0]!;
    const loaded = {
      ...expected,
      records: expected.records.map((record) =>
        record.recordId === legacy.recordId ? { ...record, publishedVisual: legacy.publishedVisual } : record,
      ),
    };
    const initialize = vi.fn().mockResolvedValueOnce(loaded);
    const upgradeCatalogueVisuals = vi.fn().mockResolvedValue(expected);
    const reconcileCatalogue = vi.fn().mockResolvedValue(expected);
    const initializeSayingDefaults = vi.fn().mockResolvedValue(expected);
    const archive = {
      initialize,
      upgradeCatalogueVisuals,
      reconcileCatalogue,
      initializeSayingDefaults,
    } as unknown as ArchiveApplication;
    const fetched: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        fetched.push(String(input));
        return new Response(new Blob([new Uint8Array([1])], { type: "image/png" }));
      }),
    );
    const onAssetsLoaded = vi.fn();

    await expect(initializeStarterArchive(archive, expected, onAssetsLoaded)).resolves.toEqual(expected);

    expect(fetched).toEqual(starterBadges.map((badge) => badge.sourceUrl));
    expect(initialize).toHaveBeenCalledOnce();
    expect(initialize.mock.calls[0]![1].map((asset: ArchiveSourceAssetInput) => asset.hash)).toEqual(
      starterBadges.map((badge) => badge.sourceAssetHash),
    );
    expect(onAssetsLoaded).toHaveBeenCalledOnce();
    expect(upgradeCatalogueVisuals.mock.calls[0]![1].map((asset: { hash: string }) => asset.hash)).toEqual(
      starterBadges.map((badge) => badge.sourceAssetHash),
    );
  });

  it("fetches an earned alpha.3 activation source before audit and preserves it through upgrade", async () => {
    const expected = createStarterArchiveState();
    const legacy = LEGACY_STARTER_VISUAL_LINEAGES[0]!;
    const loaded = {
      ...expected,
      records: expected.records.map((record) =>
        record.recordId === legacy.recordId
          ? {
              ...record,
              publishedVisual: legacy.publishedVisual,
              lifecycle: "earned" as const,
              activation: {
                occurredStart: "2026-08-20",
                occurredEnd: "2026-08-20",
                recordedAt: "2026-08-21T17:00:00.000Z",
                activatedAt: "2026-08-21T17:00:00.000Z",
                visualPin: legacy.publishedVisual,
              },
            }
          : record,
      ),
    };
    const initialize = vi.fn().mockResolvedValueOnce(loaded).mockResolvedValueOnce(loaded);
    const visual = vi.fn().mockResolvedValue({});
    const upgradeCatalogueVisuals = vi.fn().mockResolvedValue(loaded);
    const reconcileCatalogue = vi.fn().mockResolvedValue(loaded);
    const initializeSayingDefaults = vi.fn().mockResolvedValue(loaded);
    const archive = {
      initialize,
      visual,
      upgradeCatalogueVisuals,
      reconcileCatalogue,
      initializeSayingDefaults,
    } as unknown as ArchiveApplication;
    const fetched: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        fetched.push(String(input));
        return new Response(new Blob([new Uint8Array([1])], { type: "image/png" }));
      }),
    );
    const onAssetsLoaded = vi.fn();

    await expect(initializeStarterArchive(archive, expected, onAssetsLoaded)).resolves.toEqual(loaded);

    const legacySource = legacyStarterRepairSources.find(
      (source) => source.sourceAssetHash === legacy.publishedVisual.sourceAssetHash,
    )!;
    expect(fetched).toEqual([...starterBadges.map((badge) => badge.sourceUrl), legacySource.sourceUrl]);
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(initialize.mock.calls[1]![1].map((asset: ArchiveSourceAssetInput) => asset.hash)).toEqual([
      legacy.publishedVisual.sourceAssetHash,
    ]);
    expect(onAssetsLoaded).toHaveBeenCalledTimes(2);
    expect(visual).toHaveBeenCalledWith(legacy.recordId);
    expect(
      upgradeCatalogueVisuals.mock.calls[0]![1].map((asset: ArchiveSourceAssetInput) => asset.hash),
    ).toEqual(starterBadges.map((badge) => badge.sourceAssetHash));
    expect(initialize.mock.invocationCallOrder[1]).toBeLessThan(visual.mock.invocationCallOrder[0]!);
    expect(visual.mock.invocationCallOrder[0]).toBeLessThan(
      upgradeCatalogueVisuals.mock.invocationCallOrder[0]!,
    );
  });

  it("re-reads, revalidates, and converges when another tab installs defaults first", async () => {
    const defaults = createStarterArchiveState();
    const loaded = {
      ...defaults,
      records: defaults.records.map((record) => ({ ...record, acceptedSaying: null })),
    };
    const initialize = vi.fn().mockResolvedValue(loaded);
    const upgradeCatalogueVisuals = vi.fn().mockResolvedValue(loaded);
    const reconcileCatalogue = vi.fn().mockResolvedValue(loaded);
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
    const archive = {
      initialize,
      state,
      upgradeCatalogueVisuals,
      reconcileCatalogue,
      initializeSayingDefaults,
      visual,
    } as unknown as ArchiveApplication;
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
    const upgradeCatalogueVisuals = vi.fn().mockResolvedValue(defaults);
    const reconcileCatalogue = vi.fn().mockResolvedValue(defaults);
    const initializeSayingDefaults = vi.fn().mockRejectedValue(failure);
    const state = vi.fn();
    const archive = {
      initialize,
      upgradeCatalogueVisuals,
      reconcileCatalogue,
      initializeSayingDefaults,
      state,
    } as unknown as ArchiveApplication;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob([new Uint8Array([1])], { type: "image/png" }))),
    );

    await expect(initializeStarterArchive(archive, defaults, vi.fn())).rejects.toBe(failure);
    expect(state).not.toHaveBeenCalled();
    expect(initializeSayingDefaults).toHaveBeenCalledOnce();
  });

  it("passes the exact alpha.3 lineage and current alpha.4 target to the atomic upgrade", async () => {
    const expected = createStarterArchiveState();
    const loaded = legacyStarterState();
    const upgraded = {
      ...expected,
      records: expected.records.map((record, index) => ({
        ...record,
        note: index === 0 ? "Personal Yosemite note." : record.note,
        visibility: index === 0 ? ("private" as const) : record.visibility,
      })),
    };
    const upgradeCatalogueVisuals = vi.fn().mockResolvedValue(upgraded);
    const archive = { upgradeCatalogueVisuals } as unknown as ArchiveApplication;

    await expect(initializeStarterVisualUpgrade(archive, expected, loaded, [])).resolves.toEqual(upgraded);

    const [plan, assets, reviewed] = upgradeCatalogueVisuals.mock.calls[0]!;
    expect(plan.upgrades).toHaveLength(4);
    expect(plan.upgrades[0]).toMatchObject({
      from: { publishedVisual: { packRef: { version: "1.0.0-alpha.3" } } },
      to: { publishedVisual: { packRef: { version: "1.0.0-alpha.4" } } },
    });
    expect(assets).toEqual([]);
    expect(reviewed).toEqual(loaded);
  });

  it("treats a stored state that predates newly shipped catalogue records as compatible", async () => {
    const expected = createStarterArchiveState();
    const olderStore = {
      ...expected,
      records: expected.records.filter((record) => record.recordId.startsWith("starter:")),
    };
    const archive = { visual: vi.fn().mockResolvedValue({}) } as unknown as ArchiveApplication;

    await expect(validateStarterArchiveForOpen(archive, expected, olderStore)).resolves.toBeUndefined();
    expect(olderStore.records).toHaveLength(4);
  });

  it.each([
    {
      label: "an unexpected starter record",
      mutate: (state: ReturnType<typeof legacyStarterState>) => ({
        ...state,
        records: [...state.records, { ...state.records[0]!, recordId: "starter:unexpected-record" }],
      }),
      message: /unexpected record IDs/i,
    },
    {
      label: "the wrong owner",
      mutate: (state: ReturnType<typeof legacyStarterState>) => ({
        ...state,
        ownerId: "another-owner",
      }),
      message: /belongs to owner another-owner/i,
    },
    {
      label: "an unknown visual version",
      mutate: (state: ReturnType<typeof legacyStarterState>) => ({
        ...state,
        records: state.records.map((record, index) =>
          index === 0
            ? {
                ...record,
                publishedVisual: {
                  ...record.publishedVisual,
                  packRef: { ...record.publishedVisual.packRef, version: "1.0.0-alpha.2" },
                },
              }
            : record,
        ),
      }),
      message: /unknown lineage|neither the exact known legacy visual nor the current visual/i,
    },
  ])("refuses $label before starting a catalogue migration write", async ({ mutate, message }) => {
    const expected = createStarterArchiveState();
    const loaded = mutate(legacyStarterState());
    const upgradeCatalogueVisuals = vi.fn();
    const archive = { upgradeCatalogueVisuals } as unknown as ArchiveApplication;

    await expect(initializeStarterVisualUpgrade(archive, expected, loaded, [])).rejects.toThrow(message);

    expect(upgradeCatalogueVisuals).not.toHaveBeenCalled();
  });

  it("re-reads and retries a catalogue upgrade only after an exact-state conflict", async () => {
    const expected = createStarterArchiveState();
    const loaded = legacyStarterState();
    const concurrent = {
      ...loaded,
      records: loaded.records.map((record) => ({ ...record, note: "Concurrent." })),
    };
    const upgradeCatalogueVisuals = vi
      .fn()
      .mockRejectedValueOnce(
        new ArchivePersistenceError("CATALOGUE_UPGRADE_CONFLICT", "Another tab changed the state."),
      )
      .mockResolvedValueOnce(expected);
    const state = vi.fn().mockResolvedValue(concurrent);
    const archive = { upgradeCatalogueVisuals, state } as unknown as ArchiveApplication;

    await expect(initializeStarterVisualUpgrade(archive, expected, loaded, [])).resolves.toEqual(expected);

    expect(state).toHaveBeenCalledOnce();
    expect(upgradeCatalogueVisuals).toHaveBeenNthCalledWith(1, expect.anything(), [], loaded);
    expect(upgradeCatalogueVisuals).toHaveBeenNthCalledWith(2, expect.anything(), [], concurrent);
  });

  it("revalidates the complete owner-bound starter population after a conflict before retrying", async () => {
    const expected = createStarterArchiveState();
    const loaded = legacyStarterState();
    const incompatibleConcurrent = {
      ...loaded,
      ownerId: "another-owner",
      records: loaded.records.slice(1),
    };
    const upgradeCatalogueVisuals = vi
      .fn()
      .mockRejectedValueOnce(
        new ArchivePersistenceError("CATALOGUE_UPGRADE_CONFLICT", "Another tab changed the state."),
      );
    const state = vi.fn().mockResolvedValue(incompatibleConcurrent);
    const archive = { upgradeCatalogueVisuals, state } as unknown as ArchiveApplication;

    await expect(initializeStarterVisualUpgrade(archive, expected, loaded, [])).rejects.toThrow(
      /belongs to owner another-owner/i,
    );

    expect(state).toHaveBeenCalledOnce();
    expect(upgradeCatalogueVisuals).toHaveBeenCalledOnce();
  });
});
