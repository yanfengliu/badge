import {
  buildLandscapeRecipe,
  type LandscapeArtProfile,
  type LandscapeSourceRecord,
} from "./code-native-landscape-profile";
import { codeNativeUsStateProfiles01 } from "./code-native-us-state-profiles-01";
import { codeNativeUsStateProfiles02 } from "./code-native-us-state-profiles-02";
import { codeNativeUsStateProfiles03 } from "./code-native-us-state-profiles-03";
import { codeNativeUsStateProfiles04 } from "./code-native-us-state-profiles-04";
import { codeNativeUsStateProfiles05 } from "./code-native-us-state-profiles-05";
import { usStates } from "./us-states";

export const codeNativeUsStateArtProfiles: readonly LandscapeArtProfile[] = [
  ...codeNativeUsStateProfiles01,
  ...codeNativeUsStateProfiles02,
  ...codeNativeUsStateProfiles03,
  ...codeNativeUsStateProfiles04,
  ...codeNativeUsStateProfiles05,
];

validateCompleteStateProfilePartition(codeNativeUsStateArtProfiles);

const profileBySlug = new Map(codeNativeUsStateArtProfiles.map((profile) => [profile.slug, profile]));

export const codeNativeUsStateRecipes = usStates.map((state) => {
  const profile = profileBySlug.get(state.slug);
  if (!profile) {
    throw new Error(
      `U.S. state ${state.slug} has no explicit code-native art profile; add a source-locked profile before compiling its recipe.`,
    );
  }
  const sourceRecord: LandscapeSourceRecord = {
    slug: state.slug,
    candidateStyles: state.candidateStyles,
    artBrief: {
      themeCues: [state.artBrief.themeCues[0], state.artBrief.themeCues[1], state.artBrief.themeCues[2]],
      requiredMotifs: state.artBrief.requiredMotifs,
      excludedMotifs: state.artBrief.excludedMotifs,
    },
  };
  return buildLandscapeRecipe("us-states", sourceRecord, profile);
});

function validateCompleteStateProfilePartition(profiles: readonly LandscapeArtProfile[]): void {
  const catalogueSlugs = new Set(usStates.map(({ slug }) => slug));
  const profileSlugs = profiles.map(({ slug }) => slug);
  const duplicates = profileSlugs.filter((slug, index) => profileSlugs.indexOf(slug) !== index);
  if (duplicates.length > 0) {
    throw new Error(
      `U.S. state code-native art profiles repeat ${[...new Set(duplicates)].join(", ")}; keep exactly one explicit profile per state.`,
    );
  }
  const missing = [...catalogueSlugs].filter((slug) => !profileSlugs.includes(slug));
  const extras = profileSlugs.filter((slug) => !catalogueSlugs.has(slug));
  if (missing.length > 0 || extras.length > 0) {
    throw new Error(
      `U.S. state code-native art profile partition is incomplete; missing [${missing.join(", ")}], unexpected [${extras.join(", ")}].`,
    );
  }
  if (profiles.length !== usStates.length) {
    throw new Error(
      `U.S. state code-native art profile partition has ${profiles.length} profiles for ${usStates.length} states; keep the partition one-to-one.`,
    );
  }
}
