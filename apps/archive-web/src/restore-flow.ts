import {
  ArchivePersistenceError,
  type ArchiveApplication,
  type ArchiveRecoveryMode,
  type ArchiveRecoveryResult,
  type ArchiveSourceAssetInput,
  parseArchiveBackup,
} from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";

import { assertArchiveBackupFileSize, assertCompatibleStarterArchive } from "./restore-compatibility.js";

export type ArchiveRestoreAction = "offer-safety-backup" | "restore" | "recover";
export type ArchiveSafetyHandoff = "full-backup" | "state-rescue";

export interface PendingArchiveRestore {
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly exportedAt: string;
  readonly incomingEarnedCount: number;
  readonly recoveryMode: ArchiveRecoveryMode | null;
  readonly safetyBackupOffered: boolean;
  readonly safetyCheckpointState: ArchiveState | null;
  readonly safetyHandoff: ArchiveSafetyHandoff;
}

export class ArchiveSafetyReclassificationError extends Error {
  constructor(readonly restore: PendingArchiveRestore) {
    super(
      "The current Archive changed in another tab and is now catalogue-compatible, but its sealed art still needs repair. Review the repair action before continuing; no Archive data was changed.",
    );
    this.name = "ArchiveSafetyReclassificationError";
  }
}

export function nextArchiveRestoreAction(
  progress: Pick<PendingArchiveRestore, "recoveryMode" | "safetyBackupOffered">,
): ArchiveRestoreAction {
  if (progress.recoveryMode === "repair-corruption") return "recover";
  if (progress.recoveryMode === "replace-incompatible-readable-state") {
    return progress.safetyBackupOffered ? "recover" : "offer-safety-backup";
  }
  return progress.safetyBackupOffered ? "restore" : "offer-safety-backup";
}

function requireSafetyCheckpointState(
  restore: PendingArchiveRestore,
  action: "restore" | "replacement",
): ArchiveState {
  if (restore.safetyCheckpointState) return restore.safetyCheckpointState;
  throw new Error(
    `Archive ${action} lost its safety checkpoint; export a new safety backup and confirm ${action} again. No Archive data was changed.`,
  );
}

export function withSafetyCheckpoint(
  restore: PendingArchiveRestore,
  state: ArchiveState,
): PendingArchiveRestore {
  return { ...restore, safetyBackupOffered: true, safetyCheckpointState: state };
}

export async function preparePendingSafetyHandoff(
  archive: ArchiveApplication,
  restore: PendingArchiveRestore,
  expectedState: ArchiveState,
): Promise<{
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly mimeType: string;
  readonly notice: string;
  readonly restore: PendingArchiveRestore;
}> {
  let effectiveRestore = restore;
  let checkpoint;
  let reclassifiedToNormalRestore = false;

  if (restore.recoveryMode === "replace-incompatible-readable-state") {
    try {
      checkpoint = await archive.exportBackupCheckpoint();
      try {
        assertCompatibleStarterArchive(expectedState, checkpoint.state);
        effectiveRestore = {
          ...restore,
          recoveryMode: null,
          safetyHandoff: "full-backup",
        };
        reclassifiedToNormalRestore = true;
      } catch {
        effectiveRestore = { ...restore, safetyHandoff: "full-backup" };
      }
    } catch (error) {
      const sourceFailure =
        error instanceof ArchivePersistenceError &&
        [
          "BACKUP_INCOMPLETE",
          "VISUAL_SOURCE_CONFLICT",
          "VISUAL_SOURCE_HASH_MISMATCH",
          "VISUAL_SOURCE_INVALID",
          "VISUAL_SOURCE_MISSING",
          "VISUAL_SOURCE_UNREADABLE",
        ].includes(error.code);
      if (!sourceFailure) throw error;
      checkpoint = await archive.exportRecoveryEvidenceCheckpoint();
      try {
        assertCompatibleStarterArchive(expectedState, checkpoint.state);
        throw new ArchiveSafetyReclassificationError({
          ...restore,
          recoveryMode: "repair-corruption",
          safetyBackupOffered: false,
          safetyCheckpointState: null,
          safetyHandoff: "full-backup",
        });
      } catch (compatibilityError) {
        if (compatibilityError instanceof ArchiveSafetyReclassificationError) {
          throw compatibilityError;
        }
        effectiveRestore = { ...restore, safetyHandoff: "state-rescue" };
      }
    }
  } else {
    checkpoint = await archive.exportBackupCheckpoint();
  }

  const rescueOnly = effectiveRestore.safetyHandoff === "state-rescue";
  return {
    bytes: checkpoint.bytes,
    fileName: rescueOnly
      ? "my-badge-archive-rescue-evidence.badgeevidence.json"
      : "my-badge-archive-before-restore.badgearchive",
    mimeType: rescueOnly ? "application/json" : "application/octet-stream",
    notice: rescueOnly
      ? "A state-only rescue evidence file was offered because damaged source art prevents a self-contained backup. Keep it outside Git; it preserves readable records but cannot restore the missing art. Confirm replacement only after saving it."
      : reclassifiedToNormalRestore
        ? "The current Archive changed and is now compatible, so replacement was cancelled. A full safety backup was offered; the next confirmation uses the normal monotonic restore path."
        : "A safety backup was offered for download. Make sure it is saved, then explicitly confirm the restore.",
    restore: withSafetyCheckpoint(effectiveRestore, checkpoint.state),
  };
}

