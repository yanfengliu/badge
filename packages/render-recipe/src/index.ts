import { z } from "zod";

export const badgeShapeSchema = z.enum(["circle", "square", "rectangle", "shield"]);
export type BadgeShape = z.infer<typeof badgeShapeSchema>;

export const badgeMaterialSchema = z.enum(["metal", "wool", "enamel"]);
export type BadgeMaterial = z.infer<typeof badgeMaterialSchema>;

export const renderCropSchema = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    scale: z.number().finite().min(1).max(8),
  })
  .strict();
export type RenderCrop = z.infer<typeof renderCropSchema>;

export const renderRecipeV1Schema = z
  .object({
    version: z.literal(1),
    shape: badgeShapeSchema,
    material: badgeMaterialSchema,
    borderColor: z.string().regex(/^#[0-9a-f]{6}$/, "borderColor must be a lowercase #rrggbb color"),
    borderWidth: z.number().finite().min(0).max(0.2),
    thickness: z.number().finite().min(0.02).max(0.18),
    relief: z.number().finite().min(0).max(0.05),
    crop: renderCropSchema,
  })
  .strict();

export type RenderRecipeV1 = z.infer<typeof renderRecipeV1Schema>;

export const renderRecipeSchema = renderRecipeV1Schema;
export type RenderRecipe = RenderRecipeV1;

export const DEFAULT_RENDER_RECIPE = Object.freeze({
  version: 1,
  shape: "circle",
  material: "metal",
  borderColor: "#b87333",
  borderWidth: 0.08,
  thickness: 0.1,
  relief: 0.03,
  crop: Object.freeze({ x: 0.5, y: 0.5, scale: 1 }),
}) satisfies RenderRecipe;

export {
  badgeShapeAspect,
  createSourceFramingPlan,
  sourceRectToImagePlacement,
  sourceRectToTextureTransform,
} from "./source-framing.ts";
export type {
  ImagePlacement,
  NormalizedSourceRect,
  SourceDimensions,
  SourceFramingPlan,
  TextureTransform,
} from "./source-framing.ts";
