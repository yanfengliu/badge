import { describe, expect, it } from "vitest";

import { codeNativeRetainedBookRecipes } from "../packages/catalogue-authoring/src/code-native-art-recipes-retained-books.ts";
import { measureMiniatureResidual, renderFlatRecipe } from "./code-native-art/flat-raster.mjs";

const EXPECTED_BOOKS = [
  {
    slug: "pride-and-prejudice",
    primaryStyleId: "cut-paper-strata",
    manufacturingLanguage: "layered-paper-silhouette",
    forms: [
      "two facing profile silhouettes",
      "one winding garden path",
      "one left hedge mass",
      "one right hedge mass",
    ],
  },
  {
    slug: "guns-germs-and-steel",
    primaryStyleId: "prismatic-geometric-symbolism",
    manufacturingLanguage: "prismatic-crossroad-inlay",
    forms: ["one grain stalk", "one circular cell", "one spanning steel beam"],
  },
  {
    slug: "the-sixth-extinction",
    primaryStyleId: "charcoal-pastel-weather",
    manufacturingLanguage: "charcoal-pastel-inlay",
    forms: ["one ammonite arc", "one fading wing", "one ash horizon"],
  },
  {
    slug: "the-design-of-everyday-things",
    primaryStyleId: "matte-gouache-editorial",
    manufacturingLanguage: "gouache-affordance-planes",
    forms: ["one simple door plane", "one round handle", "one opening wedge of light"],
  },
  {
    slug: "dune",
    primaryStyleId: "cut-paper-strata",
    manufacturingLanguage: "desert-paper-strata",
    forms: ["one giant sun", "two sweeping dune curves", "one blue oasis"],
  },
  {
    slug: "the-remains-of-the-day",
    primaryStyleId: "aquatint-atmosphere",
    manufacturingLanguage: "aquatint-corridor-planes",
    forms: ["one long corridor", "one centered silver tray", "one garden-window glow"],
  },
  {
    slug: "educated",
    primaryStyleId: "plein-air-broken-color",
    manufacturingLanguage: "plein-air-color-blocks",
    forms: ["one mountain ridge", "one open doorway", "one broad dawn band"],
  },
];

describe("the seven retained-book code-native art recipes", () => {
  it("pins each source cue, primary style, and distinct manufacturing language", () => {
    expect(
      codeNativeRetainedBookRecipes.map(({ slug, primaryStyleId, manufacturingLanguage, forms }) => ({
        slug,
        primaryStyleId,
        manufacturingLanguage,
        forms: [...forms],
      })),
    ).toEqual(EXPECTED_BOOKS);
    expect(
      new Set(codeNativeRetainedBookRecipes.map(({ manufacturingLanguage }) => manufacturingLanguage)),
    ).toHaveProperty("size", 7);
  });

  it("keeps the small-badge recipes broad, flat, sparse, and palette-bounded", () => {
    for (const recipe of codeNativeRetainedBookRecipes) {
      expect(recipe.catalogueDirectory, recipe.slug).toBe("books-read");
      expect(recipe.forms.length, recipe.slug).toBeGreaterThanOrEqual(3);
      expect(recipe.forms.length, recipe.slug).toBeLessThanOrEqual(4);
      expect(recipe.palette.length, recipe.slug).toBe(4);
      expect(new Set(recipe.palette.map(({ hex }) => hex)).size, recipe.slug).toBe(recipe.palette.length);
      expect(recipe.commands.length, recipe.slug).toBeGreaterThanOrEqual(3);
      expect(recipe.commands.length, recipe.slug).toBeLessThanOrEqual(12);
      expect(recipe.minimumFeaturePixels, recipe.slug).toBeGreaterThanOrEqual(48);
      expect(recipe.minimumNegativeGapPixels, recipe.slug).toBeGreaterThanOrEqual(32);
      expect(recipe.sourceSpecificExclusions.length, recipe.slug).toBeGreaterThanOrEqual(3);
      expect(recipe.safeguards, recipe.slug).toContain("no-repeated-microdetail");
      expect(recipe.safeguards, recipe.slug).toContain("no-typography-or-logos");
      for (const command of recipe.commands) {
        expect(command.color, `${recipe.slug}: ${command.kind}`).toBeGreaterThanOrEqual(0);
        expect(command.color, `${recipe.slug}: ${command.kind}`).toBeLessThan(recipe.palette.length);
      }
    }
    expect(
      new Set(codeNativeRetainedBookRecipes.map(({ commands }) => JSON.stringify(commands))),
    ).toHaveProperty("size", 7);
  });

  it("remains cleanly reconstructible at the 48-pixel discovery size", () => {
    for (const recipe of codeNativeRetainedBookRecipes) {
      expect(measureMiniatureResidual(renderFlatRecipe(recipe), 48), recipe.slug).toBeLessThanOrEqual(0.035);
    }
  });
});
