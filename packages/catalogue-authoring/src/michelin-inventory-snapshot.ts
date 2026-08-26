import { michelinInventoryBayAreaAdditions } from "./michelin-inventory-snapshot-bay-area-additions";
import { michelinInventoryNewYorkPageOne } from "./michelin-inventory-snapshot-nyc-01";
import { michelinInventoryNewYorkPageTwo } from "./michelin-inventory-snapshot-nyc-02";
import { michelinInventorySanFrancisco } from "./michelin-inventory-snapshot-san-francisco";
import { michelinInventoryWashingtonDc } from "./michelin-inventory-snapshot-washington-dc";
import type { MichelinDiningRegionId } from "./michelin-restaurant-seed";

export type MichelinInventorySnapshotRow = readonly [
  ordinal: number,
  restaurantName: string,
  starCount: 1 | 2 | 3,
  locality: string,
  individualGuideUrl: `https://guide.michelin.com/${string}`,
  sourceListingUrl: `https://guide.michelin.com/${string}`,
];

export interface MichelinInventorySourcePage {
  readonly regionId: MichelinDiningRegionId;
  readonly sourceListingUrl: `https://guide.michelin.com/${string}`;
  readonly displayedRange: string;
  readonly displayedTotal: number;
  readonly distinctionCounts: Readonly<Partial<Record<"one" | "two" | "three", number>>>;
}

export const MICHELIN_INVENTORY_SNAPSHOT_CHECKED_AT = "2026-08-26" as const;

export const bayAreaInventoryBoundary = Object.freeze({
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
} as const);

export const michelinInventorySourcePages: readonly MichelinInventorySourcePage[] = Object.freeze([
  {
    regionId: "bay-area",
    sourceListingUrl: "https://guide.michelin.com/us/en/california/san-francisco/restaurants/all-starred",
    displayedRange: "San Francisco, California, USA and surroundings: 1-29 of 29 restaurants",
    displayedTotal: 29,
    distinctionCounts: { three: 4, two: 7, one: 18 },
  },
  {
    regionId: "bay-area",
    sourceListingUrl: "https://guide.michelin.com/us/en/california/restaurants/all-starred",
    displayedRange: "California : 1-48 of 83 restaurants",
    displayedTotal: 83,
    distinctionCounts: { three: 10, two: 13, one: 60 },
  },
  {
    regionId: "bay-area",
    sourceListingUrl: "https://guide.michelin.com/us/en/california/restaurants/all-starred/page/2",
    displayedRange: "California : 49-83 of 83 restaurants",
    displayedTotal: 83,
    distinctionCounts: { three: 10, two: 13, one: 60 },
  },
  {
    regionId: "new-york-city",
    sourceListingUrl: "https://guide.michelin.com/en/us/new-york-state/new-york/restaurants/all-starred",
    displayedRange: "New York City, USA and surroundings: 1-48 of 69 restaurants",
    displayedTotal: 69,
    distinctionCounts: { three: 5, two: 14, one: 50 },
  },
  {
    regionId: "new-york-city",
    sourceListingUrl:
      "https://guide.michelin.com/us/en/new-york-state/new-york/restaurants/all-starred/page/2",
    displayedRange: "New York City, USA and surroundings: 49-69 of 69 restaurants",
    displayedTotal: 69,
    distinctionCounts: { three: 5, two: 14, one: 50 },
  },
  {
    regionId: "washington-dc",
    sourceListingUrl: "https://guide.michelin.com/us/en/district-of-columbia/restaurants/all-starred",
    displayedRange: "District of Columbia : 1-22 of 22 restaurants",
    displayedTotal: 22,
    distinctionCounts: { two: 3, one: 19 },
  },
]);

export const michelinInventorySnapshotByRegion = Object.freeze({
  "bay-area": Object.freeze([...michelinInventorySanFrancisco, ...michelinInventoryBayAreaAdditions]),
  "new-york-city": Object.freeze([...michelinInventoryNewYorkPageOne, ...michelinInventoryNewYorkPageTwo]),
  "washington-dc": michelinInventoryWashingtonDc,
});

export const michelinInventorySnapshot = Object.freeze([
  ...michelinInventorySnapshotByRegion["bay-area"],
  ...michelinInventorySnapshotByRegion["new-york-city"],
  ...michelinInventorySnapshotByRegion["washington-dc"],
]);
