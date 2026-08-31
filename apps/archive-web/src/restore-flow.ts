import {
  ArchivePersistenceError,
  earnedRecordIdsMissingSaying,
  type ArchiveApplication,
  type ArchiveBackupCheckpoint,
  type ArchiveRecoveryMode,
  type ArchiveRecoveryReasonCode,
  type ArchiveRecoveryResult,
  type ArchiveSourceAssetInput,
  parseArchiveBackup,
} from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";
import { canonicalJson } from "@badge/pack-contract";

import { assertArchiveBackupFileSize, assertCompatibleStarterArchive } from "./restore-compatibility.js";
import { createStarterVisualUpgradePlan } from "./starter-visual-upgrade.js";

export type ArchiveRestoreAction = "offer-safety-backup" | "restore" | "recover";
export type ArchiveSafetyHandoff = "full-backup" | "state-rescue";

export interface PendingArchiveRestore {
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly exportedAt: string;
  readonly incomingState: ArchiveState;
  readonly incomingEarnedCount: number;
  readonly recoveryMode: ArchiveRecoveryMode | null;
  readonly safetyBackupOffered: boolean;
  readonly safetyCheckpointState: ArchiveState | null;
  readonly safetyHandoff: ArchiveSafetyHandoff;
  readonly stateRescueReason: ArchiveRecoveryReasonCode | null;
  readonly stateRescueAffectedRecordIds: readonly string[] | null;
}

export class ArchiveSafetyReclassificationError extends Error {
  constructor(readonly restore: PendingArchiveRestore) {
    super(
      "The current Archive changed in another tab and is now catalogue-compatible, but its sealed art still needs repair. Review the repair action before continuing; no Archive data was changed.",
    );
    this.name = "ArchiveSafetyReclassificationError";
  }
}

export interface ArchiveSafetyHandoffPreparation {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly mimeType: string;
  readonly notice: string;
  readonly restore: PendingArchiveRestore;
}

export class ArchiveSafetyHandoffRefreshError extends Error {
  constructor(readonly preparation: ArchiveSafetyHandoffPreparation) {
    super(
      "The Archive changed after its state rescue was saved, so replacement stopped and a fresh safety handoff was prepared. Review and save the new artifact before confirming again; no Archive data was changed.",
    );
    this.name = "ArchiveSafetyHandoffRefreshError";
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

function isSourceBackupFailure(error: unknown): error is ArchivePersistenceError {
  return (
    error instanceof ArchivePersistenceError &&
    [
      "BACKUP_INCOMPLETE",
      "VISUAL_SOURCE_CONFLICT",
      "VISUAL_SOURCE_HASH_MISMATCH",
      "VISUAL_SOURCE_INVALID",
      "VISUAL_SOURCE_MISSING",
      "VISUAL_SOURCE_UNREADABLE",
    ].includes(error.code)
  );
}

function isRecoveryReasonMismatch(error: unknown): error is ArchivePersistenceError {
  return error instanceof ArchivePersistenceError && error.code === "RECOVERY_REASON_MISMATCH";
}

interface ReplacementSafetyCheckpoint {
  readonly checkpoint: ArchiveBackupCheckpoint;
  readonly kind: "earned-quotation-missing" | "full-backup" | "source-art-unavailable";
}

async function exportReplacementSafetyCheckpoint(
  archive: ArchiveApplication,
): Promise<ReplacementSafetyCheckpoint> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return {
        checkpoint: await archive.exportRecoveryEvidenceCheckpoint("earned-quotation-missing"),
        kind: "earned-quotation-missing",
      };
    } catch (error) {
      if (!isRecoveryReasonMismatch(error)) throw error;
    }

    try {
      const checkpoint = await archive.exportBackupCheckpoint();
      if (earnedRecordIdsMissingSaying(checkpoint.state).length > 0) continue;
      return { checkpoint, kind: "full-backup" };
    } catch (error) {
      if (!isSourceBackupFailure(error)) throw error;
    }

    try {
      const checkpoint = await archive.exportRecoveryEvidenceCheckpoint("source-art-unavailable");
      if (earnedRecordIdsMissingSaying(checkpoint.state).length > 0) continue;
      return { checkpoint, kind: "source-art-unavailable" };
    } catch (error) {
      if (!isRecoveryReasonMismatch(error)) throw error;
    }
  }
  throw new Error(
    "Archive safety preparation stopped because quotation or source-art gaps changed repeatedly while evidence was being created. Choose the backup again after other Archive tabs finish. No Archive data was changed.",
  );
}

