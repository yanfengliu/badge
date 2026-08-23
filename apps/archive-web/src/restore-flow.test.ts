import {
  ArchivePersistenceError,
  MAX_ARCHIVE_BACKUP_BYTES,
  type ArchiveApplication,
} from "@badge/archive-application";
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
    const state = {
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
      incomingEarnedCount: 0,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
    };

    const prepared = await preparePendingSafetyHandoff(archive, pending, expected);
    expect(prepared).toMatchObject({
      bytes,
      fileName: "my-badge-archive-rescue-evidence.badgeevidence.json",
      mimeType: "application/json",
      restore: { safetyBackupOffered: true, safetyCheckpointState: state },
    });
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
      exportBackupCheckpoint: vi.fn().mockResolvedValue({ bytes, state: newer }),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "older-compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-23T17:00:00.000Z",
      incomingEarnedCount: 0,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
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
    const archive = {
      exportBackupCheckpoint: vi
        .fn()
        .mockRejectedValue(
          new ArchivePersistenceError("VISUAL_SOURCE_MISSING", "A sealed visual source is missing."),
        ),
      exportRecoveryEvidenceCheckpoint: vi.fn().mockResolvedValue({
        bytes: new Uint8Array([1]),
        state: expected,
      }),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "repair-source.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-23T17:00:00.000Z",
      incomingEarnedCount: 1,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
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
