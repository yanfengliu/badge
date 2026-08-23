import type { BadgeShape, RenderRecipe } from "@badge/render-recipe";

export interface ViewerRenderKeys {
  content: string;
  canvas: string;
  session: string;
}

export type SourceTextureFramingInputs = readonly [
  shape: BadgeShape,
  cropX: number,
  cropY: number,
  cropScale: number,
];

function badgeContentIdentity(sourceUrl: string, recipe: RenderRecipe): string {
  return [
    sourceUrl,
    recipe.version,
    recipe.shape,
    recipe.material,
    recipe.borderColor,
    recipe.borderWidth,
    recipe.thickness,
    recipe.relief,
    recipe.crop.x,
    recipe.crop.y,
    recipe.crop.scale,
  ].join("\u001f");
}

export function viewerRenderKeys(
  sourceUrl: string,
  recipe: RenderRecipe,
  recoveryGeneration: number,
): ViewerRenderKeys {
  return {
    content: badgeContentIdentity(sourceUrl, recipe),
    canvas: `live-renderer:${recoveryGeneration}`,
    session: sourceUrl,
  };
}

export function sourceTextureFramingInputs(recipe: RenderRecipe): SourceTextureFramingInputs {
  return [recipe.shape, recipe.crop.x, recipe.crop.y, recipe.crop.scale];
}

export function viewerSessionChanged(previousSession: string, nextSession: string): boolean {
  return previousSession !== nextSession;
}
