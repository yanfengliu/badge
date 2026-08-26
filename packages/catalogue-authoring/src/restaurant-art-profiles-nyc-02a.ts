import { newYorkCityRestaurantArtProfiles02aPart1 } from "./restaurant-art-profiles-nyc-02a-part-1";
import { newYorkCityRestaurantArtProfiles02aPart2 } from "./restaurant-art-profiles-nyc-02a-part-2";

export const newYorkCityRestaurantArtProfiles02a = [
  ...newYorkCityRestaurantArtProfiles02aPart1,
  ...newYorkCityRestaurantArtProfiles02aPart2,
] as const;
