import { buildVideoGameRecipe } from "./code-native-video-game-profile";
import { codeNativeVideoGameArtProfiles } from "./video-game-art-profile-specs";
import { videoGameAuthoringRecords } from "./video-games-edition";

const profileBySlug = new Map(codeNativeVideoGameArtProfiles.map((profile) => [profile.slug, profile]));

if (
  profileBySlug.size !== 50 ||
  videoGameAuthoringRecords.length !== 50 ||
  codeNativeVideoGameArtProfiles.length !== videoGameAuthoringRecords.length
) {
  throw new Error(
    `Video-game code-native art requires fifty unique records and profiles; found ${videoGameAuthoringRecords.length} records and ${profileBySlug.size} profiles.`,
  );
}

export const codeNativeVideoGameRecipes = videoGameAuthoringRecords.map((record) => {
  const profile = profileBySlug.get(record.slug);
  if (!profile) {
    throw new Error(
      `Video game ${record.slug} has no explicit abstract art profile; add its source-locked profile before rendering.`,
    );
  }
  return buildVideoGameRecipe(record, profile);
});

export { codeNativeVideoGameArtProfiles };
