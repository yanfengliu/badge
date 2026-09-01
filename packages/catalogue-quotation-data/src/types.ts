export type CatalogueQuotationSlot = 1 | 2;

export interface CatalogueQuotationSourceRecord {
  readonly definitionId: string;
  readonly slot: CatalogueQuotationSlot;
  readonly quotationId: `historic-quotation/${string}`;
  readonly text: string;
  readonly personName: string;
  readonly personWikipediaUrl: string;
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly sourceSha256: string;
}

export type CatalogueQuotationBank = readonly [
  CatalogueQuotationSourceRecord,
  CatalogueQuotationSourceRecord,
];
