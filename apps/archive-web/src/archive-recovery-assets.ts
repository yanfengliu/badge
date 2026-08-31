import type {
  ArchiveApplication,
  ArchiveRecoveryResult,
  ArchiveSourceAssetInput,
} from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";

import { loadCatalogueRepairAssets } from "./catalogue-source-assets.js";
import {
  archiveSourceRepairStates,
  recoverPendingArchive,
  type PendingArchiveRestore,
} from "./restore-flow.js";
import { loadLegacyStarterRepairAssets, loadStarterSourceAssets } from "./starter-assets.js";

interface ArchiveRecoveryDependencies {
  readonly loadCatalogue: typeof loadCatalogueRepairAssets;
  readonly loadCurrent: typeof loadStarterSourceAssets;
  readonly loadLegacy: typeof loadLegacyStarterRepairAssets;
  readonly recover: typeof recoverPendingArchive;
}

const defaultDependencies: ArchiveRecoveryDependencies = {
  loadCatalogue: loadCatalogueRepairAssets,
  loadCurrent: loadStarterSourceAssets,
  loadLegacy: loadLegacyStarterRepairAssets,
  recover: recoverPendingArchive,
};

export interface ArchiveRecoveryWithAssetsResult {
  readonly assets: Map<string, ArchiveSourceAssetInput>;
  readonly recovered: ArchiveRecoveryResult;
}

export async function recoverArchiveWithSourceRepair(
  archive: ArchiveApplication,
  restore: PendingArchiveRestore,
  ownerId: string,
  sayingDefaults: ArchiveState,
  renderedState: ArchiveState | null,
  retainedAssets: ReadonlyMap<string, ArchiveSourceAssetInput>,
  dependencies: ArchiveRecoveryDependencies = defaultDependencies,
): Promise<ArchiveRecoveryWithAssetsResult> {
  const repairStates = await archiveSourceRepairStates(archive, restore.incomingState, renderedState);
  const assets = new Map(retainedAssets);
  for (const batch of [
    await dependencies.loadCurrent(),
    await dependencies.loadLegacy(repairStates),
    await dependencies.loadCatalogue(repairStates),
  ]) {
    for (const asset of batch) assets.set(asset.hash, asset);
  }
  const recovered = await dependencies.recover(
    archive,
    restore,
    ownerId,
    [...assets.values()],
    sayingDefaults,
  );
  return { assets, recovered };
}
