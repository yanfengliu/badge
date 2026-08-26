import { describe, expect, it } from "vitest";
import type { RestaurantStyleSignature } from "./restaurant-art-profile";
import { newYorkCityRestaurantArtProfiles } from "./restaurant-art-profiles-nyc";
import { newYorkCityMichelinRestaurantSeeds } from "./michelin-restaurants-nyc";

const signatureByPrimaryStyle: Readonly<Record<string, RestaurantStyleSignature>> = {
  "pixel-cluster-landscape": "pixel-step",
  "thread-painted-embroidery": "fiber-applique",
  "plein-air-broken-color": "painted-mass",
  "relief-blockprint": "relief-cut",
  "stained-glass-field": "lead-cell",
  "monoprint-ink-wash": "ink-contour",
  "contour-atlas-ink": "map-contour",
  "mineral-line-engraving": "relief-cut",
  "aquatint-atmosphere": "painted-mass",
  "risograph-overprint": "screenprint-overlap",
  "matte-gouache-editorial": "painted-mass",
  "woven-tapestry-field": "woven-band",
  "cut-paper-strata": "paper-layer",
  "cyanotype-field-study": "ink-contour",
  "watercolor-naturalist-study": "painted-mass",
  "charcoal-pastel-weather": "relief-cut",
  "screenprint-night": "screenprint-overlap",
  "mosaic-tesserae-field": "mosaic-cell",
  "fresco-mineral-pigment": "painted-mass",
  "prismatic-geometric-symbolism": "geometric-facet",
  "ceramic-underglaze": "ceramic-roundel",
  "wood-marquetry-landscape": "marquetry-strata",
  "scratchboard-nocturne": "relief-cut",
  "luminous-ligne-claire": "ink-contour",
};

const unsupportedGeographicSignifier =
  /\b(flag|national|country|countries|map|mapped|outline|mountain|mountains|island|islands|mesa|fjord|fjords|harbor|coast|coastal|ocean|tide|globe)\b/giu;