export async function unrepairableIncompatibleRecoveryMessage(
  error: unknown,
  archive: ArchiveApplication,
  expectedState: ArchiveState,
): Promise<string | null> {
  if (!(error instanceof ArchivePersistenceError) || error.code !== "BACKUP_INCOMPLETE") return null;
  let current: ArchiveState;
  try {
    current = await archive.state();
  } catch {
    return null;
  }
  try {
    assertCompatibleStarterArchive(expectedState, current);
    return null;
  } catch {
    return `Archive source repair cannot reconstruct a damaged historical source, and the readable state is also incompatible with this Archive. Choose the compatible backup again; replacement will first offer state-only rescue evidence because a self-contained safety backup is impossible. Details: ${error.message}`;
  }
}

export function recoverPendingArchive(
  archive: ArchiveApplication,
  restore: PendingArchiveRestore,
  ownerId: string,
  trustedSources: readonly ArchiveSourceAssetInput[],
): Promise<ArchiveRecoveryResult> {
  const mode = restore.recoveryMode ?? "repair-corruption";
  return archive.recoverBackup(restore.bytes, ownerId, trustedSources, {
    mode,
    expectedCurrentState:
      mode === "replace-incompatible-readable-state"
        ? requireSafetyCheckpointState(restore, "replacement")
        : undefined,
  });
}

export function restorePendingArchive(
  archive: ArchiveApplication,
  restore: PendingArchiveRestore,
): Promise<ArchiveState> {
  return archive.restoreBackup(restore.bytes, requireSafetyCheckpointState(restore, "restore"));
}

export function archiveRecoveryNotice(
  result: ArchiveRecoveryResult,
  mode: ArchiveRecoveryMode | null,
): string {
  if (!result.stateReplaced) {
    return `Repaired damaged sealed source data and kept the current ${result.state.records.length}-record Archive. Choose Restore again if you also want to apply the backup's state.`;
  }
  const priorState =
    mode === "replace-incompatible-readable-state" ? "readable but incompatible" : "unreadable";
  return `Recovered ${result.state.records.length} records and preserved the prior ${priorState} local state as ${result.quarantineKey}.`;
}

export function currentEarnedCountCopy(count: number | null): string {
  return count === null
    ? "The current earned count is unavailable while this Archive is closed."
    : `This Archive currently has ${count}.`;
}

export async function inspectArchiveBackupFile(
  file: File,
  expectedState: ArchiveState,
  recoveryMode: ArchiveRecoveryMode | null,
  safetyHandoff: ArchiveSafetyHandoff = "full-backup",
): Promise<PendingArchiveRestore> {
  assertArchiveBackupFileSize(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = await parseArchiveBackup(bytes);
  assertCompatibleStarterArchive(expectedState, parsed.state);
  return {
    fileName: file.name,
    bytes,
    exportedAt: parsed.exportedAt,
    incomingEarnedCount: parsed.state.records.filter((record) => record.lifecycle === "earned").length,
    recoveryMode,
    safetyBackupOffered: false,
    safetyCheckpointState: null,
    safetyHandoff,
  };
}

export async function auditEarnedArchiveVisuals(
  archive: ArchiveApplication,
  state: ArchiveState,
): Promise<void> {
  await Promise.all(
    state.records
      .filter((record) => record.lifecycle === "earned")
      .map((record) => archive.visual(record.recordId)),
  );
}
