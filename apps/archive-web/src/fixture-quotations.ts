import type { HistoricalQuotation } from "@badge/saying-contract";
import type { FixtureHistoricalQuotation, PublishedBadgeFixture } from "@badge/catalogue-fixtures/archive";
import { formatSayingForArchive } from "@badge/saying-contract";

export function formatFixtureQuotation(quotation: FixtureHistoricalQuotation): string {
  return formatSayingForArchive({ kind: "quotation", saying: quotation.text, quotation });
}

export function defaultFixtureQuotation(badge: PublishedBadgeFixture): FixtureHistoricalQuotation {
  const quotation = badge.historicalQuotations.find((candidate) => candidate.id === badge.defaultQuotationId);
  if (!quotation) {
    throw new Error(
      `Published badge ${badge.definitionId} names missing default quotation ${badge.defaultQuotationId}; publish a source-checked quotation with that exact ID.`,
    );
  }
  return quotation;
}

export function acceptedFixtureQuotation(
  badge: PublishedBadgeFixture | undefined,
  acceptedSaying: string | null | undefined,
): HistoricalQuotation | null {
  if (!badge || !acceptedSaying) return null;
  return (
    badge.historicalQuotations.find((quotation) => formatFixtureQuotation(quotation) === acceptedSaying) ??
    null
  );
}

export function alternativeFixtureQuotations(
  badge: PublishedBadgeFixture,
  acceptedSaying: string | null | undefined,
): HistoricalQuotation[] {
  const accepted = acceptedFixtureQuotation(badge, acceptedSaying);
  return badge.historicalQuotations
    .filter((quotation) => quotation.id !== accepted?.id)
    .map((quotation) => ({ ...quotation }));
}
