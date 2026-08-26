import type { MichelinRestaurantResearchSeed, RestaurantVisualCueType } from "./michelin-restaurant-seed";

export const BAY_AREA_MICHELIN_CHECKED_AT = "2026-08-26" as const;

export const BAY_AREA_MICHELIN_LIST_URL =
  "https://guide.michelin.com/us/en/california/san-francisco/restaurants/all-starred" as const;

export const BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL =
  "https://guide.michelin.com/us/en/california/restaurants/all-starred" as const;

export const BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL =
  "https://guide.michelin.com/us/en/california/restaurants/all-starred/page/2" as const;

export const BAY_AREA_NINE_COUNTY_BOUNDARY_SOURCE_URL = "https://www.mtc.ca.gov/about-mtc/what-mtc" as const;

export const BAY_AREA_MICHELIN_ART_EXCLUSIONS = [
  "commercial guide branding, rating marks, or star pictograms",
  "restaurant names, signage, logos, menus, words, letters, numerals, or typography",
  "red commercial-guide trade dress",
  "individual plate or dish microdetail",
  "photographic copying of the referenced interior or food",
] as const;

export const bayAreaMichelinRestaurantSet = {
  schemaVersion: 1,
  setId: "michelin-restaurants-bay-area",
  title: "MICHELIN-starred restaurants — Bay Area",
  declaredCount: 41,
  checkedAt: BAY_AREA_MICHELIN_CHECKED_AT,
  sourceUrl: BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL,
  sourceUrls: [
    BAY_AREA_MICHELIN_LIST_URL,
    BAY_AREA_MICHELIN_CALIFORNIA_LIST_URL,
    BAY_AREA_MICHELIN_CALIFORNIA_LIST_PAGE_2_URL,
    BAY_AREA_NINE_COUNTY_BOUNDARY_SOURCE_URL,
  ],
  distinctionCounts: { three: 7, two: 7, one: 27 },
} as const;

export interface BayAreaMichelinRestaurantInput {
  readonly slug: string;
  readonly restaurantName: string;
  readonly locationLabel: string;
  readonly locationAliases: readonly [string, string, ...string[]];
  readonly starCount: 1 | 2 | 3;
  readonly cuisine: string;
  readonly guideUrl: `https://guide.michelin.com/${string}`;
  readonly cueType: RestaurantVisualCueType;
  readonly evidenceCue: string;
  readonly otherEvidenceSourceUrls?: readonly string[];
  readonly primaryForms: readonly [string, string, string, ...string[]];
  readonly supportingAccents: readonly string[];
  readonly colorFamilies: readonly [string, string, string, ...string[]];
  readonly candidateStyles: readonly [string, string, string];
}

export function defineBayAreaMichelinRestaurantSeed(
  input: BayAreaMichelinRestaurantInput,
  sourceRegionAliases: readonly string[] = [],
): MichelinRestaurantResearchSeed {
  return {
    slug: input.slug,
    restaurantName: input.restaurantName,
    locationLabel: input.locationLabel,
    locationAliases: uniqueAliases([...input.locationAliases, "Bay Area", ...sourceRegionAliases]),
    regionId: "bay-area",
    regionLabel: "Bay Area",
    starCount: input.starCount,
    cuisine: input.cuisine,
    guideUrl: input.guideUrl,
    checkedAt: BAY_AREA_MICHELIN_CHECKED_AT,
    cueType: input.cueType,
    evidenceCue: input.evidenceCue,
    evidenceSourceUrls: [input.guideUrl, ...(input.otherEvidenceSourceUrls ?? [])],
    primaryForms: input.primaryForms,
    supportingAccents: input.supportingAccents,
    colorFamilies: input.colorFamilies,
    candidateStyles: input.candidateStyles,
    accessibleDescription: `An original ${input.cueType}-led miniature badge study for ${input.restaurantName}, translating its researched character into ${input.primaryForms.length} broad, text-free forms: ${input.primaryForms.join(", ")}.`,
  };
}

function uniqueAliases(aliases: readonly string[]): readonly string[] {
  return [...new Set(aliases)];
}
