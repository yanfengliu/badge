import { describe, expect, it } from "vitest";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { historicalQuotationSchema } from "@badge/saying-contract";

import {
  acceptedFixtureQuotation,
  alternativeFixtureQuotations,
  defaultFixtureQuotation,
  formatFixtureQuotation,
} from "./fixture-quotations";

// This is the reviewed starter quotation manifest, not a shape-only snapshot.
// Any wording, attribution, title, or URL change requires a fresh primary-source review.
const approvedStarterQuotationManifest = [
  {
    definitionId: "visited-yosemite",
    defaultQuotationId: "john-muir-yosemite-temple-1868",
    quotations: [
      {
        id: "john-muir-yosemite-temple-1868",
        text: "It is by far the grandest of all the special temples of Nature I was ever permitted to enter.",
        person: "John Muir",
        sourceTitle: "Letters to a Friend, July 26, 1868",
        sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
      },
      {
        id: "john-muir-mountaineers-steep-trails",
        text: "Therefore we are all, in some sense, mountaineers, and going to the mountains is going home.",
        person: "John Muir",
        sourceTitle: "Steep Trails",
        sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
      },
      {
        id: "john-muir-mountains-calling-1873",
        text: "The mountains are calling and I must go.",
        person: "John Muir",
        sourceTitle: "Letter to Sarah Muir Galloway, September 3, 1873",
        sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
      },
    ],
  },
  {
    definitionId: "read-sapiens",
    defaultQuotationId: "francis-bacon-reading-full-man",
    quotations: [
      {
        id: "francis-bacon-reading-full-man",
        text: "Reading maketh a full man; conference a ready man; and writing an exact man.",
        person: "Francis Bacon",
        sourceTitle: "Of Studies",
        sourceUrl: "https://en.wikisource.org/wiki/The_Essays_of_Francis_Bacon/L_Of_Studies",
      },
      {
        id: "francis-bacon-histories-wise",
        text: "Histories make men wise; poets witty; the mathematics subtile; natural philosophy deep; moral grave; logic and rhetoric able to contend.",
        person: "Francis Bacon",
        sourceTitle: "Of Studies",
        sourceUrl: "https://en.wikisource.org/wiki/The_Essays_of_Francis_Bacon/L_Of_Studies",
      },
      {
        id: "thomas-jefferson-cannot-live-books-1815",
        text: "I cannot live without books; but fewer will suffice where amusement, and not use, is the only future object.",
        person: "Thomas Jefferson",
        sourceTitle: "Thomas Jefferson to John Adams, 10 June 1815",
        sourceUrl: "https://founders.archives.gov/documents/Jefferson/03-08-02-0425",
      },
    ],
  },
  {
    definitionId: "finished-bachelors-degree",
    defaultQuotationId: "frederick-douglass-no-struggle-1857",
    quotations: [
      {
        id: "frederick-douglass-no-struggle-1857",
        text: "If there is no struggle, there is no progress.",
        person: "Frederick Douglass",
        sourceTitle: "West India Emancipation address, August 3, 1857",
        sourceUrl: "https://www.archives.gov/exhibits/documented-rights/exhibit/section2/index.html",
      },
      {
        id: "booker-t-washington-success-obstacles-1901",
        text: "I have learned that success is to be measured not so much by the position that one has reached in life as by the obstacles which he has overcome while trying to succeed.",
        person: "Booker T. Washington",
        sourceTitle: "Up From Slavery, Chapter II: Boyhood Days",
        sourceUrl: "https://en.wikisource.org/wiki/Up_From_Slavery/Chapter_2",
      },
      {
        id: "theodore-roosevelt-hard-to-fail-1899",
        text: "It is hard to fail, but it is worse never to have tried to succeed.",
        person: "Theodore Roosevelt",
        sourceTitle: "The Strenuous Life, Hamilton Club speech, April 10, 1899",
        sourceUrl: "https://www.gutenberg.org/files/58821/58821-h/58821-h.htm",
      },
    ],
  },
  {
    definitionId: "visited-all-us-national-parks",
    defaultQuotationId: "john-muir-every-walk-nature",
    quotations: [
      {
        id: "john-muir-every-walk-nature",
        text: "But in every walk with Nature one receives far more than he seeks.",
        person: "John Muir",
        sourceTitle: "Steep Trails",
        sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
      },
      {
        id: "fdr-american-national-parks-1934",
        text: "There is nothing so American as our national parks.",
        person: "Franklin D. Roosevelt",
        sourceTitle: "Radio Address from Two Medicine Chalet, August 5, 1934",
        sourceUrl: "https://www.nps.gov/glac/learn/historyculture/fdr-radio-address.htm",
      },
      {
        id: "john-wesley-powell-naked-rock-1869",
        text: "The whole country is a region of naked rock of many colors, with cliffs and buttes about us and towering mountains in the distance.",
        person: "John Wesley Powell",
        sourceTitle: "Journal entry, July 28, 1869",
        sourceUrl: "https://www.nps.gov/care/learn/historyculture/explorers-and-surveyors.htm",
      },
    ],
  },
] as const;

describe("starter fixture quotations", () => {
  it("matches the exact independently reviewed starter quotation manifest", () => {
    expect(
      starterBadges.map((badge) => ({
        definitionId: badge.definitionId,
        defaultQuotationId: badge.defaultQuotationId,
        quotations: badge.historicalQuotations,
      })),
    ).toEqual(approvedStarterQuotationManifest);
  });

  it("resolves every designated default to a source-checked fixture quotation", () => {
    for (const badge of starterBadges) {
      const quotation = defaultFixtureQuotation(badge);

      expect(badge.historicalQuotations.length).toBeGreaterThan(1);
      expect(new Set(badge.historicalQuotations.map((candidate) => candidate.id)).size).toBe(
        badge.historicalQuotations.length,
      );
      for (const candidate of badge.historicalQuotations) {
        expect(historicalQuotationSchema.parse(candidate)).toEqual(candidate);
      }
      expect(quotation.id).toBe(badge.defaultQuotationId);
      expect(quotation.sourceUrl).toMatch(/^https:\/\//u);
      expect(formatFixtureQuotation(quotation)).toContain(`— ${quotation.person}, ${quotation.sourceTitle}`);
    }
  });

  it("matches the accepted fixture quote and removes it from regeneration choices", () => {
    const badge = starterBadges[0]!;
    const accepted = defaultFixtureQuotation(badge);
    const acceptedSaying = formatFixtureQuotation(accepted);

    expect(acceptedFixtureQuotation(badge, acceptedSaying)?.id).toBe(accepted.id);
    expect(alternativeFixtureQuotations(badge, acceptedSaying).map((quotation) => quotation.id)).toEqual(
      badge.historicalQuotations
        .filter((quotation) => quotation.id !== accepted.id)
        .map((quotation) => quotation.id),
    );
  });
});
