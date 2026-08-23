import { readFile } from "node:fs/promises";

import { zlibSync } from "fflate";
import { describe, expect, it } from "vitest";

import { admitPack, sha256Hex } from "../../pack-contract/src/index";
import { catalogueManifestFixture, fixtureObjectBytes } from "../../pack-contract/src/test-fixtures";
import { compilePack, preparePackObject } from "./index";

describe("compilePack", () => {
  it("emits byte-identical uncompressed packs with a stable digest", async () => {
    const input = {
      manifest: catalogueManifestFixture,
      objects: [{ hash: catalogueManifestFixture.objects[0].hash, bytes: fixtureObjectBytes }],
    };

    const first = await compilePack(input);
    const second = await compilePack(input);

    expect(first.bytes).toEqual(second.bytes);
    expect(first.packRef).toEqual(second.packRef);
    expect(first.packRef.packDigest).toBe("6d2a3490b1e78e26983c5d4fee937cd2dad8909a16a55705036f1777c102e634");
    const exposedBytes = first.bytes;
    exposedBytes[0] ^= 0xff;
    expect(first.bytes).toEqual(second.bytes);
    await expect(admitPack(first.bytes)).resolves.toMatchObject({ packRef: first.packRef });
  });

  it("refuses objects whose bytes do not match the declared hash", async () => {
    const wrongBytes = fixtureObjectBytes.slice();
    wrongBytes[wrongBytes.length - 1] ^= 0xff;

    await expect(
      compilePack({
        manifest: catalogueManifestFixture,
        objects: [
          {
            hash: catalogueManifestFixture.objects[0].hash,
            bytes: wrongBytes,
          },
        ],
      }),
    ).rejects.toThrow(/hash/i);
  });

  it("refuses non-PNG bytes even when a caller labels them image/png", async () => {
    const webpBytes = new Uint8Array(
      await readFile(new URL("../../catalogue-fixtures/assets/yosemite-literal.webp", import.meta.url)),
    );

    await expect(
      preparePackObject({
        bytes: webpBytes,
        mimeType: "image/png",
        role: "source-art",
        width: 896,
        height: 896,
      }),
    ).rejects.toThrow(/image\/webp.*normalize.*metadata-free PNG/i);

    const hash = await sha256Hex(webpBytes);
    const manifest = {
      ...catalogueManifestFixture,
      objects: [
        {
          ...catalogueManifestFixture.objects[0],
          hash,
          byteLength: webpBytes.byteLength,
          width: 896,
          height: 896,
        },
      ],
      entries: [
        {
          ...catalogueManifestFixture.entries[0],
          visual: { ...catalogueManifestFixture.entries[0].visual, sourceArtHash: hash },
        },
      ],
    };

    await expect(compilePack({ manifest, objects: [{ hash, bytes: webpBytes }] })).rejects.toThrow(
      /image\/webp.*normalize.*metadata-free PNG/i,
    );
  });

  it("refuses a PNG whose zlib stream conceals trailing metadata", async () => {
    const compressed = zlibSync(Uint8Array.from([0, 0]));
    const hidden = new TextEncoder().encode("Exif\0\0HIDDEN-METADATA");
    const concealed = concatenate(compressed.subarray(0, -4), hidden, compressed.subarray(-4));
    const bytes = pngWithImageData(concealed);

    await expect(
      preparePackObject({
        bytes,
        mimeType: "image/png",
        role: "source-art",
        width: 1,
        height: 1,
      }),
    ).rejects.toThrow(/trailing bytes.*DEFLATE/i);
  });
});

function pngWithImageData(compressed: Uint8Array): Uint8Array {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, 1, false);
  view.setUint32(4, 1, false);
  header[8] = 8;
  return concatenate(
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array()),
  );
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.byteLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.byteLength, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(typeBytes, data), false);
  return chunk;
}

function concatenate(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function crc32(...parts: readonly Uint8Array[]): number {
  let crc = 0xffffffff;
  for (const part of parts) {
    for (const byte of part) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
