import type { ArchiveRecord, ArchiveState } from "@badge/archive-domain";
import {
  MAX_ARCHIVE_BACKUP_BYTES,
  applyCatalogueVisualUpgradePlan,
  earnedRecordIdsMissingSaying,
  reconcileCatalogueRecords,
} from "@badge/archive-application";
import { canonicalJson } from "@badge/pack-contract";

import { createStarterVisualUpgradePlan } from "./starter-visual-upgrade.js";

type CatalogueRecord = Pick<
  ArchiveRecord,
  "recordId" | "definitionRef" | "collectionRefs" | "title" | "criterion" | "description" | "publishedVisual"
>;

export class EarnedSayingCompatibilityError extends Error {
  constructor(recordIds: readonly string[]) {
    super(
      `Archive state contains earned records without their sealed quotation: ${formatRecordIds(recordIds)}. Badge will not invent text after activation. Choose an intact backup; the current readable state remains untouched and can be preserved as non-restorable rescue evidence before explicit replacement.`,
    );
    this.name = "EarnedSayingCompatibilityError";
  }
}

function catalogueLineage(record: CatalogueRecord): CatalogueRecord {
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

function formatRecordIds(recordIds: readonly string[]): string {
  return recordIds.map((recordId) => `“${recordId}”`).join(", ");
}

function earnedIdentityMismatch(expected: ArchiveRecord, incoming: ArchiveRecord): string | null {
  const expectedPackId = expected.publishedVisual.packRef.packId;
  const incomingPackIds = [
    incoming.publishedVisual.packRef.packId,
    incoming.activation?.visualPin.packRef.packId,
  ].filter((packId): packId is string => packId !== undefined);
  const definitionMatches = canonicalJson(expected.definitionRef) === canonicalJson(incoming.definitionRef);
  const packMatches =
    incomingPackIds.length === 2 && incomingPackIds.every((packId) => packId === expectedPackId);
  if (definitionMatches && packMatches) return null;
  const definition = canonicalJson(incoming.definitionRef);
  return `definition ${definition}; published/activation pack lineage ${incomingPackIds.join(" / ") || "missing"}`;
}

export function requiresArchiveRecovery(
  initializationFailed: boolean,
  resolvedVisualError: string | null,
): boolean {
  return initializationFailed || resolvedVisualError !== null;
}

export function assertArchiveBackupFileSize(file: Pick<File, "name" | "size">): void {
  if (Number.isSafeInteger(file.size) && file.size > 0 && file.size <= MAX_ARCHIVE_BACKUP_BYTES) return;
  throw new Error(
    `Archive backup “${file.name}” is ${file.size} bytes; choose a non-empty file no larger than ${MAX_ARCHIVE_BACKUP_BYTES} bytes. The file was not read and no Archive data was changed.`,
  );
}

export function assertCompatibleStarterArchive(expected: ArchiveState, incoming: ArchiveState): void {
  if (incoming.ownerId !== expected.ownerId) {
    throw new Error(
      `Archive state belongs to owner ${incoming.ownerId}, but this app expects ${expected.ownerId}. Archive stayed closed; choose that owner's matching backup. No Archive data was changed.`,
    );
  }
  const missingSayings = earnedRecordIdsMissingSaying(incoming);
  if (missingSayings.length > 0) {
    throw new EarnedSayingCompatibilityError(missingSayings);
  }
  const upgraded = applyCatalogueVisualUpgradePlan(incoming, createStarterVisualUpgradePlan(expected)).state;
  const expanded = reconcileCatalogueRecords(upgraded, expected).state;
  assertCompatibleStarterCatalogue(expected.records, expanded.records);
}

export function assertCompatibleStarterCatalogue(
  expectedRecords: readonly ArchiveRecord[],
  incomingRecords: readonly ArchiveRecord[],
): void {
  const expectedById = new Map(expectedRecords.map((record) => [record.recordId, record]));
  const incomingById = new Map(incomingRecords.map((record) => [record.recordId, record]));
  const missing = [...expectedById.keys()].filter((recordId) => !incomingById.has(recordId)).sort();
  const unexpected = [...incomingById.keys()].filter((recordId) => !expectedById.has(recordId)).sort();

  if (missing.length > 0 || unexpected.length > 0) {
    const differences = [
      missing.length > 0 ? `missing record IDs ${formatRecordIds(missing)}` : null,
      unexpected.length > 0 ? `unexpected record IDs ${formatRecordIds(unexpected)}` : null,
    ].filter((difference): difference is string => difference !== null);

    throw new Error(
      `Archive backup does not match this Archive's shipped catalogue: ${differences.join("; ")}. Choose a backup exported by this version of Badge Archive. The selected file was left untouched and no Archive data was changed.`,
    );
  }

  for (const expected of expectedRecords) {
    const incoming = incomingById.get(expected.recordId);
    if (!incoming) continue;
    if (incoming.lifecycle === "earned") {
      const mismatch = earnedIdentityMismatch(expected, incoming);
      if (mismatch) {
        throw new Error(
          `Archive backup contains incompatible earned identity for record “${expected.recordId}”: ${mismatch}. Historical wording, visual versions, and digests may differ, but the qualified definition and pack lineage must stay the same. The selected file was left untouched and no Archive data was changed.`,
        );
      }
    } else if (canonicalJson(catalogueLineage(expected)) !== canonicalJson(catalogueLineage(incoming))) {
      throw new Error(
        `Archive backup contains incompatible unearned catalogue lineage for record “${expected.recordId}”; its definition or published visual does not match this version. Choose a matching backup or an earned self-contained memory backup. The selected file was left untouched and no Archive data was changed.`,
      );
    }
  }
}
