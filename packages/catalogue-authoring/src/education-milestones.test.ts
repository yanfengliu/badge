import { describe, expect, it } from "vitest";

import { artStyleLibrary, findArtStyle } from "./art-styles.js";
import { manufacturingTreatmentByFamily } from "./manufacturable-prompt-recipe.js";
import {
  educationMilestoneAuthoringRecords,
  educationMilestoneCampaign,
  educationMilestonePrimaryPrompts,
  educationMilestoneQuotationBank,
} from "./education-milestones.js";

const expectedIdentity = [
  {
    definitionId: "finished-masters-degree",
    slug: "masters-degree",
    defaultQuotationId: "historic-quotation/frederick-douglass-no-struggle-1857",
  },
  {
    definitionId: "earned-unl-degree",
    slug: "university-nebraska-lincoln-degree",
    defaultQuotationId: "historic-quotation/theodore-roosevelt-hard-to-fail-1899",
  },
] as const;

const officialUnlSources = [
  "https://historicbuildings.unl.edu/building.php?b=91",
  "https://archives-spec.unl.edu/pages-to-paths/unl-library-architecture",
] as const;

describe("Life Milestone potential badge authoring", () => {
  it("defines exactly two stable, searchable potential badges without publication state", () => {
    expect(educationMilestoneAuthoringRecords).toHaveLength(2);
    expect(
      educationMilestoneAuthoringRecords.map(({ definitionId, slug, defaultQuotationId }) => ({
        definitionId,
        slug,
        defaultQuotationId,
      })),
    ).toEqual(expectedIdentity);

    for (const badge of educationMilestoneAuthoringRecords) {
      expect(badge.collectionId).toBe("life-milestones");
      expect(badge.contextLabel.length).toBeGreaterThan(0);
      expect(badge.aliases.length).toBeGreaterThanOrEqual(3);
      expect(badge.aliases.every((alias) => alias.trim().length > 0)).toBe(true);
      expect(badge.accessibleDescription.length).toBeGreaterThan(40);
      expect(badge.artBrief.badgeKey).toBe(`life-milestones/${badge.slug}`);

      const serialized = badge as unknown as Record<string, unknown>;
      for (const publicationField of [
        "availability",
        "recordId",
        "packRef",
        "renderRecipe",
        "selectedSource",
        "sourceAssetHash",
        "visualEditionId",
      ]) {
        expect(serialized, `${badge.slug} must remain a potential badge`).not.toHaveProperty(
          publicationField,
        );
      }
    }
  });

  it("uses manufacturable four-form briefs and three distinct registered treatments per badge", () => {
    const registeredStyleIds = new Set(artStyleLibrary.map((style) => style.id));

    for (const badge of educationMilestoneAuthoringRecords) {
      expect(badge.artBrief.requiredMotifs).toHaveLength(4);
      expect(badge.artBrief.requiredMotifs.length).toBeGreaterThanOrEqual(3);
      expect(badge.artBrief.requiredMotifs.length).toBeLessThanOrEqual(5);
      expect(new Set(badge.candidateStyles).size).toBe(3);
      expect(badge.candidateStyles.every((styleId) => registeredStyleIds.has(styleId))).toBe(true);

      const treatmentIds = badge.candidateStyles.map((styleId) => {
        const style = findArtStyle(styleId);
        if (!style) throw new Error(`Missing registered style ${styleId}.`);
        return manufacturingTreatmentByFamily[style.family].id;
      });
      expect(new Set(treatmentIds).size).toBe(3);

      const project = educationMilestoneCampaign.find((entry) => entry.definitionId === badge.definitionId);
      expect(project?.brief).toBe(badge.artBrief);
      expect(project?.status).toBe("source-study-planned");
      expect(project?.candidates).toHaveLength(3);
      expect(new Set(project?.candidates.map((candidate) => candidate.role)).size).toBe(3);
      expect(new Set(project?.candidates.map((candidate) => candidate.styleId)).size).toBe(3);
    }
  });

  it("compiles each primary candidate with badge-source-art@2 miniature constraints", () => {
    expect(educationMilestonePrimaryPrompts).toHaveLength(2);

    for (const compiled of educationMilestonePrimaryPrompts) {
      expect(compiled.compiled.recipe).toEqual({ id: "badge-source-art", revision: 2 });
      expect(compiled.compiled.prompt).toContain("SMALL-BADGE MANUFACTURING CONTRACT");
      expect(compiled.compiled.prompt).toContain("3 to 5 primary forms");
      expect(compiled.compiled.prompt).toContain("48 × 48 pixels");
      expect(compiled.compiled.prompt).toContain(
        "No words, letters, numerals, captions, labels, signs, signatures, logos, seals, or typography.",
      );
      expect(new TextEncoder().encode(compiled.compiled.prompt).byteLength).toBeLessThanOrEqual(16 * 1024);

      const project = educationMilestoneCampaign.find(
        (entry) => entry.definitionId === compiled.definitionId,
      );
      expect(compiled.compiled.candidateKey).toBe(project?.primaryCandidateKey);
    }
  });

  it("grounds the UNL art direction in official architecture sources without university marks", () => {
    const unl = educationMilestoneAuthoringRecords.find(
      (badge) => badge.definitionId === "earned-unl-degree",
    );
    if (!unl) throw new Error("Missing the UNL degree potential badge.");

    expect(unl.artBriefProvenance.sourceUrls).toEqual(officialUnlSources);
    expect(unl.artBrief.requiredMotifs.join(" ")).toMatch(/Mueller Tower/iu);
    expect(unl.artBrief.requiredMotifs.join(" ")).toMatch(/Love Library/iu);
    expect(unl.artBrief.requiredMotifs.join(" ")).toMatch(/cupola/iu);
    expect(unl.artBrief.requiredMotifs.join(" ")).toMatch(/campus mall/iu);

    const exclusions = unl.artBrief.excludedMotifs.join(" ");
    expect(exclusions).toMatch(/logo.*seal.*wordmark/iu);
    expect(exclusions).toMatch(/mascot.*athletic branding/iu);
    expect(exclusions).toMatch(/letter N/iu);
    expect(exclusions).toMatch(/typography/iu);
  });

  it("resolves every default to a source-cited historic figure quotation with Wikipedia", () => {
    expect(educationMilestoneQuotationBank).toHaveLength(2);

    for (const badge of educationMilestoneAuthoringRecords) {
      const quotation = educationMilestoneQuotationBank.find(
        (candidate) => candidate.quotationId === badge.defaultQuotationId,
      );
      expect(quotation, badge.title).toBeDefined();
      expect(quotation?.text).toMatch(/[.!?]$/u);
      expect(quotation?.personName).toMatch(/^[A-Z][\p{L} .'-]+$/u);
      expect(quotation?.sourceTitle.length).toBeGreaterThan(10);
      expect(quotation?.sourceCitation.length).toBeGreaterThan(40);
      expect(quotation?.sourceUrl).toMatch(/^https:\/\//u);
      expect(quotation?.personWikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//u);
      expect(quotation?.checkedAt).toBe("2026-08-25");
    }

    expect(educationMilestoneQuotationBank).toEqual([
      {
        quotationId: "historic-quotation/frederick-douglass-no-struggle-1857",
        text: "If there is no struggle, there is no progress.",
        personName: "Frederick Douglass",
        sourceTitle: "West India Emancipation address, August 3, 1857",
        sourceCitation:
          "West India Emancipation speech, Canandaigua, New York, August 3, 1857; U.S. National Archives Documented Rights exhibit.",
        sourceUrl: "https://www.archives.gov/exhibits/documented-rights/exhibit/section2/index.html",
        personWikipediaUrl: "https://en.wikipedia.org/wiki/Frederick_Douglass",
        checkedAt: "2026-08-25",
      },
      {
        quotationId: "historic-quotation/theodore-roosevelt-hard-to-fail-1899",
        text: "It is hard to fail, but it is worse never to have tried to succeed.",
        personName: "Theodore Roosevelt",
        sourceTitle: "The Strenuous Life, Hamilton Club speech, April 10, 1899",
        sourceCitation:
          "The Strenuous Life, address before the Hamilton Club, Chicago, April 10, 1899; Project Gutenberg eBook #58821.",
        sourceUrl: "https://www.gutenberg.org/files/58821/58821-h/58821-h.htm",
        personWikipediaUrl: "https://en.wikipedia.org/wiki/Theodore_Roosevelt",
        checkedAt: "2026-08-25",
      },
    ]);
  });
});
