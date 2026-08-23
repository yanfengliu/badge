import { describe, expect, it } from "vitest";

import { WOOL_WEAVE_SIZE, createWoolWeavePixels } from "./wool-texture";

describe("procedural wool weave", () => {
  it("is deterministic and supplies an opaque RGBA texel for every pixel", () => {
    const first = createWoolWeavePixels();
    const second = createWoolWeavePixels();

    expect(first).toEqual(second);
    expect(first).toHaveLength(WOOL_WEAVE_SIZE * WOOL_WEAVE_SIZE * 4);
    for (let index = 3; index < first.length; index += 4) expect(first[index]).toBe(255);
  });

  it("contains enough tonal variation to produce visible crossing threads", () => {
    const pixels = createWoolWeavePixels();
    const values = Array.from({ length: pixels.length / 4 }, (_, index) => pixels[index * 4]);

    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(70);
    expect(new Set(values).size).toBeGreaterThan(24);
  });
});
