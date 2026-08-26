import { MICHELIN_RESTAURANT_RESEARCH_CHECKED_AT } from "./michelin-restaurant-seed";
import type { MichelinRestaurantResearchSeed, RestaurantVisualCueType } from "./michelin-restaurant-seed";

export const NEW_YORK_CITY_MICHELIN_CHECKED_AT = MICHELIN_RESTAURANT_RESEARCH_CHECKED_AT;

export const NEW_YORK_CITY_MICHELIN_LIST_URL =
  "https://guide.michelin.com/en/us/new-york-state/new-york/restaurants/all-starred" as const;

export const NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL =
  "https://guide.michelin.com/us/en/new-york-state/new-york/restaurants/all-starred/page/2" as const;

export type MichelinRestaurantNycCity = "New York" | "Brooklyn" | "Queens";

export interface MichelinRestaurantNycSeed extends MichelinRestaurantResearchSeed {
  readonly city: MichelinRestaurantNycCity;
  readonly sourceUrls: readonly [string, ...string[]];
}

export interface MichelinRestaurantNycInput {
  readonly slug: string;
  readonly restaurantName: string;
  readonly city: MichelinRestaurantNycCity;
  readonly starCount: 1 | 2 | 3;
  readonly cuisine: string;
  readonly guidePath: string;
  readonly listingPage: 1 | 2;
  readonly cueType: RestaurantVisualCueType;
  readonly evidenceCue: string;
  readonly additionalEvidenceSourceUrls?: readonly string[];
  readonly primaryForms: readonly [string, string, string, ...string[]];
  readonly supportingAccents: readonly string[];
  readonly colorFamilies: readonly [string, string, string, ...string[]];
  readonly candidateStyles: readonly [string, string, string];
}

export function defineMichelinRestaurantNycSeed(
  input: MichelinRestaurantNycInput,
): MichelinRestaurantNycSeed {
  const guideLocation = input.city === "New York" ? "new-york" : input.city.toLowerCase();
  const guideUrl =
    `https://guide.michelin.com/en/new-york-state/${guideLocation}/restaurant/${input.guidePath}` as const;
  const listingUrl =
    input.listingPage === 1 ? NEW_YORK_CITY_MICHELIN_LIST_URL : NEW_YORK_CITY_MICHELIN_LIST_PAGE_2_URL;
  const sourceUrls = [listingUrl, guideUrl, ...(input.additionalEvidenceSourceUrls ?? [])] as const;

  return {
    slug: input.slug,
    restaurantName: input.restaurantName,
    city: input.city,
    locationLabel: `${input.city}, NY, USA`,
    locationAliases: [input.city, "New York City"],
    regionId: "new-york-city",
    regionLabel: "New York City",
    starCount: input.starCount,
    cuisine: input.cuisine,
    guideUrl,
    checkedAt: NEW_YORK_CITY_MICHELIN_CHECKED_AT,
    cueType: input.cueType,
    evidenceCue: input.evidenceCue,
    evidenceSourceUrls: sourceUrls,
    sourceUrls,
    primaryForms: input.primaryForms,
    supportingAccents: input.supportingAccents,
    colorFamilies: input.colorFamilies,
    candidateStyles: input.candidateStyles,
    accessibleDescription: `An original ${input.cueType}-led miniature badge study for ${input.restaurantName}, composed from ${input.primaryForms.length} broad forms: ${input.primaryForms.join(", ")}.`,
  };
}
