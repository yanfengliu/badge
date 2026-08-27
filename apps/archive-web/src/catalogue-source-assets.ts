import type { ArchiveSourceAssetInput } from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";
import { cataloguePackBadges } from "@badge/catalogue-fixtures/catalogue-pack";

import { resolveCatalogueSourceUrl } from "./catalogue-source-media";

const assetKeysBySourceHash = new Map(
  cataloguePackBadges.map((badge) => [badge.sourceAssetHash, badge.assetKey] as const),
);

export function isCatalogueSourceHash(sourceAssetHash: string): boolean {
  return assetKeysBySourceHash.has(sourceAssetHash);
}

/**
 * Fetches the bundled canonical catalogue study for one pinned source hash. The repository
 * re-hashes and structurally validates the bytes before anything durable is written, so this
 * loader only needs to find and download the bundled derivative.
 */
export async function fetchCatalogueSourceAsset(sourceAssetHash: string): Promise<ArchiveSourceAssetInput> {
  const assetKey = assetKeysBySourceHash.get(sourceAssetHash);
  if (!assetKey) {
    throw new Error(
      `Archive source ${sourceAssetHash} is not part of the shipped catalogue; reload the app before activating this badge.`,
    );
  }
  const sourceUrl = resolveCatalogueSourceUrl(assetKey);
  if (!sourceUrl) {
    throw new Error(
      `Catalogue source art ${assetKey} is missing from this build; rebuild the app and retry.`,
    );
  }
  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch (error) {
    throw new Error(
      `Catalogue source art ${assetKey} could not be downloaded (${error instanceof Error ? error.message : String(error)}); check that the local Badge site is still running and retry.`,
      { cause: error },
    );
  }
  if (!response.ok) {
    throw new Error(
      `Catalogue source art ${assetKey} returned HTTP ${response.status}; rebuild the app and retry.`,
    );
  }
  return {
    hash: sourceAssetHash,
    mimeType: "image/jpeg",
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

/**
 * Loads the shipped catalogue bytes referenced by any of the given states — the chosen backup
 * and the current stored state — so corrupt-source repair can reconstruct catalogue art the
 * same way it reconstructs starter art, including a source earned after the backup was
 * exported and a stored-but-corrupt row pinned by a still-unearned record. A source that
 * cannot be fetched is skipped; recovery itself reports exactly which hash stayed missing.
 */
export async function loadCatalogueRepairAssets(
  states: readonly ArchiveState[],
): Promise<readonly ArchiveSourceAssetInput[]> {
  const neededHashes = new Set(
    states
      .flatMap((state) => state.records)
      .flatMap((record) => [
        record.publishedVisual.sourceAssetHash,
        ...(record.activation ? [record.activation.visualPin.sourceAssetHash] : []),
      ])
      .filter((hash) => isCatalogueSourceHash(hash)),
  );
  const loaded = await Promise.all(
    [...neededHashes].sort().map(async (hash) => {
      try {
        return await fetchCatalogueSourceAsset(hash);
      } catch {
        return null;
      }
    }),
  );
  return loaded.filter((asset): asset is ArchiveSourceAssetInput => asset !== null);
}
