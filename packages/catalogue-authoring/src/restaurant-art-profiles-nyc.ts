import { newYorkCityRestaurantArtProfiles01a } from "./restaurant-art-profiles-nyc-01a";
import { newYorkCityRestaurantArtProfiles01b } from "./restaurant-art-profiles-nyc-01b";
import { newYorkCityRestaurantArtProfiles02a } from "./restaurant-art-profiles-nyc-02a";
import { newYorkCityRestaurantArtProfiles02b } from "./restaurant-art-profiles-nyc-02b";
import { newYorkCityRestaurantArtProfiles03a } from "./restaurant-art-profiles-nyc-03a";
import { newYorkCityRestaurantArtProfiles03b } from "./restaurant-art-profiles-nyc-03b";

export const newYorkCityRestaurantArtProfiles = [
  ...newYorkCityRestaurantArtProfiles01a,
  ...newYorkCityRestaurantArtProfiles01b,
  ...newYorkCityRestaurantArtProfiles02a,
  ...newYorkCityRestaurantArtProfiles02b,
  ...newYorkCityRestaurantArtProfiles03a,
  ...newYorkCityRestaurantArtProfiles03b,
] as const;
