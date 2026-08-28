import { describe, expect, it } from "vitest";

import {
  codeNativeNationalParkRecipes,
  nationalParkLandscapeProfiles,
} from "./code-native-art-recipes-national-parks.ts";
import { usNationalParks } from "./us-national-parks.ts";
import {
  measureMiniatureResidual,
  renderFlatRecipe,
  resizeRgbaBilinear,
} from "../../../scripts/code-native-art/flat-raster.mjs";

const EXACT_SIZE = 48;
const PROFILE_BY_SLUG = new Map(nationalParkLandscapeProfiles.map((profile) => [profile.slug, profile]));

describe("national-park code-native art recipes", () => {
  it("binds one explicit profile to every park source without prose classification", () => {
    expect(nationalParkLandscapeProfiles).toHaveLength(63);
    expect(PROFILE_BY_SLUG.size).toBe(63);
    expect(codeNativeNationalParkRecipes).toHaveLength(63);

    for (const park of usNationalParks) {
      const profile = PROFILE_BY_SLUG.get(park.slug);
      expect(profile, park.slug).toBeDefined();
      expect(profile.sourceCue, park.slug).toBe(park.artBrief.requiredMotifs[0]);
      expect(profile.primaryStyleId, park.slug).toBe(park.candidateStyles[0]);
      expect(
        profile.motifs.map(({ label }) => label),
        park.slug,
      ).toEqual(park.artBrief.themeCues);
      expect(profile.motifs, park.slug).toHaveLength(3);
      expect(
        profile.motifs.every(({ count }) => count === 1),
        park.slug,
      ).toBe(true);
      expect(profile.palette.length, park.slug).toBeGreaterThanOrEqual(4);
      expect(profile.palette.length, park.slug).toBeLessThanOrEqual(5);
    }
  });

  it("keeps every face to three primary forms and at most one broad accent", () => {
    for (const [index, recipe] of codeNativeNationalParkRecipes.entries()) {
      const profile = nationalParkLandscapeProfiles[index];
      expect(recipe.slug).toBe(profile.slug);
      expect(recipe.catalogueDirectory, recipe.slug).toBe("national-parks");
      expect(recipe.forms, recipe.slug).toEqual(profile.motifs.map(({ label }) => label));
      expect(recipe.forms, recipe.slug).toHaveLength(3);
      expect(recipe.palette.length, recipe.slug).toBeGreaterThanOrEqual(4);
      expect(recipe.palette.length, recipe.slug).toBeLessThanOrEqual(5);
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

  it("uses source-honest silhouettes instead of relabeling one generic bird", () => {
    expect(
      nationalParkLandscapeProfiles.flatMap((profile) =>
        profile.motifs.filter(({ kind }) => kind === "bird").map(({ label }) => `${profile.slug}: ${label}`),
      ),
    ).toEqual(["pinnacles: a California condor soaring between volcanic spires at sunset"]);
    expect(motifKind("badlands", 1)).toBe("bison");
    expect(motifKind("carlsbad-caverns", 1)).toBe("bat");
    expect(motifKind("denali", 1)).toBe("caribou");
    expect(motifKind("dry-tortugas", 1)).toBe("hexagon");
    expect(motifKind("everglades", 0)).toBe("alligator");
    expect(motifKind("isle-royale", 0)).toBe("moose");
    expect(motifKind("katmai", 0)).toBe("bear");
    expect(motifKind("kobuk-valley", 0)).toBe("caribou");
    expect(motifKind("national-park-american-samoa", 0)).toBe("bat");
    expect(motifKind("redwood", 1)).toBe("person");
    expect(motifKind("rocky-mountain", 0)).toBe("elk");
    expect(motifKind("theodore-roosevelt", 0)).toBe("bison");
    expect(motifKind("yellowstone", 1)).toBe("bison");
  });

  it("makes each luminous clear-line park visibly open in exact-48 pixels", () => {
    const luminousProfiles = nationalParkLandscapeProfiles.filter(
      ({ primaryStyleId }) => primaryStyleId === "luminous-ligne-claire",
    );
    expect(luminousProfiles.map(({ slug }) => slug)).toEqual(["grand-teton", "mount-rainier", "yosemite"]);

    for (const profile of luminousProfiles) {
      expect(profile.accent, profile.slug).toBeDefined();
      expect(profile.accent.width, profile.slug).toBeLessThanOrEqual(0.48);
      expect(profile.accent.height, profile.slug).toBeLessThanOrEqual(0.14);
      const recipe = codeNativeNationalParkRecipes.find(({ slug }) => slug === profile.slug);
      expect(recipe.manufacturingLanguage, profile.slug).toBe("open clear-line enamel scene");
      const exact = resizeRgbaBilinear(renderFlatRecipe(recipe), EXACT_SIZE);
      expect(
        backgroundPixelShare(exact, recipe.palette[recipe.backgroundColor].hex),
        profile.slug,
      ).toBeGreaterThanOrEqual(0.35);
    }
  });

  it("keeps every raw park face below the strict exact-48 residual ceiling", () => {
    const failures = codeNativeNationalParkRecipes
      .map((recipe) => ({
        slug: recipe.slug,
        residual: measureMiniatureResidual(renderFlatRecipe(recipe), EXACT_SIZE),
      }))
      .filter(({ residual }) => residual > 0.035);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  }, 15_000);
});

function backgroundPixelShare(image, hex) {
  const [red, green, blue] = hex
    .slice(1)
    .match(/.{2}/gu)
    .map((part) => Number.parseInt(part, 16));
  let pixels = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    if (image.data[index] === red && image.data[index + 1] === green && image.data[index + 2] === blue) {
      pixels += 1;
    }
  }
  return pixels / (image.width * image.height);
}

function motifKind(slug, index) {
  return PROFILE_BY_SLUG.get(slug).motifs[index].kind;
}
