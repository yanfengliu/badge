import "fake-indexeddb/auto";

import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  createArchiveBackup,
  type ArchiveSourceAssetInput,
} from "@badge/archive-application";
import { activateAchievement, type ArchiveState } from "@badge/archive-domain";
import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStarterArchiveState, createStarterQuotationRequests } from "./archive-state.js";
import {
  preparePendingSafetyHandoff,
  recoverPendingArchive,
  type PendingArchiveRestore,
} from "./restore-flow.js";

const sourceAsset: ArchiveSourceAssetInput = {
  hash: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
  mimeType: "image/png",
  bytes: Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181,
    28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102, 0, 0,
    0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
  ]),
};

const secondSourceAsset: ArchiveSourceAssetInput = {
  hash: "40608fc14ad54b68b2bff707f844efb5b342f85c51b5438c95b0bc78f06d0fa3",
  mimeType: "image/png",
  bytes: Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31,
    21, 196, 137, 0, 0, 0, 1, 115, 82, 71, 66, 0, 174, 206, 28, 233, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218,
    99, 248, 207, 192, 240, 31, 0, 5, 0, 1, 255, 86, 199, 47, 13, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96,
    130,
  ]),
};

const repositories: IndexedDbArchiveRepository[] = [];

function application(): ArchiveApplication {
  const repository = new IndexedDbArchiveRepository({
    trustedQuotationRequests: createStarterQuotationRequests(),
  });
  repositories.push(repository);
  return new ArchiveApplication(repository, { now: () => "2026-08-24T17:00:00.000Z" });
}

function activateTwoHistoricalRecords(expected: ArchiveState): ArchiveState {
  const sourceAssets = [sourceAsset, secondSourceAsset];
  let current: ArchiveState = {
    ...expected,
    records: expected.records.map((record, index) => {
      const asset = sourceAssets[index];
      if (!asset) return record;
      const packId = `historical.unrelated.${index + 1}`;
      return {
        ...record,
        definitionRef: { ...record.definitionRef, packId },
        collectionRefs: record.collectionRefs.map((reference) => ({ ...reference, packId })),
        publishedVisual: {
          ...record.publishedVisual,
          packRef: { ...record.publishedVisual.packRef, packId },
          sourceAssetHash: asset.hash,
        },
      };
    }),
  };
  for (const record of current.records.slice(0, 2)) {
    current = activateAchievement(
      current,
      {
        recordId: record.recordId,
        occurredStart: "2026-08-24",
        occurredEnd: "2026-08-24",
        note: null,
        visibility: "private",
        visualPin: record.publishedVisual,
      },
      "2026-08-24T17:00:00.000Z",
    ).state;
  }
  return current;
}

function pendingSourceRescue(): PendingArchiveRestore {
  return {
    fileName: "compatible.badgearchive",
    bytes: new Uint8Array([4]),
    exportedAt: "2026-08-24T17:00:00.000Z",
    incomingState: createStarterArchiveState(),
    incomingEarnedCount: 0,
    recoveryMode: "replace-incompatible-readable-state",
    safetyBackupOffered: false,
    safetyCheckpointState: null,
    safetyHandoff: "state-rescue",
    stateRescueReason: "source-art-unavailable",
    stateRescueAffectedRecordIds: null,
  };
}

