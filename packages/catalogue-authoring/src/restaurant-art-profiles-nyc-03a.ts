import { newYorkCityRestaurantArtProfiles03aPart1 } from "./restaurant-art-profiles-nyc-03a-part-1";
import { newYorkCityRestaurantArtProfiles03aPart2 } from "./restaurant-art-profiles-nyc-03a-part-2";

export const newYorkCityRestaurantArtProfiles03a = [
  ...newYorkCityRestaurantArtProfiles03aPart1,
  ...newYorkCityRestaurantArtProfiles03aPart2,
] as const;
