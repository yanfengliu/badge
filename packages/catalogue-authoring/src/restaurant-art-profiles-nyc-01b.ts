import { newYorkCityRestaurantArtProfiles01bPart1 } from "./restaurant-art-profiles-nyc-01b-part-1";
import { newYorkCityRestaurantArtProfiles01bPart2 } from "./restaurant-art-profiles-nyc-01b-part-2";

export const newYorkCityRestaurantArtProfiles01b = [
  ...newYorkCityRestaurantArtProfiles01bPart1,
  ...newYorkCityRestaurantArtProfiles01bPart2,
] as const;
