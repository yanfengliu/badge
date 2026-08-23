import { describe, expect, it } from "vitest";

import type { RenderRecipe } from "@badge/render-recipe";

import { sourceTextureFramingInputs, viewerRenderKeys, viewerSessionChanged } from "./viewer-lifecycle";

const recipe: RenderRecipe = {
  version: 1,
  shape: "rectangle",
  material: "metal",
  borderColor: "#b87333",
  borderWidth: 0,
  thickness: 0.1,
  relief: 0.03,
  crop: { x: 0.5, y: 0.5, scale: 1 },
};

describe("live renderer lifecycle", () => {
  it("keeps one Canvas context through repeated recipe and source updates", () => {
    const borderDragKeys = Array.from({ length: 20 }, (_, index) =>
      viewerRenderKeys("/wide-source.webp", { ...recipe, borderWidth: index / 100 }, 0),
    );
    const changedSource = viewerRenderKeys("/replacement-wide-source.webp", recipe, 0);

    expect(new Set(borderDragKeys.map(({ canvas }) => canvas))).toEqual(new Set(["live-renderer:0"]));
    expect(new Set(borderDragKeys.map(({ content }) => content)).size).toBe(20);
    expect(changedSource.canvas).toBe(borderDragKeys[0]!.canvas);
    expect(changedSource.content).not.toBe(borderDragKeys[0]!.content);
  });

  it("changes the Canvas key only for an explicit recovery generation", () => {
    const initial = viewerRenderKeys("/wide-source.webp", recipe, 0);
    const recovery = viewerRenderKeys("/wide-source.webp", recipe, 1);

    expect(recovery.content).toBe(initial.content);
    expect(recovery.canvas).not.toBe(initial.canvas);
    expect(recovery.canvas).toBe("live-renderer:1");
  });

  it("keeps the source texture clone through unrelated appearance edits", () => {
    const initial = sourceTextureFramingInputs(recipe);
    const unrelatedEdits: RenderRecipe[] = [
      { ...recipe, borderColor: "#17656b" },
      { ...recipe, borderWidth: 0.17 },
      { ...recipe, thickness: 0.16 },
      { ...recipe, relief: 0.01 },
      { ...recipe, material: "wool" },
    ];

    for (const editedRecipe of unrelatedEdits) {
      expect(sourceTextureFramingInputs(editedRecipe)).toEqual(initial);
    }
    expect(sourceTextureFramingInputs({ ...recipe, shape: "circle" })).not.toEqual(initial);
    expect(
      sourceTextureFramingInputs({
        ...recipe,
        crop: { ...recipe.crop, scale: 1.5 },
      }),
    ).not.toEqual(initial);
  });

  it("preserves the current inspection pose and light through ordinary recipe edits", () => {
    const inspectionSession = {
      yaw: 1.1,
      pitch: -0.42,
      zoom: 1.28,
      lightAzimuth: 2.2,
      lightElevation: 0.74,
      mode: "light",
      engaged: true,
      capability: "webgl2",
      fallbackView: "back",
    } as const;
    const resetSession = {
      yaw: 0,
      pitch: 0,
      zoom: 1,
      lightAzimuth: 0,
      lightElevation: 0,
      mode: "object",
      engaged: false,
      capability: "checking",
      fallbackView: "front",
    } as const;
    const recipeEdits: RenderRecipe[] = [
      { ...recipe, material: "enamel" },
      { ...recipe, borderColor: "#17656b" },
      { ...recipe, borderWidth: 0.17 },
      { ...recipe, thickness: 0.16 },
      { ...recipe, relief: 0.01 },
      { ...recipe, shape: "shield" },
      { ...recipe, crop: { x: 0.24, y: 0.71, scale: 1.8 } },
    ];
    let previous = viewerRenderKeys("/wide-source.webp", recipe, 0);
    let currentSession: typeof inspectionSession | typeof resetSession = inspectionSession;

    for (const editedRecipe of recipeEdits) {
      const next = viewerRenderKeys("/wide-source.webp", editedRecipe, 0);
      if (viewerSessionChanged(previous.session, next.session)) currentSession = resetSession;
      previous = next;
    }

    expect(currentSession).toBe(inspectionSession);
    const changedSource = viewerRenderKeys("/new-source.webp", recipe, 0);
    expect(viewerSessionChanged(previous.session, changedSource.session)).toBe(true);
  });
});
