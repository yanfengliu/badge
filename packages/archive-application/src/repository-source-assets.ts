import type { ArchiveState } from "@badge/archive-domain";

import { ArchivePersistenceError } from "./errors.js";
import { irreplaceableSourceHashes } from "./source-references.js";
import {
  parseSourceAssetShape,
  preflightSourceAssetInputs,
  sourceAssetsEqual,
  validateSourceAsset,
  type ArchiveSourceAsset,
  type ArchiveSourceAssetInput,
} from "./source-assets.js";

export async function validateRepositorySourceAssets(
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
    const missing = irreplaceableSourceHashes(state).find((hash) => !supplied.has(hash));
    if (missing) {
      throw new ArchivePersistenceError(
        "BACKUP_INCOMPLETE",
        `Restore data is missing source ${missing} required by an earned record; choose an intact self-contained .badgearchive file. No Archive data was changed.`,
      );
    }
  }
  return assets;
}

export function mergeRepositorySourceAssets(
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

export function assertCompatibleRepositorySource(untrusted: unknown, asset: ArchiveSourceAsset): void {
  const existing = parseSourceAssetShape(untrusted, asset.hash);
  if (!sourceAssetsEqual(existing, asset)) {
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_CONFLICT",
      `Archive source ${asset.hash} already exists with different MIME metadata or bytes; the existing row was preserved. Restore from a backup that matches this Archive.`,
    );
  }
}
