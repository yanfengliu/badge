import { archiveStateSchema, sha256Schema, type ArchiveState } from "@badge/archive-domain";
import { canonicalJsonBytes, sha256Hex } from "@badge/pack-contract";
import { z } from "zod";

import { MAX_ARCHIVE_BACKUP_STATE_BYTES, requiredEarnedSourceHashes } from "./backup-state.js";
import { ArchivePersistenceError } from "./errors.js";

const archiveRecoveryEvidenceLimitationsV1Schema = z
  .object({
    restorable: z.literal(false),
    sourceAssetsIncluded: z.literal(false),
    message: z.literal(
      "State-only rescue evidence preserves readable records but is non-restorable and excludes source art.",
    ),
  })
  .strict();

const archiveRecoveryEvidenceV1Schema = z
  .object({
    format: z.literal("badgearchive-rescue-evidence"),
    evidenceVersion: z.literal(1),
    exportedAt: z.string().datetime({ offset: true }),
    stateSha256: sha256Schema,
    limitations: archiveRecoveryEvidenceLimitationsV1Schema,
    omittedEarnedSourceHashes: z.array(sha256Schema),
    state: archiveStateSchema,
  })
  .strict();

export const archiveRecoveryReasonCodeSchema = z.enum(["earned-quotation-missing", "source-art-unavailable"]);
export type ArchiveRecoveryReasonCode = z.infer<typeof archiveRecoveryReasonCodeSchema>;

export const archiveRecoveryReasonSchema = z
  .object({
    code: archiveRecoveryReasonCodeSchema,
    affectedRecordIds: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type ArchiveRecoveryReason = z.infer<typeof archiveRecoveryReasonSchema>;

const archiveRecoveryEvidenceV2Schema = z
  .object({
    format: z.literal("badgearchive-rescue-evidence"),
    evidenceVersion: z.literal(2),
    exportedAt: z.string().datetime({ offset: true }),
    stateSha256: sha256Schema,
    rescueReason: archiveRecoveryReasonSchema,
    limitations: z
      .object({
        restorable: z.literal(false),
        sourceAssetsIncluded: z.literal(false),
        message: z.literal(
          "State-only rescue evidence preserves readable records but cannot restore them; it excludes source art and records the exact rescue reason.",
        ),
      })
      .strict(),
    omittedEarnedSourceHashes: z.array(sha256Schema),
    state: archiveStateSchema,
  })
  .strict();

export const archiveRecoveryEvidenceSchema = z.discriminatedUnion("evidenceVersion", [
  archiveRecoveryEvidenceV1Schema,
  archiveRecoveryEvidenceV2Schema,
]);
export type ArchiveRecoveryEvidence = z.infer<typeof archiveRecoveryEvidenceSchema>;

export async function createArchiveRecoveryEvidence(
  untrustedState: ArchiveState,
  exportedAt: string,
  untrustedReason: ArchiveRecoveryReason,
): Promise<Uint8Array> {
  const state = archiveStateSchema.parse(untrustedState);
  const reason = archiveRecoveryReasonSchema.parse(untrustedReason);
  const affectedRecordIds = [...reason.affectedRecordIds].sort();
  const eligibleRecordIds = state.records
    .filter((record) =>
      reason.code === "earned-quotation-missing"
        ? record.lifecycle === "earned" && record.acceptedSaying === null
        : record.lifecycle === "earned",
    )
    .map((record) => record.recordId)
    .sort();
  if (
    affectedRecordIds.length !== new Set(affectedRecordIds).size ||
    affectedRecordIds.some((recordId) => !eligibleRecordIds.includes(recordId)) ||
    (reason.code === "earned-quotation-missing" &&
      (affectedRecordIds.length !== eligibleRecordIds.length ||
        affectedRecordIds.some((recordId, index) => recordId !== eligibleRecordIds[index])))
  ) {
    throw new ArchivePersistenceError(
      "RECOVERY_REASON_MISMATCH",
      "Archive rescue evidence reason does not match the affected earned records in its state checkpoint. No evidence was exported.",
    );
  }
  const stateBytes = canonicalJsonBytes(state);
  if (stateBytes.byteLength === 0 || stateBytes.byteLength > MAX_ARCHIVE_BACKUP_STATE_BYTES) {
    throw new ArchivePersistenceError(
      "BACKUP_TOO_LARGE",
      `Archive rescue state is ${stateBytes.byteLength} bytes; reduce it below ${MAX_ARCHIVE_BACKUP_STATE_BYTES} bytes before exporting. No Archive data was changed.`,
    );
  }
  return canonicalJsonBytes(
    archiveRecoveryEvidenceSchema.parse({
      format: "badgearchive-rescue-evidence",
      evidenceVersion: 2,
      exportedAt,
      stateSha256: await sha256Hex(stateBytes),
      rescueReason: { code: reason.code, affectedRecordIds },
      limitations: {
        restorable: false,
        sourceAssetsIncluded: false,
        message:
          "State-only rescue evidence preserves readable records but cannot restore them; it excludes source art and records the exact rescue reason.",
      },
      omittedEarnedSourceHashes: requiredEarnedSourceHashes(state),
      state,
    }),
  );
}
