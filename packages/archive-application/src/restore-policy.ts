import type { ArchiveRecord, ArchiveState } from "@badge/archive-domain";
import { canonicalJson } from "@badge/pack-contract";

import { ArchivePersistenceError } from "./errors.js";

function earnedRecords(state: ArchiveState): readonly ArchiveRecord[] {
  return state.records.filter((record) => record.lifecycle === "earned");
}

function catalogueLineage(record: ArchiveRecord): string {
  return canonicalJson({
    recordId: record.recordId,
    definitionRef: record.definitionRef,
    collectionRefs: record.collectionRefs,
    title: record.title,
    criterion: record.criterion,
    description: record.description,
    publishedVisual: record.publishedVisual,
  });
}

function assertEarnedTransitionIdentity(existing: ArchiveRecord, replacement: ArchiveRecord): void {
  const definitionChanged =
    canonicalJson(existing.definitionRef) !== canonicalJson(replacement.definitionRef);
  const existingPackId = existing.publishedVisual.packRef.packId;
  const replacementPackId = replacement.publishedVisual.packRef.packId;
  const activationPackId = replacement.activation?.visualPin.packRef.packId;
  if (definitionChanged || replacementPackId !== existingPackId || activationPackId !== existingPackId) {
    throw new ArchivePersistenceError(
      "BACKUP_CATALOGUE_MISMATCH",
      `Archive backup changes earned identity for record ${existing.recordId}: its qualified definition or pack lineage moves from ${existingPackId} to ${replacementPackId}. An earned transition may preserve historical semantic and visual changes only within the same qualified definition and pack lineage; choose a matching backup. No Archive data was changed.`,
    );
  }
}

export function assertMonotonicArchiveRestore(current: ArchiveState, incoming: ArchiveState): void {
  if (current.ownerId !== incoming.ownerId) {
    throw new ArchivePersistenceError(
      "BACKUP_OWNER_MISMATCH",
      `Archive backup belongs to owner ${incoming.ownerId}, but this Archive belongs to ${current.ownerId}; choose the matching owner's backup. No Archive data was changed.`,
    );
  }

  const incomingById = new Map(incoming.records.map((record) => [record.recordId, record]));
  for (const existing of earnedRecords(current)) {
    const replacement = incomingById.get(existing.recordId);
    if (!replacement) {
      throw new ArchivePersistenceError(
        "BACKUP_WOULD_LOSE_EARNED_RECORD",
        `Archive backup omits earned record ${existing.recordId}; normal restore never removes earned memories. Choose a newer superset backup. No Archive data was changed.`,
      );
    }
    if (canonicalJson(existing) !== canonicalJson(replacement)) {
      throw new ArchivePersistenceError(
        "BACKUP_WOULD_LOSE_EARNED_RECORD",
        `Archive backup changes earned record ${existing.recordId}; normal restore preserves every earned memory exactly. Choose a matching or newer superset backup. No Archive data was changed.`,
      );
    }
  }

  for (const existing of current.records.filter((record) => record.lifecycle !== "earned")) {
    const replacement = incomingById.get(existing.recordId);
    if (!replacement) {
      throw new ArchivePersistenceError(
        "BACKUP_CATALOGUE_MISMATCH",
        `Archive backup omits current catalogue record ${existing.recordId}; normal restore cannot leave this installed catalogue incomplete. Choose a matching backup. No Archive data was changed.`,
      );
    }
    if (replacement.lifecycle !== "earned" && catalogueLineage(existing) !== catalogueLineage(replacement)) {
      throw new ArchivePersistenceError(
        "BACKUP_CATALOGUE_MISMATCH",
        `Archive backup changes catalogue lineage for unearned record ${existing.recordId}; its definition and exact published visual must match this Archive. Choose a matching backup or an earned self-contained memory backup. No Archive data was changed.`,
      );
    }
    if (replacement.lifecycle === "earned") assertEarnedTransitionIdentity(existing, replacement);
  }
}
