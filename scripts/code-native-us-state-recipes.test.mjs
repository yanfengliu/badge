import { describe, expect, it } from "vitest";

import {
  codeNativeUsStateArtProfiles,
  codeNativeUsStateRecipes,
} from "../packages/catalogue-authoring/src/code-native-art-recipes-us-states.ts";
import { usStates } from "../packages/catalogue-authoring/src/us-states.ts";
import {
  measureMiniatureResidual,
  renderFlatRecipe,
  resizeRgbaBilinear,
} from "./code-native-art/flat-raster.mjs";

const PROFILE_BY_SLUG = new Map(codeNativeUsStateArtProfiles.map((profile) => [profile.slug, profile]));

describe("U.S. state code-native art recipes", () => {
  it("binds one explicit profile to every state source without stock-scene classification", () => {
    expect(codeNativeUsStateArtProfiles).toHaveLength(50);
    expect(PROFILE_BY_SLUG.size).toBe(50);
    expect(codeNativeUsStateRecipes).toHaveLength(50);

    for (const state of usStates) {
      const profile = PROFILE_BY_SLUG.get(state.slug);
      expect(profile, state.slug).toBeDefined();
      expect(profile.sourceCue, state.slug).toBe(state.artBrief.requiredMotifs[0]);
      expect(profile.primaryStyleId, state.slug).toBe(state.candidateStyles[0]);
      expect(
        profile.motifs.map(({ label }) => label),
        state.slug,
      ).toEqual(state.artBrief.themeCues);
      expect(profile.motifs, state.slug).toHaveLength(3);
      expect(
        profile.motifs.every(({ count }) => count === 1),
        state.slug,
      ).toBe(true);
      expect(profile.palette.length, state.slug).toBeGreaterThanOrEqual(4);
      expect(profile.palette.length, state.slug).toBeLessThanOrEqual(5);
      expect(new Set(profile.palette.map(({ hex }) => hex.toUpperCase())).size, state.slug).toBe(
        profile.palette.length,
      );
    }
  });

  it("keeps each badge to three primary forms and one optional broad accent", () => {
    for (const [index, recipe] of codeNativeUsStateRecipes.entries()) {
      const profile = codeNativeUsStateArtProfiles[index];
      expect(recipe.slug).toBe(profile.slug);
      expect(recipe.catalogueDirectory, recipe.slug).toBe("us-states");
      expect(recipe.forms, recipe.slug).toEqual(profile.motifs.map(({ label }) => label));
      expect(recipe.forms, recipe.slug).toHaveLength(3);
      expect(recipe.commands, recipe.slug).toHaveLength(profile.accent ? 8 : 6);
      expect(recipe.commands.length, recipe.slug).toBeGreaterThanOrEqual(4);
      expect(recipe.commands.length, recipe.slug).toBeLessThanOrEqual(12);
      expect(recipe.minimumFeaturePixels, recipe.slug).toBe(48);
      expect(recipe.minimumNegativeGapPixels, recipe.slug).toBe(32);
      expect(recipe.safeguards, recipe.slug).toEqual([
        "flat-color-only",
        "no-repeated-microdetail",
        "no-four-edge-inset",
        "no-typography-or-logos",
        "source-form-and-relationship-lock",
      ]);
    }
  });

  it("uses the dedicated bison silhouette instead of an avian or aquatic stand-in", () => {
    const bisonProfiles = codeNativeUsStateArtProfiles.filter((profile) =>
      profile.motifs.some(({ label }) => /\bbison\b|\bdark animal\b/iu.test(label)),
    );
    expect(bisonProfiles.map(({ slug }) => slug)).toEqual(["north-dakota", "oklahoma"]);
    for (const profile of bisonProfiles) {
      const kinds = profile.motifs.map(({ kind }) => kind);
      expect(kinds, profile.slug).toContain("bison");
      expect(kinds, profile.slug).not.toContain("bird");
      expect(kinds, profile.slug).not.toContain("fish");
    }
  });

  it("uses an open journey accent for each luminous clear-line state", () => {
    const luminous = codeNativeUsStateArtProfiles.filter(
      ({ primaryStyleId }) => primaryStyleId === "luminous-ligne-claire",
    );
    expect(luminous.map(({ slug }) => slug)).toEqual(["mississippi", "west-virginia"]);
    for (const profile of luminous) {
      expect(profile.accent, profile.slug).toBeDefined();
      expect(profile.accent.kind, profile.slug).toBe("ribbon");
      expect(profile.accent.width, profile.slug).toBeLessThanOrEqual(0.48);
      expect(profile.accent.height, profile.slug).toBeLessThanOrEqual(0.14);
      const recipe = codeNativeUsStateRecipes.find(({ slug }) => slug === profile.slug);
      const proof = resizeRgbaBilinear(renderFlatRecipe(recipe), 48);
      expect(
        exactColorShare(proof, recipe.palette[recipe.backgroundColor].hex),
        profile.slug,
      ).toBeGreaterThanOrEqual(0.38);
    }
  });

  it("keeps every raw state face below the strict exact-48 residual ceiling", () => {
    const failures = codeNativeUsStateRecipes
      .map((recipe) => ({
        slug: recipe.slug,
        residual: measureMiniatureResidual(renderFlatRecipe(recipe), 48),
      }))
      .filter(({ residual }) => residual > 0.035);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });
});

function exactColorShare(image, hex) {
  const [red, green, blue] = hex
    .slice(1)
    .match(/.{2}/gu)
    .map((channel) => Number.parseInt(channel, 16));
  let matching = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    if (image.data[index] === red && image.data[index + 1] === green && image.data[index + 2] === blue) {
      matching += 1;
    }
  }
  return matching / (image.width * image.height);
}
