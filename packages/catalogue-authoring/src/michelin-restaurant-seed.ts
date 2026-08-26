export const MICHELIN_RESTAURANT_RESEARCH_CHECKED_AT = "2026-08-26" as const;

export type MichelinRestaurantResearchCheckedAt = typeof MICHELIN_RESTAURANT_RESEARCH_CHECKED_AT;

export type MichelinDiningRegionId = "bay-area" | "new-york-city" | "washington-dc";

export type RestaurantVisualCueType = "interior" | "dish" | "culture";

export interface MichelinRestaurantResearchSeed {
  readonly slug: string;
  readonly restaurantName: string;
  readonly locationLabel: string;
  readonly locationAliases: readonly string[];
  readonly regionId: MichelinDiningRegionId;
  readonly regionLabel: string;
  readonly starCount: 1 | 2 | 3;
  readonly cuisine: string;
  readonly guideUrl: `https://guide.michelin.com/${string}`;
  readonly checkedAt: MichelinRestaurantResearchCheckedAt;
  readonly cueType: RestaurantVisualCueType;
  readonly evidenceCue: string;
  readonly evidenceSourceUrls: readonly [string, ...string[]];
  readonly primaryForms: readonly [string, string, string, ...string[]];
  readonly supportingAccents: readonly string[];
  readonly colorFamilies: readonly [string, string, string, ...string[]];
  readonly candidateStyles: readonly [string, string, string];
  readonly accessibleDescription: string;
}
