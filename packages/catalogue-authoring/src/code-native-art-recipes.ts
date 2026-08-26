import { codeNativeClassicHistoryRecipes } from "./code-native-art-recipes-classics-history";
import { codeNativeEducationRecipes } from "./code-native-art-recipes-education";
import { codeNativeLiteraryMilestoneRecipes } from "./code-native-art-recipes-literary-milestone";
import { codeNativeRestaurantRecipes } from "./code-native-art-recipes-restaurants";
import { codeNativeSciencePhilosophyRecipes } from "./code-native-art-recipes-science-philosophy";
import { codeNativeTechnologySpeculativeRecipes } from "./code-native-art-recipes-technology-speculative";
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
  ...codeNativeEducationRecipes,
  ...codeNativeRestaurantRecipes,
];

const recipeBySlug = new Map(codeNativeArtRecipes.map((recipe) => [recipe.slug, recipe]));

if (recipeBySlug.size !== codeNativeArtRecipes.length) {
  throw new Error(
    "Code-native catalogue recipes repeat a slug; assign one stable recipe per selected source before rendering.",
  );
}

export function findCodeNativeArtRecipe(slug: string): CodeNativeArtRecipe | undefined {
  return recipeBySlug.get(slug);
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
