import { archiveStateSchema, type ArchiveRecord, type ArchiveState } from "@badge/archive-domain";
import {
  formatSayingForArchive,
  sayingRequestSchema,
  validateSayingResponseForRequest,
  type HistoricalQuotation,
  type SayingRequest,
  type SayingResponse,
} from "@badge/saying-contract";

import { ArchivePersistenceError } from "./errors.js";

export type TrustedQuotationRequests = Readonly<Record<string, SayingRequest>>;

export class TrustedQuotationAdmission {
  private readonly requests: ReadonlyMap<string, SayingRequest>;

  constructor(requests: TrustedQuotationRequests = {}) {
    this.requests = new Map(
      Object.entries(requests).map(([recordId, request]) => [recordId, sayingRequestSchema.parse(request)]),
    );
  }

  validate(record: ArchiveRecord, response: SayingResponse): SayingResponse {
    try {
      return validateSayingResponseForRequest(response, this.requestFor(record));
    } catch (error) {
      if (error instanceof ArchivePersistenceError) throw error;
      throw new ArchivePersistenceError(
        "SAYING_CONFLICT",
        `The quotation proposed for ${record.title} does not exactly match its trusted source-checked bank; regenerate from the published choices. No Archive data was changed.`,
        { cause: error },
      );
    }
  }

  assertDefaults(defaultState: ArchiveState): void {
    const defaults = archiveStateSchema.parse(defaultState);
    for (const record of defaults.records) {
      if (record.acceptedSaying === null) continue;
      const request = this.requestFor(record);
      const permitted = request.allowedQuotations.some(
        (quotation) =>
          formatSayingForArchive({ kind: "quotation", saying: quotation.text, quotation }) ===
          record.acceptedSaying,
      );
      if (!permitted) {
        throw new ArchivePersistenceError(
          "SAYING_CONFLICT",
          `The default quotation for ${record.title} is not in its trusted source-checked quotation bank. Fix the published catalogue before opening Badge. No Archive data was changed.`,
        );
      }
    }
  }

  assertRecordBound(record: ArchiveRecord): void {
    this.requestFor(record);
  }

  hasTrustedAcceptedSaying(record: ArchiveRecord): boolean {
    if (record.acceptedSaying === null) return false;
    return this.requestFor(record).allowedQuotations.some(
      (quotation) =>
        formatSayingForArchive({ kind: "quotation", saying: quotation.text, quotation }) ===
        record.acceptedSaying,
    );
  }

  trustedAcceptedQuotation(record: ArchiveRecord): HistoricalQuotation | null {
    if (record.acceptedSaying === null) return null;
    const request = this.requests.get(record.recordId);
    if (!request || request.title !== record.title || request.criterion !== record.criterion) return null;
    return (
      request.allowedQuotations.find(
        (quotation) =>
          formatSayingForArchive({ kind: "quotation", saying: quotation.text, quotation }) ===
          record.acceptedSaying,
      ) ?? null
    );
  }

  uniquenessReservedQuotationTexts(record: ArchiveRecord): readonly string[] {
    const trustedQuotation = this.trustedAcceptedQuotation(record);
    if (trustedQuotation) return [trustedQuotation.text];
    return reservedAcceptedSayingTexts(record.acceptedSaying);
  }

  trustedQuotationBank(record: ArchiveRecord): readonly HistoricalQuotation[] {
    return this.requestFor(record).allowedQuotations;
  }

  private requestFor(record: ArchiveRecord): SayingRequest {
    const request = this.requests.get(record.recordId);
    if (!request) {
      throw new ArchivePersistenceError(
        "SAYING_CONFLICT",
        `No trusted quotation bank is registered for ${record.title}; publish a record-bound source-checked bank before changing or activating its quote. No Archive data was changed.`,
      );
    }
    if (request.title !== record.title || request.criterion !== record.criterion) {
      throw new ArchivePersistenceError(
        "SAYING_CONFLICT",
        `The trusted quotation bank for ${record.recordId} is bound to different achievement wording; republish it for ${record.title} before changing or activating its quote. No Archive data was changed.`,
      );
    }
    return request;
  }
}

function reservedAcceptedSayingTexts(acceptedSaying: string | null): readonly string[] {
  if (acceptedSaying === null) return [];
  const possibleTexts = new Set([acceptedSaying]);
  if (acceptedSaying.startsWith("“")) {
    let separatorIndex = acceptedSaying.indexOf("” — ", 1);
    while (separatorIndex >= 0) {
      possibleTexts.add(acceptedSaying.slice(1, separatorIndex));
      separatorIndex = acceptedSaying.indexOf("” — ", separatorIndex + 1);
    }
  }
  return [...possibleTexts];
}
