import type { HistoricQuotationId, HistoricQuotationRecord } from "./types";

export const usStateHistoricQuotations = [
  {
    quotationId: "historic-quotation/mark-twain-travel-prejudice",
    text: "Travel is fatal to prejudice, bigotry and narrow-mindedness, and many of our people need it sorely on these accounts.",
    personName: "Mark Twain",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Mark_Twain",
    sourceTitle: "The Innocents Abroad, Conclusion",
    sourceUrl: "https://www.gutenberg.org/files/3176/3176-h/3176-h.htm#CONCLUSION",
  },
  {
    quotationId: "historic-quotation/john-muir-every-walk-nature",
    text: "But in every walk with Nature one receives far more than he seeks.",
    personName: "John Muir",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
    sourceTitle: "Steep Trails",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
  {
    quotationId: "historic-quotation/henry-david-thoreau-wildness",
    text: "In Wildness is the preservation of the World.",
    personName: "Henry David Thoreau",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Henry_David_Thoreau",
    sourceTitle: "Walking",
    sourceUrl: "https://en.wikisource.org/wiki/Excursions_(1863)_Thoreau/Walking",
  },
  {
    quotationId: "historic-quotation/john-muir-eternal-sunrise",
    text: "It's always sunrise somewhere; the dew is never all dried at once; a shower is forever falling; vapor is ever rising.",
    personName: "John Muir",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
    sourceTitle: "John of the Mountains",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
] as const satisfies readonly HistoricQuotationRecord[];

export const usStateHistoricQuotationIds = usStateHistoricQuotations.map(
  (quotation) => quotation.quotationId,
) as readonly HistoricQuotationId[];

export function defaultUsStateQuotationId(censusStateFips: string): HistoricQuotationId {
  const numericFips = Number.parseInt(censusStateFips, 10);
  const quotationId = usStateHistoricQuotationIds[numericFips % usStateHistoricQuotationIds.length];
  if (!quotationId) {
    throw new Error(
      `U.S. state Census FIPS ${censusStateFips} cannot select a historic quotation; restore the non-empty sourced state quotation bank.`,
    );
  }
  return quotationId;
}
