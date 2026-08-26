import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bayAreaInventoryBoundary,
  michelinInventorySnapshot,
  MICHELIN_INVENTORY_SNAPSHOT_CHECKED_AT,
  michelinInventorySnapshotByRegion,
  michelinInventorySourcePages,
} from "./michelin-inventory-snapshot";
import type { MichelinInventorySnapshotRow } from "./michelin-inventory-snapshot";
import {
  BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL,
  BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL,
  BAY_AREA_MICHELIN_LIST_URL,
  bayAreaMichelinRestaurantSeeds,
} from "./michelin-restaurants-bay-area";
import {
  NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL,
  NEW_YORK_CITY_MICHELIN_LIST_URL,
  newYorkCityMichelinRestaurantSeeds,
} from "./michelin-restaurants-nyc";
import {
  WASHINGTON_DC_MICHELIN_LIST_URL,
  washingtonDcMichelinRestaurantSeeds,
} from "./michelin-restaurants-dc";
import type { MichelinRestaurantResearchSeed } from "./michelin-restaurant-seed";

const EXPECTED_SNAPSHOT_SHA256 = "2dc61787bd293dabc359ccc9e6bd743dda0755fe24778539c0cfcd6002ced5e2";
const EXPECTED_RESEARCH_SOURCE_SHA256 = "79fbbd8c572a0d46837f5c43f686ab9311eb75f6a8b27b49989437ca4e04243e";

const CONCRETE_SOURCE_CONTROLS = [
  [
    "benu",
    "whole roasted quail",
    "https://guide.michelin.com/us/en/california/san-francisco/restaurant/benu",
  ],
  ["nisei", "omurice", "https://guide.michelin.com/ca/en/california/san-francisco/restaurant/nisei"],
  [
    "lazy-bear",
    "gooseberry mignonette",
    "https://guide.michelin.com/ae-du/en/california/san-francisco/restaurant/lazy-bear",
  ],
  [
    "wolfsbane",
    "Dungeness crab",
    "https://guide.michelin.com/gb/en/california/san-francisco/restaurant/wolfsbane",
  ],
  [
    "yingtao",
    "Berkshire-pork-and-tiger-prawn wontons",
    "https://guide.michelin.com/us/en/new-york-state/new-york/restaurant/yingtao",
  ],
  [
    "cafe-boulud",
    "black sea bass wrapped in crispy potato",
    "https://www.cafeboulud.com/nyc/our-menu/dinner/",
  ],
  ["essential-by-christophe", "three blue prawns", "https://www.essentialbychristophe.com/menus/"],
  ["muku", "Yamagata soba", "https://www.restaurantmuku.nyc/menu"],
  ["jungsik-new-york", "striped jack with white kimchi", "https://www.jungsik.com/menu/"],
] as const;

