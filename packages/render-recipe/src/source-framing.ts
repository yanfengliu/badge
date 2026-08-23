import type { BadgeShape, RenderCrop } from "./index";

export interface SourceDimensions {
  width: number;
  height: number;
}

export interface NormalizedSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceFramingPlan {
  sourceAspect: number;
  targetAspect: number;
  sourceRect: NormalizedSourceRect;
}

export interface TextureTransform {
  repeatX: number;
  repeatY: number;
  offsetX: number;
  offsetY: number;
}

export interface ImagePlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

const BADGE_SHAPE_ASPECTS = {
  circle: 1,
  square: 1,
  rectangle: 2 / 1.38,
  shield: 1.84 / 1.96,
} as const satisfies Record<BadgeShape, number>;

function assertPositiveFiniteDimension(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Badge source ${label} must be a positive finite number; received ${String(value)}.`);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function badgeShapeAspect(shape: BadgeShape): number {
  return BADGE_SHAPE_ASPECTS[shape];
}

export function createSourceFramingPlan(
  shape: BadgeShape,
  crop: RenderCrop,
  source: SourceDimensions,
): SourceFramingPlan {
  assertPositiveFiniteDimension(source.width, "width");
  assertPositiveFiniteDimension(source.height, "height");

  const sourceAspect = source.width / source.height;
  const targetAspect = badgeShapeAspect(shape);
  const coverWidth = sourceAspect > targetAspect ? targetAspect / sourceAspect : 1;
  const coverHeight = sourceAspect > targetAspect ? 1 : sourceAspect / targetAspect;
  const width = coverWidth / crop.scale;
  const height = coverHeight / crop.scale;
  const focusX = clamp(crop.x, width / 2, 1 - width / 2);
  const focusY = clamp(crop.y, height / 2, 1 - height / 2);

  return {
    sourceAspect,
    targetAspect,
    sourceRect: {
      x: focusX - width / 2,
      y: focusY - height / 2,
      width,
      height,
    },
  };
}

export function sourceRectToTextureTransform(rect: NormalizedSourceRect): TextureTransform {
  return {
    repeatX: rect.width,
    repeatY: rect.height,
    offsetX: rect.x,
    offsetY: 1 - rect.y - rect.height,
  };
}

export function sourceRectToImagePlacement(rect: NormalizedSourceRect): ImagePlacement {
  return {
    left: -rect.x / rect.width,
    top: -rect.y / rect.height,
    width: 1 / rect.width,
    height: 1 / rect.height,
  };
}
