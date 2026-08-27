import type { HistoricalQuotation } from "@badge/saying-contract";
import type { FixtureHistoricalQuotation } from "@badge/catalogue-fixtures/archive";
import { formatSayingForArchive } from "@badge/saying-contract";

export interface QuotationBankFixture {
  readonly defaultQuotationId: string;
  readonly historicalQuotations: readonly FixtureHistoricalQuotation[];
}

export function formatFixtureQuotation(quotation: FixtureHistoricalQuotation): string {
  return formatSayingForArchive({ kind: "quotation", saying: quotation.text, quotation });
}

export function defaultFixtureQuotation(badge: QuotationBankFixture): FixtureHistoricalQuotation {
  const quotation = badge.historicalQuotations.find((candidate) => candidate.id === badge.defaultQuotationId);
  if (!quotation) {
    throw new Error(
      `Published badge bank names missing default quotation ${badge.defaultQuotationId}; publish a source-checked quotation with that exact ID.`,
    );
  }
  return quotation;
}

export function acceptedFixtureQuotation(
  badge: QuotationBankFixture | undefined,
  acceptedSaying: string | null | undefined,
): HistoricalQuotation | null {
  if (!badge || !acceptedSaying) return null;
  return (
    badge.historicalQuotations.find((quotation) => formatFixtureQuotation(quotation) === acceptedSaying) ??
    null
  );
}

export function alternativeFixtureQuotations(
  badge: QuotationBankFixture,
  acceptedSaying: string | null | undefined,
): HistoricalQuotation[] {
  const accepted = acceptedFixtureQuotation(badge, acceptedSaying);
  return badge.historicalQuotations
    .filter((quotation) => quotation.id !== accepted?.id)
    .map((quotation) => ({ ...quotation }));
}
