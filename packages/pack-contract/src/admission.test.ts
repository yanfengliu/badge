import { readFile } from "node:fs/promises";

import { zipSync, zlibSync, type Zippable } from "fflate";
import { describe, expect, it } from "vitest";

import { admitPack } from "./admission.js";
import { canonicalJsonBytes } from "./canonical-json.js";
import { sha256Hex } from "./hash.js";
import { catalogueManifestFixture, fixtureObjectBytes } from "./test-fixtures.js";
import { compilePack } from "../../pack-compiler/src/index";

describe("independent pack admission", () => {
  it("returns the exact PackRef, closed manifest, and verified objects", async () => {
    const compiled = await compilePack({
      manifest: catalogueManifestFixture,
      objects: [{ hash: catalogueManifestFixture.objects[0].hash, bytes: fixtureObjectBytes }],
    });

    const admitted = await admitPack(compiled.bytes);

    expect(admitted.packRef).toEqual(compiled.packRef);
    expect(admitted.manifest).toEqual(compiled.manifest);
    expect(admitted.objects.get(catalogueManifestFixture.objects[0].hash)).toEqual(fixtureObjectBytes);

    const exposed = admitted.objects.get(catalogueManifestFixture.objects[0].hash);
    expect(exposed).toBeDefined();
    exposed![0] ^= 0xff;
    expect(admitted.objects.get(catalogueManifestFixture.objects[0].hash)).toEqual(fixtureObjectBytes);
    expect("set" in admitted.objects).toBe(false);
  });

  it("rejects a promoted WebP before publication with PNG normalization guidance", async () => {
    const objectBytes = new Uint8Array(
      await readFile(new URL("../../catalogue-fixtures/assets/yosemite-literal.webp", import.meta.url)),
    );
    const bytes = await compileUntrustedMimePack("image/webp", objectBytes, 896, 896);

    await expect(admitPack(bytes)).rejects.toThrow(/image\/webp.*normalize.*metadata-free PNG/i);
  });

  it("rejects an EXIF-bearing JPEG before its hostile metadata can cross publication", async () => {
    const jpegWithExif = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x12, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x49, 0x49, 0x2a, 0x00, 0x08,
      0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xd9,
    ]);
    expect(new TextDecoder().decode(jpegWithExif.subarray(6, 10))).toBe("Exif");
    const bytes = await compileUntrustedMimePack("image/jpeg", jpegWithExif, 1, 1);

    await expect(admitPack(bytes)).rejects.toThrow(/image\/jpeg.*normalize.*metadata-free PNG/i);
  });

  it("rejects PNG scanlines that expand beyond their declared dimensions", async () => {
    const overlongScanlines = new Uint8Array(100);
    const objectBytes = pngWithImageData(zlibSync(overlongScanlines));
    const bytes = await compileUntrustedMimePack("image/png", objectBytes, 1, 1);

    await expect(admitPack(bytes)).rejects.toThrow(/decoded pixel length.*dimensions/i);
  });

  it("rejects PNG image data with a corrupt zlib Adler-32 trailer", async () => {
    const compressed = zlibSync(Uint8Array.from([0, 0]));
    compressed[compressed.byteLength - 1] ^= 0xff;
    const objectBytes = pngWithImageData(compressed);
    const bytes = await compileUntrustedMimePack("image/png", objectBytes, 1, 1);

    await expect(admitPack(bytes)).rejects.toThrow(/Adler-32/i);
  });

  it("rejects hidden bytes after the DEFLATE end marker", async () => {
    const compressed = zlibSync(Uint8Array.from([0, 0]));
    const hiddenMetadata = new TextEncoder().encode("Exif\0\0HIDDEN-METADATA");
    const concealed = concatenateBytes(compressed.subarray(0, -4), hiddenMetadata, compressed.subarray(-4));
    const objectBytes = pngWithImageData(concealed);
    const bytes = await compileUntrustedMimePack("image/png", objectBytes, 1, 1);

    await expect(admitPack(bytes)).rejects.toThrow(/trailing bytes.*DEFLATE/i);
  });

  it("rejects a valid but unreferenced object before private or rejected media can hitchhike", async () => {
    const decoyBytes = pngWithImageData(zlibSync(Uint8Array.from([0, 1])));
    const decoyHash = await sha256Hex(decoyBytes);
    const objects = [
      catalogueManifestFixture.objects[0],
      {
        hash: decoyHash,
        mimeType: "image/png" as const,
        byteLength: decoyBytes.byteLength,
        role: "source-art" as const,
        width: 1,
        height: 1,
      },
    ].sort((left, right) => left.hash.localeCompare(right.hash));
    const bytes = rawCanonicalPack(
      { ...catalogueManifestFixture, objects },
      new Map([
        [catalogueManifestFixture.objects[0].hash, fixtureObjectBytes],
        [decoyHash, decoyBytes],
      ]),
    );

    await expect(admitPack(bytes)).rejects.toThrow(/object.*not referenced.*remove it/i);
  });

  it("enforces one aggregate decoded-image budget before the crossing object inflates", async () => {
    const secondBytes = pngWithImageData(zlibSync(Uint8Array.from([0, 1])));
    const secondHash = await sha256Hex(secondBytes);
    const secondDefinitionId = "read-sapiens";
    const objects = [
      catalogueManifestFixture.objects[0],
      {
        hash: secondHash,
        mimeType: "image/png" as const,
        byteLength: secondBytes.byteLength,
        role: "source-art" as const,
        width: 1,
        height: 1,
      },
    ].sort((left, right) => left.hash.localeCompare(right.hash));
    const secondEntry = {
      ...catalogueManifestFixture.entries[0],
      definition: {
        ...catalogueManifestFixture.entries[0].definition,
        definitionId: secondDefinitionId,
      },
      visual: {
        ...catalogueManifestFixture.entries[0].visual,
        visualEditionId: "sapiens-field-edition",
        sourceArtHash: secondHash,
      },
    };
    const manifest = {
      ...catalogueManifestFixture,
      objects,
      collections: [
        {
          ...catalogueManifestFixture.collections[0],
          definitionIds: [catalogueManifestFixture.entries[0].definition.definitionId, secondDefinitionId],
        },
      ],
      entries: [...catalogueManifestFixture.entries, secondEntry],
    };
    const bytes = rawCanonicalPack(
      manifest,
      new Map([
        [catalogueManifestFixture.objects[0].hash, fixtureObjectBytes],
        [secondHash, secondBytes],
      ]),
    );

    await expect(admitPack(bytes, { maxTotalDecodedImageBytes: 4 })).rejects.toThrow(
      /decoded image data.*aggregate.*4-byte limit.*before inflation/i,
    );
  });

  it("charges a conservative RGBA runtime footprint before inflating grayscale pixels", async () => {
    const objectBytes = pngWithDimensionsAndImageData(8_191, 8_191, zlibSync(Uint8Array.from([0, 0])));
    const bytes = await compileUntrustedMimePack("image/png", objectBytes, 8_191, 8_191);

    await expect(admitPack(bytes)).rejects.toThrow(/decoded runtime pixels.*64 MiB admission limit/i);
  });

  it("rejects mutations to canonical ZIP creator and extractor versions", async () => {
    const compiled = await compilePack({
      manifest: catalogueManifestFixture,
      objects: [{ hash: catalogueManifestFixture.objects[0].hash, bytes: fixtureObjectBytes }],
    });
    const mutations = zipVersionFieldOffsets(compiled.bytes);
    expect(mutations).toHaveLength(6);
    for (const mutation of mutations) {
      const bytes = compiled.bytes;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(view.getUint16(mutation.offset, true), mutation.label).toBe(20);
      view.setUint16(mutation.offset, 21, true);
      await expect(admitPack(bytes), mutation.label).rejects.toMatchObject({
        code: "invalid-container",
        message: expect.stringMatching(/ZIP.*version/i),
      });
    }
  });

  it("rejects non-ZIP, truncated, and tampered bytes", async () => {
    await expect(admitPack(new TextEncoder().encode("not a pack"))).rejects.toThrow(/ZIP/i);

    const compiled = await compilePack({
      manifest: catalogueManifestFixture,
      objects: [{ hash: catalogueManifestFixture.objects[0].hash, bytes: fixtureObjectBytes }],
    });
    await expect(admitPack(compiled.bytes.slice(0, -4))).rejects.toThrow(/ZIP/i);

    const tampered = compiled.bytes.slice();
    const objectOffset = findBytes(tampered, fixtureObjectBytes);
    expect(objectOffset).toBeGreaterThanOrEqual(0);
    tampered[objectOffset] ^= 0xff;
    await expect(admitPack(tampered)).rejects.toThrow();

    const dualCrcTamper = compiled.bytes;
    const centralOffset = findBytes(dualCrcTamper, Uint8Array.from([0x50, 0x4b, 0x01, 0x02]));
    expect(centralOffset).toBeGreaterThanOrEqual(0);
    const view = new DataView(dualCrcTamper.buffer, dualCrcTamper.byteOffset, dualCrcTamper.byteLength);
    view.setUint32(14, 0, true);
    view.setUint32(centralOffset + 16, 0, true);
    await expect(admitPack(dualCrcTamper)).rejects.toMatchObject({ code: "invalid-container" });
  });
});

function findBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let offset = 0; offset <= haystack.length - needle.length; offset += 1) {
    for (let index = 0; index < needle.length; index += 1) {
      if (haystack[offset + index] !== needle[index]) {
        continue outer;
      }
    }
    return offset;
  }
  return -1;
}

function zipVersionFieldOffsets(bytes: Uint8Array): readonly { label: string; offset: number }[] {
  const endOffset = bytes.byteLength - 22;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(endOffset, true)).toBe(0x06054b50);
  const entryCount = view.getUint16(endOffset + 10, true);
  let centralOffset = view.getUint32(endOffset + 16, true);
  const offsets: { label: string; offset: number }[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    expect(view.getUint32(centralOffset, true), `central entry ${index}`).toBe(0x02014b50);
    const localOffset = view.getUint32(centralOffset + 42, true);
    offsets.push(
      { label: `local entry ${index} version-needed`, offset: localOffset + 4 },
      { label: `central entry ${index} version-made-by`, offset: centralOffset + 4 },
      { label: `central entry ${index} version-needed`, offset: centralOffset + 6 },
    );
    centralOffset +=
      46 +
      view.getUint16(centralOffset + 28, true) +
      view.getUint16(centralOffset + 30, true) +
      view.getUint16(centralOffset + 32, true);
  }

  return offsets;
}

