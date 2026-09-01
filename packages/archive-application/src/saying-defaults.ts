import {
  archiveStateSchema,
  quotationRevisionSchema,
  type ArchiveRecord,
  type ArchiveState,
} from "@badge/archive-domain";
import {
  canonicalQuotationTextKey,
  formatSayingForArchive,
  type HistoricalQuotation,
} from "@badge/saying-contract";

import { ArchivePersistenceError } from "./errors.js";

export function earnedRecordIdsMissingSaying(state: ArchiveState): readonly string[] {
  return archiveStateSchema
    .parse(state)
    .records.filter((record) => record.lifecycle === "earned" && record.acceptedSaying === null)
    .map((record) => record.recordId)
    .sort();
}

export function assertRestorableEarnedSayings(state: ArchiveState): void {
  const recordIds = earnedRecordIdsMissingSaying(state);
  if (recordIds.length === 0) return;
  throw new ArchivePersistenceError(
    "BACKUP_INVALID",
    `Archive backup contains earned records without a sealed quotation: ${recordIds.join(", ")}. This state cannot be repaired by inventing text after activation; choose an intact backup whose earned memories retain their original quotations. No Archive data was changed.`,
  );
}

export function hasDurableQuotationRevisions(untrusted: unknown): boolean {
  if (typeof untrusted !== "object" || untrusted === null || !("records" in untrusted)) return false;
  if (!Array.isArray(untrusted.records)) return false;
  return untrusted.records.every(
    (record) =>
      typeof record === "object" &&
      record !== null &&
      Object.prototype.hasOwnProperty.call(record, "quotationRevision") &&
      quotationRevisionSchema.safeParse(record.quotationRevision).success,
  );
}

export function applyReviewedSayingDefaults(
  currentState: ArchiveState,
  defaultState: ArchiveState,
  createRevision: () => string,
  admission: {
    trustedAcceptedQuotation(record: ArchiveRecord): HistoricalQuotation | null;
    uniquenessReservedQuotationTexts(record: ArchiveRecord): readonly string[];
    trustedQuotationBank(record: ArchiveRecord): readonly HistoricalQuotation[];
  },
): ArchiveState {
  const current = archiveStateSchema.parse(currentState);
  const defaults = archiveStateSchema.parse(defaultState);
  const defaultsByRecordId = new Map(
    defaults.records.map((record) => [record.recordId, record.acceptedSaying] as const),
  );
  const reservedKeys = new Set<string>();
  for (const record of current.records) {
    if (record.lifecycle !== "earned" && record.activation === null) continue;
    for (const reservedText of admission.uniquenessReservedQuotationTexts(record)) {
      reservedKeys.add(canonicalQuotationTextKey(reservedText));
    }
  }

  let changed = false;
  const records = current.records.map((record) => {
    const defaultSaying = defaultsByRecordId.get(record.recordId);
    if (record.lifecycle === "earned" || record.activation !== null) return record;
    if (record.acceptedSaying === null && (defaultSaying === null || defaultSaying === undefined)) {
      return record;
    }

    const trustedAcceptedQuotation = admission.trustedAcceptedQuotation(record);
    if (trustedAcceptedQuotation !== null) {
      const currentKey = canonicalQuotationTextKey(trustedAcceptedQuotation.text);
      if (!reservedKeys.has(currentKey)) {
        reservedKeys.add(currentKey);
        return record;
      }
    }

    const bank = admission.trustedQuotationBank(record);
    const candidates = bank.map((quotation) => ({
      acceptedSaying: formatSayingForArchive({ kind: "quotation", saying: quotation.text, quotation }),
      key: canonicalQuotationTextKey(quotation.text),
    }));
    const reviewedDefault =
      defaultSaying === null || defaultSaying === undefined
        ? undefined
        : candidates.find((candidate) => candidate.acceptedSaying === defaultSaying);
    const orderedCandidates = reviewedDefault
      ? [reviewedDefault, ...candidates.filter((candidate) => candidate !== reviewedDefault)]
      : candidates;
    const selected = orderedCandidates.find((candidate) => !reservedKeys.has(candidate.key));
    if (!selected) {
      throw new ArchivePersistenceError(
        "SAYING_CONFLICT",
        `${record.title} has no distinct source-checked quotation available; publish at least one trusted quotation with unique wording for this badge. No Archive data was changed.`,
      );
    }
    reservedKeys.add(selected.key);
    changed = true;
    return {
      ...record,
      acceptedSaying: selected.acceptedSaying,
      quotationRevision: createRevision(),
    };
  });
  return changed ? archiveStateSchema.parse({ ...current, records }) : current;
}

export function refreshUnearnedQuotationRevisions(
  incomingState: ArchiveState,
  createRevision: () => string,
): ArchiveState {
  const incoming = archiveStateSchema.parse(incomingState);
  const records = incoming.records.map((record) =>
    record.lifecycle === "earned" ? record : { ...record, quotationRevision: createRevision() },
  );
  return archiveStateSchema.parse({ ...incoming, records });
}

export function prepareQuotationRevisionsForRestore(
  currentState: ArchiveState,
  incomingState: ArchiveState,
  createRevision: () => string,
): ArchiveState {
  const current = archiveStateSchema.parse(currentState);
  const incoming = archiveStateSchema.parse(incomingState);
  const currentByRecordId = new Map(current.records.map((record) => [record.recordId, record]));
  const records = incoming.records.map((record) => {
    const prior = currentByRecordId.get(record.recordId);
    if (record.lifecycle !== "earned") return { ...record, quotationRevision: createRevision() };
    if (prior?.lifecycle === "earned") {
      return { ...record, quotationRevision: prior.quotationRevision };
    }
    return record;
  });
  return archiveStateSchema.parse({ ...incoming, records });
}
