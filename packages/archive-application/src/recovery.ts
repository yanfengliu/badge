import { archiveStateSchema, type ArchiveState } from "@badge/archive-domain";
import type { IDBPDatabase } from "idb";

import { ArchivePersistenceError } from "./errors.js";
import { rawValuesEqual } from "./raw-values-equal.js";
import {
  assertRestorableEarnedSayings,
  hasDurableQuotationRevisions,
  refreshUnearnedQuotationRevisions,
} from "./saying-defaults.js";
import { referencedSourceHashes } from "./source-references.js";
import {
  copySourceAsset,
  sourceAssetsEqual,
  validateStoredSourceAsset,
  type ArchiveSourceAsset,
} from "./source-assets.js";
import {
  ARCHIVE_OBJECT_QUARANTINE_KEY_PREFIX,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_QUARANTINE_KEY_PREFIX,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  archiveSourceQuarantineSchema,
  archiveStateQuarantineSchema,
  type ArchiveDatabase,
  type ArchiveRecoveryOptions,
  type ArchiveRecoveryResult,
} from "./storage-contract.js";

interface RecoverArchiveOptions extends ArchiveRecoveryOptions {
  readonly afterInspection?: () => void | Promise<void>;
}

function rawOwnerId(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null || !("ownerId" in raw)) return undefined;
  return typeof raw.ownerId === "string" ? raw.ownerId : undefined;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function keepTransactionActive<T>(
  transaction: ReturnType<IDBPDatabase<ArchiveDatabase>["transaction"]>,
  operation: () => Promise<T>,
): Promise<T> {
  let active = true;
  const keepAlive = (async () => {
    while (active) await transaction.objectStore(ARCHIVE_STATE_STORE).get(ARCHIVE_STATE_KEY);
  })();
  try {
    return await operation();
  } finally {
    active = false;
    try {
      await keepAlive;
    } catch {
      // The caller preserves the transaction's actionable operation error.
    }
  }
}

function quarantineKey(prefix: string, quarantinedAt: string, subject = ""): string {
  return `${prefix}${subject}${encodeURIComponent(quarantinedAt)}:${crypto.randomUUID()}`;
}

function sourceRequirement(
  hash: string,
  incomingState: ArchiveState,
  currentState: ArchiveState | undefined,
): "an earned record" | "an unearned catalogue record" {
  const records = [...incomingState.records, ...(currentState?.records ?? [])].filter(
    (record) =>
      record.publishedVisual.sourceAssetHash === hash ||
      record.activation?.visualPin.sourceAssetHash === hash,
  );
  return records.some((record) => record.activation?.visualPin.sourceAssetHash === hash)
    ? "an earned record"
    : "an unearned catalogue record";
}

