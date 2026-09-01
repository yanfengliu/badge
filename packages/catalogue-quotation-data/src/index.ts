import { diningGamesQuotationRows } from "./dining-games-data.ts";
import { buildCatalogueQuotationRegistry } from "./registry.ts";
import { travelLearningQuotationRows } from "./travel-learning-data.ts";

export const CATALOGUE_QUOTATIONS_CHECKED_AT = "2026-08-31" as const;

export const catalogueQuotationBanksByDefinitionId = buildCatalogueQuotationRegistry([
  { label: "travel-learning", rows: travelLearningQuotationRows },
  { label: "dining-games", rows: diningGamesQuotationRows },
]);

export function catalogueQuotationBankForDefinition(definitionId: string) {
  const bank = catalogueQuotationBanksByDefinitionId[definitionId];
  if (!bank) {
    throw new Error(
      `Catalogue badge ${definitionId} has no record-private source-checked quotation bank; curate slots 1 and 2 before publishing it.`,
    );
  }
  return bank;
}

export type {
  CatalogueQuotationBank,
  CatalogueQuotationSlot,
  CatalogueQuotationSourceRecord,
} from "./types.ts";
