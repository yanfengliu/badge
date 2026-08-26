import { describe, expect, it } from "vitest";

import {
  codeNativeRestaurantRecipes,
  RESTAURANT_STYLE_SIGNATURE_BY_STYLE_ID,
} from "./code-native-art-recipes-restaurants";
import { michelinRestaurantResearchSeeds } from "./michelin-dining";
import { sanFranciscoRestaurantArtProfiles } from "./restaurant-art-profiles-bay-area";
import { washingtonDcRestaurantArtProfiles } from "./restaurant-art-profiles-dc";
import { newYorkCityRestaurantArtProfiles } from "./restaurant-art-profiles-nyc";

const profiles = [
  ...sanFranciscoRestaurantArtProfiles,
  ...newYorkCityRestaurantArtProfiles,
  ...washingtonDcRestaurantArtProfiles,
];

describe("the code-native named restaurant art recipes", () => {
  it("binds one explicit, source-grounded geometry profile to every researched restaurant", () => {
    expect(profiles).toHaveLength(132);
    expect(codeNativeRestaurantRecipes).toHaveLength(132);
    expect(codeNativeRestaurantRecipes.map(({ slug }) => slug)).toEqual(
      michelinRestaurantResearchSeeds.map(({ slug }) => slug),
    );
    expect(profiles.map(({ slug }) => slug)).toEqual(michelinRestaurantResearchSeeds.map(({ slug }) => slug));
    expect(new Set(profiles.map(({ slug }) => slug))).toHaveProperty("size", 132);

    for (const [index, recipe] of codeNativeRestaurantRecipes.entries()) {
      const research = michelinRestaurantResearchSeeds[index]!;
      const profile = profiles[index]!;
      expect(profile.sourceCue, research.slug).toBe(research.evidenceCue);
      expect(
        profile.motifs.map(({ label }) => label),
        research.slug,
      ).toEqual(research.primaryForms);
      expect(recipe.catalogueDirectory, research.slug).toBe("michelin-dining");
      expect(recipe.renderer, research.slug).toEqual({ id: "code-native-enamel-geometry", revision: 1 });
      expect(recipe.forms, research.slug).toEqual(research.primaryForms);
      expect(recipe.relationship, research.slug).toBe(profile.relationship);
      expect(recipe.palette, research.slug).toEqual(profile.palette);
      expect(recipe.primaryStyleId, research.slug).toBe(research.candidateStyles[0]);
      expect(profile.styleSignature, research.slug).toBe(
        RESTAURANT_STYLE_SIGNATURE_BY_STYLE_ID[
          research.candidateStyles[0] as keyof typeof RESTAURANT_STYLE_SIGNATURE_BY_STYLE_ID
        ],
      );
      expect(recipe.commands.length, research.slug).toBeGreaterThan(
        profile.motifs.reduce((total, { count }) => total + count, 0),
      );
      expect(
        recipe.commands.some(({ kind }) => kind === "star"),
        research.slug,
      ).toBe(false);
      expect(recipe.minimumFeaturePixels, research.slug).toBe(48);
      expect(recipe.minimumNegativeGapPixels, research.slug).toBe(32);
      expect(recipe.sourceSpecificExclusions.join(" "), research.slug).toMatch(/photographic copying/iu);
      expect(recipe.sourceSpecificExclusions.join(" "), research.slug).toMatch(/star pictogram/iu);
      expect(recipe.sourceSpecificExclusions.join(" "), research.slug).toMatch(/microdetail/iu);
    }
  });

  it("honors counts, explicit palettes, bounds, and source-supported forms", () => {
    for (const [index, profile] of profiles.entries()) {
      const research = michelinRestaurantResearchSeeds[index]!;
      expect(profile.palette.length, profile.slug).toBeGreaterThanOrEqual(4);
      expect(profile.palette.length, profile.slug).toBeLessThanOrEqual(6);
      expect(new Set(profile.palette.map(({ hex }) => hex.toUpperCase())).size, profile.slug).toBe(
        profile.palette.length,
      );
      for (const { hex } of profile.palette) expect(hex, profile.slug).toMatch(/^#[0-9A-F]{6}$/iu);

      for (const motif of profile.motifs) {
        const expectedCount = /\bthree\b/iu.test(motif.label) ? 3 : /\btwo\b/iu.test(motif.label) ? 2 : 1;
        expect(motif.count, `${profile.slug}: ${motif.label}`).toBe(expectedCount);
        expect(motif.colorIndex, `${profile.slug}: ${motif.label}`).toBeGreaterThanOrEqual(1);
        expect(motif.colorIndex, `${profile.slug}: ${motif.label}`).toBeLessThan(profile.palette.length);
        expect(motif.width, `${profile.slug}: ${motif.label}`).toBeGreaterThanOrEqual(0.08);
        expect(motif.height, `${profile.slug}: ${motif.label}`).toBeGreaterThanOrEqual(0.08);
        expect(motif.x, `${profile.slug}: ${motif.label}`).toBeGreaterThan(0);
        expect(motif.x, `${profile.slug}: ${motif.label}`).toBeLessThan(1);
        expect(motif.y, `${profile.slug}: ${motif.label}`).toBeGreaterThan(0);
        expect(motif.y, `${profile.slug}: ${motif.label}`).toBeLessThan(1);

        const unsupported = motif.label.match(
          /\b(moon|mountain|flag|national|country outline|country silhouette|geography)\b/iu,
        )?.[0];
        if (unsupported) {
          expect(
            research.evidenceCue.toLocaleLowerCase("en-US"),
            `${profile.slug}: ${motif.label}`,
          ).toContain(unsupported.toLocaleLowerCase("en-US"));
        }
      }
    }
  });

  it("retains varied production languages, style constructions, palettes, and geometry", () => {
    expect(
      new Set(codeNativeRestaurantRecipes.map(({ primaryStyleId }) => primaryStyleId)).size,
    ).toBeGreaterThanOrEqual(15);
    expect(new Set(profiles.map(({ styleSignature }) => styleSignature)).size).toBeGreaterThanOrEqual(12);
    expect(
      new Set(codeNativeRestaurantRecipes.map(({ manufacturingLanguage }) => manufacturingLanguage)).size,
    ).toBeGreaterThanOrEqual(12);
    expect(
      new Set(codeNativeRestaurantRecipes.flatMap(({ commands }) => commands.map(({ kind }) => kind))).size,
    ).toBeGreaterThanOrEqual(6);
    expect(
      new Set(codeNativeRestaurantRecipes.map(({ palette }) => palette.map(({ hex }) => hex).join("/"))).size,
    ).toBe(132);
  });
});
