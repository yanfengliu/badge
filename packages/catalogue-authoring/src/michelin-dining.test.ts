import { describe, expect, it } from "vitest";

import { findArtStyle } from "./art-styles.js";
import {
  manufacturingTreatmentByFamily,
  SMALL_BADGE_MANUFACTURING_LIMITS,
} from "./manufacturable-prompt-recipe.js";
import {
  michelinDiningAuthoringRecords,
  michelinDiningCampaign,
  michelinDiningPrimaryPrompts,
  michelinDiningQuotationBank,
  michelinDiningSet,
  michelinRestaurantResearchSeeds,
  OSCAR_WILDE_DINNER_QUOTATION,
} from "./michelin-dining.js";

describe("the named Michelin restaurant authoring edition", () => {
  it("pins the complete live three-region inventory as 132 named achievements", () => {
    expect(michelinDiningSet).toMatchObject({
      schemaVersion: 2,
      setId: "michelin-dining",
      title: "Michelin dining",
      declaredCount: 132,
      checkedAt: "2026-08-26",
      regionCounts: {
        "bay-area": 41,
        "new-york-city": 69,
        "washington-dc": 22,
      },
    });
    expect(michelinRestaurantResearchSeeds).toHaveLength(132);
    expect(michelinDiningAuthoringRecords).toHaveLength(132);
    expect(new Set(michelinDiningAuthoringRecords.map(({ definitionId }) => definitionId))).toHaveProperty(
      "size",
      132,
    );
    expect(new Set(michelinDiningAuthoringRecords.map(({ slug }) => slug))).toHaveProperty("size", 132);
    expect(
      new Set(michelinRestaurantResearchSeeds.map(({ restaurantName }) => restaurantName)),
    ).toHaveProperty("size", 132);
    expect(
      Object.fromEntries(
        Object.keys(michelinDiningSet.regionCounts).map((regionId) => [
          regionId,
          michelinRestaurantResearchSeeds.filter((seed) => seed.regionId === regionId).length,
        ]),
      ),
    ).toEqual(michelinDiningSet.regionCounts);
    expect(
      Object.fromEntries(
        [1, 2, 3].map((starCount) => [
          starCount,
          michelinRestaurantResearchSeeds.filter((seed) => seed.starCount === starCount).length,
        ]),
      ),
    ).toEqual({ 1: 96, 2: 24, 3: 12 });
  });

  it("keeps every achievement specific, searchable, and bound to individual Guide provenance", () => {
    for (const record of michelinDiningAuthoringRecords) {
      expect(record.definitionId).toBe(`michelin-dining-${record.slug}`);
      expect(record.title).toBe(`Dined at ${record.restaurant.restaurantName}`);
      expect(record.criterion).toContain(record.restaurant.restaurantName);
      expect(record.criterion).toContain("visit-date status");
      expect(record.setIds).toEqual(["michelin-dining"]);
      expect(record.aliases).toContain(record.restaurant.restaurantName);
      expect(record.aliases).toContain(record.restaurant.cuisine);
      expect(record.artBrief.badgeKey).toBe(`michelin-dining/${record.slug}`);
      expect(record.guideSource).toEqual({
        authority: "The MICHELIN Guide",
        url: record.restaurant.guideUrl,
        checkedAt: "2026-08-26",
        starCount: record.restaurant.starCount,
        usage:
          "Current listing and factual research cue; no Guide prose, photography, or branding reproduced.",
      });
      expect(record.restaurant.guideUrl).toMatch(/^https:\/\/guide\.michelin\.com\//u);
      expect(record.restaurant.evidenceSourceUrls).toContain(record.restaurant.guideUrl);
      expect(record.artBriefProvenance.sourceUrls).toEqual(record.restaurant.evidenceSourceUrls);
      expect(record.artBrief.description).toContain(record.restaurant.evidenceCue);
      expect(["interior", "dish", "culture"]).toContain(record.restaurant.cueType);
    }
  });

  it("turns each factual cue into bounded miniature-safe forms and diverse registered treatments", () => {
    const usedStyles = new Set<string>();
    const usedTreatments = new Set<string>();
    for (const record of michelinDiningAuthoringRecords) {
      const brief = record.manufacturingArtBrief;
      expect(brief.referenceWidthMillimeters).toBe(
        SMALL_BADGE_MANUFACTURING_LIMITS.referenceWidthMillimeters,
      );
      expect(brief.thumbnailProofPixels).toBe(SMALL_BADGE_MANUFACTURING_LIMITS.thumbnailProofPixels);
      expect(brief.primaryForms.length).toBeGreaterThanOrEqual(3);
      expect(brief.primaryForms.length).toBeLessThanOrEqual(5);
      expect(brief.supportingAccents.length).toBeLessThanOrEqual(3);
      expect(brief.colorFamilies.length).toBeGreaterThanOrEqual(3);
      expect(brief.colorFamilies.length).toBeLessThanOrEqual(6);
      expect(record.treatmentChoices).toHaveLength(3);
      expect(new Set(record.treatmentChoices.map(({ styleId }) => styleId)).size).toBe(3);
      expect(record.artBrief.excludedMotifs.join(" ")).toMatch(/logo/u);
      expect(record.artBrief.excludedMotifs.join(" ")).toMatch(/star pictogram/u);
      expect(record.artBrief.excludedMotifs.join(" ")).toMatch(/photographic copying/u);
      expect(record.artBrief.excludedMotifs.join(" ")).toMatch(/microdetail/u);

      for (const choice of record.treatmentChoices) {
        const style = findArtStyle(choice.styleId);
        expect(style, `${record.slug}: ${choice.styleId}`).toBeTruthy();
        expect(choice).toEqual({
          styleId: style?.id,
          styleRevision: style?.revision,
          treatmentId: style ? manufacturingTreatmentByFamily[style.family].id : undefined,
          treatmentRevision: style ? manufacturingTreatmentByFamily[style.family].revision : undefined,
          treatmentLabel: style ? manufacturingTreatmentByFamily[style.family].label : undefined,
        });
        usedStyles.add(choice.styleId);
        usedTreatments.add(choice.treatmentId);
      }
    }
    expect(usedStyles.size).toBeGreaterThanOrEqual(12);
    expect(usedTreatments.size).toBeGreaterThanOrEqual(8);
  });

  it("compiles one deterministic v2 source-art plan per named restaurant", () => {
    expect(michelinDiningCampaign).toHaveLength(132);
    expect(michelinDiningPrimaryPrompts).toHaveLength(132);
    for (const [index, record] of michelinDiningAuthoringRecords.entries()) {
      const project = michelinDiningCampaign[index];
      const prompt = michelinDiningPrimaryPrompts[index];
      const expectedRole =
        record.restaurant.cueType === "interior" ? "landmark-witness" : "emblematic-metaphor";
      expect(project?.definitionId).toBe(record.definitionId);
      expect(project?.candidates).toHaveLength(3);
      expect(project?.primaryCandidateKey).toBe(`${record.definitionId}:${expectedRole}`);
      expect(prompt?.definitionId).toBe(record.definitionId);
      expect(prompt?.compiled).toEqual(record.primaryPrompt);
      expect(prompt?.compiled.role.id).toBe(expectedRole);
      if (record.restaurant.cueType !== "interior") {
        expect(prompt?.compiled.prompt).not.toContain("strong literal landmark silhouette");
      }
      expect(prompt?.compiled.recipe).toEqual({ id: "badge-source-art", revision: 2 });
      expect(prompt?.compiled.prompt).toContain("32 mm physical width");
      expect(prompt?.compiled.prompt).toContain("48 × 48");
      expect(prompt?.compiled.prompt).toContain("Use no more than 6 visually distinct color families");
    }
  });

  it("preselects only a verified real-historic-figure quotation with source and biography URLs", () => {
    expect(michelinDiningQuotationBank).toEqual([OSCAR_WILDE_DINNER_QUOTATION]);
    expect(OSCAR_WILDE_DINNER_QUOTATION).toMatchObject({
      quotationId: "historic-quotation/oscar-wilde-good-dinner",
      personName: "Oscar Wilde",
      sourceTitle: "A Woman of No Importance",
      sourceUrl: "https://www.gutenberg.org/cache/epub/854/pg854-images.html",
      personWikipediaUrl: "https://en.wikipedia.org/wiki/Oscar_Wilde",
      checkedAt: "2026-08-26",
    });
    for (const record of michelinDiningAuthoringRecords) {
      expect(record.defaultQuotationId).toBe(OSCAR_WILDE_DINNER_QUOTATION.quotationId);
      expect(record.defaultQuotation).toEqual(OSCAR_WILDE_DINNER_QUOTATION);
      expect(record.defaultQuotation.personWikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//u);
      expect(record.defaultQuotation.sourceUrl).toMatch(/^https:\/\//u);
    }
  });
});