afterEach(async () => {
  for (const repository of repositories.splice(0)) repository.close();
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("source-art rescue reclassification", () => {
  it("offers a full backup when another connection repairs art before the safety handoff", async () => {
    const expected = createStarterArchiveState();
    const original = expected.records[0]!;
    const packId = "historical.unrelated";
    const visual = {
      ...original.publishedVisual,
      packRef: { ...original.publishedVisual.packRef, packId },
      sourceAssetHash: sourceAsset.hash,
    };
    const incompatible = {
      ...expected,
      records: expected.records.map((record, index) =>
        index === 0
          ? {
              ...record,
              definitionRef: { ...record.definitionRef, packId },
              collectionRefs: record.collectionRefs.map((reference) => ({ ...reference, packId })),
              publishedVisual: visual,
            }
          : record,
      ),
    };
    const current = activateAchievement(
      incompatible,
      {
        recordId: original.recordId,
        occurredStart: "2026-08-24",
        occurredEnd: "2026-08-24",
        note: null,
        visibility: "private",
        visualPin: visual,
      },
      "2026-08-24T17:00:00.000Z",
    ).state;
    const archive = application();
    await archive.initialize(current);
    await expect(archive.exportBackupCheckpoint()).rejects.toMatchObject({
      code: "VISUAL_SOURCE_MISSING",
    });

    const evidenceAttempt = vi.spyOn(archive, "exportRecoveryEvidenceCheckpoint");
    await application().initialize(current, [sourceAsset]);
    const pending: PendingArchiveRestore = {
      fileName: "compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-24T17:00:00.000Z",
      incomingState: createStarterArchiveState(),
      incomingEarnedCount: 0,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
      stateRescueReason: "source-art-unavailable",
      stateRescueAffectedRecordIds: null,
    };

    const prepared = await preparePendingSafetyHandoff(archive, pending, expected);

    expect(evidenceAttempt).toHaveBeenCalledWith("earned-quotation-missing");
    expect(evidenceAttempt).not.toHaveBeenCalledWith("source-art-unavailable");
    expect(prepared.fileName).toBe("my-badge-archive-before-restore.badgearchive");
    expect(prepared.restore).toMatchObject({
      recoveryMode: "replace-incompatible-readable-state",
      safetyHandoff: "full-backup",
      stateRescueReason: null,
      safetyBackupOffered: true,
      safetyCheckpointState: current,
    });
  });

  it("stops confirmation when another connection repairs art after evidence export", async () => {
    const expected = createStarterArchiveState();
    const original = expected.records[0]!;
    const packId = "historical.unrelated";
    const visual = {
      ...original.publishedVisual,
      packRef: { ...original.publishedVisual.packRef, packId },
      sourceAssetHash: sourceAsset.hash,
    };
    const incompatible = {
      ...expected,
      records: expected.records.map((record, index) =>
        index === 0
          ? {
              ...record,
              definitionRef: { ...record.definitionRef, packId },
              collectionRefs: record.collectionRefs.map((reference) => ({ ...reference, packId })),
              publishedVisual: visual,
            }
          : record,
      ),
    };
    const current = activateAchievement(
      incompatible,
      {
        recordId: original.recordId,
        occurredStart: "2026-08-24",
        occurredEnd: "2026-08-24",
        note: null,
        visibility: "private",
        visualPin: visual,
      },
      "2026-08-24T17:00:00.000Z",
    ).state;
    const archive = application();
    await archive.initialize(current);
    const pending: PendingArchiveRestore = {
      fileName: "compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-24T17:00:00.000Z",
      incomingState: createStarterArchiveState(),
      incomingEarnedCount: 0,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
      stateRescueReason: "source-art-unavailable",
      stateRescueAffectedRecordIds: null,
    };
    const evidence = await preparePendingSafetyHandoff(archive, pending, expected);
    expect(evidence.fileName).toBe("my-badge-archive-rescue-evidence.badgeevidence.json");

    await application().initialize(current, [sourceAsset]);

    await expect(
      recoverPendingArchive(archive, evidence.restore, expected.ownerId, [], expected),
    ).rejects.toMatchObject({
      name: "ArchiveSafetyHandoffRefreshError",
      preparation: {
        fileName: "my-badge-archive-before-restore.badgearchive",
        restore: {
          recoveryMode: "replace-incompatible-readable-state",
          safetyHandoff: "full-backup",
          stateRescueReason: null,
        },
      },
    });
    expect(await archive.state()).toEqual(current);
  });

  it("refreshes evidence when the exact missing-source record changes from A to B", async () => {
    const expected = createStarterArchiveState();
    const current = activateTwoHistoricalRecords(expected);
    const firstRecordId = current.records[0]!.recordId;
    const secondRecordId = current.records[1]!.recordId;
    const archive = application();
    await archive.initialize(current, [secondSourceAsset]);

    const evidence = await preparePendingSafetyHandoff(archive, pendingSourceRescue(), expected);
    expect(evidence.restore.stateRescueAffectedRecordIds).toEqual([firstRecordId]);
    expect(evidence.notice).toContain(firstRecordId);
    expect(evidence.notice).not.toContain(secondRecordId);

    const concurrent = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await concurrent.put(ARCHIVE_OBJECT_STORE, sourceAsset, sourceAsset.hash);
    await concurrent.delete(ARCHIVE_OBJECT_STORE, secondSourceAsset.hash);
    concurrent.close();

    let refreshError: unknown;
    try {
      await recoverPendingArchive(archive, evidence.restore, expected.ownerId, [], expected);
    } catch (error) {
      refreshError = error;
    }
    expect(refreshError).toMatchObject({
      name: "ArchiveSafetyHandoffRefreshError",
      preparation: {
        fileName: "my-badge-archive-rescue-evidence.badgeevidence.json",
        restore: {
          stateRescueReason: "source-art-unavailable",
          stateRescueAffectedRecordIds: [secondRecordId],
        },
      },
    });
    const preparation = (refreshError as { preparation: { notice: string; restore: PendingArchiveRestore } })
      .preparation;
    expect(preparation.notice).toContain(secondRecordId);
    expect(preparation.notice).not.toContain(firstRecordId);
    expect(await archive.state()).toEqual(current);
  });

  it("prioritizes an earned missing quotation even when its missing art is later repaired", async () => {
    const expected = createStarterArchiveState();
    const original = expected.records[0]!;
    const packId = "historical.unrelated";
    const visual = {
      ...original.publishedVisual,
      packRef: { ...original.publishedVisual.packRef, packId },
      sourceAssetHash: sourceAsset.hash,
    };
    const historical = {
      ...expected,
      records: expected.records.map((record, index) =>
        index === 0
          ? {
              ...record,
              definitionRef: { ...record.definitionRef, packId },
              collectionRefs: record.collectionRefs.map((reference) => ({ ...reference, packId })),
              publishedVisual: visual,
            }
          : record,
      ),
    };
    const activated = activateAchievement(
      historical,
      {
        recordId: original.recordId,
        occurredStart: "2026-08-24",
        occurredEnd: "2026-08-24",
        note: null,
        visibility: "private",
        visualPin: visual,
      },
      "2026-08-24T17:00:00.000Z",
    ).state;
    const current = {
      ...activated,
      records: activated.records.map((record, index) =>
        index === 0 ? { ...record, acceptedSaying: null } : record,
      ),
    };
    const archive = application();
    await archive.initialize(current);
    const backup = await createArchiveBackup(expected, [], "2026-08-24T17:00:00.000Z");
    const pending = { ...pendingSourceRescue(), bytes: backup };

    const evidence = await preparePendingSafetyHandoff(archive, pending, expected);
    expect(evidence.restore).toMatchObject({
      safetyHandoff: "state-rescue",
      stateRescueReason: "earned-quotation-missing",
      stateRescueAffectedRecordIds: [original.recordId],
    });
    expect(evidence.notice).toMatch(/no sealed quotation/i);

    await application().initialize(current, [sourceAsset]);
    const refreshed = await preparePendingSafetyHandoff(archive, pending, expected);
    expect(refreshed.restore).toMatchObject({
      safetyHandoff: "state-rescue",
      stateRescueReason: "earned-quotation-missing",
      stateRescueAffectedRecordIds: [original.recordId],
    });
    expect(refreshed.fileName).toBe("my-badge-archive-rescue-evidence.badgeevidence.json");

    const recover = vi.spyOn(archive, "recoverBackup").mockResolvedValue({
      state: expected,
      stateReplaced: true,
      quarantineKey: "archive-state-quarantine:test",
      quarantineKeys: ["archive-state-quarantine:test"],
    });
    const recovery = await recoverPendingArchive(archive, evidence.restore, expected.ownerId, [], expected);
    expect(recovery.stateReplaced).toBe(true);
    expect(recover).toHaveBeenCalledWith(
      backup,
      expected.ownerId,
      [],
      expect.objectContaining({
        expectedStateRescueReason: "earned-quotation-missing",
        expectedStateRescueAffectedRecordIds: [original.recordId],
      }),
    );
  });
});
