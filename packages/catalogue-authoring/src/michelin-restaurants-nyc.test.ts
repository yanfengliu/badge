import { describe, expect, it } from "vitest";

import { findArtStyle } from "./art-styles";
import {
  NEW_YORK_CITY_MICHELIN_CHECKED_AT,
  NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL,
  NEW_YORK_CITY_MICHELIN_LIST_URL,
  michelinRestaurantsNyc,
  newYorkCityMichelinRestaurantSet,
} from "./michelin-restaurants-nyc";

const EXPECTED_NAMES = [
  "Icca",
  "Atera",
  "Huso",
  "Jungsik New York",
  "Crown Shy",
  "Saga",
  "Bridges",
  "Yamada",
  "Le Coucou",
  "Muku",
  "L’Abeille",
  "Corima",
  "Dirt Candy",
  "César",
  "Torrisi",
  "Estela",
  "Torien",
  "Yoshino",
  "Sixty Three Clinton",
  "Sushi Nakazawa New York",
  "Family Meal at Blue Hill",
  "Jeju Noodle Bar",
  "Frevo",
  "Shmoné",
  "Tuome",
  "Bar Miller",
  "Tsukimi",
  "Semma",
  "Kosaka",
  "Casa Mono",
  "Oiji Mi",
  "bōm",
  "Gramercy Tavern",
  "Rezdôra",
  "Noda",
  "Odo",
  "Noz 17",
  "Aska",
  "Cote",
  "Jua",
  "Shota Omakase",
  "Eleven Madison Park",
  "Francie",
  "Atomix",
  "The Four Horsemen",
  "Joo Ok",
  "Nōksu",
  "Oxomoco",
  "Tempura Matsui",
  "Restaurant Yuu",
  "Chef's Table at Brooklyn Fare",
  "Sushi Sho",
  "Gabriel Kreuther",
  "Le Pavillon",
  "Jōji",
  "Meju",
  "Kochi",
  "Mari",
  "Le Bernardin",
  "The Modern",
  "YingTao",
  "Aquavit",
  "Per Se",
  "Masa",
  "Jean-Georges",
  "Café Boulud",
  "Daniel",
  "Sushi Noz",
  "Essential by Christophe",
] as const;

const THREE_STAR_NAMES = [
  "Jungsik New York",
  "Eleven Madison Park",
  "Sushi Sho",
  "Le Bernardin",
  "Per Se",
] as const;

const TWO_STAR_NAMES = [
  "Atera",
  "Saga",
  "César",
  "Odo",
  "Aska",
  "Atomix",
  "Joo Ok",
  "Chef's Table at Brooklyn Fare",
  "Gabriel Kreuther",
  "The Modern",
  "Aquavit",
  "Masa",
  "Jean-Georges",
  "Sushi Noz",
] as const;

describe("the current New York City MICHELIN restaurant research seeds", () => {
  it("matches the exact 69-name, 5/14/50 official Guide inventory", () => {
    expect(NEW_YORK_CITY_MICHELIN_CHECKED_AT).toBe("2026-08-26");
    expect(michelinRestaurantsNyc.map(({ restaurantName }) => restaurantName)).toEqual(EXPECTED_NAMES);
    expect(
      michelinRestaurantsNyc
        .filter(({ starCount }) => starCount === 3)
        .map(({ restaurantName }) => restaurantName),
    ).toEqual(THREE_STAR_NAMES);
    expect(
      michelinRestaurantsNyc
        .filter(({ starCount }) => starCount === 2)
        .map(({ restaurantName }) => restaurantName),
    ).toEqual(TWO_STAR_NAMES);
    expect(michelinRestaurantsNyc.filter(({ starCount }) => starCount === 1)).toHaveLength(50);
    expect(newYorkCityMichelinRestaurantSet).toEqual({
      schemaVersion: 1,
      setId: "michelin-restaurants-new-york-city",
      title: "MICHELIN-starred restaurants — New York City",
      declaredCount: 69,
      checkedAt: "2026-08-26",
      sourceUrls: [NEW_YORK_CITY_MICHELIN_LIST_URL, NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL],
      distinctionCounts: { three: 5, two: 14, one: 50 },
    });
  });

  it("keeps a unique global-English individual Guide URL and listing-page source for every entry", () => {
    expect(michelinRestaurantsNyc).toHaveLength(69);
    expect(new Set(michelinRestaurantsNyc.map(({ slug }) => slug)).size).toBe(69);
    expect(new Set(michelinRestaurantsNyc.map(({ guideUrl }) => guideUrl)).size).toBe(69);

    for (const seed of michelinRestaurantsNyc) {
      expect(seed.checkedAt).toBe(NEW_YORK_CITY_MICHELIN_CHECKED_AT);
      expect(seed.regionId).toBe("new-york-city");
      expect(["New York", "Brooklyn", "Queens"]).toContain(seed.city);
      expect(seed.locationLabel).toBe(`${seed.city}, NY, USA`);
      expect(seed.guideUrl).toMatch(
        /^https:\/\/guide\.michelin\.com\/en\/new-york-state\/(?:new-york|brooklyn|queens)\/restaurant\//u,
      );
      expect(seed.sourceUrls).toEqual(seed.evidenceSourceUrls);
      expect(seed.sourceUrls).toContain(seed.guideUrl);
      expect(
        seed.sourceUrls.some((url) =>
          [NEW_YORK_CITY_MICHELIN_LIST_URL, NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL].includes(url as never),
        ),
      ).toBe(true);
      expect(seed.cuisine.length).toBeGreaterThan(2);
    }
  });

  it("grounds each miniature-safe art brief in a concise official-page cue", () => {
    const forbiddenPositiveDirection =
      /\bMICHELIN\b|\bstars?\b|\blogos?\b|\bpictograms?\b|trade dress|\bred\b|typography|microdetail|chef likeness|photo(?:graph)? copying/iu;

    for (const seed of michelinRestaurantsNyc) {
      expect(["interior", "dish", "culture"]).toContain(seed.cueType);
      expect(seed.evidenceCue.length).toBeGreaterThanOrEqual(50);
      expect(seed.evidenceCue.length).toBeLessThanOrEqual(180);
      expect(seed.primaryForms.length).toBeGreaterThanOrEqual(3);
      expect(seed.primaryForms.length).toBeLessThanOrEqual(5);
      expect(seed.supportingAccents.length).toBeLessThanOrEqual(3);
      expect(seed.colorFamilies.length).toBeGreaterThanOrEqual(3);
      expect(seed.colorFamilies.length).toBeLessThanOrEqual(6);
      expect(seed.candidateStyles).toHaveLength(3);
      expect(seed.accessibleDescription.length).toBeGreaterThan(40);

      for (const styleId of seed.candidateStyles) {
        expect(findArtStyle(styleId), `${seed.slug} uses unknown style ${styleId}`).toBeDefined();
      }

      const positiveDirection = [...seed.primaryForms, ...seed.supportingAccents, ...seed.colorFamilies].join(
        " ",
      );
      expect(positiveDirection).not.toMatch(forbiddenPositiveDirection);
      for (const form of seed.primaryForms) {
        expect(form.trim().split(/\s+/u).length).toBeLessThanOrEqual(9);
      }
    }
    expect(new Set(michelinRestaurantsNyc.map(({ evidenceCue }) => evidenceCue)).size).toBe(69);
  });
});