describe("source-grounded New York City restaurant art profiles", () => {
  it("covers the exact current 69-restaurant roster once and in research order", () => {
    expect(newYorkCityRestaurantArtProfiles).toHaveLength(69);
    expect(newYorkCityRestaurantArtProfiles.map(({ slug }) => slug)).toEqual(
      newYorkCityMichelinRestaurantSeeds.map(({ slug }) => slug),
    );
    expect(new Set(newYorkCityRestaurantArtProfiles.map(({ slug }) => slug)).size).toBe(69);
  });

  it("binds every geometry profile to the exact cited research cue and registered primary style", () => {
    for (const [index, profile] of newYorkCityRestaurantArtProfiles.entries()) {
      const seed = newYorkCityMichelinRestaurantSeeds[index]!;
      expect(profile.schemaVersion, profile.slug).toBe(1);
      expect(profile.sourceCue, profile.slug).toBe(seed.evidenceCue);
      expect(profile.styleSignature, profile.slug).toBe(signatureByPrimaryStyle[seed.candidateStyles[0]]);
      expect(profile.edgeStrategy, profile.slug).toMatch(/all four edges/iu);
      expect(profile.relationship.length, profile.slug).toBeGreaterThanOrEqual(72);
    }
  });

  it("uses explicit, unique, bounded palettes rather than color-name heuristics", () => {
    for (const profile of newYorkCityRestaurantArtProfiles) {
      expect(profile.palette.length, profile.slug).toBeGreaterThanOrEqual(4);
      expect(profile.palette.length, profile.slug).toBeLessThanOrEqual(6);
      expect(new Set(profile.palette.map(({ name }) => name)).size, profile.slug).toBe(
        profile.palette.length,
      );
      expect(new Set(profile.palette.map(({ hex }) => hex)).size, profile.slug).toBe(profile.palette.length);
      for (const color of profile.palette) {
        expect(color.name.length, profile.slug).toBeGreaterThanOrEqual(8);
        expect(color.hex, `${profile.slug}: ${color.name}`).toMatch(/^#[0-9A-F]{6}$/u);
      }
    }
  });

  it("authors three to five broad source-form motifs inside the safe field", () => {
    for (const [index, profile] of newYorkCityRestaurantArtProfiles.entries()) {
      const seed = newYorkCityMichelinRestaurantSeeds[index]!;
      expect(profile.motifs.length, profile.slug).toBeGreaterThanOrEqual(3);
      expect(profile.motifs.length, profile.slug).toBeLessThanOrEqual(5);
      expect(
        profile.motifs.map(({ label }) => label),
        profile.slug,
      ).toEqual(seed.primaryForms);

      for (const motif of profile.motifs) {
        const writtenCount = /^(one|two|three)\b/u.exec(motif.label)?.[1];
        expect(writtenCount, `${profile.slug}: ${motif.label}`).toBeDefined();
        expect(motif.count, `${profile.slug}: ${motif.label}`).toBe(
          writtenCount === "three" ? 3 : writtenCount === "two" ? 2 : 1,
        );
        expect(motif.colorIndex, `${profile.slug}: ${motif.label}`).toBeGreaterThanOrEqual(1);
        expect(motif.colorIndex, `${profile.slug}: ${motif.label}`).toBeLessThan(profile.palette.length);
        expect(motif.width, `${profile.slug}: ${motif.label}`).toBeGreaterThanOrEqual(0.12);
        expect(motif.height, `${profile.slug}: ${motif.label}`).toBeGreaterThanOrEqual(0.11);

        const repeatedSpanX = (motif.count - 1) * (motif.spreadX ?? 0);
        const repeatedSpanY = (motif.count - 1) * (motif.spreadY ?? 0);
        const left = motif.x - motif.width / 2 - repeatedSpanX / 2;
        const right = motif.x + motif.width / 2 + repeatedSpanX / 2;
        const top = motif.y - motif.height / 2 - repeatedSpanY / 2;
        const bottom = motif.y + motif.height / 2 + repeatedSpanY / 2;
        expect(left, `${profile.slug}: ${motif.label} left`).toBeGreaterThanOrEqual(0.04);
        expect(right, `${profile.slug}: ${motif.label} right`).toBeLessThanOrEqual(0.96);
        expect(top, `${profile.slug}: ${motif.label} top`).toBeGreaterThanOrEqual(0.04);
        expect(bottom, `${profile.slug}: ${motif.label} bottom`).toBeLessThanOrEqual(0.96);

        if (motif.count > 1) {
          const largestSpread = Math.max(motif.spreadX ?? 0, motif.spreadY ?? 0);
          expect(largestSpread, `${profile.slug}: ${motif.label} repeated spread`).toBeGreaterThanOrEqual(
            Math.min(motif.width, motif.height) * 0.5,
          );
          expect(
            Math.min(motif.width, motif.height) * 48,
            `${profile.slug}: ${motif.label} at 48px`,
          ).toBeGreaterThanOrEqual(7.5);
        }
      }
    }
  });

  it("does not reintroduce unsupported geography, country, or national shorthand", () => {
    for (const profile of newYorkCityRestaurantArtProfiles) {
      for (const motif of profile.motifs) {
        const matches = [...motif.label.matchAll(unsupportedGeographicSignifier)].map(([match]) =>
          match.toLocaleLowerCase("en-US"),
        );
        for (const match of matches) {
          expect(profile.sourceCue.toLocaleLowerCase("en-US"), `${profile.slug}: ${motif.label}`).toContain(
            match,
          );
        }
      }
    }
  });

  it("keeps every authored composition unique and preserves style diversity", () => {
    const designFingerprints = newYorkCityRestaurantArtProfiles.map((profile) =>
      JSON.stringify({
        styleSignature: profile.styleSignature,
        palette: profile.palette,
        motifs: profile.motifs,
        relationship: profile.relationship,
      }),
    );
    expect(new Set(designFingerprints).size).toBe(69);
    expect(
      new Set(newYorkCityRestaurantArtProfiles.map(({ styleSignature }) => styleSignature)).size,
    ).toBeGreaterThanOrEqual(8);
  });
});
