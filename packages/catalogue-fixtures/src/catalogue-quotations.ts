import { catalogueQuotationBanksByDefinitionId as sourceBanks } from "@badge/catalogue-quotation-data";

import type { FixtureHistoricalQuotation } from "./types";

export type FixtureQuotationBank = readonly [FixtureHistoricalQuotation, FixtureHistoricalQuotation];

function fixtureQuotation(quotation: (typeof sourceBanks)[string][number]): FixtureHistoricalQuotation {
  return Object.freeze({
    id: quotation.quotationId.replace(/^historic-quotation\//u, ""),
    text: quotation.text,
    person: quotation.personName,
    personWikipediaUrl: quotation.personWikipediaUrl,
    sourceTitle: quotation.sourceTitle,
    sourceUrl: quotation.sourceUrl,
  });
}

export const catalogueQuotationBanksByDefinitionId: Readonly<Record<string, FixtureQuotationBank>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(sourceBanks).map(([definitionId, bank]) => {
        const fixtureBank: FixtureQuotationBank = [fixtureQuotation(bank[0]), fixtureQuotation(bank[1])];
        return [definitionId, Object.freeze(fixtureBank)] as const;
      }),
    ),
  );

export function fixtureQuotationBankForDefinition(definitionId: string): FixtureQuotationBank {
  const bank = catalogueQuotationBanksByDefinitionId[definitionId];
  if (!bank) {
    throw new Error(
      `Catalogue badge ${definitionId} has no compiled record-private quotation bank; refresh the quotation data before publishing fixtures.`,
    );
  }
  return bank;
}
