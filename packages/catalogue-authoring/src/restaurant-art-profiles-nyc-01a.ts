import { newYorkCityRestaurantArtProfiles01aPart1 } from "./restaurant-art-profiles-nyc-01a-part-1";
import { newYorkCityRestaurantArtProfiles01aPart2 } from "./restaurant-art-profiles-nyc-01a-part-2";

export const newYorkCityRestaurantArtProfiles01a = [
  ...newYorkCityRestaurantArtProfiles01aPart1,
  ...newYorkCityRestaurantArtProfiles01aPart2,
] as const;
