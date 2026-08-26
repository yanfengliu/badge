import { arc, circle, curve, ellipse, polygon, rect } from "./code-native-art-recipe-builders";
import type { CodeNativeArtCommand } from "./code-native-art-recipe-types";
import type { RestaurantGeometryMotif, RestaurantStyleSignature } from "./restaurant-art-profile";

const SIZE = 896;
const MINIMUM_CONSTRUCTION_WIDTH = 48;

interface MotifPlacement {
  readonly cx: number;
  readonly cy: number;
  readonly width: number;
  readonly height: number;
}

interface PlacementTransform {
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly translateX?: number;
  readonly translateY?: number;
}

export function renderRestaurantMotifConstruction(
  signature: RestaurantStyleSignature,
  motif: RestaurantGeometryMotif,
  paletteLength: number,
): readonly CodeNativeArtCommand[] {
  const constructionColor = constructionColorIndex(motif.colorIndex, paletteLength);
  return Array.from({ length: motif.count }, (_, repeatIndex) => {
    const placement = motifPlacement(motif, repeatIndex);
    return renderConstructionPair(signature, motif, placement, constructionColor);
  }).flat();
}

function renderConstructionPair(
  signature: RestaurantStyleSignature,
  motif: RestaurantGeometryMotif,
  placement: MotifPlacement,
  constructionColor: number,
): readonly [CodeNativeArtCommand, CodeNativeArtCommand] {
  const baseColor = motif.colorIndex;
  switch (signature) {
    case "ceramic-roundel":
      return [
        renderMotifShape(motif, transformPlacement(placement, { scaleX: 1.22, scaleY: 1.22 }), baseColor),
        renderMotifShape(
          motif,
          transformPlacement(placement, { scaleX: 0.4216, scaleY: 0.4216 }),
          constructionColor,
        ),
      ];
    case "fiber-applique":
      return [
        renderMotifShape(
          motif,
          transformPlacement(placement, {
            scaleX: 1.134,
            scaleY: 1.134,
            translateX: -0.14,
            translateY: 0.14,
          }),
          constructionColor,
        ),
        renderMotifShape(
          motif,
          transformPlacement(placement, {
            scaleX: 0.94,
            scaleY: 0.72,
            translateX: 0.08,
            translateY: -0.08,
          }),
          baseColor,
        ),
      ];
    case "geometric-facet":
      return [
        renderMotifShape(motif, placement, baseColor),
        polygon(
          constructionColor,
          placement.cx - placement.width * 0.34,
          placement.cy + placement.height * 0.24,
          placement.cx + placement.width * 0.08,
          placement.cy - placement.height * 0.34,
          placement.cx + placement.width * 0.36,
          placement.cy + placement.height * 0.18,
        ),
      ];
    case "ink-contour":
      return [
        renderMotifShape(
          motif,
          transformPlacement(placement, { scaleX: 1.06, scaleY: 1.06 }),
          constructionColor,
        ),
        renderMotifShape(motif, transformPlacement(placement, { scaleX: 0.82, scaleY: 0.82 }), baseColor),
      ];
    case "lead-cell":
      return [
        renderMotifShape(
          motif,
          transformPlacement(placement, { scaleX: 1.265, scaleY: 1.265 }),
          constructionColor,
        ),
        renderMotifShape(
          motif,
          transformPlacement(placement, {
            scaleX: 0.432,
            scaleY: 0.468,
            translateX: -0.262,
            translateY: 0.16,
          }),
          baseColor,
        ),
      ];
    case "map-contour":
      return [
        renderMotifShape(motif, placement, baseColor),
        renderMotifShape(
          motif,
          transformPlacement(placement, {
            scaleX: 0.76,
            scaleY: 0.76,
            translateX: 0.32,
            translateY: -0.23,
          }),
          constructionColor,
        ),
      ];
    case "marquetry-strata":
      return [
        renderMotifShape(motif, transformPlacement(placement, { translateY: 0.36 }), constructionColor),
        renderMotifShape(motif, transformPlacement(placement, { translateY: -0.12 }), baseColor),
      ];
    case "mosaic-cell":
      return [
        renderMotifShape(motif, placement, baseColor),
        rect(
          constructionColor,
          placement.cx + placement.width * 0.12,
          placement.cy - placement.height * 0.25,
          placement.width * 0.58,
          placement.height * 0.55,
        ),
      ];
    case "painted-mass":
      return [
        renderMotifShape(
          motif,
          transformPlacement(placement, { scaleX: 1.04, scaleY: 1.04, translateX: -0.12, translateY: -0.1 }),
          constructionColor,
        ),
        renderMotifShape(
          motif,
          transformPlacement(placement, { translateX: 0.04, translateY: 0.04 }),
          baseColor,
        ),
      ];
    case "paper-layer":
      return [
        renderMotifShape(
          motif,
          transformPlacement(placement, { translateX: 0.12, translateY: 0.15 }),
          constructionColor,
        ),
        renderMotifShape(motif, placement, baseColor),
      ];
    case "pixel-step": {
      const stepHeight = Math.min(
        placement.height * 0.58,
        Math.max(MINIMUM_CONSTRUCTION_WIDTH, placement.height * 0.42),
      );
      return [
        renderMotifShape(motif, placement, baseColor),
        rect(
          constructionColor,
          placement.cx - placement.width * 0.254,
          placement.cy + placement.height * 0.95 - stepHeight * 1.2,
          placement.width * 0.816,
          stepHeight * 1.2,
        ),
      ];
    }
    case "relief-cut":
      return [
        renderMotifShape(
          motif,
          transformPlacement(placement, { translateX: -0.12, translateY: 0.12 }),
          constructionColor,
        ),
        renderMotifShape(motif, placement, baseColor),
      ];
    case "screenprint-overlap":
      return [
        renderMotifShape(motif, transformPlacement(placement, { translateX: 0.14 }), constructionColor),
        renderMotifShape(motif, transformPlacement(placement, { translateX: -0.06 }), baseColor),
      ];
    case "woven-band": {
      const horizontal = placement.width >= placement.height;
      const bandWidth = Math.min(
        horizontal ? placement.height : placement.width,
        Math.max(MINIMUM_CONSTRUCTION_WIDTH, (horizontal ? placement.height : placement.width) * 0.36),
      );
      return [
        renderMotifShape(motif, placement, baseColor),
        horizontal
          ? rect(
              constructionColor,
              placement.cx - placement.width * 0.732,
              placement.cy + placement.height * 0.25 - bandWidth * 0.6,
              placement.width * 1.104,
              bandWidth * 1.2,
            )
          : rect(
              constructionColor,
              placement.cx - placement.width * 0.18 - bandWidth * 0.6,
              placement.cy - placement.height * 0.302,
              bandWidth * 1.2,
              placement.height * 1.104,
            ),
      ];
    }
  }
}

