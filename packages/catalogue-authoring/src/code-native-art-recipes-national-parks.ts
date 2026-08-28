import {
  buildLandscapeRecipe,
  type LandscapeArtProfile,
  type LandscapeSourceRecord,
} from "./code-native-landscape-profile";
import { nationalParkLandscapeProfiles01 } from "./national-park-landscape-profiles-01";
import { nationalParkLandscapeProfiles02 } from "./national-park-landscape-profiles-02";
import { nationalParkLandscapeProfiles03 } from "./national-park-landscape-profiles-03";
import { nationalParkLandscapeProfiles04 } from "./national-park-landscape-profiles-04";
import { nationalParkLandscapeProfiles05 } from "./national-park-landscape-profiles-05";
import { nationalParkLandscapeProfiles06 } from "./national-park-landscape-profiles-06";
import { nationalParkLandscapeProfiles07 } from "./national-park-landscape-profiles-07";
import { usNationalParks } from "./us-national-parks";

export const nationalParkLandscapeProfiles: readonly LandscapeArtProfile[] = [
  ...nationalParkLandscapeProfiles01,
  ...nationalParkLandscapeProfiles02,
  ...nationalParkLandscapeProfiles03,
  ...nationalParkLandscapeProfiles04,
  ...nationalParkLandscapeProfiles05,
  ...nationalParkLandscapeProfiles06,
  ...nationalParkLandscapeProfiles07,
];

validateCompleteNationalParkProfilePartition(nationalParkLandscapeProfiles);

const profileBySlug = new Map(nationalParkLandscapeProfiles.map((profile) => [profile.slug, profile]));

export const codeNativeNationalParkRecipes = usNationalParks.map((park) => {
  const profile = profileBySlug.get(park.slug);
  if (!profile) {
    throw new Error(
      `National park ${park.slug} has no explicit code-native art profile; add a source-locked profile before compiling its recipe.`,
    );
  }
  const sourceRecord: LandscapeSourceRecord = {
    slug: park.slug,
    candidateStyles: park.candidateStyles,
    artBrief: {
      themeCues: [park.artBrief.themeCues[0], park.artBrief.themeCues[1], park.artBrief.themeCues[2]],
      requiredMotifs: park.artBrief.requiredMotifs,
      excludedMotifs: park.artBrief.excludedMotifs,
    },
  };
  return buildLandscapeRecipe("national-parks", sourceRecord, profile);
});

function validateCompleteNationalParkProfilePartition(profiles: readonly LandscapeArtProfile[]): void {
  const catalogueSlugs = new Set(usNationalParks.map(({ slug }) => slug));
  const profileSlugs = profiles.map(({ slug }) => slug);
  const duplicates = profileSlugs.filter((slug, index) => profileSlugs.indexOf(slug) !== index);
  if (duplicates.length > 0) {
    throw new Error(
      `National-park code-native art profiles repeat ${[...new Set(duplicates)].join(", ")}; keep exactly one explicit profile per park.`,
    );
  }
  const missing = [...catalogueSlugs].filter((slug) => !profileSlugs.includes(slug));
  const extras = profileSlugs.filter((slug) => !catalogueSlugs.has(slug));
  if (missing.length > 0 || extras.length > 0) {
    throw new Error(
      `National-park code-native art profile partition is incomplete; missing [${missing.join(", ")}], unexpected [${extras.join(", ")}].`,
    );
  }
  if (profiles.length !== usNationalParks.length) {
    throw new Error(
      `National-park code-native art profile partition has ${profiles.length} profiles for ${usNationalParks.length} parks; keep the partition one-to-one.`,
    );
  }
}
