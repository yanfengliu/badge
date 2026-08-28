import { describe, expect, it } from "vitest";

import {
  CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
  codeNativeArtRecipes,
  findCodeNativeArtRecipe,
  serializeCodeNativeArtRecipe,
} from "../packages/catalogue-authoring/src/code-native-art-recipes.ts";
import { bookAuthoringRecords } from "../packages/catalogue-authoring/src/books-edition.ts";
import { educationMilestoneAuthoringRecords } from "../packages/catalogue-authoring/src/education-milestones.ts";
import { michelinRestaurantResearchSeeds } from "../packages/catalogue-authoring/src/michelin-dining.ts";
import { usNationalParks } from "../packages/catalogue-authoring/src/us-national-parks.ts";
import { usStates } from "../packages/catalogue-authoring/src/us-states.ts";
import { videoGameAuthoringRecords } from "../packages/catalogue-authoring/src/video-games-edition.ts";
import { measureMiniatureResidual, renderFlatRecipe } from "./code-native-art/flat-raster.mjs";

const EXPECTED_NON_RESTAURANT = [
  ...usNationalParks.map(({ slug }) => `national-parks/${slug}`),
  ...usStates.map(({ slug }) => `us-states/${slug}`),
  ...bookAuthoringRecords.map(({ slug }) => `books-read/${slug}`),
  ...educationMilestoneAuthoringRecords.map(({ slug }) => `life-milestones/${slug}`),
  ...videoGameAuthoringRecords.map(({ slug }) => `video-games/${slug}`),
].sort();

const SUPERSEDED_GENERIC_DINING = [
  "michelin-dining/new-york-city",
  "michelin-dining/san-francisco-surroundings",
  "michelin-dining/washington-dc",
].sort();

const EXPECTED_DIRECT_DINING = michelinRestaurantResearchSeeds
  .map(({ slug }) => `michelin-dining/${slug}`)
  .sort();
const NON_RESTAURANT_RECIPES = codeNativeArtRecipes.filter(
  ({ catalogueDirectory }) => catalogueDirectory !== "michelin-dining",
);

describe("code-native catalogue art recipes", () => {
  it("pins all 215 non-restaurant and 132 named-restaurant recipes", () => {
    const keys = codeNativeArtRecipes
      .map(({ catalogueDirectory, slug }) => `${catalogueDirectory}/${slug}`)
      .sort();
    expect(keys).toEqual([...EXPECTED_NON_RESTAURANT, ...EXPECTED_DIRECT_DINING].sort());
    expect(new Set(keys).size).toBe(347);
    expect(EXPECTED_NON_RESTAURANT).toHaveLength(215);
    for (const key of SUPERSEDED_GENERIC_DINING) {
      expect(keys, key).not.toContain(key);
    }
  });

  it("keeps every geometry recipe inside the small-badge structural limits", () => {
    expect(CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF).toEqual({
      id: "code-native-enamel-geometry",
      revision: 1,
    });
    for (const recipe of codeNativeArtRecipes) {
      expect(recipe.schemaVersion, recipe.slug).toBe(1);
      expect(recipe.renderer, recipe.slug).toEqual(CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF);
      expect(recipe.forms.length, recipe.slug).toBeGreaterThanOrEqual(3);
      expect(recipe.forms.length, recipe.slug).toBeLessThanOrEqual(5);
      expect(recipe.palette.length, recipe.slug).toBeGreaterThanOrEqual(4);
      expect(recipe.palette.length, recipe.slug).toBeLessThanOrEqual(6);
      expect(new Set(recipe.palette.map(({ hex }) => hex)).size, recipe.slug).toBe(recipe.palette.length);
      expect(recipe.minimumFeaturePixels, recipe.slug).toBeGreaterThanOrEqual(28);
      expect(recipe.minimumNegativeGapPixels, recipe.slug).toBeGreaterThanOrEqual(23);
      expect(recipe.commands.length, recipe.slug).toBeGreaterThanOrEqual(3);
      expect(recipe.commands.length, recipe.slug).toBeLessThanOrEqual(
        recipe.catalogueDirectory === "michelin-dining" ? 20 : 12,
      );
      expect(recipe.safeguards, recipe.slug).toEqual([
        "flat-color-only",
        "no-repeated-microdetail",
        "no-four-edge-inset",
        "no-typography-or-logos",
        "source-form-and-relationship-lock",
      ]);
      expect(recipe.sourceSpecificExclusions.length, recipe.slug).toBeGreaterThan(0);
      expect(recipe.edgeStrategy, recipe.slug).toMatch(
        /top|bottom|left|right|upper|lower|side edge|all four|full-bleed/iu,
      );
    }
  });

  it("gates the non-restaurant raw renderer before normalization can blur miniature reconstruction failures", () => {
    expect(NON_RESTAURANT_RECIPES).toHaveLength(215);
    for (const recipe of NON_RESTAURANT_RECIPES) {
      const rawSource = renderFlatRecipe(recipe);
      expect(measureMiniatureResidual(rawSource, 48), recipe.slug).toBeLessThanOrEqual(0.035);
    }
  }, 60_000);

  it("preserves varied flat manufacturing languages instead of one generic poster style", () => {
    const languages = new Map();
    for (const recipe of codeNativeArtRecipes) {
      languages.set(recipe.manufacturingLanguage, (languages.get(recipe.manufacturingLanguage) ?? 0) + 1);
      expect(recipe.styleComparison, recipe.slug).toContain(recipe.primaryStyleId);
      expect(recipe.styleComparison, recipe.slug).toMatch(/without|through|using/iu);
    }
    expect(languages.size).toBeGreaterThanOrEqual(15);
    expect(Math.max(...languages.values())).toBeLessThanOrEqual(55);
  });

  it("serializes immutable design briefs deterministically for provenance binding", () => {
    for (const recipe of codeNativeArtRecipes) {
      const serialized = serializeCodeNativeArtRecipe(recipe);
      expect(serializeCodeNativeArtRecipe(JSON.parse(serialized)), recipe.slug).toBe(serialized);
      expect(findCodeNativeArtRecipe(recipe.catalogueDirectory, recipe.slug), recipe.slug).toBe(recipe);
    }
    expect(findCodeNativeArtRecipe("books-read", "not-a-real-study")).toBeUndefined();
  });
});
