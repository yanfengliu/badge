import {
  StudioStoreError,
  candidateIdentityMatchesAsset,
  parseAssetShape,
  type StudioAsset,
} from "./studio-store-validation.js";

export function validateProspectiveAssetGraph(rows: readonly unknown[], prospective: StudioAsset): void {
  const assets = rows.map((row) => parseAssetShape(row)).filter((asset) => asset.hash !== prospective.hash);
  validateDerivationGraph([...assets, prospective]);
}

export function validateDerivationGraph(assets: readonly StudioAsset[]): void {
  const byHash = new Map(assets.map((asset) => [asset.hash, asset]));
  for (const asset of assets) {
    if (asset.kind !== "derivative") continue;
    const lineages =
      asset.schemaVersion === 1
        ? [{ parentHash: asset.parentHash, parentCandidateIdentity: null }]
        : asset.candidateLineages;
    for (const lineage of lineages) {
      const parent = byHash.get(lineage.parentHash);
      if (!parent) {
        throw new StudioStoreError(
          "ASSET_UNREADABLE",
          `Studio derivative ${asset.hash} references missing parent ${lineage.parentHash}; all rows were preserved. Restore the missing source before writing.`,
        );
      }
      if (
        lineage.parentCandidateIdentity &&
        !candidateIdentityMatchesAsset(parent, lineage.parentCandidateIdentity)
      ) {
        throw new StudioStoreError(
          "ASSET_UNREADABLE",
          `Studio derivative ${asset.hash} has candidate lineage that does not match parent ${lineage.parentHash}; all rows were preserved. Restore an intact Studio backup before writing.`,
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (asset: StudioAsset): void => {
    if (visited.has(asset.hash)) return;
    if (visiting.has(asset.hash)) {
      throw new StudioStoreError(
        "ASSET_UNREADABLE",
        `Studio derivation graph contains a cycle at ${asset.hash}; all rows were preserved. Restore an intact Studio backup.`,
      );
    }
    visiting.add(asset.hash);
    if (asset.kind === "derivative") {
      const parentHashes =
        asset.schemaVersion === 1
          ? [asset.parentHash]
          : asset.candidateLineages.map((lineage) => lineage.parentHash);
      for (const parentHash of new Set(parentHashes)) visit(byHash.get(parentHash)!);
    }
    visiting.delete(asset.hash);
    visited.add(asset.hash);
  };
  for (const asset of assets) visit(asset);
}
