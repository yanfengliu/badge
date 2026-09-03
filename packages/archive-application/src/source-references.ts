import { recordSourceHashes, type ArchiveState } from "@badge/archive-domain";

function sortedUnique(hashes: readonly string[]): string[] {
  return [...new Set(hashes)].sort();
}

export function referencedSourceHashes(state: ArchiveState): string[] {
  return sortedUnique(state.records.flatMap((record) => recordSourceHashes(record)));
}

export function earnedSourceHashes(state: ArchiveState): string[] {
  return sortedUnique(
    state.records.flatMap((record) =>
      record.activation ? [record.activation.visualPin.sourceAssetHash] : [],
    ),
  );
}

export function ownerAdjustedSourceHashes(state: ArchiveState): string[] {
  return sortedUnique(
    state.records.flatMap((record) =>
      record.adjustment?.source ? [record.adjustment.source.sourceAssetHash] : [],
    ),
  );
}

/**
 * Every source no shipped catalogue can hand back: an earned record's pinned art, and an image
 * the owner swapped in from their own device. A catalogue source for an unearned, unadjusted
 * badge is deliberately excluded — it reloads from the bundled tier, so its absence is normal
 * rather than damage, and copying it into every backup would multiply the archive by its whole
 * catalogue.
 */
export function irreplaceableSourceHashes(state: ArchiveState): string[] {
  return sortedUnique([...earnedSourceHashes(state), ...ownerAdjustedSourceHashes(state)]);
}