export async function recoverArchive(
  database: IDBPDatabase<ArchiveDatabase>,
  incomingState: ArchiveState,
  incomingAssets: readonly ArchiveSourceAsset[],
  quarantinedAt: string,
  expectedOwnerId: string,
  options: RecoverArchiveOptions = {},
): Promise<ArchiveRecoveryResult> {
  if (incomingState.ownerId !== expectedOwnerId) {
    throw new ArchivePersistenceError(
      "BACKUP_OWNER_MISMATCH",
      `Archive recovery was explicitly opened for owner ${expectedOwnerId}, but the backup belongs to ${incomingState.ownerId}; choose the intended owner's backup. No Archive data was changed.`,
    );
  }

  const rawState = await database.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY);
  if (rawState === undefined) {
    throw new ArchivePersistenceError(
      "STATE_MISSING",
      "Archive state is missing rather than corrupt; initialize it normally before restoring a backup.",
    );
  }
  const parsedCandidate = archiveStateSchema.safeParse(rawState);
  const parsedCurrent =
    parsedCandidate.success && hasDurableQuotationRevisions(rawState) ? parsedCandidate.data : undefined;
  if (parsedCurrent) {
    if (parsedCurrent.ownerId !== expectedOwnerId) {
      throw new ArchivePersistenceError(
        "BACKUP_OWNER_MISMATCH",
        `Readable Archive state belongs to owner ${parsedCurrent.ownerId}, but recovery was opened for ${expectedOwnerId}; choose the matching owner and backup. No Archive data was changed.`,
      );
    }
  } else {
    const evidenceOwnerId = rawOwnerId(rawState);
    if (evidenceOwnerId !== undefined && evidenceOwnerId !== expectedOwnerId) {
      throw new ArchivePersistenceError(
        "BACKUP_OWNER_MISMATCH",
        `Unreadable Archive evidence names owner ${evidenceOwnerId}, but recovery was opened for ${expectedOwnerId}; choose the matching owner and backup. No Archive data was changed.`,
      );
    }
  }

  const replaceReadableState = options.mode === "replace-incompatible-readable-state";
  if (replaceReadableState) {
    if (!options.expectedCurrentState) {
      throw new ArchivePersistenceError(
        "RESTORE_CONFLICT",
        "Readable Archive replacement requires the exact state from a freshly exported safety backup. Export the safety backup and confirm replacement again. No Archive data was changed.",
      );
    }
    if (!parsedCurrent || !(await rawValuesEqual(parsedCurrent, options.expectedCurrentState))) {
      throw new ArchivePersistenceError(
        "RESTORE_CONFLICT",
        "Archive state changed after its safety backup was exported; export a new safety backup and confirm replacement again. No Archive data was changed.",
      );
    }
  }
  if (replaceReadableState && options.expectedStateRescueReason === "earned-quotation-missing") {
    const actualAffectedRecordIds =
      parsedCurrent?.records
        .filter((record) => record.lifecycle === "earned" && record.acceptedSaying === null)
        .map((record) => record.recordId)
        .sort() ?? [];
    const expectedAffectedRecordIds = sortedUnique(options.expectedStateRescueAffectedRecordIds ?? []);
    if (!sameStrings(actualAffectedRecordIds, expectedAffectedRecordIds)) {
      throw new ArchivePersistenceError(
        "RECOVERY_REASON_MISMATCH",
        "The earned-memory quotation gaps no longer match the saved state rescue. Create and save fresh evidence before replacing state. No Archive data was changed.",
      );
    }
  }
  const stateMustBeReplaced = !parsedCurrent || replaceReadableState;
  const replacementState = stateMustBeReplaced
    ? refreshUnearnedQuotationRevisions(incomingState, () => crypto.randomUUID())
    : incomingState;
  if (stateMustBeReplaced) assertRestorableEarnedSayings(replacementState);
  const assetsByHash = new Map(incomingAssets.map((asset) => [asset.hash, asset]));
  const requiredHashes = new Set(
    referencedSourceHashes(stateMustBeReplaced ? replacementState : parsedCurrent),
  );
  const outgoingRescueRecords =
    replaceReadableState && options.expectedStateRescueReason === "source-art-unavailable" && parsedCurrent
      ? parsedCurrent.records.filter((record) => record.activation !== null)
      : [];
  const outgoingRescueHashes = sortedUnique(
    outgoingRescueRecords.map((record) => record.activation!.visualPin.sourceAssetHash),
  );
  const inspectedHashes = [...new Set([...requiredHashes, ...outgoingRescueHashes])].sort();
  const snapshot = new Map<string, unknown>();
  const read = database.transaction(ARCHIVE_OBJECT_STORE, "readonly");
  for (const hash of inspectedHashes) snapshot.set(hash, await read.store.get(hash));
  await read.done;

  if (options.expectedStateRescueReason === "source-art-unavailable") {
    const unavailableHashes = new Set<string>();
    for (const hash of outgoingRescueHashes) {
      const raw = snapshot.get(hash);
      if (raw === undefined) {
        unavailableHashes.add(hash);
        continue;
      }
      try {
        await validateStoredSourceAsset(raw, hash);
      } catch (error) {
        if (!(error instanceof ArchivePersistenceError)) throw error;
        unavailableHashes.add(hash);
      }
    }
    const actualAffectedRecordIds = outgoingRescueRecords
      .filter((record) => unavailableHashes.has(record.activation!.visualPin.sourceAssetHash))
      .map((record) => record.recordId)
      .sort();
    const expectedAffectedRecordIds = sortedUnique(options.expectedStateRescueAffectedRecordIds ?? []);
    if (!sameStrings(actualAffectedRecordIds, expectedAffectedRecordIds)) {
      throw new ArchivePersistenceError(
        "RECOVERY_REASON_MISMATCH",
        "The source-art gaps no longer match the saved state rescue. Create and save a fresh safety handoff before replacing state. No Archive data was changed.",
      );
    }
  }

  const repairHashes = new Set<string>();
  for (const hash of inspectedHashes) {
    const raw = snapshot.get(hash);
    const incoming = assetsByHash.get(hash);
    if (raw === undefined) {
      if (requiredHashes.has(hash)) repairHashes.add(hash);
      continue;
    }
    try {
      const stored = await validateStoredSourceAsset(raw, hash);
      if (incoming && !sourceAssetsEqual(stored, incoming)) repairHashes.add(hash);
    } catch (error) {
      if (!(error instanceof ArchivePersistenceError)) throw error;
      if (requiredHashes.has(hash)) repairHashes.add(hash);
    }
  }

  if (parsedCurrent && !replaceReadableState && repairHashes.size === 0) {
    throw new ArchivePersistenceError(
      "RECOVERY_NOT_REQUIRED",
      "Archive state and every referenced source object are readable; use normal monotonic restore instead of recovery. No Archive data was changed.",
    );
  }

  const stateQuarantineKey = stateMustBeReplaced
    ? quarantineKey(ARCHIVE_QUARANTINE_KEY_PREFIX, quarantinedAt)
    : undefined;
  const sourceQuarantineKeys = new Map(
    [...repairHashes].map((hash) => [
      hash,
      quarantineKey(ARCHIVE_OBJECT_QUARANTINE_KEY_PREFIX, quarantinedAt, `${hash}:`),
    ]),
  );
  const stateEvidence = stateQuarantineKey
    ? archiveStateQuarantineSchema.parse({
        kind: "quarantined-archive-state",
        quarantineVersion: 1,
        quarantinedAt,
        reason: parsedCurrent ? "incompatible-readable-state" : "unreadable",
        raw: rawState,
      })
    : undefined;
  const sourceEvidence = new Map(
    [...repairHashes].map((hash) => {
      const raw = snapshot.get(hash);
      return [
        hash,
        archiveSourceQuarantineSchema.parse({
          kind: "quarantined-archive-source",
          quarantineVersion: 1,
          quarantinedAt,
          sourceHash: hash,
          reason: raw === undefined ? "missing" : "unreadable-or-conflicting",
          raw: raw ?? null,
        }),
      ];
    }),
  );
  await options.afterInspection?.();
  const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
  try {
    const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
    const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
    await keepTransactionActive(transaction, async () => {
      const currentRawState = await stateStore.get(ARCHIVE_STATE_KEY);
      if (!(await rawValuesEqual(currentRawState, rawState))) {
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          "Archive recovery stopped because another connection changed the state after inspection; retry so the newest evidence can be quarantined atomically.",
        );
      }
      for (const hash of inspectedHashes) {
        const currentRawSource = await objectStore.get(hash);
        const snapshotRawSource = snapshot.get(hash);
        if (!(await rawValuesEqual(currentRawSource, snapshotRawSource))) {
          throw new ArchivePersistenceError(
            options.expectedStateRescueReason === "source-art-unavailable"
              ? "RECOVERY_REASON_MISMATCH"
              : "TRANSACTION_FAILED",
            options.expectedStateRescueReason === "source-art-unavailable"
              ? `Archive recovery stopped because source ${hash} changed after state-rescue inspection. Create a fresh safety handoff before replacing state. No Archive data was changed.`
              : `Archive recovery stopped because another connection changed source ${hash} after inspection; retry so the newest evidence can be quarantined atomically.`,
          );
        }
      }
    });
    for (const hash of repairHashes) {
      const incoming = assetsByHash.get(hash);
      if (!incoming) {
        const requirement = sourceRequirement(hash, incomingState, parsedCurrent);
        throw new ArchivePersistenceError(
          "BACKUP_INCOMPLETE",
          `Recovery inputs do not contain source ${hash} required by ${requirement}; choose an intact self-contained backup and retry after trusted current sources finish loading. No Archive data was changed.`,
        );
      }
      const key = sourceQuarantineKeys.get(hash);
      if (!key) throw new Error(`Missing quarantine key for ${hash}`);
      const evidence = sourceEvidence.get(hash);
      if (!evidence) throw new Error(`Missing quarantine evidence for ${hash}`);
      await objectStore.put(evidence, key);
      await objectStore.put(copySourceAsset(incoming), hash);
    }
    if (stateQuarantineKey && stateEvidence) {
      await stateStore.put(stateEvidence, stateQuarantineKey);
      await stateStore.put(replacementState, ARCHIVE_STATE_KEY);
    }
    await transaction.done;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The browser may already have completed or aborted the transaction.
    }
    try {
      await transaction.done;
    } catch {
      // Preserve the actionable recovery error above.
    }
    throw error;
  }

  const quarantineKeys = [
    ...(stateQuarantineKey ? [stateQuarantineKey] : []),
    ...[...sourceQuarantineKeys.values()],
  ];
  const firstKey = quarantineKeys[0];
  if (!firstKey) throw new Error("Recovery completed without quarantine evidence");
  return {
    state: stateMustBeReplaced ? replacementState : parsedCurrent!,
    stateReplaced: stateMustBeReplaced,
    quarantineKey: firstKey,
    quarantineKeys,
  };
}
