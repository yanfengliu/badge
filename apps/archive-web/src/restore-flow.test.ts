import {
  ArchivePersistenceError,
  MAX_ARCHIVE_BACKUP_BYTES,
  type ArchiveApplication,
} from "@badge/archive-application";
import { activateAchievement } from "@badge/archive-domain";
import { describe, expect, it, vi } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import {
  currentEarnedCountCopy,
  inspectArchiveBackupFile,
  nextArchiveRestoreAction,
  preparePendingSafetyHandoff,
  unrepairableIncompatibleRecoveryMessage,
  type PendingArchiveRestore,
} from "./restore-flow.js";

describe("Archive restore safety flow", () => {
  it("does not present an unknown closed-Archive earned count as zero", () => {
    expect(currentEarnedCountCopy(null)).toMatch(/unavailable while this Archive is closed/i);
    expect(currentEarnedCountCopy(2)).toBe("This Archive currently has 2.");
  });

  it("offers a safety backup before a normal restore and requires a second explicit action", () => {
    expect(nextArchiveRestoreAction({ recoveryMode: null, safetyBackupOffered: false })).toBe(
      "offer-safety-backup",
    );
    expect(nextArchiveRestoreAction({ recoveryMode: null, safetyBackupOffered: true })).toBe("restore");
  });

  it("routes damaged local storage directly to explicit recovery", () => {
    expect(nextArchiveRestoreAction({ recoveryMode: "repair-corruption", safetyBackupOffered: false })).toBe(
      "recover",
    );
  });

  it("requires a saved safety backup before replacing readable incompatible state", () => {
    expect(
      nextArchiveRestoreAction({
        recoveryMode: "replace-incompatible-readable-state",
        safetyBackupOffered: false,
      }),
    ).toBe("offer-safety-backup");
    expect(
      nextArchiveRestoreAction({
        recoveryMode: "replace-incompatible-readable-state",
        safetyBackupOffered: true,
      }),
    ).toBe("recover");
  });

  it("rejects an oversized File before its arrayBuffer method can read bytes", async () => {
    const arrayBuffer = vi.fn(() => Promise.reject(new Error("bytes must not be read")));
    const file = {
      name: "too-large.badgearchive",
      size: MAX_ARCHIVE_BACKUP_BYTES + 1,
      arrayBuffer,
    } as unknown as File;

    await expect(inspectArchiveBackupFile(file, createStarterArchiveState(), null)).rejects.toThrow(
      /too-large\.badgearchive.*was not read/i,
    );
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("promotes an unrepairable incompatible state to a state-only rescue handoff", async () => {
    const expected = createStarterArchiveState();
    const incompatible = {
      ...expected,
      records: expected.records.map((record, index) =>
        index === 0
          ? {
              ...record,
              publishedVisual: {
                ...record.publishedVisual,
                packRef: { ...record.publishedVisual.packRef, packDigest: "a".repeat(64) },
              },
            }
          : record,
      ),
    };
    const archive = {
      state: vi.fn().mockResolvedValue(incompatible),
    } as unknown as ArchiveApplication;
    const error = new ArchivePersistenceError(
      "BACKUP_INCOMPLETE",
      `Recovery inputs do not contain source ${"f".repeat(64)} required by an earned record.`,
    );

    await expect(unrepairableIncompatibleRecoveryMessage(error, archive, expected)).resolves.toMatch(
      /state-only rescue evidence.*self-contained safety backup is impossible/i,
    );
  });

  it("binds state-rescue bytes and the final replacement CAS to one checkpoint", async () => {
    const expected = createStarterArchiveState();
    const record = expected.records[0]!;
    const earned = activateAchievement(
      expected,
      {
        recordId: record.recordId,
        occurredStart: "2026-08-20",
        occurredEnd: "2026-08-20",
        note: null,
        visibility: "private",
        visualPin: record.publishedVisual,
      },
      "2026-08-23T17:00:00.000Z",
    ).state;
    const state = {
      ...earned,
      records: earned.records.map((candidate) =>
        candidate.recordId === record.recordId ? { ...candidate, acceptedSaying: null } : candidate,
      ),
    };
    const bytes = new Uint8Array([1, 2, 3]);
    const archive = {
      exportBackupCheckpoint: vi
        .fn()
        .mockRejectedValue(
          new ArchivePersistenceError(
            "VISUAL_SOURCE_MISSING",
            "A sealed visual source is missing; choose a backup containing it.",
          ),
        ),
      exportRecoveryEvidenceCheckpoint: vi.fn().mockResolvedValue({ bytes, state }),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-23T17:00:00.000Z",
      incomingState: createStarterArchiveState(),
      incomingEarnedCount: 1,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
      stateRescueReason: "earned-quotation-missing",
      stateRescueAffectedRecordIds: null,
    };

    const prepared = await preparePendingSafetyHandoff(archive, pending, expected);
    expect(prepared).toMatchObject({
      bytes,
      fileName: "my-badge-archive-rescue-evidence.badgeevidence.json",
      mimeType: "application/json",
      restore: { safetyBackupOffered: true, safetyCheckpointState: state },
    });
    expect(archive.exportBackupCheckpoint).not.toHaveBeenCalled();
    expect(prepared.notice).toMatch(/non-restorable and excludes source art/i);
  });

  it("cancels stale state-rescue replacement when another tab makes the Archive compatible", async () => {
    const expected = createStarterArchiveState();
    const record = expected.records[0]!;
    const newer = activateAchievement(
      expected,
      {
        recordId: record.recordId,
        occurredStart: "2026-08-24",
        occurredEnd: "2026-08-24",
        note: "A newer memory that replacement must preserve.",
        visibility: "private",
        visualPin: record.publishedVisual,
      },
      "2026-08-24T20:00:00.000Z",
    ).state;
    const fullBytes = new Uint8Array([8, 9]);
    const archive = {
      exportRecoveryEvidenceCheckpoint: vi
        .fn()
        .mockRejectedValue(
          new ArchivePersistenceError(
            "RECOVERY_REASON_MISMATCH",
            "No earned record is missing a sealed quotation.",
          ),
        ),
      exportBackupCheckpoint: vi.fn().mockResolvedValue({ bytes: fullBytes, state: newer }),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "older-compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-23T17:00:00.000Z",
      incomingState: createStarterArchiveState(),
      incomingEarnedCount: 0,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
      stateRescueReason: "earned-quotation-missing",
      stateRescueAffectedRecordIds: null,
    };

    const prepared = await preparePendingSafetyHandoff(archive, pending, expected);

    expect(prepared).toMatchObject({
      bytes: fullBytes,
      fileName: "my-badge-archive-before-restore.badgearchive",
      restore: {
        recoveryMode: null,
        safetyHandoff: "full-backup",
        safetyCheckpointState: newer,
      },
    });
    expect(nextArchiveRestoreAction(prepared.restore)).toBe("restore");
  });

  it("never turns an unhandled full-backup failure into forced replacement", async () => {
    const expected = createStarterArchiveState();
    const failure = new ArchivePersistenceError(
      "BACKUP_TOO_LARGE",
      "The compatible Archive is too large for a full safety backup.",
    );
    const archive = {
      exportRecoveryEvidenceCheckpoint: vi
        .fn()
        .mockRejectedValue(
          new ArchivePersistenceError(
            "RECOVERY_REASON_MISMATCH",
            "No earned record is missing a sealed quotation.",
          ),
        ),
      exportBackupCheckpoint: vi.fn().mockRejectedValue(failure),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "older-compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-23T17:00:00.000Z",
      incomingState: createStarterArchiveState(),
      incomingEarnedCount: 0,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
      stateRescueReason: "source-art-unavailable",
      stateRescueAffectedRecordIds: null,
    };

    await expect(preparePendingSafetyHandoff(archive, pending, expected)).rejects.toBe(failure);
  });

  it("reclassifies a stale forced replacement to normal restore from the exact newer safety snapshot", async () => {
    const expected = createStarterArchiveState();
    const newer = {
      ...expected,
      records: expected.records.map((record, index) =>
        index === 0 ? { ...record, lifecycle: "planned" as const } : record,
      ),
    };
    const bytes = new Uint8Array([8, 9]);
    const archive = {
      exportRecoveryEvidenceCheckpoint: vi
        .fn()
        .mockRejectedValue(
          new ArchivePersistenceError(
            "RECOVERY_REASON_MISMATCH",
            "No earned record is missing a sealed quotation.",
          ),
        ),
      exportBackupCheckpoint: vi.fn().mockResolvedValue({ bytes, state: newer }),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "older-compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-23T17:00:00.000Z",
      incomingState: createStarterArchiveState(),
      incomingEarnedCount: 0,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "full-backup",
      stateRescueReason: null,
      stateRescueAffectedRecordIds: null,
    };

    const prepared = await preparePendingSafetyHandoff(archive, pending, expected);
    expect(prepared).toMatchObject({
      bytes,
      fileName: "my-badge-archive-before-restore.badgearchive",
      restore: {
        recoveryMode: null,
        safetyHandoff: "full-backup",
        safetyBackupOffered: true,
        safetyCheckpointState: newer,
      },
    });
    expect(prepared.notice).toMatch(/replacement was cancelled.*normal monotonic restore path/i);
  });

  it("reclassifies a compatible state with damaged art to explicit repair", async () => {
    const expected = createStarterArchiveState();
    const record = expected.records[0]!;
    const current = activateAchievement(
      expected,
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
    const archive = {
      exportBackupCheckpoint: vi
        .fn()
        .mockRejectedValue(
          new ArchivePersistenceError("VISUAL_SOURCE_MISSING", "A sealed visual source is missing."),
        ),
      exportRecoveryEvidenceCheckpoint: vi.fn().mockImplementation((reason: string) =>
        reason === "earned-quotation-missing"
          ? Promise.reject(
              new ArchivePersistenceError(
                "RECOVERY_REASON_MISMATCH",
                "No earned record is missing a sealed quotation.",
              ),
            )
          : Promise.resolve({
              bytes: new Uint8Array([1]),
              state: current,
              recoveryReason: {
                code: "source-art-unavailable",
                affectedRecordIds: [record.recordId],
              },
            }),
      ),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "repair-source.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-23T17:00:00.000Z",
      incomingState: createStarterArchiveState(),
      incomingEarnedCount: 1,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "full-backup",
      stateRescueReason: null,
      stateRescueAffectedRecordIds: null,
    };

    await expect(preparePendingSafetyHandoff(archive, pending, expected)).rejects.toMatchObject({
      name: "ArchiveSafetyReclassificationError",
      restore: {
        recoveryMode: "repair-corruption",
        safetyHandoff: "full-backup",
        safetyBackupOffered: false,
      },
    });
  });
});
