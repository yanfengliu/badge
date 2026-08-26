import { describe, expect, it } from "vitest";

import {
  CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
  codeNativeArtRecipes,
  findCodeNativeArtRecipe,
  serializeCodeNativeArtRecipe,
} from "../packages/catalogue-authoring/src/code-native-art-recipes.ts";
import { michelinRestaurantResearchSeeds } from "../packages/catalogue-authoring/src/michelin-dining.ts";
import { measureMiniatureResidual, renderFlatRecipe } from "./code-native-art/flat-raster.mjs";

const EXPECTED_REPLACEMENTS = [
  "books-read/nineteen-eighty-four",
  "books-read/to-kill-a-mockingbird",
  "books-read/the-great-gatsby",
  "books-read/the-count-of-monte-cristo",
  "books-read/the-odyssey",
  "books-read/the-brothers-karamazov",
  "books-read/the-dawn-of-everything",
  "books-read/the-silk-roads",
  "books-read/team-of-rivals",
  "books-read/the-warmth-of-other-suns",
  "books-read/spqr",
  "books-read/a-brief-history-of-time",
  "books-read/the-selfish-gene",
  "books-read/the-gene",
  "books-read/the-emperor-of-all-maladies",
  "books-read/cosmos",
  "books-read/meditations",
  "books-read/the-republic",
  "books-read/mans-search-for-meaning",
  "books-read/the-myth-of-sisyphus",
  "books-read/justice",
  "books-read/nicomachean-ethics",
  "books-read/the-innovators",
  "books-read/the-pragmatic-programmer",
  "books-read/code",
  "books-read/algorithms-to-live-by",
  "books-read/the-phoenix-project",
  "books-read/chip-war",
  "books-read/the-three-body-problem",
  "books-read/foundation",
  "books-read/neuromancer",
  "books-read/the-left-hand-of-darkness",
  "books-read/project-hail-mary",
  "books-read/beloved",
  "books-read/the-road",
  "books-read/a-gentleman-in-moscow",
  "books-read/the-kite-runner",
  "books-read/pachinko",
  "books-read/thinking-fast-and-slow",
  "books-read/atomic-habits",
  "books-read/kitchen-confidential",
  "books-read/the-wager",
  "books-read/the-anthropocene-reviewed",
  "life-milestones/masters-degree",
  "life-milestones/university-nebraska-lincoln-degree",
].sort();

const PRESERVED_CANONICAL = [
  "books-read/pride-and-prejudice",
  "books-read/guns-germs-and-steel",
  "books-read/the-sixth-extinction",
  "books-read/the-design-of-everyday-things",
  "books-read/dune",
  "books-read/the-remains-of-the-day",
  "books-read/educated",
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
  it("pins 45 source replacements and 132 direct named-restaurant recipes without touching retained studies", () => {
    const keys = codeNativeArtRecipes
      .map(({ catalogueDirectory, slug }) => `${catalogueDirectory}/${slug}`)
      .sort();
    expect(keys).toEqual([...EXPECTED_REPLACEMENTS, ...EXPECTED_DIRECT_DINING].sort());
    expect(new Set(keys).size).toBe(177);
    for (const key of [...PRESERVED_CANONICAL, ...SUPERSEDED_GENERIC_DINING]) {
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
      expect(recipe.commands.length, recipe.slug).toBeLessThanOrEqual(20);
      expect(recipe.safeguards, recipe.slug).toEqual([
        "flat-color-only",
        "no-repeated-microdetail",
        "no-four-edge-inset",
        "no-typography-or-logos",
        "source-form-and-relationship-lock",
      ]);
      expect(recipe.sourceSpecificExclusions.length, recipe.slug).toBeGreaterThan(0);
      expect(recipe.edgeStrategy, recipe.slug).toMatch(/top|bottom|left|right|all four|full-bleed/iu);
    }
  });

  it("gates the non-restaurant raw renderer before normalization can blur miniature reconstruction failures", () => {
    expect(NON_RESTAURANT_RECIPES).toHaveLength(45);
    for (const recipe of NON_RESTAURANT_RECIPES) {
      const rawSource = renderFlatRecipe(recipe);
      expect(measureMiniatureResidual(rawSource, 48), recipe.slug).toBeLessThanOrEqual(0.045);
    }
  }, 15_000);

  it("preserves varied flat manufacturing languages instead of one generic poster style", () => {
    const languages = new Map();
    for (const recipe of codeNativeArtRecipes) {
      languages.set(recipe.manufacturingLanguage, (languages.get(recipe.manufacturingLanguage) ?? 0) + 1);
      expect(recipe.styleComparison, recipe.slug).toContain(recipe.primaryStyleId);
      expect(recipe.styleComparison, recipe.slug).toMatch(/without|through|using/iu);
    }
    expect(languages.size).toBeGreaterThanOrEqual(15);
    expect(Math.max(...languages.values())).toBeLessThanOrEqual(40);
  });

  it("serializes immutable design briefs deterministically for provenance binding", () => {
    for (const recipe of codeNativeArtRecipes) {
      const serialized = serializeCodeNativeArtRecipe(recipe);
      expect(serializeCodeNativeArtRecipe(JSON.parse(serialized)), recipe.slug).toBe(serialized);
      expect(findCodeNativeArtRecipe(recipe.slug), recipe.slug).toBe(recipe);
    }
    expect(findCodeNativeArtRecipe("not-a-real-study")).toBeUndefined();
  });
});
