import { describe, expect, it } from "vitest";

import {
  badgeShapeAspect,
  createSourceFramingPlan,
  sourceRectToImagePlacement,
  sourceRectToTextureTransform,
  type NormalizedSourceRect,
} from "./index";

const WIDE_SOURCE = { width: 1600, height: 900 } as const;
const TALL_SOURCE = { width: 800, height: 1200 } as const;

function rectFromTextureTransform(
  transform: ReturnType<typeof sourceRectToTextureTransform>,
): NormalizedSourceRect {
  return {
    x: transform.offsetX,
    y: 1 - transform.offsetY - transform.repeatY,
    width: transform.repeatX,
    height: transform.repeatY,
  };
}

function rectFromImagePlacement(
  placement: ReturnType<typeof sourceRectToImagePlacement>,
): NormalizedSourceRect {
  return {
    x: -placement.left / placement.width,
    y: -placement.top / placement.height,
    width: 1 / placement.width,
    height: 1 / placement.height,
  };
}

function expectRectClose(actual: NormalizedSourceRect, expected: NormalizedSourceRect): void {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
  expect(actual.width).toBeCloseTo(expected.width, 8);
  expect(actual.height).toBeCloseTo(expected.height, 8);
}

describe("renderer-neutral source framing", () => {
  it("defines target aspects that match the authored badge silhouettes", () => {
    expect(badgeShapeAspect("circle")).toBe(1);
    expect(badgeShapeAspect("square")).toBe(1);
    expect(badgeShapeAspect("rectangle")).toBeCloseTo(2 / 1.38, 10);
    expect(badgeShapeAspect("shield")).toBeCloseTo(1.84 / 1.96, 10);
  });

  it("cover-crops a non-square source before applying the authored zoom and focus", () => {
    const plan = createSourceFramingPlan("circle", { x: 0.8, y: 0.15, scale: 2 }, WIDE_SOURCE);

    expect(plan.sourceAspect).toBeCloseTo(16 / 9, 10);
    expect(plan.targetAspect).toBe(1);
    expect(plan.sourceRect).toEqual({
      x: 0.659375,
      y: 0,
      width: 0.28125,
      height: 0.5,
    });
    expect(plan.sourceRect.width).not.toBe(plan.sourceRect.height);
  });

  it("uses each shape aspect when cover-cropping the same wide source", () => {
    const circle = createSourceFramingPlan("circle", { x: 0.5, y: 0.5, scale: 1 }, WIDE_SOURCE);
    const rectangle = createSourceFramingPlan("rectangle", { x: 0.5, y: 0.5, scale: 1 }, WIDE_SOURCE);
    const shield = createSourceFramingPlan("shield", { x: 0.5, y: 0.5, scale: 1 }, WIDE_SOURCE);

    expect(circle.sourceRect.width).toBeCloseTo(9 / 16, 10);
    expect(rectangle.sourceRect.width).toBeCloseTo(2 / 1.38 / (16 / 9), 10);
    expect(shield.sourceRect.width).toBeCloseTo(1.84 / 1.96 / (16 / 9), 10);
    expect(circle.sourceRect.height).toBe(1);
    expect(rectangle.sourceRect.height).toBe(1);
    expect(shield.sourceRect.height).toBe(1);
  });

  it("cover-crops a tall source vertically without changing its aspect", () => {
    const plan = createSourceFramingPlan("rectangle", { x: 0.5, y: 0.75, scale: 1 }, TALL_SOURCE);

    expect(plan.sourceRect.width).toBe(1);
    expect(plan.sourceRect.height).toBeCloseTo(2 / 3 / (2 / 1.38), 10);
    expect(plan.sourceAspect * (plan.sourceRect.width / plan.sourceRect.height)).toBeCloseTo(
      plan.targetAspect,
      10,
    );
  });

  it("gives live texture sampling and fallback image placement the identical source rectangle", () => {
    const plan = createSourceFramingPlan("shield", { x: 0.26, y: 0.73, scale: 1.65 }, WIDE_SOURCE);
    const textureTransform = sourceRectToTextureTransform(plan.sourceRect);
    const imagePlacement = sourceRectToImagePlacement(plan.sourceRect);
    const liveRect = rectFromTextureTransform(textureTransform);
    const fallbackRect = rectFromImagePlacement(imagePlacement);

    expectRectClose(liveRect, plan.sourceRect);
    expectRectClose(fallbackRect, plan.sourceRect);
    expectRectClose(liveRect, fallbackRect);
    expect(plan.targetAspect * (imagePlacement.width / imagePlacement.height)).toBeCloseTo(
      plan.sourceAspect,
      10,
    );
  });

  it("rejects unusable source dimensions instead of silently stretching the art", () => {
    expect(() =>
      createSourceFramingPlan("square", { x: 0.5, y: 0.5, scale: 1 }, { width: 0, height: 9 }),
    ).toThrow("source width");
    expect(() =>
      createSourceFramingPlan("square", { x: 0.5, y: 0.5, scale: 1 }, { width: 9, height: Number.NaN }),
    ).toThrow("source height");
  });
});
