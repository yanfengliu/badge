import type { BookCategory } from "./book-authoring-record";
import type { HistoricQuotationId, HistoricQuotationRecord } from "./types";

export const bookHistoricQuotations = [
  {
    quotationId: "historic-quotation/francis-bacon-reading-full-man",
    text: "Reading maketh a full man; conference a ready man; and writing an exact man.",
    personName: "Francis Bacon",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Francis_Bacon",
    sourceTitle: "Of Studies",
    sourceUrl: "https://en.wikisource.org/wiki/The_Essays_of_Francis_Bacon/L_Of_Studies",
  },
  {
    quotationId: "historic-quotation/francis-bacon-histories-wise",
    text: "Histories make men wise; poets witty; the mathematics subtile; natural philosophy deep; moral grave; logic and rhetoric able to contend.",
    personName: "Francis Bacon",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Francis_Bacon",
    sourceTitle: "Of Studies",
    sourceUrl: "https://en.wikisource.org/wiki/The_Essays_of_Francis_Bacon/L_Of_Studies",
  },
  {
    quotationId: "historic-quotation/thomas-jefferson-cannot-live-books-1815",
    text: "I cannot live without books; but fewer will suffice where amusement, and not use, is the only future object.",
    personName: "Thomas Jefferson",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Thomas_Jefferson",
    sourceTitle: "Thomas Jefferson to John Adams, 10 June 1815",
    sourceUrl: "https://founders.archives.gov/documents/Jefferson/03-08-02-0425",
  },
] as const satisfies readonly HistoricQuotationRecord[];

const defaultQuotationByCategory: Readonly<Record<BookCategory, HistoricQuotationId>> = {
  classic: "historic-quotation/francis-bacon-reading-full-man",
  history: "historic-quotation/francis-bacon-histories-wise",
  science: "historic-quotation/francis-bacon-histories-wise",
  philosophy: "historic-quotation/francis-bacon-histories-wise",
  technology: "historic-quotation/thomas-jefferson-cannot-live-books-1815",
  "speculative-fiction": "historic-quotation/francis-bacon-reading-full-man",
  "literary-fiction": "historic-quotation/francis-bacon-reading-full-man",
  "modern-nonfiction": "historic-quotation/thomas-jefferson-cannot-live-books-1815",
};

export function defaultBookQuotationId(category: BookCategory): HistoricQuotationId {
  return defaultQuotationByCategory[category];
}