function motifPlacement(motif: RestaurantGeometryMotif, repeatIndex: number): MotifPlacement {
  const offsetUnit = repeatIndex - (motif.count - 1) / 2;
  return {
    cx: px(motif.x + offsetUnit * (motif.spreadX ?? 0)),
    cy: px(motif.y + offsetUnit * (motif.spreadY ?? 0)),
    width: px(motif.width),
    height: px(motif.height),
  };
}

function transformPlacement(placement: MotifPlacement, transform: PlacementTransform): MotifPlacement {
  return {
    cx: placement.cx + placement.width * (transform.translateX ?? 0),
    cy: placement.cy + placement.height * (transform.translateY ?? 0),
    width: placement.width * (transform.scaleX ?? 1),
    height: placement.height * (transform.scaleY ?? 1),
  };
}

function renderMotifShape(
  motif: RestaurantGeometryMotif,
  placement: MotifPlacement,
  colorIndex: number,
): CodeNativeArtCommand {
  const { cx, cy, width, height } = placement;
  const left = cx - width / 2;
  const top = cy - height / 2;
  switch (motif.kind) {
    case "arch": {
      const outer = Math.min(width, height) / 2;
      const thickness = Math.min(outer, Math.max(MINIMUM_CONSTRUCTION_WIDTH, outer * 0.34));
      return arc(colorIndex, cx, cy + height * 0.22, outer, Math.max(0, outer - thickness), 180, 360);
    }
    case "block":
      return rect(colorIndex, left, top, width, height);
    case "bird":
      return polygon(
        colorIndex,
        left,
        top + height * 0.5,
        left + width * 0.2,
        top + height * 0.14,
        left + width * 0.26,
        top + height * 0.34,
        left + width * 0.57,
        top,
        left + width * 0.77,
        top + height * 0.18,
        left + width,
        top + height * 0.22,
        left + width * 0.8,
        top + height * 0.4,
        left + width * 0.88,
        top + height * 0.6,
        left + width * 0.66,
        top + height * 0.84,
        left + width * 0.28,
        top + height,
        left + width * 0.06,
        top + height * 0.72,
      );
    case "claw":
      return polygon(
        colorIndex,
        left + width * 0.12,
        top + height,
        left,
        top + height * 0.68,
        left + width * 0.23,
        top + height * 0.4,
        left + width * 0.16,
        top + height * 0.06,
        left + width * 0.48,
        top + height * 0.25,
        left + width * 0.6,
        top,
        left + width,
        top + height * 0.34,
        left + width * 0.76,
        top + height * 0.5,
        left + width * 0.9,
        top + height * 0.75,
        left + width * 0.58,
        top + height,
      );
    case "cone":
      return polygon(colorIndex, cx, top, left, top + height, left + width, top + height);
    case "corner": {
      const thickness = Math.min(
        Math.min(width, height),
        Math.max(MINIMUM_CONSTRUCTION_WIDTH, Math.min(width, height) * 0.34),
      );
      return polygon(
        colorIndex,
        left,
        top,
        left + thickness,
        top,
        left + thickness,
        top + height - thickness,
        left + width,
        top + height - thickness,
        left + width,
        top + height,
        left,
        top + height,
      );
    }
    case "disk":
      return circle(colorIndex, cx, cy, Math.min(width, height) / 2);
    case "fish":
      return polygon(
        colorIndex,
        left + width,
        cy,
        left + width * 0.34,
        top,
        left + width * 0.1,
        top + height * 0.12,
        left + width * 0.22,
        cy,
        left + width * 0.1,
        top + height * 0.88,
        left + width * 0.34,
        top + height,
      );
    case "horizon":
      return polygon(
        colorIndex,
        left,
        top + height * 0.62,
        left + width * 0.34,
        top + height * 0.28,
        left + width * 0.68,
        top + height * 0.5,
        left + width,
        top + height * 0.2,
        left + width,
        top + height,
        left,
        top + height,
      );
    case "leaf":
      return polygon(colorIndex, cx, top, left + width, cy, cx, top + height, left, cy);
    case "oval":
      return ellipse(colorIndex, cx, cy, width / 2, height / 2);
    case "prawn":
      return polygon(
        colorIndex,
        left + width,
        top + height * 0.36,
        left + width * 0.95,
        top + height * 0.12,
        left + width * 0.78,
        top,
        left + width * 0.6,
        top + height * 0.08,
        left + width * 0.22,
        top + height * 0.16,
        left,
        top + height * 0.46,
        left + width * 0.28,
        top + height * 0.39,
        left + width * 0.46,
        top + height * 0.5,
        left + width * 0.37,
        top + height * 0.72,
        left + width * 0.56,
        top + height,
        left + width * 0.64,
        top + height * 0.68,
        left + width * 0.84,
        top + height * 0.62,
        left + width,
        top + height * 0.52,
      );
    case "ring": {
      const outer = Math.min(width, height) / 2;
      const thickness = Math.min(outer, Math.max(MINIMUM_CONSTRUCTION_WIDTH, outer * 0.38));
      return arc(colorIndex, cx, cy, outer, Math.max(0, outer - thickness), 0, 360);
    }
    case "ribbon":
      return curve(
        colorIndex,
        Math.min(height, Math.max(MINIMUM_CONSTRUCTION_WIDTH, height * 0.42)),
        [left, cy + height * 0.22],
        [left + width * 0.3, top - height * 0.05],
        [left + width * 0.68, top + height * 1.02],
        [left + width, cy - height * 0.18],
      );
    case "shell":
      return polygon(
        colorIndex,
        cx,
        top,
        left + width,
        top + height * 0.46,
        left + width * 0.82,
        top + height,
        left + width * 0.18,
        top + height,
        left,
        top + height * 0.46,
      );
    case "stripe":
      return polygon(
        colorIndex,
        left,
        top + height * 0.7,
        left + width * 0.22,
        top + height,
        left + width,
        top + height * 0.3,
        left + width * 0.78,
        top,
      );
    case "triangle":
      return polygon(colorIndex, cx, top, left + width, top + height, left, top + height * 0.82);
  }
}

function constructionColorIndex(colorIndex: number, paletteLength: number): number {
  return colorIndex === 1 && paletteLength > 2 ? 2 : 1;
}

function px(value: number): number {
  return Math.round(value * SIZE);
}
