import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  measureMiniatureResidual,
  renderFlatRecipe,
  resizeRgbaBilinear,
} from "../../../scripts/code-native-art/flat-raster.mjs";
import { videoGameAuthoringRecords } from "./video-games-edition.ts";
import {
  codeNativeVideoGameArtProfiles,
  codeNativeVideoGameRecipes,
} from "./code-native-art-recipes-video-games.ts";

describe("code-native video-game badge art", () => {
  it("binds one explicit abstract profile and recipe to every game", () => {
    const expectedSlugs = videoGameAuthoringRecords.map(({ slug }) => slug).sort();
    expect(videoGameAuthoringRecords).toHaveLength(50);
    expect(codeNativeVideoGameArtProfiles.map(({ slug }) => slug).sort()).toEqual(expectedSlugs);
    expect(codeNativeVideoGameRecipes.map(({ slug }) => slug).sort()).toEqual(expectedSlugs);
    expect(new Set(codeNativeVideoGameArtProfiles.map(({ signatureKey }) => signatureKey)).size).toBe(50);

    for (const [index, record] of videoGameAuthoringRecords.entries()) {
      const recipe = codeNativeVideoGameRecipes[index];
      expect(recipe.catalogueDirectory, record.slug).toBe("video-games");
      expect(recipe.primaryStyleId, record.slug).toBe(record.candidateStyles[0]);
      expect(recipe.forms, record.slug).toEqual(record.artBrief.themeCues);
      expect(recipe.relationship, record.slug).toBe(record.artBrief.requiredMotifs[0]);
      expect(recipe.commands.length, record.slug).toBeGreaterThanOrEqual(6);
      expect(recipe.commands.length, record.slug).toBeLessThanOrEqual(8);
      expect(recipe.sourceSpecificExclusions.join(" "), record.slug).toMatch(
        /screenshot|interface|logo|character|trade dress/iu,
      );
    }
  });

  it("keeps all fifty broad compositions distinct and legible at 48 pixels", () => {
    const sourceHashes = new Set();
    const exact48Hashes = new Set();
    for (const recipe of codeNativeVideoGameRecipes) {
      const source = renderFlatRecipe(recipe);
      expect(measureMiniatureResidual(source, 48), recipe.slug).toBeLessThanOrEqual(0.035);
      sourceHashes.add(createHash("sha256").update(source.data).digest("hex"));
      exact48Hashes.add(createHash("sha256").update(resizeRgbaBilinear(source, 48).data).digest("hex"));
    }
    expect(sourceHashes.size).toBe(50);
    expect(exact48Hashes.size).toBe(50);
  }, 15_000);

  it("maps all primary style labels across at least fourteen construction-family identifiers", () => {
    const primaryStyles = new Set(codeNativeVideoGameRecipes.map(({ primaryStyleId }) => primaryStyleId));
    const manufacturingLanguages = new Set(
      codeNativeVideoGameRecipes.map(({ manufacturingLanguage }) => manufacturingLanguage),
    );
    expect(primaryStyles.size).toBe(24);
    expect(manufacturingLanguages.size).toBeGreaterThanOrEqual(14);
    for (const recipe of codeNativeVideoGameRecipes) {
      expect(recipe.styleComparison, recipe.slug).toContain(recipe.primaryStyleId);
      expect(recipe.styleComparison, recipe.slug).toMatch(/visible|through/iu);
    }
  });
});
