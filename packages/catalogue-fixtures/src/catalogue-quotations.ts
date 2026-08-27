import type { FixtureHistoricalQuotation } from "./types";

/**
 * Record-bound quotation banks for the discovery catalogue pack, one shared bank per set.
 * Every entry is copied exactly from an already source-checked release module — the starter
 * archive fixture, the U.S. state bank, the book bank, the education bank, or the Michelin
 * dining bank — so this file introduces no new wording, attribution, or source claims.
 */

export const parkQuotationBank: readonly FixtureHistoricalQuotation[] = [
  {
    id: "john-muir-mountaineers-steep-trails",
    text: "Therefore we are all, in some sense, mountaineers, and going to the mountains is going home.",
    person: "John Muir",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
    sourceTitle: "Steep Trails",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
  {
    id: "john-muir-mountains-calling-1873",
    text: "The mountains are calling and I must go.",
    person: "John Muir",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
    sourceTitle: "Letter to Sarah Muir Galloway, September 3, 1873",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
  {
    id: "john-muir-every-walk-nature",
    text: "But in every walk with Nature one receives far more than he seeks.",
    person: "John Muir",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
    sourceTitle: "Steep Trails",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
  {
    id: "fdr-american-national-parks-1934",
    text: "There is nothing so American as our national parks.",
    person: "Franklin D. Roosevelt",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Franklin_D._Roosevelt",
    sourceTitle: "Radio Address from Two Medicine Chalet, August 5, 1934",
    sourceUrl: "https://www.nps.gov/glac/learn/historyculture/fdr-radio-address.htm",
  },
  {
    id: "john-wesley-powell-naked-rock-1869",
    text: "The whole country is a region of naked rock of many colors, with cliffs and buttes about us and towering mountains in the distance.",
    person: "John Wesley Powell",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Wesley_Powell",
    sourceTitle: "Journal entry, July 28, 1869",
    sourceUrl: "https://www.nps.gov/care/learn/historyculture/explorers-and-surveyors.htm",
  },
  {
    id: "henry-david-thoreau-wildness",
    text: "In Wildness is the preservation of the World.",
    person: "Henry David Thoreau",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Henry_David_Thoreau",
    sourceTitle: "Walking",
    sourceUrl: "https://en.wikisource.org/wiki/Excursions_(1863)_Thoreau/Walking",
  },
];

export const stateQuotationBank: readonly FixtureHistoricalQuotation[] = [
  {
    id: "mark-twain-travel-prejudice",
    text: "Travel is fatal to prejudice, bigotry and narrow-mindedness, and many of our people need it sorely on these accounts.",
    person: "Mark Twain",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Mark_Twain",
    sourceTitle: "The Innocents Abroad, Conclusion",
    sourceUrl: "https://www.gutenberg.org/files/3176/3176-h/3176-h.htm#CONCLUSION",
  },
  {
    id: "john-muir-every-walk-nature",
    text: "But in every walk with Nature one receives far more than he seeks.",
    person: "John Muir",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
    sourceTitle: "Steep Trails",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
  {
    id: "henry-david-thoreau-wildness",
    text: "In Wildness is the preservation of the World.",
    person: "Henry David Thoreau",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Henry_David_Thoreau",
    sourceTitle: "Walking",
    sourceUrl: "https://en.wikisource.org/wiki/Excursions_(1863)_Thoreau/Walking",
  },
  {
    id: "john-muir-eternal-sunrise",
    text: "It's always sunrise somewhere; the dew is never all dried at once; a shower is forever falling; vapor is ever rising.",
    person: "John Muir",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
    sourceTitle: "John of the Mountains",
    sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
  },
];

export const bookQuotationBank: readonly FixtureHistoricalQuotation[] = [
  {
    id: "francis-bacon-reading-full-man",
    text: "Reading maketh a full man; conference a ready man; and writing an exact man.",
    person: "Francis Bacon",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Francis_Bacon",
    sourceTitle: "Of Studies",
    sourceUrl: "https://en.wikisource.org/wiki/The_Essays_of_Francis_Bacon/L_Of_Studies",
  },
  {
    id: "francis-bacon-histories-wise",
    text: "Histories make men wise; poets witty; the mathematics subtile; natural philosophy deep; moral grave; logic and rhetoric able to contend.",
    person: "Francis Bacon",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Francis_Bacon",
    sourceTitle: "Of Studies",
    sourceUrl: "https://en.wikisource.org/wiki/The_Essays_of_Francis_Bacon/L_Of_Studies",
  },
  {
    id: "thomas-jefferson-cannot-live-books-1815",
    text: "I cannot live without books; but fewer will suffice where amusement, and not use, is the only future object.",
    person: "Thomas Jefferson",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Thomas_Jefferson",
    sourceTitle: "Thomas Jefferson to John Adams, 10 June 1815",
    sourceUrl: "https://founders.archives.gov/documents/Jefferson/03-08-02-0425",
  },
];

export const educationQuotationBank: readonly FixtureHistoricalQuotation[] = [
  {
    id: "frederick-douglass-no-struggle-1857",
    text: "If there is no struggle, there is no progress.",
    person: "Frederick Douglass",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Frederick_Douglass",
    sourceTitle: "West India Emancipation address, August 3, 1857",
    sourceUrl: "https://www.archives.gov/exhibits/documented-rights/exhibit/section2/index.html",
  },
  {
    id: "theodore-roosevelt-hard-to-fail-1899",
    text: "It is hard to fail, but it is worse never to have tried to succeed.",
    person: "Theodore Roosevelt",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Theodore_Roosevelt",
    sourceTitle: "The Strenuous Life, Hamilton Club speech, April 10, 1899",
    sourceUrl: "https://www.gutenberg.org/files/58821/58821-h/58821-h.htm",
  },
];

export const diningQuotationBank: readonly FixtureHistoricalQuotation[] = [
  {
    id: "oscar-wilde-good-dinner",
    text: "After a good dinner one can forgive anybody, even one’s own relations.",
    person: "Oscar Wilde",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Oscar_Wilde",
    sourceTitle: "A Woman of No Importance",
    sourceUrl: "https://www.gutenberg.org/cache/epub/854/pg854-images.html",
  },
];

export const catalogueQuotationBanksBySetId: Readonly<Record<string, readonly FixtureHistoricalQuotation[]>> =
  {
    "us-national-parks": parkQuotationBank,
    "us-states": stateQuotationBank,
    "books-read": bookQuotationBank,
    "life-milestones": educationQuotationBank,
    "michelin-dining": diningQuotationBank,
  };