export async function preparePendingSafetyHandoff(
  archive: ArchiveApplication,
  restore: PendingArchiveRestore,
  expectedState: ArchiveState,
): Promise<ArchiveSafetyHandoffPreparation> {
  let effectiveRestore = restore;
  let checkpoint: ArchiveBackupCheckpoint | undefined;
  let reclassifiedToNormalRestore = false;
  if (restore.recoveryMode === "replace-incompatible-readable-state") {
    const replacement = await exportReplacementSafetyCheckpoint(archive);
    checkpoint = replacement.checkpoint;
    if (replacement.kind === "earned-quotation-missing") {
      effectiveRestore = {
        ...restore,
        safetyHandoff: "state-rescue",
        stateRescueReason: "earned-quotation-missing",
      };
    } else {
      let compatible = true;
      try {
        assertCompatibleStarterArchive(expectedState, checkpoint.state);
      } catch {
        compatible = false;
      }
      if (replacement.kind === "source-art-unavailable" && compatible) {
        throw new ArchiveSafetyReclassificationError({
          ...restore,
          recoveryMode: "repair-corruption",
          safetyBackupOffered: false,
          safetyCheckpointState: null,
          safetyHandoff: "full-backup",
          stateRescueReason: null,
          stateRescueAffectedRecordIds: null,
        });
      }
      const rescueOnly = replacement.kind === "source-art-unavailable";
      effectiveRestore = {
        ...restore,
        recoveryMode: compatible ? null : restore.recoveryMode,
        safetyHandoff: rescueOnly ? "state-rescue" : "full-backup",
        stateRescueReason: rescueOnly ? "source-art-unavailable" : null,
        stateRescueAffectedRecordIds: null,
      };
      reclassifiedToNormalRestore = compatible;
    }
  } else {
    checkpoint = await archive.exportBackupCheckpoint();
  }

  if (!checkpoint) {
    throw new Error(
      "Archive safety preparation did not produce a checkpoint; choose the backup again. No Archive data was changed.",
    );
  }
  const rescueOnly = effectiveRestore.safetyHandoff === "state-rescue";
  if (
    rescueOnly &&
    checkpoint.recoveryReason &&
    checkpoint.recoveryReason.code !== effectiveRestore.stateRescueReason
  ) {
    throw new Error(
      "Archive state rescue evidence does not match its typed reason; choose the backup again. No Archive data was changed.",
    );
  }
  const affectedRecordIds = rescueOnly
    ? (checkpoint.recoveryReason?.affectedRecordIds ??
      checkpoint.state.records
        .filter((record) =>
          effectiveRestore.stateRescueReason === "earned-quotation-missing"
            ? record.lifecycle === "earned" && record.acceptedSaying === null
            : record.lifecycle === "earned",
        )
        .map((record) => record.recordId)
        .sort())
    : [];
  if (rescueOnly && affectedRecordIds.length === 0) {
    throw new Error(
      "Archive state-rescue evidence did not name an affected record; choose the backup again so Badge can create truthful evidence. No Archive data was changed.",
    );
  }
  const rescueNotice =
    effectiveRestore.stateRescueReason === "earned-quotation-missing"
      ? `A state-only rescue evidence file was offered because an earned memory has no sealed quotation (${formatAffectedRecordIds(affectedRecordIds)}). Later words cannot truthfully be assigned to that memory. Keep the file outside Git; it is non-restorable and excludes source art. Confirm replacement only after saving it.`
      : `A state-only rescue evidence file was offered because sealed source art is unavailable (${formatAffectedRecordIds(affectedRecordIds)}). Keep it outside Git; it is non-restorable and excludes source art. Confirm replacement only after saving it.`;
  return {
    bytes: checkpoint.bytes,
    fileName: rescueOnly
      ? "my-badge-archive-rescue-evidence.badgeevidence.json"
      : "my-badge-archive-before-restore.badgearchive",
    mimeType: rescueOnly ? "application/json" : "application/octet-stream",
    notice: rescueOnly
      ? rescueNotice
      : reclassifiedToNormalRestore
        ? "The current Archive changed and is now compatible, so replacement was cancelled. A full safety backup was offered; the next confirmation uses the normal monotonic restore path."
        : "A safety backup was offered for download. Make sure it is saved, then explicitly confirm the restore.",
    restore: {
      ...withSafetyCheckpoint(effectiveRestore, checkpoint.state),
      stateRescueAffectedRecordIds: rescueOnly ? affectedRecordIds : null,
    },
  };
}

