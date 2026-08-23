import { describe, expect, it } from "vitest";

import { badgeShapeAspect, type BadgeShape } from "@badge/render-recipe";

import { createBodyGeometry, createFaceGeometry } from "./geometry";
import { badgeVerticalExtentAtZoom, cameraVerticalSpanAtBadge } from "./scene-layout";
import { VIEWER_ZOOM_MAX } from "./viewer-state";

const SHAPES: BadgeShape[] = ["circle", "square", "rectangle", "shield"];

describe("badge camera fit", () => {
  it.each(SHAPES)("keeps the beveled %s inside the camera at maximum zoom", (shape) => {
    const geometry = createBodyGeometry(shape, 0.18);
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    expect(bounds).not.toBeNull();

    const width = bounds!.max.x - bounds!.min.x;
    const height = bounds!.max.y - bounds!.min.y;
    const depth = bounds!.max.z - bounds!.min.z;
    const conservativeRotatedExtent = Math.hypot(Math.max(width, height), depth);
    const remainingRoom =
      cameraVerticalSpanAtBadge() - badgeVerticalExtentAtZoom(conservativeRotatedExtent, VIEWER_ZOOM_MAX);

    geometry.dispose();
    expect(remainingRoom).toBeGreaterThan(0.18);
  });

  it.each(SHAPES)("keeps the renderer-neutral %s framing aspect aligned with its geometry", (shape) => {
    const geometry = createFaceGeometry(shape);
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    expect(bounds).not.toBeNull();

    const width = bounds!.max.x - bounds!.min.x;
    const height = bounds!.max.y - bounds!.min.y;

    geometry.dispose();
    expect(width / height).toBeCloseTo(badgeShapeAspect(shape), 7);
  });
});
