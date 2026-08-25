import { describe, expect, it } from "vitest";
import { LinearMipmapLinearFilter, RepeatWrapping } from "three";

import { WOOL_WEAVE_SIZE, createWoolWeavePixels, createWoolWeaveTexture } from "./wool-texture";

function shortPeriodCorrelation(pixels: Uint8Array, size: number, offsetX: number, offsetY: number): number {
  let leftSum = 0;
  let rightSum = 0;
  let leftSquaredSum = 0;
  let rightSquaredSum = 0;
  let productSum = 0;
  const sampleCount = size * size;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = pixels[(y * size + x) * 4];
      const shiftedX = (x + offsetX + size) % size;
      const shiftedY = (y + offsetY + size) % size;
      const right = pixels[(shiftedY * size + shiftedX) * 4];
      leftSum += left;
      rightSum += right;
      leftSquaredSum += left * left;
      rightSquaredSum += right * right;
      productSum += left * right;
    }
  }

  const covariance = productSum - (leftSum * rightSum) / sampleCount;
  const leftVariance = leftSquaredSum - (leftSum * leftSum) / sampleCount;
  const rightVariance = rightSquaredSum - (rightSum * rightSum) / sampleCount;
  return covariance / Math.sqrt(leftVariance * rightVariance);
}

function maximumShortPeriodCorrelation(
  pixels: Uint8Array,
  size: number,
  minimumDistance: number,
  maximumDistance: number,
): number {
  const correlations: number[] = [];

  for (let offsetX = -maximumDistance; offsetX <= maximumDistance; offsetX += 1) {
    for (let offsetY = -maximumDistance; offsetY <= maximumDistance; offsetY += 1) {
      const distance = Math.hypot(offsetX, offsetY);
      if (distance >= minimumDistance && distance <= maximumDistance) {
        correlations.push(Math.abs(shortPeriodCorrelation(pixels, size, offsetX, offsetY)));
      }
    }
  }

  return Math.max(...correlations);
}

function createDefectiveLatticeControl(size = WOOL_WEAVE_SIZE): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const warp = Math.cos((x / 4) * Math.PI) * 18;
      const weft = Math.cos((y / 4) * Math.PI) * 16;
      const overUnder = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? 14 : -12;
      const fiber = Math.sin((x * 13 + y * 7) * 0.37) * 5;
      const value = Math.round(Math.min(246, Math.max(156, 210 + warp + weft + overUnder + fiber)));
      const offset = (y * size + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }

  return pixels;
}

describe("procedural wool weave", () => {
  it("is deterministic and supplies an opaque RGBA texel for every pixel", () => {
    const first = createWoolWeavePixels();
    const second = createWoolWeavePixels();

    expect(first).toEqual(second);
    expect(first).toHaveLength(WOOL_WEAVE_SIZE * WOOL_WEAVE_SIZE * 4);
    for (let index = 3; index < first.length; index += 4) expect(first[index]).toBe(255);
  });

  it("contains subtle tonal variation for visible irregular fibers", () => {
    const pixels = createWoolWeavePixels();
    const values = Array.from({ length: pixels.length / 4 }, (_, index) => pixels[index * 4]);
    const range = Math.max(...values) - Math.min(...values);

    expect(range).toBeGreaterThan(40);
    expect(range).toBeLessThan(65);
    expect(new Set(values).size).toBeGreaterThan(24);
  });

  it("does not encode a short repeating lattice that resolves as facets under grazing light", () => {
    const pixels = createWoolWeavePixels();
    const defectiveControl = createDefectiveLatticeControl();

    expect(maximumShortPeriodCorrelation(defectiveControl, WOOL_WEAVE_SIZE, 2, 16)).toBeGreaterThan(0.95);
    expect(maximumShortPeriodCorrelation(pixels, WOOL_WEAVE_SIZE, 2, 16)).toBeLessThan(0.15);
  });

  it("tiles without a distinctive edge seam", () => {
    const pixels = createWoolWeavePixels();
    let seamDifference = 0;
    let neighborDifference = 0;

    for (let offset = 0; offset < WOOL_WEAVE_SIZE; offset += 1) {
      const firstRow = pixels[offset * 4];
      const lastRow = pixels[((WOOL_WEAVE_SIZE - 1) * WOOL_WEAVE_SIZE + offset) * 4];
      const firstColumn = pixels[offset * WOOL_WEAVE_SIZE * 4];
      const lastColumn = pixels[(offset * WOOL_WEAVE_SIZE + WOOL_WEAVE_SIZE - 1) * 4];
      seamDifference += Math.abs(firstRow - lastRow) + Math.abs(firstColumn - lastColumn);

      for (let inner = 0; inner < WOOL_WEAVE_SIZE - 1; inner += 1) {
        const current = pixels[(offset * WOOL_WEAVE_SIZE + inner) * 4];
        const next = pixels[(offset * WOOL_WEAVE_SIZE + inner + 1) * 4];
        const below = pixels[((inner + 1) * WOOL_WEAVE_SIZE + offset) * 4];
        const above = pixels[(inner * WOOL_WEAVE_SIZE + offset) * 4];
        neighborDifference += Math.abs(current - next) + Math.abs(above - below);
      }
    }

    const seamAverage = seamDifference / (WOOL_WEAVE_SIZE * 2);
    const neighborAverage = neighborDifference / (WOOL_WEAVE_SIZE * (WOOL_WEAVE_SIZE - 1) * 2);
    expect(seamAverage).toBeLessThan(neighborAverage * 1.5);
  });

  it.each([
    [Number.NaN, 1],
    [0, 1],
    [1, 1],
    [4, 4],
    [16, 8],
    [Number.POSITIVE_INFINITY, 8],
  ])("uses bounded oblique sampling when the renderer reports %i× anisotropy", (available, expected) => {
    const texture = createWoolWeaveTexture(available);

    expect(texture.wrapS).toBe(RepeatWrapping);
    expect(texture.wrapT).toBe(RepeatWrapping);
    expect(texture.repeat.toArray()).toEqual([3, 3]);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture.minFilter).toBe(LinearMipmapLinearFilter);
    expect(texture.anisotropy).toBe(expected);
    expect(texture.name).toBe("badge-wool-fibers-v2");
    expect(texture.version).toBeGreaterThan(0);
    texture.dispose();
  });
});
