import type {
  ActivationInput,
  ActivationResult,
  ArchiveLifecycle,
  ArchiveState,
} from "@badge/archive-domain";

import { createArchiveBackup, createArchiveRecoveryEvidence, parseArchiveBackup } from "./backup.js";
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

  state(): Promise<ArchiveState> {
    return this.repository.read();
  }

  activate(input: ActivationInput, sourceAsset: ArchiveSourceAssetInput): Promise<ActivationResult> {
    return this.repository.activate(input, this.now(), sourceAsset);
  }

  visual(recordId: string): Promise<ResolvedArchiveVisual> {
    return this.repository.resolveVisual(recordId);
  }

  updateSaying(recordId: string, saying: string): Promise<ArchiveState> {
    return this.repository.updateSaying(recordId, saying);
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

  async exportRecoveryEvidenceCheckpoint(): Promise<ArchiveBackupCheckpoint> {
    const state = await this.repository.read();
    return { bytes: await createArchiveRecoveryEvidence(state, this.now()), state };
  }

  async restoreBackup(
    bytes: Uint8Array | string,
    expectedCurrentState?: ArchiveState,
  ): Promise<ArchiveState> {
    const backup = await parseArchiveBackup(bytes);
    return this.repository.restore(backup.state, backup.sourceAssets, expectedCurrentState);
  }

  async recoverBackup(
    bytes: Uint8Array | string,
    expectedOwnerId: string,
    trustedRepairSourceAssets: readonly ArchiveSourceAssetInput[] = [],
    options: ArchiveRecoveryOptions = {},
  ): Promise<ArchiveRecoveryResult> {
    const backup = await parseArchiveBackup(bytes);
    return this.repository.recover(
      backup.state,
      backup.sourceAssets,
      trustedRepairSourceAssets,
      this.now(),
      expectedOwnerId,
      options,
    );
  }
}
