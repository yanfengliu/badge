import { archiveStateSchema, type ArchiveState } from "@badge/archive-domain";
import { canonicalJson } from "@badge/pack-contract";
import type { IDBPDatabase } from "idb";

import { abortQuietly, parseStoredState } from "./archive-database.js";
import {
  applyCatalogueVisualUpgradePlan,
  validateCatalogueVisualUpgradePlan,
  type ArchiveCatalogueVisualUpgradePlan,
} from "./catalogue-visual-upgrade.js";
import { ArchivePersistenceError } from "./errors.js";
import {
  assertCompatibleRepositorySource,
  validateRepositorySourceAssets,
} from "./repository-source-assets.js";
import { copySourceAsset, type ArchiveSourceAsset, type ArchiveSourceAssetInput } from "./source-assets.js";
import {
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  type ArchiveDatabase,
} from "./storage-contract.js";

export interface PreparedCatalogueVisualUpgrade {
  readonly plan: ArchiveCatalogueVisualUpgradePlan;
  readonly assetsByHash: ReadonlyMap<string, ArchiveSourceAsset>;
  readonly expected: ArchiveState;
}

export async function prepareCatalogueVisualUpgrade(
  upgradePlan: ArchiveCatalogueVisualUpgradePlan,
  sourceAssets: readonly ArchiveSourceAssetInput[],
  expectedCurrentState: ArchiveState,
): Promise<PreparedCatalogueVisualUpgrade> {
  const plan = validateCatalogueVisualUpgradePlan(upgradePlan);
  const assets = await validateRepositorySourceAssets(sourceAssets);
  return {
    plan,
    assetsByHash: new Map(assets.map((asset) => [asset.hash, asset])),
    expected: archiveStateSchema.parse(expectedCurrentState),
  };
}

export async function upgradeStoredCatalogueVisuals(
  database: IDBPDatabase<ArchiveDatabase>,
  prepared: PreparedCatalogueVisualUpgrade,
): Promise<ArchiveState> {
  const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
  try {
    const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
    const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
    const current = parseStoredState(await stateStore.get(ARCHIVE_STATE_KEY));
    if (canonicalJson(current) !== canonicalJson(prepared.expected)) {
      throw new ArchivePersistenceError(
        "CATALOGUE_UPGRADE_CONFLICT",
        "Archive state changed after its catalogue visuals were reviewed; reload Badge before trying the visual upgrade again. No Archive data was changed.",
      );
    }
    const result = applyCatalogueVisualUpgradePlan(current, prepared.plan);
    for (const hash of result.currentTargetSourceHashes) {
      const asset = prepared.assetsByHash.get(hash);
      if (!asset) {
        throw new ArchivePersistenceError(
          "VISUAL_SOURCE_MISSING",
          `Catalogue visual upgrade requires trusted current source ${hash}; reload Badge after rebuilding the starter assets. No Archive data was changed.`,
        );
      }
      const stored = await objectStore.get(hash);
      if (stored === undefined) await objectStore.put(copySourceAsset(asset), hash);
      else assertCompatibleRepositorySource(stored, asset);
    }
    if (canonicalJson(result.state) !== canonicalJson(current)) {
      await stateStore.put(result.state, ARCHIVE_STATE_KEY);
    }
    await transaction.done;
    return result.state;
  } catch (error) {
    await abortQuietly(transaction);
    if (error instanceof ArchivePersistenceError) throw error;
    throw new ArchivePersistenceError(
      "TRANSACTION_FAILED",
      "Archive catalogue-visual upgrade failed; existing records and source objects were preserved. Reload Badge and try again.",
      { cause: error },
    );
  }
}
