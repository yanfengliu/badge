import { newYorkCityRestaurantArtProfiles03bPart1 } from "./restaurant-art-profiles-nyc-03b-part-1";
import { newYorkCityRestaurantArtProfiles03bPart2 } from "./restaurant-art-profiles-nyc-03b-part-2";

export const newYorkCityRestaurantArtProfiles03b = [
  ...newYorkCityRestaurantArtProfiles03bPart1,
  ...newYorkCityRestaurantArtProfiles03bPart2,
] as const;
