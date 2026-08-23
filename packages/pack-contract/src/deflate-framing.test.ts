import { zlibSync } from "fflate";
import { describe, expect, it } from "vitest";

import { assertExactDeflatePayload } from "./deflate-framing.js";

describe("exact DEFLATE framing", () => {
  it.each([
    { name: "stored", length: 256, level: 0, blockType: 0 },
    { name: "fixed Huffman", length: 1_024, level: 6, blockType: 1 },
    { name: "dynamic Huffman", length: 16_384, level: 9, blockType: 2 },
  ] as const)("accepts a complete $name stream", ({ length, level, blockType }) => {
    const decoded = Uint8Array.from({ length }, (_, index) => (index * index + 17 * index + 31) & 255);
    const zlib = zlibSync(decoded, { level });
    expect((zlib[2] >>> 1) & 3).toBe(blockType);

    expect(() => assertExactDeflatePayload(zlib.subarray(2, -4), decoded.byteLength)).not.toThrow();
  });

  it("rejects bytes after the final block", () => {
    const decoded = Uint8Array.from([0, 0]);
    const zlib = zlibSync(decoded);
    const hidden = new TextEncoder().encode("Exif\0\0HIDDEN-METADATA");
    const payload = new Uint8Array(zlib.byteLength - 6 + hidden.byteLength);
    payload.set(zlib.subarray(2, -4));
    payload.set(hidden, zlib.byteLength - 6);

    expect(() => assertExactDeflatePayload(payload, decoded.byteLength)).toThrow(/trailing bytes.*DEFLATE/i);
  });

  it("rejects reserved HLIT values before decoding a dynamic tree", () => {
    const reservedHlitPayload = Uint8Array.from([
      0xf5, 0xc0, 0x01, 0x09, 0x00, 0x00, 0x00, 0x80, 0x20, 0xaf, 0xf5, 0xff, 0x54, 0x53, 0x34,
    ]);

    expect(() => assertExactDeflatePayload(reservedHlitPayload, 2)).toThrow(/HLIT 30.*reserved/i);
  });
});
