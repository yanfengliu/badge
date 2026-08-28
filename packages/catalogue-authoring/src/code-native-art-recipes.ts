import { codeNativeClassicHistoryRecipes } from "./code-native-art-recipes-classics-history";
import { codeNativeEducationRecipes } from "./code-native-art-recipes-education";
import { codeNativeLiteraryMilestoneRecipes } from "./code-native-art-recipes-literary-milestone";
import { codeNativeNationalParkRecipes } from "./code-native-art-recipes-national-parks";
import { codeNativeRestaurantRecipes } from "./code-native-art-recipes-restaurants";
import { codeNativeRetainedBookRecipes } from "./code-native-art-recipes-retained-books";
import { codeNativeSciencePhilosophyRecipes } from "./code-native-art-recipes-science-philosophy";
import { codeNativeTechnologySpeculativeRecipes } from "./code-native-art-recipes-technology-speculative";
import { codeNativeUsStateRecipes } from "./code-native-art-recipes-us-states";
import { codeNativeVideoGameRecipes } from "./code-native-art-recipes-video-games";
import {
  CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
  type CodeNativeArtRecipe,
} from "./code-native-art-recipe-types";

export { CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF };
export type { CodeNativeArtRecipe, CodeNativeArtCommand } from "./code-native-art-recipe-types";

export const codeNativeArtRecipes: readonly CodeNativeArtRecipe[] = [
  ...codeNativeClassicHistoryRecipes,
  ...codeNativeSciencePhilosophyRecipes,
  ...codeNativeTechnologySpeculativeRecipes,
  ...codeNativeLiteraryMilestoneRecipes,
  ...codeNativeRetainedBookRecipes,
  ...codeNativeEducationRecipes,
  ...codeNativeNationalParkRecipes,
  ...codeNativeUsStateRecipes,
  ...codeNativeVideoGameRecipes,
  ...codeNativeRestaurantRecipes,
];

const recipeByKey = new Map(
  codeNativeArtRecipes.map((recipe) => [recipeKey(recipe.catalogueDirectory, recipe.slug), recipe]),
);

if (recipeByKey.size !== codeNativeArtRecipes.length) {
  throw new Error(
    "Code-native catalogue recipes repeat a catalogue-qualified key; assign one stable recipe per selected source before rendering.",
  );
}

export function findCodeNativeArtRecipe(
  catalogueDirectory: CodeNativeArtRecipe["catalogueDirectory"],
  slug: string,
): CodeNativeArtRecipe | undefined {
  return recipeByKey.get(recipeKey(catalogueDirectory, slug));
}

function recipeKey(catalogueDirectory: CodeNativeArtRecipe["catalogueDirectory"], slug: string): string {
  return `${catalogueDirectory}/${slug}`;
}

export function serializeCodeNativeArtRecipe(recipe: CodeNativeArtRecipe): string {
  return JSON.stringify(stableValue(recipe));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Readonly<Record<string, unknown>>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}
