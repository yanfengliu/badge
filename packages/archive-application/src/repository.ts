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
import type { IDBPDatabase } from "idb";
import { canonicalJson } from "@badge/pack-contract";
import { formatSayingForArchive, type SayingResponse } from "@badge/saying-contract";

import { abortQuietly, openArchiveDatabase, parseStoredState } from "./archive-database.js";
import { ArchivePersistenceError } from "./errors.js";
import { TrustedQuotationAdmission, type TrustedQuotationRequests } from "./quotation-admission.js";
import { recoverArchive } from "./recovery.js";
import { inspectRecoveryEvidenceSnapshot } from "./recovery-evidence-snapshot.js";
import type { ArchiveRecoveryReasonCode } from "./recovery-evidence.js";
import {
  assertCompatibleRepositorySource,
  mergeRepositorySourceAssets,
  validateRepositorySourceAssets,
} from "./repository-source-assets.js";
import {
  applyMissingSayingDefaults,
  assertRestorableEarnedSayings,
  prepareQuotationRevisionsForRestore,
} from "./saying-defaults.js";
import { assertMonotonicArchiveRestore } from "./restore-policy.js";
import { earnedSourceHashes, referencedSourceHashes } from "./source-references.js";
import {
  copySourceAsset,
  validateSourceAsset,
  validateStoredSourceAsset,
  type ArchiveSourceAsset,
  type ArchiveSourceAssetInput,
} from "./source-assets.js";
import {
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
  trustedQuotationRequests?: TrustedQuotationRequests;
}

interface Mutation<T> {
  state: ArchiveState;
  result: T;
}

export class IndexedDbArchiveRepository {
  private connection: IDBPDatabase<ArchiveDatabase> | undefined;
  private opening: Promise<IDBPDatabase<ArchiveDatabase>> | undefined;
  private lifecycleRevision = 0;
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly quotationAdmission: TrustedQuotationAdmission;

  constructor(private readonly options: IndexedDbArchiveRepositoryOptions = {}) {
    this.quotationAdmission = new TrustedQuotationAdmission(options.trustedQuotationRequests);
  }

  private createOpeningAttempt(): Promise<IDBPDatabase<ArchiveDatabase>> {
    return openArchiveDatabase((database) => {
      if (this.connection === database) this.connection = undefined;
    });
  }

