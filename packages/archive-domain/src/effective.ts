import type { BadgeAdjustment } from "./adjustment.js";
import type { ArchiveRecord, PublishedVisual } from "./model.js";
import type { CollectionRef } from "./refs.js";

/**
 * Resolves what the owner actually sees for one record: the catalogue's published visual with
 * the badge adjustment laid over it. Applying an overlay to a visual that already carries the
 * same overlay is idempotent, so an earned record — whose `publishedVisual` was folded at
 * activation — resolves to exactly the pinned memory.
 */
export function effectiveVisual(record: ArchiveRecord): PublishedVisual {
  const adjustment = record.adjustment;
  if (!adjustment) return record.publishedVisual;
  const recipe = record.publishedVisual.renderRecipe;
  return {
    ...record.publishedVisual,
    sourceAssetHash: adjustment.source?.sourceAssetHash ?? record.publishedVisual.sourceAssetHash,
    accessibleDescription:
      adjustment.source?.accessibleDescription ?? record.publishedVisual.accessibleDescription,
    renderRecipe: {
      ...recipe,
      shape: adjustment.appearance.shape ?? recipe.shape,
      material: adjustment.appearance.material ?? recipe.material,
      borderColor: adjustment.appearance.borderColor ?? recipe.borderColor,
      borderWidth: adjustment.appearance.borderWidth ?? recipe.borderWidth,
    },
  };
}

/** The visual an earned record replays, or the effective visual an unearned record would pin. */
export function displayedVisual(record: ArchiveRecord): PublishedVisual {
  return record.activation?.visualPin ?? effectiveVisual(record);
}

export function effectiveCollectionRefs(record: ArchiveRecord): readonly CollectionRef[] {
  return record.adjustment?.collectionRefs ?? record.collectionRefs;
}

export function effectiveTags(record: ArchiveRecord): readonly string[] {
  return record.adjustment?.tags ?? [];
}

/**
 * Every source hash the archive must keep for this record. An adjusted source is owner-supplied
 * and exists nowhere else — no shipped pack can re-supply it — so it is required for backup
 * closure and must never be swept as unreferenced, whether or not the badge is collected.
 */
export function recordSourceHashes(record: ArchiveRecord): readonly string[] {
  const hashes = [record.publishedVisual.sourceAssetHash];
  if (record.adjustment?.source) hashes.push(record.adjustment.source.sourceAssetHash);
  if (record.activation) hashes.push(record.activation.visualPin.sourceAssetHash);
  return hashes;
}

export function ownerSuppliedSourceHash(record: ArchiveRecord): string | null {
  return record.adjustment?.source?.sourceAssetHash ?? null;
}

export function adjustmentSummary(adjustment: BadgeAdjustment | null): {
  readonly appearanceFields: number;
  readonly hasOwnImage: boolean;
  readonly tagCount: number;
  readonly collectionsChanged: boolean;
} {
  return {
    appearanceFields: adjustment
      ? [
          adjustment.appearance.shape,
          adjustment.appearance.material,
          adjustment.appearance.borderColor,
          adjustment.appearance.borderWidth,
        ].filter((value) => value !== null).length
      : 0,
    hasOwnImage: adjustment?.source !== null && adjustment !== null,
    tagCount: adjustment?.tags.length ?? 0,
    collectionsChanged: (adjustment?.collectionRefs ?? null) !== null,
  };
}