describe("the independent 2026-08-26 Michelin inventory source snapshot", () => {
  it("binds the normalized official-source ledger to a reviewed digest", () => {
    expect(MICHELIN_INVENTORY_SNAPSHOT_CHECKED_AT).toBe("2026-08-26");
    expect(michelinInventorySnapshot).toHaveLength(132);
    expect(
      createHash("sha256")
        .update(
          JSON.stringify({
            checkedAt: MICHELIN_INVENTORY_SNAPSHOT_CHECKED_AT,
            sourcePages: michelinInventorySourcePages,
            records: michelinInventorySnapshot,
          }),
        )
        .digest("hex"),
    ).toBe(EXPECTED_SNAPSHOT_SHA256);
  });

  it("records the exact official page ranges and distinction counters", () => {
    expect(michelinInventorySourcePages).toEqual([
      expect.objectContaining({
        displayedRange: "San Francisco, California, USA and surroundings: 1-29 of 29 restaurants",
        displayedTotal: 29,
        distinctionCounts: { three: 4, two: 7, one: 18 },
      }),
      expect.objectContaining({
        displayedRange: "California : 1-48 of 83 restaurants",
        displayedTotal: 83,
        distinctionCounts: { three: 10, two: 13, one: 60 },
      }),
      expect.objectContaining({
        displayedRange: "California : 49-83 of 83 restaurants",
        displayedTotal: 83,
        distinctionCounts: { three: 10, two: 13, one: 60 },
      }),
      expect.objectContaining({
        displayedRange: "New York City, USA and surroundings: 1-48 of 69 restaurants",
        displayedTotal: 69,
        distinctionCounts: { three: 5, two: 14, one: 50 },
      }),
      expect.objectContaining({
        displayedRange: "New York City, USA and surroundings: 49-69 of 69 restaurants",
        displayedTotal: 69,
        distinctionCounts: { three: 5, two: 14, one: 50 },
      }),
      expect.objectContaining({
        displayedRange: "District of Columbia : 1-22 of 22 restaurants",
        displayedTotal: 22,
        distinctionCounts: { two: 3, one: 19 },
      }),
    ]);
    expect(bayAreaInventoryBoundary).toEqual({
      authority: "Metropolitan Transportation Commission",
      sourceUrl: "https://www.mtc.ca.gov/about-mtc/what-mtc",
      counties: [
        "Alameda",
        "Contra Costa",
        "Marin",
        "Napa",
        "San Francisco",
        "San Mateo",
        "Santa Clara",
        "Solano",
        "Sonoma",
      ],
    });
  });

  it("matches every production name, star, locality, individual URL, page URL, and order", () => {
    expect(
      projectProductionRows(
        bayAreaMichelinRestaurantSeeds,
        (seed) =>
          seed.evidenceSourceUrls.find((url) => url.includes("/restaurants/all-starred")) ??
          BAY_AREA_MICHELIN_LIST_URL,
      ),
    ).toEqual(michelinInventorySnapshotByRegion["bay-area"]);
    expect(projectProductionRows(newYorkCityMichelinRestaurantSeeds, (seed) => seed.sourceUrls[0])).toEqual(
      michelinInventorySnapshotByRegion["new-york-city"],
    );
    expect(
      projectProductionRows(washingtonDcMichelinRestaurantSeeds, () => WASHINGTON_DC_MICHELIN_LIST_URL),
    ).toEqual(michelinInventorySnapshotByRegion["washington-dc"]);
  });

  it("binds every cuisine and individualized visual cue to its reviewed evidence sources", () => {
    const seeds = [
      ...bayAreaMichelinRestaurantSeeds,
      ...newYorkCityMichelinRestaurantSeeds,
      ...washingtonDcMichelinRestaurantSeeds,
    ];
    const rows = seeds.map((seed) => [
      seed.slug,
      seed.cuisine,
      seed.cueType,
      seed.evidenceCue,
      seed.primaryForms,
      seed.guideUrl,
      seed.evidenceSourceUrls,
    ]);
    expect(rows).toHaveLength(132);
    expect(new Set(seeds.map((seed) => seed.slug)).size).toBe(132);
    for (const seed of seeds) {
      expect(seed.evidenceSourceUrls, seed.slug).toContain(seed.guideUrl);
      expect(
        seed.evidenceSourceUrls.every((url) => /^https:\/\//u.test(url)),
        seed.slug,
      ).toBe(true);
      expect(seed.evidenceCue.length, seed.slug).toBeGreaterThanOrEqual(60);
      expect(seed.primaryForms.length, seed.slug).toBeGreaterThanOrEqual(3);
    }
    expect(createHash("sha256").update(JSON.stringify(rows)).digest("hex")).toBe(
      EXPECTED_RESEARCH_SOURCE_SHA256,
    );

    for (const [slug, concreteCue, sourceUrl] of CONCRETE_SOURCE_CONTROLS) {
      const seed = seeds.find((candidate) => candidate.slug === slug)!;
      expect(seed.evidenceCue, slug).toContain(concreteCue);
      expect(seed.evidenceSourceUrls, slug).toContain(sourceUrl);
    }
  });

  it("keeps all six page captures complete and all 132 individual links unique", () => {
    expect(new Set(michelinInventorySnapshot.map((row) => row[4])).size).toBe(132);
    expect(new Set(michelinInventorySnapshot.map((row) => `${row[1]}|${row[3]}`)).size).toBe(132);
    expect(countRowsForPage(BAY_AREA_MICHELIN_LIST_URL)).toBe(29);
    expect(countRowsForPage(BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL)).toBe(7);
    expect(countRowsForPage(BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL)).toBe(5);
    expect(countRowsForPage(NEW_YORK_CITY_MICHELIN_LIST_URL)).toBe(48);
    expect(countRowsForPage(NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL)).toBe(21);
    expect(countRowsForPage(WASHINGTON_DC_MICHELIN_LIST_URL)).toBe(22);
    expect(countStars(michelinInventorySnapshotByRegion["bay-area"])).toEqual({
      one: 27,
      two: 7,
      three: 7,
    });
    expect(countStars(michelinInventorySnapshotByRegion["new-york-city"])).toEqual({
      one: 50,
      two: 14,
      three: 5,
    });
    expect(countStars(michelinInventorySnapshotByRegion["washington-dc"])).toEqual({
      one: 19,
      two: 3,
      three: 0,
    });

    for (const records of Object.values(michelinInventorySnapshotByRegion)) {
      expect(records.map((row) => row[0])).toEqual(records.map((_, index) => index + 1));
    }

    for (const row of michelinInventorySnapshot) {
      expect(row[3].length).toBeGreaterThanOrEqual(15);
      expect(row[4]).toMatch(/^https:\/\/guide\.michelin\.com\/.+\/restaurant\/.+$/u);
      expect(row[5]).toMatch(/^https:\/\/guide\.michelin\.com\/.+\/restaurants\/all-starred/u);
    }
  });

  it("keeps the source ledger structurally independent from production seed modules", () => {
    for (const fileName of [
      "michelin-inventory-snapshot.ts",
      "michelin-inventory-snapshot-bay-area-additions.ts",
      "michelin-inventory-snapshot-san-francisco.ts",
      "michelin-inventory-snapshot-nyc-01.ts",
      "michelin-inventory-snapshot-nyc-02.ts",
      "michelin-inventory-snapshot-washington-dc.ts",
    ]) {
      const source = readFileSync(new URL(fileName, import.meta.url), "utf8");
      expect(source, fileName).not.toMatch(/from ["']\.\/michelin-restaurants-/u);
    }
  });
});

function projectProductionRows<T extends MichelinRestaurantResearchSeed>(
  seeds: readonly T[],
  getListingUrl: (seed: T) => string,
): readonly MichelinInventorySnapshotRow[] {
  return seeds.map((seed, index) => {
    const listingUrl = getListingUrl(seed);
    expect(listingUrl).toMatch(/^https:\/\/guide\.michelin\.com\//u);
    return [
      index + 1,
      seed.restaurantName,
      seed.starCount,
      seed.locationLabel,
      seed.guideUrl,
      listingUrl as `https://guide.michelin.com/${string}`,
    ] as const;
  });
}

function countRowsForPage(sourceListingUrl: string): number {
  return michelinInventorySnapshot.filter((row) => row[5] === sourceListingUrl).length;
}

function countStars(records: readonly MichelinInventorySnapshotRow[]): {
  readonly one: number;
  readonly two: number;
  readonly three: number;
} {
  return {
    one: records.filter((row) => row[2] === 1).length,
    two: records.filter((row) => row[2] === 2).length,
    three: records.filter((row) => row[2] === 3).length,
  };
}
