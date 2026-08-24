import {
  ArchivePersistenceError,
  createArchiveRecoveryEvidence,
  type ArchiveApplication,
} from "@badge/archive-application";
import { activateAchievement } from "@badge/archive-domain";
import { describe, expect, it, vi } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import { preparePendingSafetyHandoff, type PendingArchiveRestore } from "./restore-flow.js";

describe("earned-quotation state-rescue handoff", () => {
  it("names the missing sealed quotation and affected record in the artifact and notice", async () => {
    const expected = createStarterArchiveState();
    const record = expected.records[0]!;
    const earned = activateAchievement(
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
    const current = {
      ...earned,
      records: earned.records.map((candidate) =>
        candidate.recordId === record.recordId ? { ...candidate, acceptedSaying: null } : candidate,
      ),
    };
    const bytes = await createArchiveRecoveryEvidence(current, "2026-08-24T17:00:00.000Z", {
      code: "earned-quotation-missing",
      affectedRecordIds: [record.recordId],
    });
    const archive = {
      exportRecoveryEvidenceCheckpoint: vi.fn().mockResolvedValue({ bytes, state: current }),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-24T17:00:00.000Z",
      incomingEarnedCount: 1,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
      stateRescueReason: "earned-quotation-missing",
      stateRescueAffectedRecordIds: null,
    };

    const prepared = await preparePendingSafetyHandoff(archive, pending, expected);
    const evidence = JSON.parse(new TextDecoder().decode(prepared.bytes)) as {
      rescueReason: { code: string; affectedRecordIds: string[] };
    };

    expect(evidence.rescueReason).toEqual({
      code: "earned-quotation-missing",
      affectedRecordIds: [record.recordId],
    });
    expect(prepared.notice).toContain("earned memory has no sealed quotation");
    expect(prepared.notice).toContain(record.recordId);
    expect(prepared.notice).not.toContain("damaged historical art");
    expect(archive.exportRecoveryEvidenceCheckpoint).toHaveBeenCalledWith("earned-quotation-missing");
  });

  it("reclassifies when another tab repairs the missing quotation before evidence export", async () => {
    const expected = createStarterArchiveState();
    const fullBytes = new Uint8Array([8, 9]);
    const archive = {
      state: vi.fn().mockResolvedValue(expected),
      exportRecoveryEvidenceCheckpoint: vi
        .fn()
        .mockRejectedValue(
          new ArchivePersistenceError(
            "RECOVERY_REASON_MISMATCH",
            "No earned record is missing a sealed quotation.",
          ),
        ),
      exportBackupCheckpoint: vi.fn().mockResolvedValue({ bytes: fullBytes, state: expected }),
    } as unknown as ArchiveApplication;
    const pending: PendingArchiveRestore = {
      fileName: "compatible.badgearchive",
      bytes: new Uint8Array([4]),
      exportedAt: "2026-08-24T17:00:00.000Z",
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
      restore: {
        recoveryMode: null,
        safetyHandoff: "full-backup",
        stateRescueReason: null,
        safetyCheckpointState: expected,
      },
    });
    expect(prepared.notice).toMatch(/replacement was cancelled.*normal monotonic restore/i);
  });
});
