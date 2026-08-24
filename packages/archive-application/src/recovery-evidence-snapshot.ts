import type { ArchiveState } from "@badge/archive-domain";
import type { IDBPDatabase } from "idb";

import { parseStoredState } from "./archive-database.js";
import { ArchivePersistenceError } from "./errors.js";
import type { ArchiveRecoveryReasonCode } from "./recovery-evidence.js";
import { validateStoredSourceAsset } from "./source-assets.js";
import {
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  type ArchiveDatabase,
} from "./storage-contract.js";

export interface ArchiveRecoveryEvidenceSnapshot {
  readonly state: ArchiveState;
  readonly affectedRecordIds: readonly string[];
}

function isUnavailableStoredSource(error: unknown): error is ArchivePersistenceError {
  return (
    error instanceof ArchivePersistenceError &&
    [
      "VISUAL_SOURCE_HASH_MISMATCH",
      "VISUAL_SOURCE_INVALID",
      "VISUAL_SOURCE_MISSING",
      "VISUAL_SOURCE_UNREADABLE",
    ].includes(error.code)
  );
}

function reasonMismatch(reason: ArchiveRecoveryReasonCode): never {
  throw new ArchivePersistenceError(
    "RECOVERY_REASON_MISMATCH",
    reason === "earned-quotation-missing"
      ? "Archive rescue evidence cannot claim a missing sealed quotation because no earned record has a null quotation. No evidence was exported."
      : "Archive rescue evidence cannot claim unavailable source art because every earned record currently has a valid sealed source. No evidence was exported.",
  );
}

export async function inspectRecoveryEvidenceSnapshot(
  database: IDBPDatabase<ArchiveDatabase>,
  reason: ArchiveRecoveryReasonCode,
): Promise<ArchiveRecoveryEvidenceSnapshot> {
  const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readonly");
  const state = parseStoredState(await transaction.objectStore(ARCHIVE_STATE_STORE).get(ARCHIVE_STATE_KEY));
  if (reason === "earned-quotation-missing") {
    await transaction.done;
    const affectedRecordIds = state.records
      .filter((record) => record.lifecycle === "earned" && record.acceptedSaying === null)
      .map((record) => record.recordId)
      .sort();
    if (affectedRecordIds.length === 0) return reasonMismatch(reason);
    return { state, affectedRecordIds };
  }

  const earnedRecords = state.records.filter((record) => record.activation !== null);
  const rows = await Promise.all(
    earnedRecords.map((record) =>
      transaction.objectStore(ARCHIVE_OBJECT_STORE).get(record.activation!.visualPin.sourceAssetHash),
    ),
  );
  await transaction.done;
  const affectedRecordIds: string[] = [];
  for (let index = 0; index < earnedRecords.length; index += 1) {
    const record = earnedRecords[index]!;
    const hash = record.activation!.visualPin.sourceAssetHash;
    const row = rows[index];
    if (row === undefined) {
      affectedRecordIds.push(record.recordId);
      continue;
    }
    try {
      await validateStoredSourceAsset(row, hash);
    } catch (error) {
      if (!isUnavailableStoredSource(error)) throw error;
      affectedRecordIds.push(record.recordId);
    }
  }
  if (affectedRecordIds.length === 0) return reasonMismatch(reason);
  return { state, affectedRecordIds: [...new Set(affectedRecordIds)].sort() };
}