function formatAffectedRecordIds(recordIds: readonly string[]): string {
  const label = recordIds.length === 1 ? "affected record ID" : "affected record IDs";
  return `${label}: ${recordIds.join(", ")}`;
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

export async function archiveSourceRepairStates(
  archive: ArchiveApplication,
  incomingState: ArchiveState,
  renderedState: ArchiveState | null,
): Promise<readonly ArchiveState[]> {
  try {
    return [incomingState, await archive.state()];
  } catch {
    return renderedState ? [incomingState, renderedState] : [incomingState];
  }
}

export async function recoverPendingArchive(
  archive: ArchiveApplication,
  restore: PendingArchiveRestore,
  ownerId: string,
  trustedSources: readonly ArchiveSourceAssetInput[],
  sayingDefaults: ArchiveState,
): Promise<ArchiveRecoveryResult> {
  const mode = restore.recoveryMode ?? "repair-corruption";
  const replacingFromStateRescue =
    mode === "replace-incompatible-readable-state" && restore.safetyHandoff === "state-rescue";
  if (replacingFromStateRescue) {
    const refreshed = await preparePendingSafetyHandoff(
      archive,
      { ...restore, safetyBackupOffered: false, safetyCheckpointState: null },
      sayingDefaults,
    );
    const refreshedAffectedIds = refreshed.restore.stateRescueAffectedRecordIds ?? [];
    const savedAffectedIds = restore.stateRescueAffectedRecordIds ?? [];
    if (
      refreshed.restore.safetyHandoff !== "state-rescue" ||
      !refreshed.restore.safetyCheckpointState ||
      !restore.safetyCheckpointState ||
      canonicalJson(refreshed.restore.safetyCheckpointState) !==
        canonicalJson(restore.safetyCheckpointState) ||
      refreshedAffectedIds.length !== savedAffectedIds.length ||
      refreshedAffectedIds.some((recordId, index) => recordId !== savedAffectedIds[index])
    ) {
      throw new ArchiveSafetyHandoffRefreshError(refreshed);
    }
  }
  try {
    return await archive.recoverBackup(restore.bytes, ownerId, trustedSources, {
      mode,
      expectedCurrentState:
        mode === "replace-incompatible-readable-state"
          ? requireSafetyCheckpointState(restore, "replacement")
          : undefined,
      expectedStateRescueReason: replacingFromStateRescue
        ? (restore.stateRescueReason ?? undefined)
        : undefined,
      expectedStateRescueAffectedRecordIds: replacingFromStateRescue
        ? (restore.stateRescueAffectedRecordIds ?? undefined)
        : undefined,
      sayingDefaults,
      catalogueVisualUpgradePlan: createStarterVisualUpgradePlan(sayingDefaults),
    });
  } catch (error) {
    if (!replacingFromStateRescue || !isRecoveryReasonMismatch(error)) throw error;
    const refreshed = await preparePendingSafetyHandoff(
      archive,
      { ...restore, safetyBackupOffered: false, safetyCheckpointState: null },
      sayingDefaults,
    );
    throw new ArchiveSafetyHandoffRefreshError(refreshed);
  }
}

export function restorePendingArchive(
  archive: ArchiveApplication,
  restore: PendingArchiveRestore,
  sayingDefaults: ArchiveState,
): Promise<ArchiveState> {
  return archive.restoreBackup(
    restore.bytes,
    requireSafetyCheckpointState(restore, "restore"),
    sayingDefaults,
    createStarterVisualUpgradePlan(sayingDefaults),
  );
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
  stateRescueReason: ArchiveRecoveryReasonCode | null = null,
): Promise<PendingArchiveRestore> {
  assertArchiveBackupFileSize(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = await parseArchiveBackup(bytes);
  assertCompatibleStarterArchive(expectedState, parsed.state);
  return {
    fileName: file.name,
    bytes,
    exportedAt: parsed.exportedAt,
    incomingState: parsed.state,
    incomingEarnedCount: parsed.state.records.filter((record) => record.lifecycle === "earned").length,
    recoveryMode,
    safetyBackupOffered: false,
    safetyCheckpointState: null,
    safetyHandoff,
    stateRescueReason,
    stateRescueAffectedRecordIds: null,
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
