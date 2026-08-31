import type {
  ArchiveApplication,
  ArchiveRecoveryResult,
  ArchiveSourceAssetInput,
} from "@badge/archive-application";
import { describe, expect, it, vi } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import { recoverArchiveWithSourceRepair } from "./archive-recovery-assets.js";
import type { PendingArchiveRestore } from "./restore-flow.js";

function asset(hash: string, byte: number): ArchiveSourceAssetInput {
  return { hash, mimeType: "image/png", bytes: Uint8Array.of(byte) };
}

function pendingRestore(incomingState: ReturnType<typeof createStarterArchiveState>): PendingArchiveRestore {
  return {
    fileName: "incoming.badgearchive",
    bytes: Uint8Array.of(1, 2, 3),
    exportedAt: "2026-08-28T12:00:00.000Z",
    incomingState,
    incomingEarnedCount: 0,
    recoveryMode: "repair-corruption",
    safetyBackupOffered: false,
    safetyCheckpointState: null,
    safetyHandoff: "full-backup",
    stateRescueReason: null,
    stateRescueAffectedRecordIds: null,
  };
}

describe("Archive recovery source transaction", () => {
  it("passes current, incoming, and freshly persisted repair sources to recovery exactly once", async () => {
    const incoming = createStarterArchiveState();
    const fresh = { ...incoming, ownerId: "fresh-persisted-owner" };
    const rendered = { ...incoming, ownerId: "stale-rendered-owner" };
    const archive = {
      state: vi.fn().mockResolvedValue(fresh),
    } as unknown as ArchiveApplication;
    const retained = new Map([["retained", asset("retained", 1)]]);
    const current = asset("retained", 2);
    const legacy = asset("legacy", 3);
    const catalogue = asset("catalogue", 4);
    const result: ArchiveRecoveryResult = {
      state: incoming,
      stateReplaced: false,
      quarantineKey: "quarantine",
      quarantineKeys: ["quarantine"],
    };
    const loadCurrent = vi.fn().mockResolvedValue([current]);
    const loadLegacy = vi.fn().mockResolvedValue([legacy]);
    const loadCatalogue = vi.fn().mockResolvedValue([catalogue]);
    const recover = vi.fn().mockResolvedValue(result);
    const restore = pendingRestore(incoming);

    const prepared = await recoverArchiveWithSourceRepair(
      archive,
      restore,
      incoming.ownerId,
      incoming,
      rendered,
      retained,
      { loadCurrent, loadLegacy, loadCatalogue, recover },
    );

    expect(loadLegacy).toHaveBeenCalledWith([incoming, fresh]);
    expect(loadCatalogue).toHaveBeenCalledWith([incoming, fresh]);
    expect(recover).toHaveBeenCalledWith(
      archive,
      restore,
      incoming.ownerId,
      [current, legacy, catalogue],
      incoming,
    );
    expect(prepared).toEqual({
      assets: new Map([
        [current.hash, current],
        [legacy.hash, legacy],
        [catalogue.hash, catalogue],
      ]),
      recovered: result,
    });
    expect(retained.get("retained")?.bytes).toEqual(Uint8Array.of(1));
  });

  it("does not expose newly fetched assets when repository recovery rejects them", async () => {
    const incoming = createStarterArchiveState();
    const archive = {
      state: vi.fn().mockResolvedValue(incoming),
    } as unknown as ArchiveApplication;
    const retained = new Map([["retained", asset("retained", 1)]]);
    const failure = new Error("repository rejected the repair batch");

    await expect(
      recoverArchiveWithSourceRepair(
        archive,
        pendingRestore(incoming),
        incoming.ownerId,
        incoming,
        incoming,
        retained,
        {
          loadCurrent: vi.fn().mockResolvedValue([asset("current", 2)]),
          loadLegacy: vi.fn().mockResolvedValue([asset("legacy", 3)]),
          loadCatalogue: vi.fn().mockResolvedValue([asset("catalogue", 4)]),
          recover: vi.fn().mockRejectedValue(failure),
        },
      ),
    ).rejects.toBe(failure);

    expect([...retained]).toEqual([["retained", asset("retained", 1)]]);
  });
});
