import { describe, expect, it } from "vitest";

import { findArtStyle } from "./art-styles";
import {
  BAY_AREA_MICHELIN_ART_EXCLUSIONS,
  BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL,
  BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL,
  BAY_AREA_MICHELIN_CHECKED_AT,
  BAY_AREA_MICHELIN_LIST_URL,
  BAY_AREA_NINE_COUNTY_BOUNDARY_SOURCE_URL,
  bayAreaMichelinRestaurantInputsPartOne,
  bayAreaMichelinRestaurantInputsPartTwo,
  bayAreaMichelinRestaurantInputsPartThree,
  bayAreaMichelinRestaurantRecords,
  bayAreaMichelinRestaurantSet,
  sanFranciscoMichelinRestaurantSeeds,
} from "./michelin-restaurants-bay-area";

const EXPECTED_RESTAURANTS = [
  ["kiln", "Kiln", 2, "Contemporary"],
  ["birdsong", "Birdsong", 2, "Contemporary, American"],
  ["nari", "Nari", 1, "Thai, Contemporary"],
  ["kin-khao", "Kin Khao", 1, "Thai"],
  ["californios", "Californios", 3, "Mexican, Contemporary"],
  ["state-bird-provisions", "State Bird Provisions", 1, "Californian"],
  ["the-progress", "The Progress", 1, "Californian"],
  ["7-adams", "7 Adams", 1, "Californian, Contemporary"],
  ["acquerello", "Acquerello", 2, "Italian, Contemporary"],
  ["restaurant-naides", "Restaurant Naides", 1, "Filipino"],
  ["niku-steakhouse", "Niku Steakhouse", 1, "Steakhouse"],
  ["ssal", "Ssal", 1, "Korean"],
  ["mister-jius", "Mister Jiu’s", 1, "Chinese"],
  ["benu", "Benu", 3, "Asian"],
  ["nisei", "Nisei", 1, "Japanese"],
  ["lazy-bear", "Lazy Bear", 2, "Contemporary"],
  ["sons-and-daughters", "Sons & Daughters", 2, "Contemporary"],
  ["hilda-and-jesse", "Hilda and Jesse", 1, "American, Contemporary"],
  ["san-ho-won", "San Ho Won", 1, "Korean, Contemporary"],
  ["quince", "Quince", 3, "Contemporary, Californian"],
  ["saison", "Saison", 2, "Californian"],
  ["atelier-crenn", "Atelier Crenn", 3, "Contemporary, French"],
  ["sorrel", "Sorrel", 1, "Contemporary"],
  ["angler-sf", "Angler SF", 1, "Contemporary, Seafood"],
  ["wolfsbane", "Wolfsbane", 1, "Contemporary"],
  ["sun-moon-studio", "Sun Moon Studio", 1, "Californian"],
  ["commis", "Commis", 2, "Contemporary"],
  ["madcap", "Madcap", 1, "Contemporary, Asian Contemporary"],
  ["wakuriya", "Wakuriya", 1, "Japanese"],
  ["singlethread", "SingleThread", 3, "Contemporary, Californian"],
  ["auberge-du-soleil", "Auberge du Soleil", 1, "Californian"],
  ["auro", "Auro", 1, "Contemporary, French"],
  ["enclos", "Enclos", 3, "Contemporary, Californian"],
  ["the-french-laundry", "The French Laundry", 3, "Contemporary, French"],
  ["the-village-pub", "The Village Pub", 1, "Contemporary, American Contemporary"],
  ["cyrus", "Cyrus", 1, "Californian, Modern Cuisine"],
  ["protege", "Protégé", 1, "Contemporary, Californian"],
  ["selbys", "Selby's", 1, "American, Classic Cuisine"],
  ["troubadour", "Troubadour", 1, "French, Californian"],
  ["plumed-horse", "Plumed Horse", 1, "Contemporary, American Contemporary"],
  ["press", "Press", 1, "Modern Cuisine"],
] as const;

