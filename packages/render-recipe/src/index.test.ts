import { describe, expect, it } from "vitest";

import { renderRecipeSchema } from "./index";

const validRecipe = {
  version: 1,
  shape: "circle",
  material: "metal",
  borderColor: "#b87333",
  borderWidth: 0.08,
  thickness: 0.1,
  relief: 0.03,
  crop: { x: 0.5, y: 0.5, scale: 1 },
} as const;

describe("RenderRecipe v1", () => {
  it("accepts the complete engine-neutral recipe", () => {
    expect(renderRecipeSchema.parse(validRecipe)).toEqual(validRecipe);
  });

  it("rejects unknown and out-of-range fields", () => {
    expect(() => renderRecipeSchema.parse({ ...validRecipe, renderer: "three" })).toThrow();
    expect(() => renderRecipeSchema.parse({ ...validRecipe, thickness: 0.19 })).toThrow();
    expect(() => renderRecipeSchema.parse({ ...validRecipe, borderColor: "bronze" })).toThrow();
    expect(() =>
      renderRecipeSchema.parse({ ...validRecipe, crop: { ...validRecipe.crop, scale: 0.9 } }),
    ).toThrow();
  });
});
