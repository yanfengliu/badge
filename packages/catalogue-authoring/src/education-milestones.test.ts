import { catalogueQuotationBankForDefinition } from "@badge/catalogue-quotation-data";
import { describe, expect, it } from "vitest";

import { artStyleLibrary, findArtStyle } from "./art-styles.js";
import { manufacturingTreatmentByFamily } from "./manufacturable-prompt-recipe.js";
import {
  educationMilestoneAuthoringRecords,
  educationMilestoneCampaign,
  educationMilestonePrimaryPrompts,
} from "./education-milestones.js";

const expectedIdentity = [
  {
    definitionId: "finished-masters-degree",
    slug: "masters-degree",
  },
  {
    definitionId: "earned-unl-degree",
    slug: "university-nebraska-lincoln-degree",
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
      educationMilestoneAuthoringRecords.map(({ definitionId, slug }) => ({
        definitionId,
        slug,
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
    for (const badge of educationMilestoneAuthoringRecords) {
      const bank = catalogueQuotationBankForDefinition(badge.definitionId);
      expect(badge.defaultQuotationId, badge.title).toBe(bank[0].quotationId);
      for (const quotation of bank) {
        expect(quotation.text).toMatch(/[.!?]$/u);
        expect(quotation.personName).toMatch(/^[A-Z][\p{L} .'-]+$/u);
        expect(quotation.sourceTitle.length).toBeGreaterThan(5);
        expect(quotation.sourceUrl).toMatch(/^https:\/\//u);
        expect(quotation.personWikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//u);
        expect(quotation.sourceSha256).toMatch(/^[a-f0-9]{64}$/u);
      }
    }
  });
});
