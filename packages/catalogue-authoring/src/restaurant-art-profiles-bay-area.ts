import { sanFranciscoRestaurantArtProfilesPartOne } from "./restaurant-art-profiles-bay-area-01";
import { sanFranciscoRestaurantArtProfilesPartTwo } from "./restaurant-art-profiles-bay-area-02";
import { sanFranciscoRestaurantArtProfilesPartThree } from "./restaurant-art-profiles-bay-area-03";
import { bayAreaRestaurantArtProfilesPartFour } from "./restaurant-art-profiles-bay-area-04";

export {
  bayAreaRestaurantArtProfilesPartFour,
  sanFranciscoRestaurantArtProfilesPartOne,
  sanFranciscoRestaurantArtProfilesPartTwo,
  sanFranciscoRestaurantArtProfilesPartThree,
};

export const bayAreaRestaurantArtProfiles = Object.freeze([
  ...sanFranciscoRestaurantArtProfilesPartOne,
  ...sanFranciscoRestaurantArtProfilesPartTwo,
  ...sanFranciscoRestaurantArtProfilesPartThree,
  ...bayAreaRestaurantArtProfilesPartFour,
]);

export const sanFranciscoRestaurantArtProfiles = bayAreaRestaurantArtProfiles;
