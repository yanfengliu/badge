import { candidateIdentityKey, processedCandidateIdentity } from "./candidate-identity.js";
import { readImageAsset } from "./image-processing.js";
import { StudioStoreError, parseAssetShape, type StudioAsset } from "./studio-store-validation.js";

export async function parseStoredStudioAsset(row: unknown): Promise<StudioAsset> {
  const asset = parseAssetShape(row);
  let image;
  try {
    image = await readImageAsset(asset.blob);
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message.replace("Selected Studio image", `Stored Studio ${asset.kind} ${asset.hash}`)
        : "its image bytes could not be validated";
    throw new StudioStoreError(
      "ASSET_UNREADABLE",
      `${detail} The stored row was preserved; restore a bounded Studio backup before making changes.`,
      { cause: error },
    );
  }
  if (image.hash !== asset.hash) {
    throw new StudioStoreError(
      "ASSET_UNREADABLE",
      `Stored Studio ${asset.kind} ${asset.hash} hashes to ${image.hash}; the immutable row was preserved. Restore a matching Studio backup before making changes.`,
    );
  }
  if (asset.kind === "derivative" && asset.schemaVersion === 2) {
    for (const lineage of asset.candidateLineages) {
      const expectedIdentity = await processedCandidateIdentity(
        asset.hash,
        lineage.parentCandidateIdentity.provenance,
        lineage.parentCandidateIdentity,
        lineage.operation,
      );
      if (candidateIdentityKey(expectedIdentity) !== candidateIdentityKey(lineage.candidateIdentity)) {
        throw new StudioStoreError(
          "ASSET_UNREADABLE",
          `Stored Studio derivative ${asset.hash} has candidate identity that does not match its parent and ${lineage.operation} transform; the row was preserved. Restore an intact Studio backup before making changes.`,
        );
      }
    }
  }
  return asset;
}
