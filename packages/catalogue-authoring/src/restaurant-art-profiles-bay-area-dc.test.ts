import { describe, expect, it } from "vitest";

import { bayAreaMichelinRestaurantSeeds } from "./michelin-restaurants-bay-area.js";
import { washingtonDcMichelinRestaurantSeeds } from "./michelin-restaurants-dc.js";
import { bayAreaRestaurantArtProfiles } from "./restaurant-art-profiles-bay-area.js";
import { washingtonDcRestaurantArtProfiles } from "./restaurant-art-profiles-dc.js";
import type { RestaurantArtProfile, RestaurantStyleSignature } from "./restaurant-art-profile.js";

const primaryStyleSignatures: Readonly<Record<string, RestaurantStyleSignature>> = {
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

const regionalCases = [
  {
    label: "the nine-county Bay Area",
    profiles: bayAreaRestaurantArtProfiles,
    seeds: bayAreaMichelinRestaurantSeeds,
    count: 41,
  },
  {
    label: "Washington, DC and surroundings",
    profiles: washingtonDcRestaurantArtProfiles,
    seeds: washingtonDcMichelinRestaurantSeeds,
    count: 22,
  },
] as const;

describe("source-grounded Bay Area and DC restaurant geometry", () => {
  it.each(regionalCases)("binds one exact profile to every $label seed", ({ profiles, seeds, count }) => {
    expect(profiles).toHaveLength(count);
    expect(seeds).toHaveLength(count);
    expect(profiles.map(({ slug }) => slug)).toEqual(seeds.map(({ slug }) => slug));
    expect(new Set(profiles.map(({ slug }) => slug))).toHaveProperty("size", count);

    for (const [index, profile] of profiles.entries()) {
      const seed = seeds[index]!;
      expect(profile.sourceCue).toBe(seed.evidenceCue);
      expect(profile.motifs.map(({ label }) => label)).toEqual(seed.primaryForms);
      expect(profile.styleSignature).toBe(primaryStyleSignatures[seed.candidateStyles[0]]);
      expect(profile.edgeStrategy).toBe("full-bleed");
      expect(profile.relationship.length).toBeGreaterThan(24);
    }
  });

  it("keeps every palette finite, semantic, unique, and construction-ready", () => {
    for (const profile of allProfiles()) {
      expect(profile.palette.length).toBeGreaterThanOrEqual(4);
      expect(profile.palette.length).toBeLessThanOrEqual(6);
      expect(new Set(profile.palette.map(({ name }) => name))).toHaveProperty("size", profile.palette.length);
      expect(new Set(profile.palette.map(({ hex }) => hex.toUpperCase()))).toHaveProperty(
        "size",
        profile.palette.length,
      );
      expect(profile.palette.every(({ name }) => /^[A-Za-z][A-Za-z0-9 -]+$/u.test(name))).toBe(true);
      expect(profile.palette.every(({ hex }) => /^#[0-9A-F]{6}$/u.test(hex))).toBe(true);
      expect(contrastRatio(profile.palette[0].hex, profile.palette[1].hex)).toBeGreaterThanOrEqual(4);
    }
  });

  it("authors legible normalized geometry and honors every leading quantity", () => {
    for (const profile of allProfiles()) {
      expect(profile.motifs.length).toBeGreaterThanOrEqual(3);
      expect(profile.motifs.length).toBeLessThanOrEqual(5);

      for (const motif of profile.motifs) {
        expect(motif.count).toBe(quantityFromLabel(motif.label));
        expect(motif.colorIndex).toBeGreaterThanOrEqual(1);
        expect(motif.colorIndex).toBeLessThan(profile.palette.length);
        expect(motif.x).toBeGreaterThan(0);
        expect(motif.x).toBeLessThan(1);
        expect(motif.y).toBeGreaterThan(0);
        expect(motif.y).toBeLessThan(1);
        expect(motif.width).toBeGreaterThanOrEqual(0.09);
        expect(motif.width).toBeLessThanOrEqual(0.9);
        expect(motif.height).toBeGreaterThanOrEqual(0.09);
        expect(motif.height).toBeLessThanOrEqual(0.9);
        expect(motif.spreadX).toBeGreaterThanOrEqual(0);
        expect(motif.spreadX).toBeLessThanOrEqual(0.9);
        expect(motif.spreadY).toBeGreaterThanOrEqual(0);
        expect(motif.spreadY).toBeLessThanOrEqual(0.9);
        expect(Math.min(motif.width, motif.height) * 48).toBeGreaterThanOrEqual(4.5);

        if (motif.count > 1) {
          const xBounds = repeatedBounds(motif.x, motif.width, motif.spreadX ?? 0, motif.count);
          const yBounds = repeatedBounds(motif.y, motif.height, motif.spreadY ?? 0, motif.count);
          expect(Math.max(motif.spreadX ?? 0, motif.spreadY ?? 0) * 48).toBeGreaterThanOrEqual(5);
          expect(xBounds[0]).toBeGreaterThanOrEqual(0.06);
          expect(xBounds[1]).toBeLessThanOrEqual(0.94);
          expect(yBounds[0]).toBeGreaterThanOrEqual(0.06);
          expect(yBounds[1]).toBeLessThanOrEqual(0.94);
        }
      }
    }
  });

  it("does not substitute unsupported geographic or national shorthand for researched cues", () => {
    const signifiers = [
      { motif: /\bmoon\b/iu, cue: /\bmoon\b/iu },
      { motif: /\bsun\b/iu, cue: /\bsun\b/iu },
      { motif: /\bmountain\b/iu, cue: /\b(?:mountain|andes|andean)\b/iu },
      { motif: /\bcoast\b/iu, cue: /\bcoast\b/iu },
      { motif: /\bpacific\b/iu, cue: /\bpacific\b/iu },
      { motif: /\bflag\b/iu, cue: /\bflag\b/iu },
      { motif: /\bnational\b/iu, cue: /\bnational\b/iu },
      { motif: /\bcountry\b/iu, cue: /\bcountry\b/iu },
    ] as const;

    for (const profile of allProfiles()) {
      const labels = profile.motifs.map(({ label }) => label).join(" ");
      for (const { motif, cue } of signifiers) {
        if (motif.test(labels)) expect(cue.test(profile.sourceCue)).toBe(true);
      }
    }
  });

  it("keeps the 63 compositions distinct and visually varied", () => {
    const profiles = allProfiles();
    expect(new Set(profiles.map(profileSignature))).toHaveProperty("size", 63);
    expect(new Set(profiles.map(({ styleSignature }) => styleSignature)).size).toBeGreaterThanOrEqual(10);
    expect(
      new Set(profiles.flatMap(({ motifs }) => motifs.map(({ kind }) => kind))).size,
    ).toBeGreaterThanOrEqual(14);
    expect(new Set(profiles.map(({ palette }) => palette.map(({ hex }) => hex).join("/")))).toHaveProperty(
      "size",
      63,
    );
  });
});

function allProfiles(): readonly RestaurantArtProfile[] {
  return [...bayAreaRestaurantArtProfiles, ...washingtonDcRestaurantArtProfiles];
}

function quantityFromLabel(label: string): 1 | 2 | 3 {
  const quantities = { one: 1, two: 2, three: 3 } as const;
  const quantity = quantities[label.split(" ")[0] as keyof typeof quantities];
  if (!quantity) throw new Error(`Restaurant motif must begin with one, two, or three: ${label}`);
  return quantity;
}

function repeatedBounds(center: number, size: number, spread: number, count: 1 | 2 | 3): [number, number] {
  const outerOffset = spread * ((count - 1) / 2);
  return [center - outerOffset - size / 2, center + outerOffset + size / 2];
}

function profileSignature(profile: RestaurantArtProfile): string {
  return JSON.stringify({
    style: profile.styleSignature,
    palette: profile.palette.map(({ hex }) => hex),
    motifs: profile.motifs.map(({ kind, count, colorIndex, x, y, width, height, spreadX, spreadY }) => ({
      kind,
      count,
      colorIndex,
      x,
      y,
      width,
      height,
      spreadX,
      spreadY,
    })),
  });
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return channels
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
}
