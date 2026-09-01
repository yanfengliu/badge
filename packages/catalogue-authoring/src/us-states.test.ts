import { catalogueQuotationBankForDefinition } from "@badge/catalogue-quotation-data";
import { describe, expect, it } from "vitest";

import { findArtStyle } from "./art-styles.js";
import { compileCandidatePrompt } from "./prompt-recipe.js";
import { usStateCampaign } from "./us-states-campaign.js";
import { usStateHistoricQuotations } from "./us-state-quotations.js";
import { usStateCatalogueEdition, usStates } from "./us-states.js";

const CENSUS_STATE_IDENTITIES = [
  ["01", "AL", "Alabama"],
  ["02", "AK", "Alaska"],
  ["04", "AZ", "Arizona"],
  ["05", "AR", "Arkansas"],
  ["06", "CA", "California"],
  ["08", "CO", "Colorado"],
  ["09", "CT", "Connecticut"],
  ["10", "DE", "Delaware"],
  ["12", "FL", "Florida"],
  ["13", "GA", "Georgia"],
  ["15", "HI", "Hawaii"],
  ["16", "ID", "Idaho"],
  ["17", "IL", "Illinois"],
  ["18", "IN", "Indiana"],
  ["19", "IA", "Iowa"],
  ["20", "KS", "Kansas"],
  ["21", "KY", "Kentucky"],
  ["22", "LA", "Louisiana"],
  ["23", "ME", "Maine"],
  ["24", "MD", "Maryland"],
  ["25", "MA", "Massachusetts"],
  ["26", "MI", "Michigan"],
  ["27", "MN", "Minnesota"],
  ["28", "MS", "Mississippi"],
  ["29", "MO", "Missouri"],
  ["30", "MT", "Montana"],
  ["31", "NE", "Nebraska"],
  ["32", "NV", "Nevada"],
  ["33", "NH", "New Hampshire"],
  ["34", "NJ", "New Jersey"],
  ["35", "NM", "New Mexico"],
  ["36", "NY", "New York"],
  ["37", "NC", "North Carolina"],
  ["38", "ND", "North Dakota"],
  ["39", "OH", "Ohio"],
  ["40", "OK", "Oklahoma"],
  ["41", "OR", "Oregon"],
  ["42", "PA", "Pennsylvania"],
  ["44", "RI", "Rhode Island"],
  ["45", "SC", "South Carolina"],
  ["46", "SD", "South Dakota"],
  ["47", "TN", "Tennessee"],
  ["48", "TX", "Texas"],
  ["49", "UT", "Utah"],
  ["50", "VT", "Vermont"],
  ["51", "VA", "Virginia"],
  ["53", "WA", "Washington"],
  ["54", "WV", "West Virginia"],
  ["55", "WI", "Wisconsin"],
  ["56", "WY", "Wyoming"],
] as const;

