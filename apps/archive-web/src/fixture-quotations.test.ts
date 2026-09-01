import { catalogueQuotationBanksByDefinitionId } from "@badge/catalogue-quotation-data";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { historicalQuotationSchema } from "@badge/saying-contract";
import { describe, expect, it } from "vitest";

import {
  acceptedFixtureQuotation,
  alternativeFixtureQuotations,
  defaultFixtureQuotation,
  formatFixtureQuotation,
} from "./fixture-quotations";

describe("starter fixture quotations", () => {
  it("projects each independently reviewed private source bank without changing its content", () => {
    for (const badge of starterBadges) {
      const sourceBank = catalogueQuotationBanksByDefinitionId[badge.definitionId];
      expect(sourceBank, badge.definitionId).toBeDefined();
      expect(badge.defaultQuotationId).toBe(sourceBank[0].quotationId.replace(/^historic-quotation\//u, ""));
      expect(badge.historicalQuotations).toEqual(
        sourceBank.map((quotation) => ({
          id: quotation.quotationId.replace(/^historic-quotation\//u, ""),
          text: quotation.text,
          person: quotation.personName,
          personWikipediaUrl: quotation.personWikipediaUrl,
          sourceTitle: quotation.sourceTitle,
          sourceUrl: quotation.sourceUrl,
        })),
      );
    }
  });

  it("resolves every designated default to a source-checked fixture quotation", () => {
    for (const badge of starterBadges) {
      const quotation = defaultFixtureQuotation(badge);

      expect(badge.historicalQuotations).toHaveLength(2);
      expect(new Set(badge.historicalQuotations.map((candidate) => candidate.id)).size).toBe(2);
      for (const candidate of badge.historicalQuotations) {
        expect(historicalQuotationSchema.parse(candidate)).toEqual(candidate);
        const wikipediaUrl = new URL(candidate.personWikipediaUrl!);
        expect(wikipediaUrl.protocol).toBe("https:");
        expect(wikipediaUrl.hostname).toBe("en.wikipedia.org");
        expect(wikipediaUrl.pathname).toMatch(/^\/wiki\/[A-Za-z0-9_.%()-]+$/u);
      }
      expect(quotation.id).toBe(badge.defaultQuotationId);
      expect(quotation.sourceUrl).toMatch(/^https:\/\//u);
      expect(formatFixtureQuotation(quotation)).toContain(`— ${quotation.person}, ${quotation.sourceTitle}`);
    }
  });

  it("uses one reviewed Wikipedia biography per historical figure", () => {
    const biographyByPerson = new Map<string, string>();
    for (const badge of starterBadges) {
      for (const quotation of badge.historicalQuotations) {
        if (!quotation.personWikipediaUrl) {
          throw new Error(`Starter quotation ${quotation.id} is missing its reviewed Wikipedia biography.`);
        }
        const existing = biographyByPerson.get(quotation.person);
        if (existing) expect(quotation.personWikipediaUrl).toBe(existing);
        else biographyByPerson.set(quotation.person, quotation.personWikipediaUrl);
      }
    }

    expect(biographyByPerson.size).toBeGreaterThan(1);
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
