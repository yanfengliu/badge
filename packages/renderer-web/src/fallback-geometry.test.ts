import { describe, expect, it } from "vitest";

import type { BadgeShape } from "@badge/render-recipe";

import { fallbackViewDimensions } from "./fallback-geometry";

const SHAPES: BadgeShape[] = ["circle", "square", "rectangle", "shield"];

describe("fallback object geometry", () => {
  it.each(SHAPES)("keeps %s front, edge, and back at one physical height", (shape) => {
    const dimensions = fallbackViewDimensions(shape, 320, 16);

    expect(dimensions.front.width).toBe(320);
    expect(dimensions.back).toEqual(dimensions.front);
    expect(dimensions.edge.width).toBe(16);
    expect(dimensions.edge.height).toBeCloseTo(dimensions.front.height, 10);
    expect(dimensions.front.width / dimensions.front.height).toBeCloseTo(dimensions.aspect, 10);
  });
});
