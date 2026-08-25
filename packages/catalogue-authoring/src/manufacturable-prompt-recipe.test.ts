import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { artStyleLibrary } from "./art-styles.js";
import {
  compileCandidatePromptForRecipe,
  compileManufacturableCandidatePrompt,
  CURRENT_PROMPT_RECIPE_REF,
  MANUFACTURABLE_PROMPT_RECIPE_REF,
  manufacturingTreatmentByFamily,
  SMALL_BADGE_MANUFACTURING_LIMITS,
} from "./manufacturable-prompt-recipe.js";
import { nationalParkCampaign } from "./national-parks-campaign.js";
import { compileCandidatePrompt, PROMPT_RECIPE_REF } from "./prompt-recipe.js";

describe("the manufacturable small-badge source-art prompt recipe", () => {
  it("publishes exact scale, form, palette, gap, and thumbnail limits", () => {
    expect(MANUFACTURABLE_PROMPT_RECIPE_REF).toEqual({ id: "badge-source-art", revision: 2 });
    expect(CURRENT_PROMPT_RECIPE_REF).toEqual(MANUFACTURABLE_PROMPT_RECIPE_REF);
    expect(SMALL_BADGE_MANUFACTURING_LIMITS).toEqual({
      referenceWidthMillimeters: 32,
      primaryForms: { minimum: 3, maximum: 5 },
      supportingAccentsMaximum: 3,
      colorFamiliesMaximum: 6,
      minimumRecognitionFeatureMillimeters: 1,
      minimumRecognitionFeaturePercentOfWidth: 3.125,
      minimumNegativeGapMillimeters: 0.8,
      minimumNegativeGapPercentOfWidth: 2.5,
      thumbnailProofPixels: 48,
    });
  });

  it("compiles every park candidate deterministically under the hard miniature contract", () => {
    const prompts = new Set<string>();
    for (const project of nationalParkCampaign) {
      for (const candidate of project.candidates) {
        const first = compileManufacturableCandidatePrompt(project.brief, candidate);
        const second = compileManufacturableCandidatePrompt(project.brief, candidate);

        expect(first).toEqual(second);
        expect(first.recipe).toEqual(MANUFACTURABLE_PROMPT_RECIPE_REF);
        expect(new TextEncoder().encode(first.prompt).byteLength).toBeLessThanOrEqual(16 * 1024);
        expect(first.prompt).toContain("3 to 5 primary forms");
        expect(first.prompt).toContain("no more than 3 supporting accents");
        expect(first.prompt).toContain("no more than 6 visually distinct color families");
        expect(first.prompt).toContain("recognition-critical form or mark must be at least 1 mm");
        expect(first.prompt).toContain("0.8 mm (2.5% of width)");
        expect(first.prompt).toContain("process construction line");
        expect(first.prompt).toContain("48 × 48 pixels");
        expect(first.prompt).toMatch(/no microdetail/iu);
        expect(first.prompt).toMatch(/no words, letters, numerals/iu);
        expect(first.prompt).toMatch(/do not depict a finished badge, patch, pin, coin/iu);
        prompts.add(first.prompt);
      }
    }
    expect(prompts.size).toBe(63 * 3);
  });

  it("translates every registered style family into a production-compatible face medium", () => {
    const registeredFamilies = new Set(artStyleLibrary.map((style) => style.family));
    expect(new Set(Object.keys(manufacturingTreatmentByFamily))).toEqual(registeredFamilies);

    const expectedMedia = [
      ["thread-painted-embroidery", /embroidery or woven-thread face artwork/iu, 1.25],
      ["stained-glass-field", /stained-glass or cloisonné cell artwork/iu, 0.35],
      ["wood-marquetry-landscape", /wood marquetry or fitted-inlay face artwork/iu, 0.8],
      ["relief-blockprint", /screenprinted or relief-cut spot-color face artwork/iu, 0.3],
      ["ceramic-underglaze", /underglaze color-field face artwork/iu, 0.5],
    ] as const;
    const project = nationalParkCampaign[0];
    for (const [styleId, expectedTreatment, minimumProcessLineMillimeters] of expectedMedia) {
      const compiled = compileManufacturableCandidatePrompt(project.brief, {
        ...project.candidates[0],
        styleId,
      });
      expect(compiled.prompt).toMatch(expectedTreatment);
      expect(compiled.manufacturing.treatment.minimumProcessLineMillimeters).toBe(
        minimumProcessLineMillimeters,
      );
      expect(compiled.prompt).toContain(`${minimumProcessLineMillimeters} mm`);
    }
  });

  it("makes style texture subordinate to legibility instead of preserving microdetail", () => {
    const project = nationalParkCampaign[0];
    for (const style of artStyleLibrary) {
      const compiled = compileManufacturableCandidatePrompt(project.brief, {
        ...project.candidates[0],
        styleId: style.id,
      });
      expect(compiled.prompt).toContain(
        "If a v1 style directive suggests finer texture, this miniature contract wins",
      );
      expect(compiled.prompt).toContain(
        "Merge, enlarge, or omit anything that would disappear at the proof size",
      );
    }
  });

  it("retains badge-source-art@1 byte-for-byte while current authoring opts into revision 2", () => {
    const project = nationalParkCampaign[0];
    const candidate = project.candidates[0];
    const legacyBefore = compileCandidatePrompt(project.brief, candidate);
    const current = compileManufacturableCandidatePrompt(project.brief, candidate);
    const legacyAfter = compileCandidatePrompt(project.brief, candidate);

    expect(PROMPT_RECIPE_REF).toEqual({ id: "badge-source-art", revision: 1 });
    expect(legacyAfter).toEqual(legacyBefore);
    expect(current.prompt.startsWith(`${legacyBefore.prompt}\n\n`)).toBe(true);
    expect(createHash("sha256").update(legacyAfter.prompt, "utf8").digest("hex")).toBe(
      "affa38b656f2ea1a9c95fdaa2b0b68b4474945fea8c438c1126dff59f0d6c0a7",
    );
    expect(createHash("sha256").update(current.prompt, "utf8").digest("hex")).toBe(
      "08eda0db24cda8f441e2bf18b028cf633e1d87d8a400a407171c69eef4ac7a87",
    );
    expect(compileCandidatePromptForRecipe(PROMPT_RECIPE_REF, project.brief, candidate)).toEqual(
      legacyBefore,
    );
    expect(compileCandidatePromptForRecipe(CURRENT_PROMPT_RECIPE_REF, project.brief, candidate)).toEqual(
      current,
    );
  });

  it("rejects unsupported prompt revisions instead of silently changing provenance", () => {
    const project = nationalParkCampaign[0];
    expect(() =>
      compileCandidatePromptForRecipe(
        { id: "badge-source-art", revision: 3 },
        project.brief,
        project.candidates[0],
      ),
    ).toThrow(/badge-source-art@3.*supported revisions are 1 and 2/iu);
    expect(() =>
      compileCandidatePromptForRecipe(
        { id: "unknown-recipe", revision: 2 },
        project.brief,
        project.candidates[0],
      ),
    ).toThrow(/unknown-recipe@2.*supported recipe is badge-source-art/iu);
  });
});
