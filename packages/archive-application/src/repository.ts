import {
  ArchiveDomainError,
  activateAchievement,
  archiveStateSchema,
  exactVisualPinSchema,
  setRecordLifecycle,
  updateAcceptedSaying,
  type ActivationInput,
  type ActivationResult,
  type ArchiveLifecycle,
  type ArchiveState,
} from "@badge/archive-domain";
import { openDB, type IDBPDatabase } from "idb";
import { canonicalJson } from "@badge/pack-contract";

import { ArchivePersistenceError } from "./errors.js";
import { recoverArchive } from "./recovery.js";
import { assertMonotonicArchiveRestore } from "./restore-policy.js";
import { earnedSourceHashes, referencedSourceHashes } from "./source-references.js";
import {
  copySourceAsset,
  parseSourceAssetShape,
  preflightSourceAssetInputs,
  sourceAssetsEqual,
  validateSourceAsset,
  validateStoredSourceAsset,
  type ArchiveSourceAsset,
  type ArchiveSourceAssetInput,
} from "./source-assets.js";
import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  type ArchiveBackupSnapshot,
  type ArchiveDatabase,
  type ArchiveRecoveryOptions,
  type ArchiveRecoveryResult,
  type ResolvedArchiveVisual,
} from "./storage-contract.js";

export type ArchiveRepositoryTransactionStage = "activation:written" | "activation:committed";
export type ArchiveRepositoryRecoveryStage = "recovery:inspected";

export interface IndexedDbArchiveRepositoryOptions {
  onTransactionStage?: (stage: ArchiveRepositoryTransactionStage) => void;
  onObserverError?: (error: unknown, stage: ArchiveRepositoryTransactionStage) => void;
  onRecoveryStage?: (stage: ArchiveRepositoryRecoveryStage) => void | Promise<void>;
}

interface Mutation<T> {
  state: ArchiveState;
  result: T;
}

