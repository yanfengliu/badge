import {
  INITIAL_QUOTATION_REVISION,
  archiveRecordSchema,
  archiveStateSchema,
  type ArchiveRecord,
  type ArchiveState,
} from "@badge/archive-domain";
import { canonicalJson } from "@badge/pack-contract";

import { ArchivePersistenceError } from "./errors.js";

export type CatalogueVisualLineage = Pick<
  ArchiveRecord,
  "recordId" | "definitionRef" | "collectionRefs" | "title" | "criterion" | "description" | "publishedVisual"
>;

export interface CatalogueVisualUpgrade {
  readonly from: CatalogueVisualLineage;
  readonly to: CatalogueVisualLineage;
}

export interface ArchiveCatalogueVisualUpgradePlan {
  readonly upgrades: readonly CatalogueVisualUpgrade[];
}

export function catalogueVisualLineage(record: CatalogueVisualLineage): CatalogueVisualLineage {
  return {
    recordId: record.recordId,
    definitionRef: record.definitionRef,
    collectionRefs: record.collectionRefs,
    title: record.title,
    criterion: record.criterion,
    description: record.description,
    publishedVisual: record.publishedVisual,
  };
}

function validateLineage(untrusted: CatalogueVisualLineage): CatalogueVisualLineage {
  const parsed = archiveRecordSchema.parse({
    ...catalogueVisualLineage(untrusted),
    lifecycle: "suggested",
    acceptedSaying: null,
    quotationRevision: INITIAL_QUOTATION_REVISION,
    note: null,
    visibility: "inherit",
    activation: null,
  });
  return catalogueVisualLineage(parsed);
}

function semantics(lineage: CatalogueVisualLineage): Omit<CatalogueVisualLineage, "publishedVisual"> {
  return {
    recordId: lineage.recordId,
    definitionRef: lineage.definitionRef,
    collectionRefs: lineage.collectionRefs,
    title: lineage.title,
    criterion: lineage.criterion,
    description: lineage.description,
  };
}

export function validateCatalogueVisualUpgradePlan(
  plan: ArchiveCatalogueVisualUpgradePlan,
): ArchiveCatalogueVisualUpgradePlan {
  const seen = new Set<string>();
  const upgrades = plan.upgrades.map((upgrade) => {
    const from = validateLineage(upgrade.from);
    const to = validateLineage(upgrade.to);
    if (from.recordId !== to.recordId) {
      throw new ArchivePersistenceError(
        "CATALOGUE_UPGRADE_INVALID",
        `Catalogue visual upgrade changes record identity from ${from.recordId} to ${to.recordId}; each upgrade must keep one exact record ID. No Archive data was changed.`,
      );
    }
    if (seen.has(from.recordId)) {
      throw new ArchivePersistenceError(
        "CATALOGUE_UPGRADE_INVALID",
        `Catalogue visual upgrade repeats record ${from.recordId}; provide exactly one legacy-to-current mapping per record. No Archive data was changed.`,
      );
    }
    seen.add(from.recordId);
    if (canonicalJson(semantics(from)) !== canonicalJson(semantics(to))) {
      throw new ArchivePersistenceError(
        "CATALOGUE_UPGRADE_INVALID",
        `Catalogue visual upgrade for ${from.recordId} changes definition, collection, or wording; this path may replace only the exact published visual. No Archive data was changed.`,
      );
    }
    if (canonicalJson(from.publishedVisual) === canonicalJson(to.publishedVisual)) {
      throw new ArchivePersistenceError(
        "CATALOGUE_UPGRADE_INVALID",
        `Catalogue visual upgrade for ${from.recordId} maps a visual to itself; remove the redundant mapping. No Archive data was changed.`,
      );
    }
    return { from, to };
  });
  return { upgrades };
}

export interface AppliedCatalogueVisualUpgrade {
  readonly state: ArchiveState;
  readonly upgradedRecordIds: readonly string[];
  readonly currentTargetSourceHashes: readonly string[];
}

export function applyCatalogueVisualUpgradePlan(
  state: ArchiveState,
  untrustedPlan: ArchiveCatalogueVisualUpgradePlan,
): AppliedCatalogueVisualUpgrade {
  const current = archiveStateSchema.parse(state);
  const plan = validateCatalogueVisualUpgradePlan(untrustedPlan);
  const upgradesByRecordId = new Map(plan.upgrades.map((upgrade) => [upgrade.from.recordId, upgrade]));
  const upgradedRecordIds: string[] = [];
  const currentTargetSourceHashes = new Set<string>();
  const records = current.records.map((record) => {
    const upgrade = upgradesByRecordId.get(record.recordId);
    if (!upgrade || record.lifecycle === "earned") return record;
    const lineage = catalogueVisualLineage(record);
    if (canonicalJson(lineage) === canonicalJson(upgrade.to)) {
      currentTargetSourceHashes.add(upgrade.to.publishedVisual.sourceAssetHash);
      return record;
    }
    if (canonicalJson(lineage) !== canonicalJson(upgrade.from)) {
      throw new ArchivePersistenceError(
        "CATALOGUE_UPGRADE_UNKNOWN_LINEAGE",
        `The supplied state contains incompatible unearned catalogue lineage for record ${record.recordId}; it matches neither the exact known legacy visual nor the current visual. Automatic upgrade stopped and no data was changed.`,
      );
    }
    upgradedRecordIds.push(record.recordId);
    currentTargetSourceHashes.add(upgrade.to.publishedVisual.sourceAssetHash);
    return { ...record, publishedVisual: upgrade.to.publishedVisual };
  });
  const upgraded =
    upgradedRecordIds.length === 0 ? current : archiveStateSchema.parse({ ...current, records });
  return {
    state: upgraded,
    upgradedRecordIds,
    currentTargetSourceHashes: [...currentTargetSourceHashes].sort(),
  };
}
