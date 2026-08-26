import {
  defineCodeNativeArtRecipe,
  type CodeNativeArtCommand,
  type CodeNativePoint,
  type CodeNativeRecipeInput,
} from "./code-native-art-recipe-types";

export const color = (name: string, hex: `#${string}`) => ({ name, hex });

export function palette(
  first: ReturnType<typeof color>,
  second: ReturnType<typeof color>,
  third: ReturnType<typeof color>,
  fourth: ReturnType<typeof color>,
  ...rest: ReturnType<typeof color>[]
): CodeNativeRecipeInput["palette"] {
  return [first, second, third, fourth, ...rest];
}

export function forms(
  first: string,
  second: string,
  third: string,
  ...rest: string[]
): CodeNativeRecipeInput["forms"] {
  return [first, second, third, ...rest];
}

export const rect = (
  colorIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
): CodeNativeArtCommand => ({ kind: "rect", color: colorIndex, x, y, width, height });

export const circle = (colorIndex: number, cx: number, cy: number, radius: number): CodeNativeArtCommand => ({
  kind: "circle",
  color: colorIndex,
  cx,
  cy,
  radius,
});

export const ellipse = (
  colorIndex: number,
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
): CodeNativeArtCommand => ({
  kind: "ellipse",
  color: colorIndex,
  cx,
  cy,
  radiusX,
  radiusY,
});

export const polygon = (
  colorIndex: number,
  ...coordinates: (number | CodeNativePoint)[]
): CodeNativeArtCommand => {
  const usesFlatCoordinates = typeof coordinates[0] === "number";
  if (usesFlatCoordinates && coordinates.length % 2 !== 0) {
    throw new Error("Code-native polygons require complete coordinate pairs.");
  }
  const points = usesFlatCoordinates
    ? Array.from(
        { length: coordinates.length / 2 },
        (_, index) => [coordinates[index * 2] as number, coordinates[index * 2 + 1] as number] as const,
      )
    : (coordinates as CodeNativePoint[]);
  if (points.length < 3) {
    throw new Error("Code-native polygons require at least three coordinate pairs.");
  }
  return { kind: "polygon", color: colorIndex, points };
};

export const curve = (
  colorIndex: number,
  width: number,
  first: CodeNativePoint,
  second: CodeNativePoint,
  third: CodeNativePoint,
  fourth: CodeNativePoint,
): CodeNativeArtCommand => ({
  kind: "curve",
  color: colorIndex,
  width,
  points: [first, second, third, fourth],
});

export const arc = (
  colorIndex: number,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startDegrees: number,
  endDegrees: number,
): CodeNativeArtCommand => ({
  kind: "arc",
  color: colorIndex,
  cx,
  cy,
  outerRadius,
  innerRadius,
  startDegrees,
  endDegrees,
});

export const star = (
  colorIndex: number,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points = 5,
  rotationDegrees = -90,
): CodeNativeArtCommand => ({
  kind: "star",
  color: colorIndex,
  cx,
  cy,
  outerRadius,
  innerRadius,
  points,
  rotationDegrees,
});

export const recipe = defineCodeNativeArtRecipe;
