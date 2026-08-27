import { describe, expect, it } from "vitest";
import { sha256Hex } from "@badge/pack-contract";

import { validateSourceAsset, validateStoredSourceAsset } from "../src/index.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

describe("durable Archive source-image validation", () => {
  it("accepts a fully validated canonical PNG image", async () => {
    const mimeType = "image/png" as const;
    const hash = validPngHash;
    const bytes = validPngBytes;
    await expect(validateSourceAsset({ hash, mimeType, bytes })).resolves.toEqual({
      hash,
      mimeType,
      bytes,
    });
  });

  it("rejects non-image bytes even when their declared hash and MIME label agree", async () => {
    const bytes = new TextEncoder().encode("not an image despite its label");
    const hash = "5d49cdb66029ca9b5ee2a486cdc50f8374463a52993c9a2d023ede26e6db005a";

    await expect(validateSourceAsset({ hash, mimeType: "image/png", bytes })).rejects.toMatchObject({
      code: "VISUAL_SOURCE_INVALID",
      message: expect.stringMatching(/declares image\/png.*non-PNG.*exact admitted image/i),
    });
  });

  it.each(["image/webp", "image/gif"])(
    "rejects %s as an unsupported durable Archive source format",
    async (mimeType) => {
      const unsupported = {
        hash: validPngHash,
        mimeType,
        bytes: validPngBytes,
      } as never;

      await expect(validateSourceAsset(unsupported)).rejects.toMatchObject({
        code: "VISUAL_SOURCE_INVALID",
        message: expect.stringMatching(/mimeType.*image\/png or image\/jpeg/i),
      });
    },
  );

  it("rejects PNG bytes mislabeled as the admitted image/jpeg format", async () => {
    await expect(
      validateSourceAsset({ hash: validPngHash, mimeType: "image/jpeg", bytes: validPngBytes }),
    ).rejects.toMatchObject({
      code: "VISUAL_SOURCE_INVALID",
      message: expect.stringMatching(/declares image\/jpeg.*signature is image\/png/i),
    });
  });

  it("rejects a PNG with corrupt Adler bytes even when its chunk CRC and hash agree", async () => {
    const corrupt = corruptPngAdlerKeepingChunkCrc(validPngBytes);
    const hash = await sha256Hex(corrupt);

    await expect(validateSourceAsset({ hash, mimeType: "image/png", bytes: corrupt })).rejects.toMatchObject({
      code: "VISUAL_SOURCE_INVALID",
      message: expect.stringMatching(/exact admitted image bytes/i),
    });
  });

  it("rejects structurally truncated PNG bytes even with their matching hash", async () => {
    const truncated = validPngBytes.slice(0, -1);
    const hash = await sha256Hex(truncated);

    await expect(
      validateSourceAsset({ hash, mimeType: "image/png", bytes: truncated }),
    ).rejects.toMatchObject({
      code: "VISUAL_SOURCE_INVALID",
      message: expect.stringMatching(/exact admitted image bytes/i),
    });
  });

  it("reports a corrupt stored source as unreadable and preserves recovery guidance", async () => {
    const truncated = validPngBytes.slice(0, -1);
    const stored = { hash: validPngHash, mimeType: "image/png" as const, bytes: truncated };

    await expect(validateStoredSourceAsset(stored, validPngHash)).rejects.toMatchObject({
      code: "VISUAL_SOURCE_UNREADABLE",
      message: expect.stringMatching(/not a fully valid decodable image.*row was preserved.*restore/i),
    });
  });
});

function corruptPngAdlerKeepingChunkCrc(source: Uint8Array): Uint8Array {
  const bytes = source.slice();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 8;
  while (cursor + 12 <= bytes.byteLength) {
    const dataLength = view.getUint32(cursor, false);
    const dataStart = cursor + 8;
    const dataEnd = dataStart + dataLength;
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8));
    if (type === "IDAT") {
      bytes[dataEnd - 1] ^= 1;
      view.setUint32(dataEnd, crc32(bytes.subarray(cursor + 4, dataEnd)), false);
      return bytes;
    }
    cursor = dataEnd + 4;
  }
  throw new Error("PNG fixture does not contain an IDAT chunk");
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
