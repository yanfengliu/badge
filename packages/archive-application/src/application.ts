import type {
  ActivationInput,
  ActivationResult,
  ArchiveLifecycle,
  ArchiveState,
} from "@badge/archive-domain";
import type { SayingResponse } from "@badge/saying-contract";

import { createArchiveBackup, parseArchiveBackup } from "./backup.js";
import {
  applyCatalogueVisualUpgradePlan,
  type ArchiveCatalogueVisualUpgradePlan,
} from "./catalogue-visual-upgrade.js";
import {
  createArchiveRecoveryEvidence,
  type ArchiveRecoveryReason,
  type ArchiveRecoveryReasonCode,
} from "./recovery-evidence.js";
import type { IndexedDbArchiveRepository } from "./repository.js";
import type { ArchiveSourceAssetInput } from "./source-assets.js";
import type {
  ArchiveRecoveryOptions,
  ArchiveRecoveryResult,
  ResolvedArchiveVisual,
} from "./storage-contract.js";

export interface ArchiveApplicationOptions {
  now?: () => string;
}

export interface ArchiveBackupCheckpoint {
  readonly bytes: Uint8Array;
  readonly state: ArchiveState;
  readonly recoveryReason?: ArchiveRecoveryReason;
}

export class ArchiveApplication {
  private readonly now: () => string;

  constructor(
    private readonly repository: IndexedDbArchiveRepository,
    options: ArchiveApplicationOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  initialize(
    seed: ArchiveState,
    sourceAssets: readonly ArchiveSourceAssetInput[] = [],
  ): Promise<ArchiveState> {
    return this.repository.load(seed, sourceAssets);
  }

  initializeSayingDefaults(
    defaultState: ArchiveState,
    expectedCurrentState: ArchiveState,
  ): Promise<ArchiveState> {
    return this.repository.initializeSayingDefaults(defaultState, expectedCurrentState);
  }

  reconcileCatalogue(defaultState: ArchiveState, expectedCurrentState: ArchiveState): Promise<ArchiveState> {
    return this.repository.reconcileCatalogueRecords(defaultState, expectedCurrentState);
  }

  upgradeCatalogueVisuals(
    upgradePlan: ArchiveCatalogueVisualUpgradePlan,
    sourceAssets: readonly ArchiveSourceAssetInput[],
    expectedCurrentState: ArchiveState,
  ): Promise<ArchiveState> {
    return this.repository.upgradeCatalogueVisuals(upgradePlan, sourceAssets, expectedCurrentState);
  }

  state(): Promise<ArchiveState> {
    return this.repository.read();
  }

  async activate(
    input: ActivationInput,
    sourceAsset: ArchiveSourceAssetInput,
    acceptedQuotation: SayingResponse,
    expectedQuotationRevision: string,
  ): Promise<ActivationResult> {
    return this.repository.activate(
      input,
      this.now(),
      sourceAsset,
      acceptedQuotation,
      expectedQuotationRevision,
    );
  }

  visual(recordId: string): Promise<ResolvedArchiveVisual> {
    return this.repository.resolveVisual(recordId);
  }

  async updateQuotation(
    recordId: string,
    quotation: SayingResponse,
    expectedQuotationRevision: string,
  ): Promise<ArchiveState> {
    return this.repository.updateQuotation(recordId, quotation, expectedQuotationRevision);
  }

  updateLifecycle(recordId: string, lifecycle: ArchiveLifecycle): Promise<ArchiveState> {
    return this.repository.updateLifecycle(recordId, lifecycle);
  }

  async exportBackup(): Promise<Uint8Array> {
    return (await this.exportBackupCheckpoint()).bytes;
  }

  async exportBackupCheckpoint(): Promise<ArchiveBackupCheckpoint> {
    const snapshot = await this.repository.backupSnapshot();
    return {
      bytes: await createArchiveBackup(snapshot.state, snapshot.sourceAssets, this.now()),
      state: snapshot.state,
    };
  }

  async exportRecoveryEvidenceCheckpoint(
    reason: ArchiveRecoveryReasonCode,
  ): Promise<ArchiveBackupCheckpoint> {
    const snapshot = await this.repository.recoveryEvidenceSnapshot(reason);
    return {
      bytes: await createArchiveRecoveryEvidence(snapshot.state, this.now(), {
        code: reason,
        affectedRecordIds: [...snapshot.affectedRecordIds],
      }),
      state: snapshot.state,
      recoveryReason: { code: reason, affectedRecordIds: [...snapshot.affectedRecordIds] },
    };
  }

  async restoreBackup(
    bytes: Uint8Array | string,
    expectedCurrentState: ArchiveState,
    sayingDefaults?: ArchiveState,
    catalogueVisualUpgradePlan?: ArchiveCatalogueVisualUpgradePlan,
  ): Promise<ArchiveState> {
    const backup = await parseArchiveBackup(bytes);
    const state = catalogueVisualUpgradePlan
      ? applyCatalogueVisualUpgradePlan(backup.state, catalogueVisualUpgradePlan).state
      : backup.state;
    return this.repository.restore(state, backup.sourceAssets, expectedCurrentState, sayingDefaults);
  }

  async recoverBackup(
    bytes: Uint8Array | string,
    expectedOwnerId: string,
    trustedRepairSourceAssets: readonly ArchiveSourceAssetInput[] = [],
    options: ArchiveRecoveryOptions = {},
  ): Promise<ArchiveRecoveryResult> {
    const backup = await parseArchiveBackup(bytes);
    const state = options.catalogueVisualUpgradePlan
      ? applyCatalogueVisualUpgradePlan(backup.state, options.catalogueVisualUpgradePlan).state
      : backup.state;
    const repositoryOptions = { ...options, catalogueVisualUpgradePlan: undefined };
    return this.repository.recover(
      state,
      backup.sourceAssets,
      trustedRepairSourceAssets,
      this.now(),
      expectedOwnerId,
      repositoryOptions,
    );
  }
}