async function compileUntrustedMimePack(
  mimeType: string,
  objectBytes: Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const hash = await sha256Hex(objectBytes);
  const manifest = {
    ...catalogueManifestFixture,
    objects: [
      {
        ...catalogueManifestFixture.objects[0],
        hash,
        mimeType,
        byteLength: objectBytes.byteLength,
        width,
        height,
      },
    ],
    entries: [
      {
        ...catalogueManifestFixture.entries[0],
        visual: { ...catalogueManifestFixture.entries[0].visual, sourceArtHash: hash },
      },
    ],
  };
  const options = { level: 0 as const, mtime: new Date(1980, 0, 1), os: 0, attrs: 0 };
  const entries: Zippable = {
    "manifest.json": [canonicalJsonBytes(manifest), options],
    [`objects/${hash}`]: [objectBytes, options],
  };
  return zipSync(entries, options);
}

function pngWithImageData(compressed: Uint8Array): Uint8Array {
  return pngWithDimensionsAndImageData(1, 1, compressed);
}

function pngWithDimensionsAndImageData(width: number, height: number, compressed: Uint8Array): Uint8Array {
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width, false);
  headerView.setUint32(4, height, false);
  header[8] = 8;
  header[9] = 0;
  return concatenateBytes(
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND"),
  );
}

function rawCanonicalPack(manifest: unknown, objects: ReadonlyMap<string, Uint8Array>): Uint8Array {
  const options = { level: 0 as const, mtime: new Date(1980, 0, 1), os: 0, attrs: 0 };
  const entries: Zippable = { "manifest.json": [canonicalJsonBytes(manifest), options] };
  for (const object of (manifest as typeof catalogueManifestFixture).objects) {
    const bytes = objects.get(object.hash);
    if (!bytes) throw new Error(`Test object ${object.hash} is missing`);
    entries[`objects/${object.hash}`] = [bytes, options];
  }
  return zipSync(entries, options);
}

function pngChunk(type: string, data: Uint8Array = new Uint8Array()): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.byteLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.byteLength, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(typeBytes, data), false);
  return chunk;
}

function concatenateBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.byteLength, 0));
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.byteLength;
  });
  return result;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(...parts: readonly Uint8Array[]): number {
  let crc = 0xffffffff;
  parts.forEach((part) => {
    part.forEach((byte) => {
      crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    });
  });
  return (crc ^ 0xffffffff) >>> 0;
}