describe("the sourced 50 U.S. states authoring edition", () => {
  it("freezes the Census state FIPS identities while excluding non-state equivalents", () => {
    expect(usStateCatalogueEdition).toEqual({
      schemaVersion: 1,
      catalogueId: "us-states",
      edition: "2021-10-08.census-ansi",
      declaredCount: 50,
      source: {
        authority: "U.S. Census Bureau",
        url: "https://www.census.gov/library/reference/code-lists/ansi/ansi-codes-for-states.html",
        section: "FIPS Codes for the States and District of Columbia",
        pageLastUpdated: "2021-10-08",
        retrievedAt: "2026-08-24",
        scope: "The 50 U.S. states; excludes the District of Columbia, Puerto Rico, and insular areas.",
      },
    });
    expect(usStates.map((state) => [state.censusStateFips, state.postalCode, state.name])).toEqual(
      CENSUS_STATE_IDENTITIES,
    );
    expect(usStates).toHaveLength(50);
    expect(usStates.some((state) => state.censusStateFips === "11")).toBe(false);
  });

  it("uses FIPS-bound stable definition and authoring identities", () => {
    expect(new Set(usStates.map((state) => state.definitionId)).size).toBe(50);
    expect(new Set(usStates.map((state) => state.slug)).size).toBe(50);
    for (const state of usStates) {
      expect(state.definitionId).toBe(`visited-us-state-${state.censusStateFips}`);
      expect(state.artBrief.badgeKey).toBe(`us-states/${state.censusStateFips}`);
      expect(state.criterion).toBe(`Visit ${state.name}`);
      expect(state.artBrief.requiredMotifs[0].length, state.name).toBeGreaterThan(12);
      expect(state.artBrief.themeCues).toHaveLength(3);
      expect(state.candidateStyles).toHaveLength(3);
      expect(new Set(state.candidateStyles).size, state.name).toBe(3);
      expect(state.defaultQuotationId, state.name).toBe(
        catalogueQuotationBankForDefinition(state.definitionId)[0].quotationId,
      );
      expect(state.artBriefProvenance.kind).toBe("curated-editorial");
      expect(state.artBriefProvenance.note).toContain("Census source establishes state identity only");
    }
    const newYork = usStates.find((state) => state.postalCode === "NY");
    expect(newYork?.artBrief.excludedMotifs).toContain(
      "mountains, hills, or wilderness peaks anywhere in the scene",
    );
    expect(newYork?.artBriefProvenance.sourceUrls).toEqual([
      "https://parks.ny.gov/visit/state-parks/niagara-falls-state-park",
    ]);
  });

  it("retains the previous source-linked state bank as explicit migration provenance", () => {
    expect(usStateHistoricQuotations).toEqual([
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
    ]);
    for (const quotation of usStateHistoricQuotations) {
      expect(quotation.quotationId).toMatch(/^historic-quotation\//u);
      expect(quotation.text.length).toBeGreaterThan(20);
      expect(quotation.personName).toMatch(/\S+\s+\S+/u);
      if (quotation.personWikipediaUrl !== undefined) {
        expect(quotation.personWikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//u);
      }
      expect(quotation.sourceUrl).toMatch(/^https:\/\//u);
    }
  });

  it("plans three deterministic role-distinct source studies with a truthful primary", () => {
    expect(usStateCampaign).toHaveLength(50);
    const compiledKeys = new Set<string>();
    for (const [index, project] of usStateCampaign.entries()) {
      const state = usStates[index]!;
      expect(project.status).toBe("source-study-planned");
      expect(project.definitionId).toBe(state.definitionId);
      expect(project.primaryCandidateKey).toBe(`${state.definitionId}:landmark-witness`);
      expect(new Set(project.candidates.map((candidate) => candidate.role))).toEqual(
        new Set(["landmark-witness", "emblematic-metaphor", "terrain-memory"]),
      );
      expect(project.candidates.map((candidate) => candidate.styleId)).toEqual(state.candidateStyles);
      expect(
        project.candidates.some((candidate) => candidate.candidateKey === project.primaryCandidateKey),
      ).toBe(true);
      for (const candidate of project.candidates) {
        expect(findArtStyle(candidate.styleId), `${state.name}: ${candidate.styleId}`).toBeTruthy();
        const first = compileCandidatePrompt(project.brief, candidate);
        const second = compileCandidatePrompt(project.brief, candidate);
        expect(first).toEqual(second);
        expect(first.prompt).toContain(state.name);
        compiledKeys.add(candidate.candidateKey);
      }
    }
    expect(compiledKeys.size).toBe(150);
  });

  it("uses the complete existing style registry without allowing one primary style to dominate", () => {
    const allAssignments = usStates.flatMap((state) => [...state.candidateStyles]);
    const primaryCounts = new Map<string, number>();
    for (const state of usStates) {
      const primary = state.candidateStyles[0];
      primaryCounts.set(primary, (primaryCounts.get(primary) ?? 0) + 1);
    }
    expect(new Set(allAssignments).size).toBe(24);
    expect(primaryCounts.size).toBe(24);
    expect(Math.max(...primaryCounts.values())).toBeLessThanOrEqual(3);
  });

  it("carries authoring data only and does not claim selected, published, or personal state", () => {
    const forbiddenFields = [
      "acceptedSaying",
      "activatedAt",
      "historicalQuotations",
      "packRef",
      "quotation",
      "recordId",
      "renderRecipe",
      "selectedSource",
      "sourceAssetHash",
      "visibility",
    ];
    for (const state of usStates) {
      const fields = Object.keys(state);
      expect(
        fields.some((field) => forbiddenFields.includes(field)),
        state.name,
      ).toBe(false);
    }
    for (const project of usStateCampaign) {
      const fields = Object.keys(project);
      expect(fields).not.toContain("selectedCandidateKey");
      expect(fields).not.toContain("selectedSource");
    }
  });
});