function parseStoredState(untrusted: unknown): ArchiveState {
  if (untrusted === undefined) {
    throw new ArchivePersistenceError(
      "STATE_MISSING",
      "Archive state is missing; initialize the archive with a validated seed before continuing.",
    );
  }
  const parsed = archiveStateSchema.safeParse(untrusted);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ArchivePersistenceError(
      "STATE_UNREADABLE",
      `Archive state is unreadable at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "validation failed"}. The stored row was preserved and automatic writes were stopped; use explicit backup recovery to quarantine and replace it.`,
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

async function abortQuietly(transaction: { abort(): void; readonly done: Promise<unknown> }): Promise<void> {
  try {
    transaction.abort();
  } catch {
    // The browser may already have completed or aborted the transaction.
  }
  try {
    await transaction.done;
  } catch {
    // Preserve the original operation error.
  }
}

async function validateSourceAssets(
  inputs: readonly ArchiveSourceAssetInput[],
  state?: ArchiveState,
): Promise<ArchiveSourceAsset[]> {
  const preflightedInputs = preflightSourceAssetInputs(inputs, {
    code: "VISUAL_SOURCE_INVALID",
    subject: "Archive input",
    guidance: "No image was decoded or hashed and no Archive data was changed.",
  });
  const assets: ArchiveSourceAsset[] = [];
  for (const input of preflightedInputs) {
    const asset = await validateSourceAsset(input);
    if (assets.some((candidate) => candidate.hash === asset.hash)) {
      throw new ArchivePersistenceError(
        "VISUAL_SOURCE_CONFLICT",
        `Archive source ${asset.hash} appears more than once; provide one immutable object per hash.`,
      );
    }
    assets.push(asset);
  }
  if (state) {
    const supplied = new Set(assets.map((asset) => asset.hash));
    const missing = earnedSourceHashes(state).find((hash) => !supplied.has(hash));
    if (missing) {
      throw new ArchivePersistenceError(
        "BACKUP_INCOMPLETE",
        `Restore data is missing source ${missing} required by an earned record; choose an intact self-contained .badgearchive file. No Archive data was changed.`,
      );
    }
  }
  return assets;
}

function mergeSourceAssets(
  backupAssets: readonly ArchiveSourceAsset[],
  trustedRepairAssets: readonly ArchiveSourceAsset[],
): ArchiveSourceAsset[] {
  const merged = new Map<string, ArchiveSourceAsset>();
  for (const asset of [...backupAssets, ...trustedRepairAssets]) {
    const existing = merged.get(asset.hash);
    if (existing && !sourceAssetsEqual(existing, asset)) {
      throw new ArchivePersistenceError(
        "VISUAL_SOURCE_CONFLICT",
        `Recovery inputs disagree about immutable source ${asset.hash}; choose one intact backup and retry after the current trusted sources finish loading. No Archive data was changed.`,
      );
    }
    merged.set(asset.hash, asset);
  }
  return [...merged.values()].sort((left, right) => left.hash.localeCompare(right.hash));
}

function assertCompatibleStoredSource(untrusted: unknown, asset: ArchiveSourceAsset): void {
  const existing = parseSourceAssetShape(untrusted, asset.hash);
  if (!sourceAssetsEqual(existing, asset)) {
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_CONFLICT",
      `Archive source ${asset.hash} already exists with different MIME metadata or bytes; the existing row was preserved. Restore from a backup that matches this Archive.`,
    );
  }
}

export class IndexedDbArchiveRepository {
  private connection: IDBPDatabase<ArchiveDatabase> | undefined;
  private opening: Promise<IDBPDatabase<ArchiveDatabase>> | undefined;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly options: IndexedDbArchiveRepositoryOptions = {}) {}

  private createOpeningAttempt(): Promise<IDBPDatabase<ArchiveDatabase>> {
    let abandonedBecauseBlocked = false;
    let openedConnection: IDBPDatabase<ArchiveDatabase> | undefined;
    let rejectBlocked!: (error: ArchivePersistenceError) => void;
    const blocked = new Promise<never>((_resolve, reject) => {
      rejectBlocked = reject;
    });
    const request = openDB<ArchiveDatabase>(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1 && !database.objectStoreNames.contains(ARCHIVE_STATE_STORE)) {
          database.createObjectStore(ARCHIVE_STATE_STORE);
        }
        if (oldVersion < 2 && !database.objectStoreNames.contains(ARCHIVE_OBJECT_STORE)) {
          database.createObjectStore(ARCHIVE_OBJECT_STORE);
        }
      },
      blocked(currentVersion, requestedVersion) {
        abandonedBecauseBlocked = true;
        rejectBlocked(
          new ArchivePersistenceError(
            "DATABASE_BLOCKED",
            `Archive storage version ${requestedVersion ?? ARCHIVE_DATABASE_VERSION} cannot open because another Badge Archive tab or older connection is holding version ${currentVersion}. Close the other Archive tab or window, then retry. No Archive data was changed.`,
          ),
        );
      },
      blocking: () => {
        openedConnection?.close();
        if (this.connection === openedConnection) this.connection = undefined;
      },
      terminated: () => {
        if (this.connection === openedConnection) this.connection = undefined;
      },
    });
    void request.then(
      (database) => {
        openedConnection = database;
        if (abandonedBecauseBlocked) database.close();
      },
      () => undefined,
    );
    return Promise.race([request, blocked]);
  }

  private async database(): Promise<IDBPDatabase<ArchiveDatabase>> {
    if (this.connection) return this.connection;
    if (this.opening) return this.opening;
    const attempt = this.createOpeningAttempt();
    this.opening = attempt;
    try {
      const database = await attempt;
      if (this.opening !== attempt) {
        database.close();
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          "Archive storage finished opening after this repository was closed; retry the action with the active Archive window. No Archive data was changed.",
        );
      }
      this.connection = database;
      this.opening = undefined;
      return database;
    } catch (error) {
      if (this.opening === attempt) this.opening = undefined;
      throw error;
    }
  }

  private enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(operation, operation);
    this.writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async load(
    seed: ArchiveState,
    sourceAssets: readonly ArchiveSourceAssetInput[] = [],
  ): Promise<ArchiveState> {
    const validatedSeed = archiveStateSchema.parse(seed);
    const validatedAssets = await validateSourceAssets(sourceAssets);
    return this.enqueueWrite(async () => {
      const database = await this.database();
      const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
      try {
        const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
        const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
        const existing = await stateStore.get(ARCHIVE_STATE_KEY);
        const state = existing === undefined ? validatedSeed : parseStoredState(existing);
        if (existing === undefined) await stateStore.put(state, ARCHIVE_STATE_KEY);
        const referenced = new Set(referencedSourceHashes(state));
        for (const asset of validatedAssets.filter((candidate) => referenced.has(candidate.hash))) {
          const stored = await objectStore.get(asset.hash);
          if (stored === undefined) await objectStore.put(copySourceAsset(asset), asset.hash);
          else assertCompatibleStoredSource(stored, asset);
        }
        await transaction.done;
        return state;
      } catch (error) {
        await abortQuietly(transaction);
        if (error instanceof ArchivePersistenceError) throw error;
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          "Archive initialization failed; existing state and source rows were preserved. Retry or export diagnostics.",
          { cause: error },
        );
      }
    });
  }

  async read(): Promise<ArchiveState> {
    await this.writeQueue;
    const database = await this.database();
    return parseStoredState(await database.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY));
  }

  async resolveVisual(recordId: string): Promise<ResolvedArchiveVisual> {
    await this.writeQueue;
    const database = await this.database();
    const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readonly");
    const state = parseStoredState(await transaction.objectStore(ARCHIVE_STATE_STORE).get(ARCHIVE_STATE_KEY));
    const record = state.records.find((candidate) => candidate.recordId === recordId);
    if (!record) {
      await transaction.done;
      throw new ArchivePersistenceError(
        "VISUAL_SOURCE_MISSING",
        `Archive record ${recordId} was not found; reload the collection before resolving its visual.`,
      );
    }
    const pin = exactVisualPinSchema.parse(record.activation?.visualPin ?? record.publishedVisual);
    const stored = await transaction.objectStore(ARCHIVE_OBJECT_STORE).get(pin.sourceAssetHash);
    await transaction.done;
    if (stored === undefined) {
      throw new ArchivePersistenceError(
        "VISUAL_SOURCE_MISSING",
        `Archive source ${pin.sourceAssetHash} for record ${recordId} is missing; restore an intact .badgearchive backup or reinstall the exact admitted pack.`,
      );
    }
    return {
      recordId,
      pin,
      sourceAsset: await validateStoredSourceAsset(stored, pin.sourceAssetHash),
    };
  }

  async backupSnapshot(): Promise<ArchiveBackupSnapshot> {
    await this.writeQueue;
    const database = await this.database();
    const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readonly");
    const state = parseStoredState(await transaction.objectStore(ARCHIVE_STATE_STORE).get(ARCHIVE_STATE_KEY));
    const hashes = earnedSourceHashes(state);
    const rows = await Promise.all(
      hashes.map((hash) => transaction.objectStore(ARCHIVE_OBJECT_STORE).get(hash)),
    );
    await transaction.done;
    const sourceAssets: ArchiveSourceAsset[] = [];
    for (let index = 0; index < hashes.length; index += 1) {
      const hash = hashes[index];
      const row = rows[index];
      if (row === undefined) {
        throw new ArchivePersistenceError(
          "VISUAL_SOURCE_MISSING",
          `Archive source ${hash} required by an earned record is missing; the backup was not created. Reinstall the exact pack or restore an intact backup first.`,
        );
      }
      sourceAssets.push(await validateStoredSourceAsset(row, hash));
    }
    return { state, sourceAssets };
  }

  private enqueueMutation<T>(
    operationName: "lifecycle" | "saying",
    transition: (state: ArchiveState) => Mutation<T>,
  ): Promise<T> {
    return this.enqueueWrite(async () => {
      const database = await this.database();
      const transaction = database.transaction(ARCHIVE_STATE_STORE, "readwrite");
      try {
        const state = parseStoredState(await transaction.store.get(ARCHIVE_STATE_KEY));
        const mutation = transition(state);
        await transaction.store.put(archiveStateSchema.parse(mutation.state), ARCHIVE_STATE_KEY);
        await transaction.done;
        return mutation.result;
      } catch (error) {
        await abortQuietly(transaction);
        if (error instanceof ArchiveDomainError || error instanceof ArchivePersistenceError) throw error;
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          `Archive ${operationName} transaction failed; no partial state was kept. Retry the action.`,
          { cause: error },
        );
      }
    });
  }

  async activate(
    input: ActivationInput,
    activatedAt: string,
    sourceAssetInput: ArchiveSourceAssetInput,
  ): Promise<ActivationResult> {
    const sourceAsset = await validateSourceAsset(sourceAssetInput, input.visualPin.sourceAssetHash);
    return this.enqueueWrite(async () => {
      const database = await this.database();
      const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
      let result: ActivationResult;
      try {
        const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
        const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
        const state = parseStoredState(await stateStore.get(ARCHIVE_STATE_KEY));
        result = activateAchievement(state, input, activatedAt);
        const existingSource = await objectStore.get(sourceAsset.hash);
        if (existingSource === undefined) {
          await objectStore.put(copySourceAsset(sourceAsset), sourceAsset.hash);
        } else {
          assertCompatibleStoredSource(existingSource, sourceAsset);
        }
        await stateStore.put(archiveStateSchema.parse(result.state), ARCHIVE_STATE_KEY);
        this.options.onTransactionStage?.("activation:written");
        await transaction.done;
      } catch (error) {
        await abortQuietly(transaction);
        if (error instanceof ArchiveDomainError || error instanceof ArchivePersistenceError) throw error;
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          "Archive activation transaction failed; neither earned state nor source bytes were kept. Retry the action.",
          { cause: error },
        );
      }
      try {
        this.options.onTransactionStage?.("activation:committed");
      } catch (error) {
        try {
          this.options.onObserverError?.(error, "activation:committed");
        } catch {
          // A diagnostic observer cannot turn a durable commit into an apparent failure.
        }
      }
      return result;
    });
  }

  updateSaying(recordId: string, saying: string): Promise<ArchiveState> {
    return this.enqueueMutation("saying", (state) => {
      const result = updateAcceptedSaying(state, recordId, saying);
      return { state: result, result };
    });
  }

  updateLifecycle(recordId: string, lifecycle: ArchiveLifecycle): Promise<ArchiveState> {
    return this.enqueueMutation("lifecycle", (state) => {
      const result = setRecordLifecycle(state, recordId, lifecycle);
      return { state: result, result };
    });
  }

  async restore(
    incomingState: ArchiveState,
    incomingSourceAssets: readonly ArchiveSourceAssetInput[],
    expectedCurrentState?: ArchiveState,
  ): Promise<ArchiveState> {
    const state = archiveStateSchema.parse(incomingState);
    const expected = expectedCurrentState ? archiveStateSchema.parse(expectedCurrentState) : undefined;
    const sourceAssets = await validateSourceAssets(incomingSourceAssets, state);
    return this.enqueueWrite(async () => {
      const database = await this.database();
      const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
      try {
        const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
        const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
        const current = parseStoredState(await stateStore.get(ARCHIVE_STATE_KEY));
        if (expected && canonicalJson(current) !== canonicalJson(expected)) {
          throw new ArchivePersistenceError(
            "RESTORE_CONFLICT",
            "Archive state changed after its safety backup was exported; export a new safety backup and confirm the restore again. No Archive data was changed.",
          );
        }
        assertMonotonicArchiveRestore(current, state);
        for (const asset of sourceAssets) {
          const existing = await objectStore.get(asset.hash);
          if (existing === undefined) await objectStore.put(copySourceAsset(asset), asset.hash);
          else assertCompatibleStoredSource(existing, asset);
        }
        await stateStore.put(state, ARCHIVE_STATE_KEY);
        await transaction.done;
        return state;
      } catch (error) {
        await abortQuietly(transaction);
        if (error instanceof ArchivePersistenceError) throw error;
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          "Archive restore transaction failed; current state and source objects were preserved. Retry with an intact matching backup.",
          { cause: error },
        );
      }
    });
  }

  async recover(
    incomingState: ArchiveState,
    incomingSourceAssets: readonly ArchiveSourceAssetInput[],
    trustedRepairSourceAssets: readonly ArchiveSourceAssetInput[],
    quarantinedAt: string,
    expectedOwnerId: string,
    options: ArchiveRecoveryOptions = {},
  ): Promise<ArchiveRecoveryResult> {
    const state = archiveStateSchema.parse(incomingState);
    const backupAssets = await validateSourceAssets(incomingSourceAssets, state);
    const trustedRepairAssets = await validateSourceAssets(trustedRepairSourceAssets);
    const sourceAssets = mergeSourceAssets(backupAssets, trustedRepairAssets);
    const recoveryOptions = {
      ...options,
      expectedCurrentState: options.expectedCurrentState
        ? archiveStateSchema.parse(options.expectedCurrentState)
        : undefined,
    };
    return this.enqueueWrite(async () => {
      const database = await this.database();
      try {
        return await recoverArchive(database, state, sourceAssets, quarantinedAt, expectedOwnerId, {
          ...recoveryOptions,
          afterInspection: () => this.options.onRecoveryStage?.("recovery:inspected"),
        });
      } catch (error) {
        if (error instanceof ArchivePersistenceError) throw error;
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          "Archive corrupt-state recovery failed; the unreadable row was left in place and no replacement was committed. Retry with an intact matching backup.",
          { cause: error },
        );
      }
    });
  }

  close(): void {
    this.connection?.close();
    this.connection = undefined;
    this.opening = undefined;
  }
}
