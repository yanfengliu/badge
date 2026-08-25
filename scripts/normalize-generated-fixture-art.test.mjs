import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { decodeGeneratedRgbPng, resizeRgbaBilinear } from "./normalize-generated-fixture-art.mjs";

describe("generated fixture-art normalization", () => {
  it("decodes bounded 8-bit RGB PNG scanlines before authoring conversion", () => {
    const png = rgbPng(2, 2, [
      [255, 0, 0, 0, 255, 0],
      [0, 0, 255, 255, 255, 255],
    ]);

    expect(decodeGeneratedRgbPng(png)).toEqual({
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]),
    });
  });

  it("rejects generated containers outside the deliberately narrow input contract", () => {
    const rgbaHeader = rgbPng(1, 1, [[20, 30, 40]]);
    rgbaHeader[25] = 6;
    expect(() => decodeGeneratedRgbPng(rgbaHeader)).toThrow(/8-bit RGB/i);
  });

  it("uses bounded center-aligned interpolation for the normalized square", () => {
    const source = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([0, 0, 0, 255, 100, 0, 0, 255, 0, 100, 0, 255, 100, 100, 0, 255]),
    };

    const resized = resizeRgbaBilinear(source, 64);
    const center = (32 * 64 + 32) * 4;
    expect(resized.width).toBe(64);
    expect(resized.height).toBe(64);
    expect(Array.from(resized.data.slice(center, center + 4))).toEqual([52, 52, 0, 255]);
  });
});

function rgbPng(width, height, rows) {
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width, false);
  headerView.setUint32(4, height, false);
  header.set([8, 2, 0, 0, 0], 8);
  const scanlines = Uint8Array.from(rows.flatMap((row) => [0, ...row]));
  return concatenate([
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", new Uint8Array(deflateSync(scanlines))),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const result = new Uint8Array(12 + data.byteLength);
  const view = new DataView(result.buffer);
  view.setUint32(0, data.byteLength, false);
  result.set(typeBytes, 4);
  result.set(data, 8);
  return result;
}

function concatenate(parts) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
