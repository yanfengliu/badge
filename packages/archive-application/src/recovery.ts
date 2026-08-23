import { archiveStateSchema, type ArchiveState } from "@badge/archive-domain";
import type { IDBPDatabase } from "idb";

import { ArchivePersistenceError } from "./errors.js";
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

interface EqualityState {
  readonly leftToRight: WeakMap<object, object>;
  readonly rightToLeft: WeakMap<object, object>;
}

function bytesEqual(left: ArrayBufferLike, right: ArrayBufferLike): boolean {
  if (left.byteLength !== right.byteLength) return false;
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  return leftBytes.every((value, index) => value === rightBytes[index]);
}

function isSharedArrayBuffer(value: unknown): value is SharedArrayBuffer {
  return typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function rawValuesEqual(
  left: unknown,
  right: unknown,
  state: EqualityState = {
    leftToRight: new WeakMap(),
    rightToLeft: new WeakMap(),
  },
): Promise<boolean> {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false;

  const priorRight = state.leftToRight.get(left);
  const priorLeft = state.rightToLeft.get(right);
  if (priorRight || priorLeft) return priorRight === right && priorLeft === left;
  state.leftToRight.set(left, right);
  state.rightToLeft.set(right, left);

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      if (key === undefined || key !== rightKeys[index]) return false;
      if (!(await rawValuesEqual(left[key as unknown as number], right[key as unknown as number], state))) {
        return false;
      }
    }
    return true;
  }

  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime());
  }

  if (left instanceof RegExp || right instanceof RegExp) {
    return (
      left instanceof RegExp &&
      right instanceof RegExp &&
      left.source === right.source &&
      left.flags === right.flags &&
      left.lastIndex === right.lastIndex
    );
  }

  if (
    left instanceof ArrayBuffer ||
    right instanceof ArrayBuffer ||
    isSharedArrayBuffer(left) ||
    isSharedArrayBuffer(right)
  ) {
    const leftIsBuffer = left instanceof ArrayBuffer || isSharedArrayBuffer(left);
    const rightIsBuffer = right instanceof ArrayBuffer || isSharedArrayBuffer(right);
    return leftIsBuffer && rightIsBuffer && bytesEqual(left, right);
  }

  if (ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
    if (!ArrayBuffer.isView(left) || !ArrayBuffer.isView(right)) return false;
    return (
      left.byteOffset === right.byteOffset &&
      left.byteLength === right.byteLength &&
      left.buffer.byteLength === right.buffer.byteLength &&
      bytesEqual(left.buffer, right.buffer)
    );
  }

  if (isFile(left) || isFile(right)) {
    if (!isFile(left) || !isFile(right)) return false;
    if (
      left.name !== right.name ||
      left.lastModified !== right.lastModified ||
      left.type !== right.type ||
      left.size !== right.size
    ) {
      return false;
    }
    return bytesEqual(await left.arrayBuffer(), await right.arrayBuffer());
  }

  if (left instanceof Blob || right instanceof Blob) {
    if (!(left instanceof Blob) || !(right instanceof Blob)) return false;
    if (left.type !== right.type || left.size !== right.size) return false;
    return bytesEqual(await left.arrayBuffer(), await right.arrayBuffer());
  }

  if (left instanceof Map || right instanceof Map) {
    if (!(left instanceof Map) || !(right instanceof Map) || left.size !== right.size) return false;
    const leftEntries = [...left.entries()];
    const rightEntries = [...right.entries()];
    for (let index = 0; index < leftEntries.length; index += 1) {
      const leftEntry = leftEntries[index];
      const rightEntry = rightEntries[index];
      if (!leftEntry || !rightEntry) return false;
      if (!(await rawValuesEqual(leftEntry[0], rightEntry[0], state))) return false;
      if (!(await rawValuesEqual(leftEntry[1], rightEntry[1], state))) return false;
    }
    return true;
  }

  if (left instanceof Set || right instanceof Set) {
    if (!(left instanceof Set) || !(right instanceof Set) || left.size !== right.size) return false;
    const leftValues = [...left.values()];
    const rightValues = [...right.values()];
    for (let index = 0; index < leftValues.length; index += 1) {
      if (!(await rawValuesEqual(leftValues[index], rightValues[index], state))) return false;
    }
    return true;
  }

  if (left instanceof Error || right instanceof Error) {
    if (!(left instanceof Error) || !(right instanceof Error)) return false;
    const leftWithCause = left as Error & { cause?: unknown };
    const rightWithCause = right as Error & { cause?: unknown };
    const aggregateErrorsEqual =
      typeof AggregateError === "undefined" ||
      (!(left instanceof AggregateError) && !(right instanceof AggregateError)) ||
      (left instanceof AggregateError &&
        right instanceof AggregateError &&
        (await rawValuesEqual(left.errors, right.errors, state)));
    return (
      left.name === right.name &&
      left.message === right.message &&
      left.stack === right.stack &&
      aggregateErrorsEqual &&
      (await rawValuesEqual(leftWithCause.cause, rightWithCause.cause, state))
    );
  }

  if (
    typeof DOMException !== "undefined" &&
    (left instanceof DOMException || right instanceof DOMException)
  ) {
    return (
      left instanceof DOMException &&
      right instanceof DOMException &&
      left.name === right.name &&
      left.message === right.message &&
      left.code === right.code
    );
  }

  const prototype = Object.getPrototypeOf(left);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  if (leftKeys.length !== rightKeys.length) return false;
  for (let index = 0; index < leftKeys.length; index += 1) {
    const key = leftKeys[index];
    if (key === undefined || key !== rightKeys[index]) return false;
    if (!(await rawValuesEqual(leftRecord[key], rightRecord[key], state))) return false;
  }
  return true;
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
  const parsedCurrent = archiveStateSchema.safeParse(rawState);
  if (parsedCurrent.success) {
    if (parsedCurrent.data.ownerId !== expectedOwnerId) {
      throw new ArchivePersistenceError(
        "BACKUP_OWNER_MISMATCH",
        `Readable Archive state belongs to owner ${parsedCurrent.data.ownerId}, but recovery was opened for ${expectedOwnerId}; choose the matching owner and backup. No Archive data was changed.`,
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
    if (!parsedCurrent.success || !(await rawValuesEqual(parsedCurrent.data, options.expectedCurrentState))) {
      throw new ArchivePersistenceError(
        "RESTORE_CONFLICT",
        "Archive state changed after its safety backup was exported; export a new safety backup and confirm replacement again. No Archive data was changed.",
      );
    }
  }
  const stateMustBeReplaced = !parsedCurrent.success || replaceReadableState;
  const assetsByHash = new Map(incomingAssets.map((asset) => [asset.hash, asset]));
  const requiredHashes = new Set(
    referencedSourceHashes(stateMustBeReplaced ? incomingState : parsedCurrent.data),
  );
  const inspectedHashes = [...requiredHashes].sort();
  const snapshot = new Map<string, unknown>();
  const read = database.transaction(ARCHIVE_OBJECT_STORE, "readonly");
  for (const hash of inspectedHashes) snapshot.set(hash, await read.store.get(hash));
  await read.done;

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
      repairHashes.add(hash);
    }
  }

  if (parsedCurrent.success && !replaceReadableState && repairHashes.size === 0) {
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
        reason: parsedCurrent.success ? "incompatible-readable-state" : "unreadable",
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
            "TRANSACTION_FAILED",
            `Archive recovery stopped because another connection changed source ${hash} after inspection; retry so the newest evidence can be quarantined atomically.`,
          );
        }
      }
    });
    for (const hash of repairHashes) {
      const incoming = assetsByHash.get(hash);
      if (!incoming) {
        const requirement = sourceRequirement(
          hash,
          incomingState,
          parsedCurrent.success ? parsedCurrent.data : undefined,
        );
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
      await stateStore.put(incomingState, ARCHIVE_STATE_KEY);
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
    state: stateMustBeReplaced ? incomingState : parsedCurrent.data,
    stateReplaced: stateMustBeReplaced,
    quarantineKey: firstKey,
    quarantineKeys,
  };
}
