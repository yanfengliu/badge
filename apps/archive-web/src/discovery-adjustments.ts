import { effectiveCollectionRefs, effectiveTags, type ArchiveState } from "@badge/archive-domain";
import type { DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

/**
 * What the owner changed about where badges live and what they call them.
 *
 * Discover's badge list ships with the catalogue, so an adjustment has to be laid over it before
 * a set filter or a search can see it: a badge the owner moved into Books Read belongs on that
 * shelf, and a tag they wrote is a word they will search for.
 */
export interface DiscoveryAdjustments {
  readonly setIdsByRecordId: ReadonlyMap<string, readonly string[]>;
  readonly tagsByRecordId: ReadonlyMap<string, readonly string[]>;
}

export const EMPTY_DISCOVERY_ADJUSTMENTS: DiscoveryAdjustments = {
  setIdsByRecordId: new Map(),
  tagsByRecordId: new Map(),
};

export function discoveryAdjustmentsFor(state: ArchiveState | null): DiscoveryAdjustments {
  if (!state) return EMPTY_DISCOVERY_ADJUSTMENTS;
  const setIdsByRecordId = new Map<string, readonly string[]>();
  const tagsByRecordId = new Map<string, readonly string[]>();
  for (const record of state.records) {
    if (!record.adjustment) continue;
    if (record.adjustment.collectionRefs !== null) {
      setIdsByRecordId.set(
        record.recordId,
        effectiveCollectionRefs(record).map((ref) => ref.collectionId),
      );
    }
    const tags = effectiveTags(record);
    if (tags.length > 0) tagsByRecordId.set(record.recordId, tags);
  }
  return { setIdsByRecordId, tagsByRecordId };
}

export function applyDiscoveryAdjustments(
  badges: readonly DiscoveryBadge[],
  adjustments: DiscoveryAdjustments,
): readonly DiscoveryBadge[] {
  if (adjustments.setIdsByRecordId.size === 0) return badges;
  return badges.map((badge) => {
    const setIds = adjustments.setIdsByRecordId.get(badge.recordId);
    return setIds ? { ...badge, setIds } : badge;
  });
}
