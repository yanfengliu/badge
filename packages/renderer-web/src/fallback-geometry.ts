import { badgeShapeAspect, type BadgeShape } from "@badge/render-recipe";

interface ViewDimensions {
  width: number;
  height: number;
}

export interface FallbackViewDimensions {
  aspect: number;
  front: ViewDimensions;
  edge: ViewDimensions;
  back: ViewDimensions;
}

export function fallbackFrameAspect(shape: BadgeShape): number {
  return badgeShapeAspect(shape);
}

export function fallbackViewDimensions(
  shape: BadgeShape,
  frontWidth: number,
  edgeWidth: number,
): FallbackViewDimensions {
  const aspect = fallbackFrameAspect(shape);
  const height = frontWidth / aspect;
  const face = { width: frontWidth, height };

  return {
    aspect,
    front: face,
    edge: { width: edgeWidth, height },
    back: { ...face },
  };
}
