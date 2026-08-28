import type { HistoricQuotationId, HistoricQuotationRecord } from "./types";

const hamletPlayQuotationId: HistoricQuotationId = "historic-quotation/william-shakespeare-plays-the-thing";

export const videoGameHistoricQuotations = [
  {
    quotationId: hamletPlayQuotationId,
    text: "The play’s the thing Wherein I’ll catch the conscience of the King.",
    personName: "William Shakespeare",
    sourceTitle: "Hamlet, Act II, Scene II",
    sourceUrl: "https://www.gutenberg.org/files/1524/1524-h/1524-h.htm",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/William_Shakespeare",
  },
] as const satisfies readonly HistoricQuotationRecord[];

export function defaultVideoGameQuotationId(): HistoricQuotationId {
  return hamletPlayQuotationId;
}
