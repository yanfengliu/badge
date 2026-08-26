import { newYorkCityRestaurantArtProfiles02bPart1 } from "./restaurant-art-profiles-nyc-02b-part-1";
import { newYorkCityRestaurantArtProfiles02bPart2 } from "./restaurant-art-profiles-nyc-02b-part-2";

export const newYorkCityRestaurantArtProfiles02b = [
  ...newYorkCityRestaurantArtProfiles02bPart1,
  ...newYorkCityRestaurantArtProfiles02bPart2,
] as const;
