import { describe, expect, it } from "vitest";

import { findArtStyle } from "./art-styles";
import {
  WASHINGTON_DC_MICHELIN_ART_EXCLUSIONS,
  WASHINGTON_DC_MICHELIN_CHECKED_AT,
  WASHINGTON_DC_MICHELIN_LIST_URL,
  washingtonDcMichelinRestaurantRecords,
  washingtonDcMichelinRestaurantSet,
} from "./michelin-restaurants-dc";

const EXPECTED_RESTAURANTS = [
  ["the-inn-at-little-washington", "The Inn at Little Washington", 2, "French, Classic French"],
  ["jont", "Jônt", 2, "Contemporary"],
  ["minibar-by-jose-andres", "minibar by José Andrés", 2, "Creative"],
  ["xiquet", "Xiquet", 1, "Spanish"],
  ["rooster-and-owl", "Rooster & Owl", 1, "Contemporary, Fusion"],
  ["masseria", "Masseria", 1, "Italian, Regional Cuisine"],
  ["omakase-at-barracks-row", "Omakase at Barracks Row", 1, "Japanese, Sushi"],
  ["the-dabney", "The Dabney", 1, "American, Contemporary"],
  ["elcielo-washington-dc", "Elcielo Washington DC", 1, "Colombian, Contemporary"],
  ["oyster-oyster", "Oyster Oyster", 1, "Vegetarian, Contemporary"],
  ["pineapple-and-pearls", "Pineapple and Pearls", 1, "Contemporary"],
  ["causa", "Causa", 1, "Peruvian, Latin American"],
  ["imperfecto-the-chefs-table", "Imperfecto: The Chef's Table", 1, "Latin American"],
  ["sushi-nakazawa-washington-dc", "Sushi Nakazawa Washington DC", 1, "Japanese, Sushi"],
  ["albi", "Albi", 1, "Middle Eastern"],
  ["mita", "MITA", 1, "Vegetarian, Latin American"],
  ["roses-luxury", "Rose’s Luxury", 1, "Contemporary"],
  ["little-pearl", "Little Pearl", 1, "Contemporary"],
  ["fiola", "Fiola", 1, "Italian, Contemporary"],
  ["bresca", "Bresca", 1, "Contemporary, American"],
  ["gravitas", "Gravitas", 1, "Contemporary, American"],
  ["rania", "Rania", 1, "Indian, Contemporary"],
] as const;

describe("the current named Washington, DC MICHELIN restaurant studies", () => {
  it("matches the 22-entry live official Guide inventory", () => {
    expect(WASHINGTON_DC_MICHELIN_CHECKED_AT).toBe("2026-08-26");
    expect(WASHINGTON_DC_MICHELIN_LIST_URL).toBe(
      "https://guide.michelin.com/us/en/district-of-columbia/restaurants/all-starred",
    );
    expect(washingtonDcMichelinRestaurantSet).toEqual({
      schemaVersion: 1,
      setId: "michelin-restaurants-washington-dc",
      title: "MICHELIN-starred restaurants — Washington, DC & surroundings",
      declaredCount: 22,
      checkedAt: "2026-08-26",
      sourceUrl: WASHINGTON_DC_MICHELIN_LIST_URL,
      distinctionCounts: { two: 3, one: 19 },
    });
    expect(
      washingtonDcMichelinRestaurantRecords.map(({ slug, restaurantName, starCount, cuisine }) => [
        slug,
        restaurantName,
        starCount,
        cuisine,
      ]),
    ).toEqual(EXPECTED_RESTAURANTS);
  });

  it("keeps one stable official individual-listing record per restaurant", () => {
    expect(washingtonDcMichelinRestaurantRecords).toHaveLength(22);
    expect(new Set(washingtonDcMichelinRestaurantRecords.map(({ slug }) => slug)).size).toBe(22);
    expect(new Set(washingtonDcMichelinRestaurantRecords.map(({ guideUrl }) => guideUrl)).size).toBe(22);

    for (const record of washingtonDcMichelinRestaurantRecords) {
      expect(record.checkedAt).toBe(WASHINGTON_DC_MICHELIN_CHECKED_AT);
      expect(record.locationLabel).toMatch(/Washington, (?:DC|VA), \d{5}, USA$/u);
      expect(record.regionId).toBe("washington-dc");
      expect(record.regionLabel).toBe("Washington, DC & surroundings");
      expect(record.cuisine.length).toBeGreaterThanOrEqual(3);
      expect(record.guideUrl).toMatch(
        /^https:\/\/guide\.michelin\.com\/us\/en\/district-of-columbia\/washington-dc\/restaurant\/[a-z0-9-]+$/u,
      );
      expect(record.evidenceSourceUrls).toEqual([record.guideUrl]);
    }
    expect(washingtonDcMichelinRestaurantRecords[0]).toMatchObject({
      locationLabel: "309 Middle St., Washington, VA, 22747, USA",
      locationAliases: ["Washington, Virginia", "Rappahannock County", "Washington, DC & surroundings"],
    });
    for (const record of washingtonDcMichelinRestaurantRecords.slice(1)) {
      expect(record.locationAliases).toEqual(["Washington, DC", "District of Columbia"]);
    }
  });

  it("grounds each study in one concise interior, dish, or culture cue", () => {
    for (const record of washingtonDcMichelinRestaurantRecords) {
      expect(["interior", "dish", "culture"]).toContain(record.cueType);
      expect(record.evidenceCue.length).toBeGreaterThanOrEqual(24);
      expect(record.evidenceCue.length).toBeLessThanOrEqual(180);
      expect(record.accessibleDescription).toContain(record.restaurantName);
      expect(record.accessibleDescription).toContain("broad forms");
    }
    expect(new Set(washingtonDcMichelinRestaurantRecords.map(({ evidenceCue }) => evidenceCue)).size).toBe(
      22,
    );
  });

  it("keeps every original art brief broad, miniature-safe, and brand-free", () => {
    const forbiddenPositiveDirection =
      /\bMICHELIN\b|\bstars?\b|\blogos?\b|\bpictograms?\b|trade dress|\bred\b|typography|photo(?:graph)? copying|microdetail/iu;
    expect(WASHINGTON_DC_MICHELIN_ART_EXCLUSIONS).toEqual([
      "commercial guide branding, rating marks, or star pictograms",
      "restaurant names, signage, logos, menus, words, letters, numerals, or typography",
      "red commercial-guide trade dress",
      "individual plate or dish microdetail",
      "photographic copying of the referenced interior or food",
    ]);

    for (const record of washingtonDcMichelinRestaurantRecords) {
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
  });
});
