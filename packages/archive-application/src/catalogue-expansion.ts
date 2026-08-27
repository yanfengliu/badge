import { archiveStateSchema, type ArchiveRecord, type ArchiveState } from "@badge/archive-domain";
import { canonicalJson } from "@badge/pack-contract";

import { ArchivePersistenceError } from "./errors.js";

export interface CatalogueReconciliationResult {
  readonly state: ArchiveState;
  readonly addedRecordIds: readonly string[];
  readonly reseededRecordIds: readonly string[];
}

function catalogueLineage(record: ArchiveRecord): string {
  return canonicalJson({
    definitionRef: record.definitionRef,
    collectionRefs: record.collectionRefs,
    title: record.title,
    criterion: record.criterion,
    description: record.description,
    publishedVisual: record.publishedVisual,
  });
}

function packReleaseKey(record: ArchiveRecord): string {
  return `${record.publishedVisual.packRef.packId}\u0000${record.publishedVisual.packRef.version}`;
}

/**
 * Grows and refreshes a stored state against the catalogue this release ships. Records are
 * appended only when the store demonstrably predates them: a default record may be added only
 * if the store holds no record from that exact pack release (packId plus version), so a state
 * that already carries records of the same release but lost one is left incomplete and the
 * compatibility gate routes it to recovery instead of silently backfilling over possible
 * earned history. A readable state with zero records is likewise never healed here — no
 * shipped version ever writes an empty archive, so emptiness is evidence for recovery.
 *
 * An unearned stored record whose catalogue lineage drifted from the current seed — a
 * regenerated pack digest, refreshed source hash, or revised recipe — is reseeded to the
 * shipped lineage while every personal field (lifecycle, quotation, note, visibility) is
 * preserved. Earned records are never modified, reordered, or removed.
 */
export function reconcileCatalogueRecords(
  currentState: ArchiveState,
  defaultState: ArchiveState,
): CatalogueReconciliationResult {
  const current = archiveStateSchema.parse(currentState);
  const defaults = archiveStateSchema.parse(defaultState);
  if (current.ownerId !== defaults.ownerId || current.records.length === 0) {
    return { state: current, addedRecordIds: [], reseededRecordIds: [] };
  }
  const storedPackReleases = new Set(current.records.map(packReleaseKey));
  const defaultsByRecordId = new Map(defaults.records.map((record) => [record.recordId, record]));
  const reseededRecordIds: string[] = [];
  const records = current.records.map((record) => {
    const seeded = defaultsByRecordId.get(record.recordId);
    if (!seeded || record.lifecycle === "earned" || record.activation !== null) return record;
    if (catalogueLineage(record) === catalogueLineage(seeded)) return record;
    reseededRecordIds.push(record.recordId);
    return {
      ...record,
      definitionRef: seeded.definitionRef,
      collectionRefs: seeded.collectionRefs,
      title: seeded.title,
      criterion: seeded.criterion,
      description: seeded.description,
      publishedVisual: seeded.publishedVisual,
    };
  });

  const currentRecordIds = new Set(current.records.map((record) => record.recordId));
  const additions = defaults.records.filter(
    (record) => !currentRecordIds.has(record.recordId) && !storedPackReleases.has(packReleaseKey(record)),
  );
  for (const record of additions) {
    if (record.lifecycle === "earned" || record.activation !== null) {
      throw new ArchivePersistenceError(
        "CATALOGUE_UPGRADE_INVALID",
        `Catalogue defaults mark record ${record.recordId} as already earned; a shipped catalogue may seed only unearned records. Fix the published catalogue before opening Badge. No Archive data was changed.`,
      );
    }
  }
  if (additions.length === 0 && reseededRecordIds.length === 0) {
    return { state: current, addedRecordIds: [], reseededRecordIds: [] };
  }
  return {
    state: archiveStateSchema.parse({ ...current, records: [...records, ...additions] }),
    addedRecordIds: additions.map((record) => record.recordId),
    reseededRecordIds,
  };
}
