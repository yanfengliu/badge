import { createSeededArchiveState, type ArchiveState, type PublishedVisual } from "@badge/archive-domain";
import { zlibSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  MAX_ARCHIVE_BACKUP_STATE_BYTES,
  MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES,
  MAX_ARCHIVE_SOURCE_ASSET_BYTES,
  MAX_ARCHIVE_SOURCE_ASSET_COUNT,
  MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES,
  createArchiveBackup,
  parseArchiveBackup,
  validateSourceAssetWithImageBudget,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import { sha256Hex } from "@badge/pack-contract";
import { makeSourceBackup } from "./backup-test-mutators.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const exportedAt = "2026-08-23T17:00:00.000Z";
const visual: PublishedVisual = {
  packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: validPngHash,
  accessibleDescription: "A crafted Yosemite badge showing granite walls after rain.",
  renderRecipeVersion: 1,
  renderRecipe: {
    version: 1,
    shape: "circle",
    material: "metal",
    borderColor: "#b87333",
    borderWidth: 0.08,
    thickness: 0.1,
    relief: 0.03,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};
const sourceAsset: ArchiveSourceAssetInput = {
  hash: validPngHash,
  mimeType: "image/png",
  bytes: validPngBytes,
};

describe("Archive backup source preflight bounds", () => {
  it("caps legacy state-only JSON before UTF-8 decoding or parsing", async () => {
    const oversizedLegacy = new Uint8Array(MAX_ARCHIVE_BACKUP_STATE_BYTES + 1);
    oversizedLegacy.fill(" ".charCodeAt(0));

    await expect(parseArchiveBackup(oversizedLegacy)).rejects.toMatchObject({
      code: "BACKUP_TOO_LARGE",
      message: expect.stringMatching(
        /legacy Archive backup.*no larger than.*not decoded as JSON.*No Archive data was changed/i,
      ),
    });
  });

  it("rejects an excessive source count before decoding or hashing any source", async () => {
    await expect(
      createArchiveBackup(
        state(),
        Array.from({ length: MAX_ARCHIVE_SOURCE_ASSET_COUNT + 1 }, () => sourceAsset),
        exportedAt,
      ),
    ).rejects.toMatchObject({
      code: "BACKUP_TOO_LARGE",
      message: expect.stringMatching(/1025 source assets.*No image was decoded or hashed/i),
    });
  });

  it("rejects excessive aggregate source bytes before decoding or hashing any source", async () => {
    const maximumSizedSource = {
      hash: "f".repeat(64),
      mimeType: "image/png" as const,
      bytes: new Uint8Array(MAX_ARCHIVE_SOURCE_ASSET_BYTES),
    };

    await expect(
      createArchiveBackup(
        state(),
        Array.from({ length: 5 }, () => maximumSizedSource),
        exportedAt,
      ),
    ).rejects.toMatchObject({
      code: "BACKUP_TOO_LARGE",
      message: expect.stringMatching(/source assets total.*No image was decoded or hashed/i),
    });
  });

  it("rejects an oversized individual source during the cheap shape preflight", async () => {
    const oversizedSource = {
      hash: "f".repeat(64),
      mimeType: "image/png" as const,
      bytes: new Uint8Array(MAX_ARCHIVE_SOURCE_ASSET_BYTES + 1),
    };

    await expect(createArchiveBackup(state(), [oversizedSource], exportedAt)).rejects.toMatchObject({
      code: "VISUAL_SOURCE_INVALID",
      message: expect.stringMatching(/bytes.*no larger/i),
    });
  });

  it("rejects manifest/state source closure before inspecting an unreferenced image payload", async () => {
    const unreferencedNonPng = new TextEncoder().encode("self-consistent but not an image");
    const backup = await makeSourceBackup(() => state(), [unreferencedNonPng], exportedAt);

    await expect(parseArchiveBackup(backup)).rejects.toMatchObject({
      code: "BACKUP_INVALID",
      message: expect.stringMatching(/unreferenced source.*closed backup.*No Archive data was changed/i),
    });
  });

  it("reports a missing earned source before inspecting a different hostile payload", async () => {
    const unreferencedNonPng = new TextEncoder().encode("self-consistent but not an image");
    const requiredHash = "f".repeat(64);
    const backup = await makeSourceBackup(
      () => earnedStateForSources([requiredHash]),
      [unreferencedNonPng],
      exportedAt,
    );

    await expect(parseArchiveBackup(backup)).rejects.toMatchObject({
      code: "BACKUP_INCOMPLETE",
      message: expect.stringMatching(
        new RegExp(`missing source ${requiredHash}.*earned record.*No Archive data was changed`, "i"),
      ),
    });
  });

  it("keeps the decoded-image aggregate cap above one fully collected catalogue while bounding amplification", () => {
    const fullCatalogueDecodedBytes = 300 * 896 * 896 * 4;
    expect(MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES).toBe(2 * 1024 * 1024 * 1024);
    expect(fullCatalogueDecodedBytes).toBeLessThan(MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES);
    expect(MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES).toBeLessThanOrEqual(
      32 * MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES,
    );
  });

  it("rejects a source whose declared decode overruns the remaining aggregate budget before inflation", async () => {
    const declared64MiBSource = pngWithDimensionsAndImageData(
      4_096,
      4_096,
      zlibSync(Uint8Array.from([0, 0])),
    );
    await expect(
      validateSourceAssetWithImageBudget(
        {
          hash: await sha256Hex(declared64MiBSource),
          mimeType: "image/png",
          bytes: declared64MiBSource,
        },
        { maxDecodedBytes: 16 * 1024 * 1024, aggregateLimit: MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES },
      ),
    ).rejects.toMatchObject({
      code: "VISUAL_SOURCE_INVALID",
      message: expect.stringMatching(
        /decoded image data would exceed the pack aggregate 2147483648-byte limit.*before inflation/i,
      ),
    });
  });
});

function state(): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: { namespace: "pack", packId: "parks", definitionId: "visited-yosemite" },
        collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "national-parks" }],
        title: "Visited Yosemite National Park",
        criterion: "Visit Yosemite National Park honestly.",
        description: null,
        lifecycle: "suggested",
        publishedVisual: visual,
        acceptedSaying: null,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

function earnedStateForSources(hashes: readonly string[]): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: hashes.map((hash, index) => ({
      recordId: `record-${index}`,
      definitionRef: { namespace: "pack", packId: "parks", definitionId: `definition-${index}` },
      collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: `collection-${index}` }],
      title: `Earned memory ${index}`,
      criterion: "Remember this honestly.",
      description: null,
      lifecycle: "earned",
      publishedVisual: { ...visual, visualEditionId: `edition-${index}`, sourceAssetHash: hash },
      acceptedSaying: null,
      note: null,
      visibility: "inherit",
      activation: {
        activatedAt: exportedAt,
        occurredStart: "2026-08-23",
        occurredEnd: "2026-08-23",
        recordedAt: exportedAt,
        visualPin: { ...visual, visualEditionId: `edition-${index}`, sourceAssetHash: hash },
      },
    })),
  });
}

function pngWithDimensionsAndImageData(width: number, height: number, compressed: Uint8Array): Uint8Array {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width, false);
  view.setUint32(4, height, false);
  header[8] = 8;
  header[9] = 0;
  return concatenate(
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND"),
  );
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

function concatenate(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(...parts: readonly Uint8Array[]): number {
  let crc = 0xffffffff;
  for (const part of parts) {
    for (const byte of part) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