const ACCESSIBLE_OFFICIAL_CUE_URLS = {
  "auberge-du-soleil": "https://guide.michelin.com/ca/en/california/rutherford/restaurant/auberge-du-soleil",
  auro: "https://guide.michelin.com/en/california/calistoga/restaurant/auro",
  enclos: "https://guide.michelin.com/en/california/sonoma/restaurant/enclos",
  "the-french-laundry": "https://guide.michelin.com/en/california/yountville/restaurant/the-french-laundry",
  cyrus: "https://guide.michelin.com/gb/en/california/geyserville/restaurant/cyrus",
} as const;

describe("the current named nine-county Bay Area MICHELIN restaurant studies", () => {
  it("matches the 41-entry live official Guide inventory and bounded file split", () => {
    expect(BAY_AREA_MICHELIN_CHECKED_AT).toBe("2026-08-26");
    expect(BAY_AREA_MICHELIN_LIST_URL).toBe(
      "https://guide.michelin.com/us/en/california/san-francisco/restaurants/all-starred",
    );
    expect(bayAreaMichelinRestaurantInputsPartOne).toHaveLength(15);
    expect(bayAreaMichelinRestaurantInputsPartTwo).toHaveLength(14);
    expect(bayAreaMichelinRestaurantInputsPartThree).toHaveLength(12);
    expect(Object.isFrozen(sanFranciscoMichelinRestaurantSeeds)).toBe(true);
    expect(sanFranciscoMichelinRestaurantSeeds).toBe(bayAreaMichelinRestaurantRecords);
    expect(bayAreaMichelinRestaurantSet).toEqual({
      schemaVersion: 1,
      setId: "michelin-restaurants-bay-area",
      title: "MICHELIN-starred restaurants — Bay Area",
      declaredCount: 41,
      checkedAt: "2026-08-26",
      sourceUrl: BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL,
      sourceUrls: [
        BAY_AREA_MICHELIN_LIST_URL,
        BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL,
        BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL,
        BAY_AREA_NINE_COUNTY_BOUNDARY_SOURCE_URL,
      ],
      distinctionCounts: { three: 7, two: 7, one: 27 },
    });
    expect(
      bayAreaMichelinRestaurantRecords.map(({ slug, restaurantName, starCount, cuisine }) => [
        slug,
        restaurantName,
        starCount,
        cuisine,
      ]),
    ).toEqual(EXPECTED_RESTAURANTS);
  });

  it("keeps one current, stable, official individual-listing record per restaurant", () => {
    expect(bayAreaMichelinRestaurantRecords).toHaveLength(41);
    expect(new Set(bayAreaMichelinRestaurantRecords.map(({ slug }) => slug)).size).toBe(41);
    expect(new Set(bayAreaMichelinRestaurantRecords.map(({ guideUrl }) => guideUrl)).size).toBe(41);
    expect(bayAreaMichelinRestaurantRecords.filter(({ starCount }) => starCount === 3)).toHaveLength(7);
    expect(bayAreaMichelinRestaurantRecords.filter(({ starCount }) => starCount === 2)).toHaveLength(7);
    expect(bayAreaMichelinRestaurantRecords.filter(({ starCount }) => starCount === 1)).toHaveLength(27);

    for (const record of bayAreaMichelinRestaurantRecords) {
      expect(record.checkedAt).toBe(BAY_AREA_MICHELIN_CHECKED_AT);
      expect(record.regionId).toBe("bay-area");
      expect(record.regionLabel).toBe("Bay Area");
      expect(record.locationLabel).toMatch(/, CA, \d{5}, USA$/u);
      expect(record.locationAliases).toContain("Bay Area");
      expect(record.cuisine.length).toBeGreaterThanOrEqual(3);
      expect(record.guideUrl).toMatch(
        /^https:\/\/guide\.michelin\.com\/us\/en\/california\/[a-z-]+\/restaurant\/[A-Za-z0-9%-]+$/u,
      );
      expect(record.evidenceSourceUrls[0]).toBe(record.guideUrl);
      expect(record.evidenceSourceUrls.every((url) => url.startsWith("https://"))).toBe(true);
    }

    for (const record of bayAreaMichelinRestaurantRecords.slice(29)) {
      expect(record.locationAliases).not.toContain("San Francisco & surroundings");
      expect(record.evidenceSourceUrls).toContain(BAY_AREA_NINE_COUNTY_BOUNDARY_SOURCE_URL);
      expect(
        record.evidenceSourceUrls.some((url) =>
          /^https:\/\/guide\.michelin\.com\/en\/california\/[a-z-]+\/restaurant\//u.test(url),
        ),
      ).toBe(true);
      expect(record.evidenceSourceUrls).toContain(
        record.slug === "singlethread" ||
          record.slug === "auberge-du-soleil" ||
          record.slug === "auro" ||
          record.slug === "enclos" ||
          record.slug === "the-french-laundry" ||
          record.slug === "the-village-pub" ||
          record.slug === "cyrus"
          ? BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL
          : BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL,
      );
    }
    for (const record of bayAreaMichelinRestaurantRecords.slice(0, 29)) {
      expect(record.locationAliases).toContain("San Francisco & surroundings");
    }
    for (const [slug, sourceUrl] of Object.entries(ACCESSIBLE_OFFICIAL_CUE_URLS)) {
      expect(
        bayAreaMichelinRestaurantRecords.find((record) => record.slug === slug)?.evidenceSourceUrls,
      ).toContain(sourceUrl);
    }
  });

  it("grounds each study in one concise, restaurant-specific visual cue", () => {
    const cueCorpus = bayAreaMichelinRestaurantRecords
      .map(({ restaurantName, evidenceCue }) => `${restaurantName} ${evidenceCue}`)
      .join(" ");
    expect(cueCorpus).toContain("Mushroom hor mok");
    expect(cueCorpus).toContain("rolling dim-sum-style carts");
    expect(cueCorpus).toContain("whole roasted duck");
    expect(cueCorpus).toContain("slow-poached egg yolk");
    expect(cueCorpus).toContain("open wood hearth");
    expect(cueCorpus).toContain("kaiseki");

    for (const record of bayAreaMichelinRestaurantRecords) {
      expect(["interior", "dish", "culture"]).toContain(record.cueType);
      expect(record.evidenceCue.length).toBeGreaterThanOrEqual(40);
      expect(record.evidenceCue.length).toBeLessThanOrEqual(190);
      expect(record.accessibleDescription).toContain(record.restaurantName);
      expect(record.accessibleDescription).toContain("broad, text-free forms");
    }
    expect(new Set(bayAreaMichelinRestaurantRecords.map(({ evidenceCue }) => evidenceCue)).size).toBe(41);
  });

  it("keeps every original art brief broad, miniature-safe, diverse, and brand-free", () => {
    const forbiddenPositiveDirection =
      /\bMICHELIN\b|\bstars?\b|\blogos?\b|\bpictograms?\b|trade dress|\bred\b|typography|photo(?:graph)? copying|microdetail/iu;
    expect(BAY_AREA_MICHELIN_ART_EXCLUSIONS).toEqual([
      "commercial guide branding, rating marks, or star pictograms",
      "restaurant names, signage, logos, menus, words, letters, numerals, or typography",
      "red commercial-guide trade dress",
      "individual plate or dish microdetail",
      "photographic copying of the referenced interior or food",
    ]);

    for (const record of bayAreaMichelinRestaurantRecords) {
      expect(record.primaryForms.length).toBeGreaterThanOrEqual(3);
      expect(record.primaryForms.length).toBeLessThanOrEqual(5);
      expect(record.supportingAccents.length).toBeLessThanOrEqual(3);
      expect(record.colorFamilies.length).toBeGreaterThanOrEqual(3);
      expect(record.colorFamilies.length).toBeLessThanOrEqual(6);
      expect(record.candidateStyles).toHaveLength(3);
      expect(new Set(record.candidateStyles).size).toBe(3);
      for (const styleId of record.candidateStyles) {
        expect(findArtStyle(styleId), `${record.slug}: ${styleId}`).toBeTruthy();
      }

      const positiveDirection = [
        ...record.primaryForms,
        ...record.supportingAccents,
        ...record.colorFamilies,
      ].join(" ");
      expect(positiveDirection).not.toMatch(forbiddenPositiveDirection);
      for (const form of record.primaryForms) {
        expect(form.trim().split(/\s+/u).length).toBeLessThanOrEqual(9);
      }
    }
    expect(
      new Set(bayAreaMichelinRestaurantRecords.flatMap(({ candidateStyles }) => candidateStyles)).size,
    ).toBeGreaterThanOrEqual(12);
  });
});
