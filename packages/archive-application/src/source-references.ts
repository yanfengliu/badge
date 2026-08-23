import type { ArchiveState } from "@badge/archive-domain";

export function referencedSourceHashes(state: ArchiveState): string[] {
  return [
    ...new Set(
      state.records.flatMap((record) => [
        record.publishedVisual.sourceAssetHash,
        ...(record.activation ? [record.activation.visualPin.sourceAssetHash] : []),
      ]),
    ),
  ].sort();
}

export function earnedSourceHashes(state: ArchiveState): string[] {
  return [
    ...new Set(
      state.records.flatMap((record) =>
        record.activation ? [record.activation.visualPin.sourceAssetHash] : [],
      ),
    ),
  ].sort();
}
