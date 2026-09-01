import {
  activateAchievement,
  updateAcceptedSaying,
  type ActivationInput,
  type ActivationResult,
  type ArchiveRecord,
  type ArchiveState,
} from "@badge/archive-domain";
import {
  canonicalQuotationTextKey,
  formatSayingForArchive,
  type SayingResponse,
} from "@badge/saying-contract";

import { ArchivePersistenceError } from "./errors.js";
import type { TrustedQuotationAdmission } from "./quotation-admission.js";
import { applyReviewedSayingDefaults } from "./saying-defaults.js";

export class QuotationUniquenessPolicy {
  constructor(
    private readonly admission: TrustedQuotationAdmission,
    private readonly createRevision: () => string,
  ) {}

  applyDefaults(current: ArchiveState, defaults: ArchiveState): ArchiveState {
    return applyReviewedSayingDefaults(current, defaults, this.createRevision, {
      trustedAcceptedQuotation: (record) => this.admission.trustedAcceptedQuotation(record),
      uniquenessReservedQuotationTexts: (record) => this.admission.uniquenessReservedQuotationTexts(record),
      trustedQuotationBank: (record) => this.admission.trustedQuotationBank(record),
    });
  }

  updateAcceptedQuotation(
    state: ArchiveState,
    recordId: string,
    quotation: SayingResponse,
    expectedQuotationRevision: string,
  ): ArchiveState {
    const record = state.records.find((candidate) => candidate.recordId === recordId);
    const admittedQuotation = record ? this.admission.validate(record, quotation) : null;
    const saying = admittedQuotation ? formatSayingForArchive(admittedQuotation) : null;
    if (record && record.quotationRevision !== expectedQuotationRevision) {
      throw new ArchivePersistenceError(
        "SAYING_CONFLICT",
        `The accepted quotation for ${record.title} changed while another selection was pending; review the current quote before regenerating again. No Archive data was changed.`,
      );
    }
    const result = updateAcceptedSaying(state, recordId, saying ?? "", this.createRevision());
    if (record && admittedQuotation) {
      this.assertTextAvailable(result, record, admittedQuotation.quotation.text);
    }
    return result;
  }

  activateWithAcceptedQuotation(
    state: ArchiveState,
    input: ActivationInput,
    activatedAt: string,
    quotation: SayingResponse,
    expectedQuotationRevision: string,
  ): ActivationResult {
    const record = state.records.find((candidate) => candidate.recordId === input.recordId);
    const admittedQuotation = record ? this.admission.validate(record, quotation) : null;
    const acceptedSaying = admittedQuotation ? formatSayingForArchive(admittedQuotation) : null;
    if (
      record &&
      (record.acceptedSaying !== acceptedSaying || record.quotationRevision !== expectedQuotationRevision)
    ) {
      throw new ArchivePersistenceError(
        "SAYING_CONFLICT",
        `The source-checked quotation for ${record.title} changed after activation opened; reopen the badge and review the current quote. No Archive data was changed.`,
      );
    }
    const result = activateAchievement(state, input, activatedAt);
    if (record && admittedQuotation) {
      this.assertTextAvailable(result.state, result.record, admittedQuotation.quotation.text);
    }
    return result;
  }

  assertTextAvailable(state: ArchiveState, targetRecord: ArchiveRecord, proposedText: string): void {
    const proposedKey = canonicalQuotationTextKey(proposedText);
    const conflictingRecord = state.records.find((candidate) => {
      if (candidate.recordId === targetRecord.recordId) return false;
      return this.admission
        .uniquenessReservedQuotationTexts(candidate)
        .some((reservedText) => canonicalQuotationTextKey(reservedText) === proposedKey);
    });
    if (conflictingRecord) {
      throw new ArchivePersistenceError(
        "SAYING_CONFLICT",
        `The quotation selected for ${targetRecord.title} is already accepted by ${conflictingRecord.title}; choose a different source-checked quotation for ${targetRecord.title}. No Archive data was changed.`,
      );
    }
  }

  assertNoTextCollisions(state: ArchiveState): void {
    this.assertTextCollisions(state, false);
  }

  assertNoUnearnedTextCollisions(state: ArchiveState): void {
    this.assertTextCollisions(state, true);
  }

  private assertTextCollisions(state: ArchiveState, allowSealedDuplicates: boolean): void {
    const owners = new Map<string, ArchiveRecord>();
    for (const record of state.records) {
      for (const reservedText of this.admission.uniquenessReservedQuotationTexts(record)) {
        const key = canonicalQuotationTextKey(reservedText);
        const owner = owners.get(key);
        if (!owner) {
          owners.set(key, record);
          continue;
        }
        if (owner.recordId === record.recordId) continue;
        const ownerSealed = owner.lifecycle === "earned" || owner.activation !== null;
        const recordSealed = record.lifecycle === "earned" || record.activation !== null;
        if (allowSealedDuplicates && ownerSealed && recordSealed) continue;
        throw new ArchivePersistenceError(
          "SAYING_CONFLICT",
          `Archive data assigns the same quotation wording to ${owner.title} and ${record.title}${allowSealedDuplicates ? ", including an unearned badge" : " in a newly created Archive"}; use the current source-checked quotation catalogue so Badge can choose a distinct value. No Archive data was changed.`,
        );
      }
    }
  }
}
