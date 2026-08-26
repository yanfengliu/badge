import { buildBookAuthoringCampaign } from "./book-authoring-campaign";
import { defineBook } from "./book-authoring-record";
import type { BookAuthoringRecord } from "./book-authoring-record";
import { buildBookPrimaryPrompts } from "./book-primary-prompts";
import { bookHistoricQuotations } from "./book-quotations";
import { classicAndHistoryBookSeeds } from "./book-seeds-classics-history";
import { literaryAndNonfictionBookSeeds } from "./book-seeds-literary-nonfiction";
import { scienceAndPhilosophyBookSeeds } from "./book-seeds-science-philosophy";
import { technologyAndSpeculativeBookSeeds } from "./book-seeds-technology-speculative";

export interface BookAuthoringEdition {
  readonly schemaVersion: 1;
  readonly catalogueId: "books-read";
  readonly edition: "2026-08-25.badge-editorial-50@1";
  readonly declaredCount: 50;
  readonly scope: string;
}

export const bookAuthoringEdition: BookAuthoringEdition = {
  schemaVersion: 1,
  catalogueId: "books-read",
  edition: "2026-08-25.badge-editorial-50@1",
  declaredCount: 50,
  scope:
    "Fifty single-work reading achievements curated for the owner's Books Read set; excludes the separately published Sapiens fixture.",
};

const bookSeeds = [
  ...classicAndHistoryBookSeeds,
  ...scienceAndPhilosophyBookSeeds,
  ...technologyAndSpeculativeBookSeeds,
  ...literaryAndNonfictionBookSeeds,
] as const;

export const bookAuthoringRecords: readonly BookAuthoringRecord[] = bookSeeds.map(defineBook);

export const bookAuthoringCampaign = buildBookAuthoringCampaign(bookAuthoringRecords);

export const bookPrimaryPrompts = buildBookPrimaryPrompts(bookAuthoringCampaign);

export { bookHistoricQuotations };
export type { BookAuthoringRecord, BookCategory } from "./book-authoring-record";
export type { BookPrimaryPrompt } from "./book-primary-prompts";