  private async database(): Promise<IDBPDatabase<ArchiveDatabase>> {
    if (this.connection) return this.connection;
    if (this.opening) return this.opening;
    const openingRevision = this.lifecycleRevision;
    const request = this.createOpeningAttempt();
    const attempt = request.then((database) => {
      if (this.lifecycleRevision !== openingRevision) {
        database.close();
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          "Archive storage finished opening after this repository was closed. The pending version upgrade may have completed, but the requested Archive record action did not run; retry with the active Archive window.",
        );
      }
      this.connection = database;
      return database;
    });
    this.opening = attempt;
    void attempt.then(
      () => {
        if (this.opening === attempt) this.opening = undefined;
      },
      () => {
        if (this.opening === attempt) this.opening = undefined;
      },
    );
    return attempt;
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
    const validatedAssets = await validateRepositorySourceAssets(sourceAssets);
    return this.enqueueWrite(async () => {
      const database = await this.database();
      const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
      try {
        const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
        const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
        const existing = await stateStore.get(ARCHIVE_STATE_KEY);
        const state = existing === undefined ? validatedSeed : parseStoredState(existing);
        if (existing === undefined) {
          await stateStore.put(state, ARCHIVE_STATE_KEY);
        }
        const referenced = new Set(referencedSourceHashes(state));
        for (const asset of validatedAssets.filter((candidate) => referenced.has(candidate.hash))) {
          const stored = await objectStore.get(asset.hash);
          if (stored === undefined) await objectStore.put(copySourceAsset(asset), asset.hash);
          else assertCompatibleRepositorySource(stored, asset);
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

  async initializeSayingDefaults(
    defaultState: ArchiveState,
    expectedCurrentState: ArchiveState,
  ): Promise<ArchiveState> {
    const defaults = archiveStateSchema.parse(defaultState);
    const expected = archiveStateSchema.parse(expectedCurrentState);
    this.quotationAdmission.assertDefaults(defaults);
    return this.enqueueWrite(async () => {
      const database = await this.database();
      const transaction = database.transaction(ARCHIVE_STATE_STORE, "readwrite");
      try {
        const current = parseStoredState(await transaction.store.get(ARCHIVE_STATE_KEY));
        if (canonicalJson(current) !== canonicalJson(expected)) {
          throw new ArchivePersistenceError(
            "INITIALIZATION_CONFLICT",
            "Archive state changed after its quotation defaults were reviewed; reload Badge before trying again. No Archive data was changed.",
          );
        }

        const initialized = applyMissingSayingDefaults(
          current,
          defaults,
          () => crypto.randomUUID(),
          (record) => this.quotationAdmission.assertRecordBound(record),
        );
        if (canonicalJson(initialized) !== canonicalJson(current)) {
          await transaction.store.put(initialized, ARCHIVE_STATE_KEY);
        }
        await transaction.done;
        return initialized;
      } catch (error) {
        await abortQuietly(transaction);
        if (error instanceof ArchivePersistenceError) throw error;
        throw new ArchivePersistenceError(
          "TRANSACTION_FAILED",
          "Archive quotation-default initialization failed; existing quotations and records were preserved. Reload Badge and try again.",
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

  async recoveryEvidenceSnapshot(reason: ArchiveRecoveryReasonCode) {
    await this.writeQueue;
    return inspectRecoveryEvidenceSnapshot(await this.database(), reason);
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
    acceptedQuotation: SayingResponse,
    expectedQuotationRevision: string,
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
        const record = state.records.find((candidate) => candidate.recordId === input.recordId);
        const acceptedSaying = record
          ? formatSayingForArchive(this.quotationAdmission.validate(record, acceptedQuotation))
          : null;
        if (
          record &&
          (record.acceptedSaying !== acceptedSaying || record.quotationRevision !== expectedQuotationRevision)
        ) {
          throw new ArchivePersistenceError(
            "SAYING_CONFLICT",
            `The source-checked quotation for ${record.title} changed after activation opened; reopen the badge and review the current quote. No Archive data was changed.`,
          );
        }
        result = activateAchievement(state, input, activatedAt);
        const existingSource = await objectStore.get(sourceAsset.hash);
        if (existingSource === undefined) {
          await objectStore.put(copySourceAsset(sourceAsset), sourceAsset.hash);
        } else {
          assertCompatibleRepositorySource(existingSource, sourceAsset);
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

  updateQuotation(
    recordId: string,
    quotation: SayingResponse,
    expectedQuotationRevision: string,
  ): Promise<ArchiveState> {
    return this.enqueueMutation("saying", (state) => {
      const record = state.records.find((candidate) => candidate.recordId === recordId);
      const saying = record
        ? formatSayingForArchive(this.quotationAdmission.validate(record, quotation))
        : null;
      if (record && record.quotationRevision !== expectedQuotationRevision) {
        throw new ArchivePersistenceError(
          "SAYING_CONFLICT",
          `The accepted quotation for ${record.title} changed while another selection was pending; review the current quote before regenerating again. No Archive data was changed.`,
        );
      }
      const result = updateAcceptedSaying(state, recordId, saying ?? "", crypto.randomUUID());
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
    expectedCurrentState: ArchiveState,
    sayingDefaults?: ArchiveState,
  ): Promise<ArchiveState> {
    const parsedIncoming = archiveStateSchema.parse(incomingState);
    if (sayingDefaults) this.quotationAdmission.assertDefaults(sayingDefaults);
    const state = sayingDefaults
      ? applyMissingSayingDefaults(
          parsedIncoming,
          archiveStateSchema.parse(sayingDefaults),
          () => crypto.randomUUID(),
          (record) => this.quotationAdmission.assertRecordBound(record),
        )
      : parsedIncoming;
    assertRestorableEarnedSayings(state);
    const expected = archiveStateSchema.parse(expectedCurrentState);
    const sourceAssets = await validateRepositorySourceAssets(incomingSourceAssets, state);
    return this.enqueueWrite(async () => {
      const database = await this.database();
      const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
      try {
        const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
        const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
        const current = parseStoredState(await stateStore.get(ARCHIVE_STATE_KEY));
        if (canonicalJson(current) !== canonicalJson(expected)) {
          throw new ArchivePersistenceError(
            "RESTORE_CONFLICT",
            "Archive state changed after its safety backup was exported; export a new safety backup and confirm the restore again. No Archive data was changed.",
          );
        }
        const restoredState = prepareQuotationRevisionsForRestore(current, state, () => crypto.randomUUID());
        assertMonotonicArchiveRestore(current, restoredState);
        for (const asset of sourceAssets) {
          const existing = await objectStore.get(asset.hash);
          if (existing === undefined) await objectStore.put(copySourceAsset(asset), asset.hash);
          else assertCompatibleRepositorySource(existing, asset);
        }
        await stateStore.put(restoredState, ARCHIVE_STATE_KEY);
        await transaction.done;
        return restoredState;
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
    const parsedIncoming = archiveStateSchema.parse(incomingState);
    if (options.sayingDefaults) this.quotationAdmission.assertDefaults(options.sayingDefaults);
    const defaults = options.sayingDefaults ? archiveStateSchema.parse(options.sayingDefaults) : undefined;
    const state = defaults
      ? applyMissingSayingDefaults(
          parsedIncoming,
          defaults,
          () => crypto.randomUUID(),
          (record) => this.quotationAdmission.assertRecordBound(record),
        )
      : parsedIncoming;
    const backupAssets = await validateRepositorySourceAssets(incomingSourceAssets, state);
    const trustedRepairAssets = await validateRepositorySourceAssets(trustedRepairSourceAssets);
    const sourceAssets = mergeRepositorySourceAssets(backupAssets, trustedRepairAssets);
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
          sayingDefaults: undefined,
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
    this.lifecycleRevision += 1;
    this.connection?.close();
    this.connection = undefined;
  }
}
