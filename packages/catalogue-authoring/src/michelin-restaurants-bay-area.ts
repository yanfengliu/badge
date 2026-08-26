import { bayAreaMichelinRestaurantInputsPartOne } from "./michelin-restaurants-bay-area-01";
import { bayAreaMichelinRestaurantInputsPartTwo } from "./michelin-restaurants-bay-area-02";
import { bayAreaMichelinRestaurantInputsPartThree } from "./michelin-restaurants-bay-area-03";
import {
  BAY_AREA_MICHELIN_ART_EXCLUSIONS,
  BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL,
  BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL,
  BAY_AREA_MICHELIN_CHECKED_AT,
  BAY_AREA_MICHELIN_LIST_URL,
  BAY_AREA_NINE_COUNTY_BOUNDARY_SOURCE_URL,
  bayAreaMichelinRestaurantSet,
  defineBayAreaMichelinRestaurantSeed,
} from "./michelin-restaurants-bay-area-types";
import type { MichelinRestaurantResearchSeed } from "./michelin-restaurant-seed";

const SAN_FRANCISCO_SOURCE_ALIASES = ["San Francisco & surroundings"] as const;

export {
  BAY_AREA_MICHELIN_ART_EXCLUSIONS,
  BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL,
  BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL,
  BAY_AREA_MICHELIN_CHECKED_AT,
  BAY_AREA_MICHELIN_LIST_URL,
  BAY_AREA_NINE_COUNTY_BOUNDARY_SOURCE_URL,
  bayAreaMichelinRestaurantInputsPartOne,
  bayAreaMichelinRestaurantInputsPartTwo,
  bayAreaMichelinRestaurantInputsPartThree,
  bayAreaMichelinRestaurantSet,
};

export const bayAreaMichelinRestaurantSeeds: readonly MichelinRestaurantResearchSeed[] = Object.freeze([
  ...bayAreaMichelinRestaurantInputsPartOne.map((input) =>
    defineBayAreaMichelinRestaurantSeed(input, SAN_FRANCISCO_SOURCE_ALIASES),
  ),
  ...bayAreaMichelinRestaurantInputsPartTwo.map((input) =>
    defineBayAreaMichelinRestaurantSeed(input, SAN_FRANCISCO_SOURCE_ALIASES),
  ),
  ...bayAreaMichelinRestaurantInputsPartThree.map((input) => defineBayAreaMichelinRestaurantSeed(input)),
]);

export const sanFranciscoMichelinRestaurantSeeds = bayAreaMichelinRestaurantSeeds;

export const bayAreaMichelinRestaurantRecords = bayAreaMichelinRestaurantSeeds;
