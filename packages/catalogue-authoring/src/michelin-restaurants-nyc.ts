import { newYorkCityMichelinRestaurantSeeds01 } from "./michelin-restaurants-nyc-01";
import { newYorkCityMichelinRestaurantSeeds02 } from "./michelin-restaurants-nyc-02";
import { newYorkCityMichelinRestaurantSeeds03 } from "./michelin-restaurants-nyc-03";
import {
  NEW_YORK_CITY_MICHELIN_CHECKED_AT,
  NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL,
  NEW_YORK_CITY_MICHELIN_LIST_URL,
} from "./michelin-restaurants-nyc-types";
import type { MichelinRestaurantNycSeed } from "./michelin-restaurants-nyc-types";

export {
  NEW_YORK_CITY_MICHELIN_CHECKED_AT,
  NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL,
  NEW_YORK_CITY_MICHELIN_LIST_URL,
};
export type { MichelinRestaurantNycCity, MichelinRestaurantNycSeed } from "./michelin-restaurants-nyc-types";

export const NEW_YORK_CITY_MICHELIN_ART_EXCLUSIONS = [
  "commercial guide branding, rating marks, or star pictograms",
  "restaurant names, signage, logos, menus, words, letters, numerals, or typography",
  "red commercial-guide trade dress",
  "individual plate or dish microdetail",
  "chef likenesses",
  "photographic copying of the referenced interior or food",
] as const;

export const newYorkCityMichelinRestaurantSet = {
  schemaVersion: 1,
  setId: "michelin-restaurants-new-york-city",
  title: "MICHELIN-starred restaurants — New York City",
  declaredCount: 69,
  checkedAt: NEW_YORK_CITY_MICHELIN_CHECKED_AT,
  sourceUrls: [NEW_YORK_CITY_MICHELIN_LIST_URL, NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL],
  distinctionCounts: { three: 5, two: 14, one: 50 },
} as const;

export const newYorkCityMichelinRestaurantSeeds: readonly MichelinRestaurantNycSeed[] = [
  ...newYorkCityMichelinRestaurantSeeds01,
  ...newYorkCityMichelinRestaurantSeeds02,
  ...newYorkCityMichelinRestaurantSeeds03,
];

export const michelinRestaurantsNyc = newYorkCityMichelinRestaurantSeeds;
