import "fake-indexeddb/auto";

import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { createSeededArchiveState, type ArchiveState, type PublishedVisual } from "@badge/archive-domain";
import { sha256Hex } from "@badge/pack-contract";

import {
  ARCHIVE_DATABASE_NAME,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  parseArchiveBackup,
  validateSourceAsset,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import { validateArchiveSourceJpeg } from "../src/jpeg-structure.js";
import { historicalQuotationRequest, sourceCheckedResponse } from "./historical-quotation-fixtures.js";
import { validJpegBytes, validJpegHash, validPngBytes } from "./image-fixtures.js";

const jpegVisual: PublishedVisual = {
  packRef: { packId: "badge.catalogue.discovery", version: "1.0.0", packDigest: "b".repeat(64) },
  visualEditionId: "visual.acadia.study.jpeg.v1",
  sourceAssetHash: validJpegHash,
  accessibleDescription: "A crafted Acadia badge study with granite ledges at dawn.",
  renderRecipeVersion: 1,
  renderRecipe: {
    version: 1,
    shape: "circle",
    material: "enamel",
    borderColor: "#514637",
    borderWidth: 0.075,
    thickness: 0.13,
    relief: 0.032,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};

const jpegSource: ArchiveSourceAssetInput = {
  hash: validJpegHash,
  mimeType: "image/jpeg",
  bytes: validJpegBytes,
};

function jpegSeed(): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "catalogue:visited-acadia",
        definitionRef: {
          namespace: "pack",
          packId: "badge.catalogue.discovery",
          definitionId: "visited-acadia",
        },
        collectionRefs: [
          { namespace: "pack", packId: "badge.catalogue.discovery", collectionId: "us-national-parks" },
        ],
        title: historicalQuotationRequest.title,
        criterion: historicalQuotationRequest.criterion,
        description: null,
        lifecycle: "suggested",
        publishedVisual: jpegVisual,
        acceptedSaying: null,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

function patchedJpeg(patch: (bytes: Uint8Array) => Uint8Array): Uint8Array {
  return patch(validJpegBytes.slice());
}

let repositories: IndexedDbArchiveRepository[] = [];

function repository(): IndexedDbArchiveRepository {
  const result = new IndexedDbArchiveRepository({
    trustedQuotationRequests: { "catalogue:visited-acadia": historicalQuotationRequest },
  });
  repositories.push(result);
  return result;
}

afterEach(async () => {
  for (const current of repositories) current.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("JPEG structural validation", () => {
  it("accepts the normalized metadata-free baseline shape and reports its dimensions", () => {
    const result = validateArchiveSourceJpeg(validJpegHash, validJpegBytes);
    expect(result).toEqual({ width: 8, height: 8, decodedByteLength: 8 * 8 * 4 });
  });

  it("rejects trailing bytes after the EOI marker", () => {
    const trailing = new Uint8Array(validJpegBytes.byteLength + 2);
    trailing.set(validJpegBytes, 0);
    expect(() => validateArchiveSourceJpeg(validJpegHash, trailing)).toThrowError(/trailing bytes/);
  });

  it("rejects a truncated scan with no EOI", () => {
    const truncated = validJpegBytes.slice(0, validJpegBytes.byteLength - 4);
    expect(() => validateArchiveSourceJpeg(validJpegHash, truncated)).toThrowError(
      /does not end with the EOI marker|truncated/,
    );
  });

  it("rejects metadata segments such as EXIF APP1", () => {
    const withExif = patchedJpeg((bytes) => {
      const exif = Uint8Array.from([0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
      const combined = new Uint8Array(bytes.byteLength + exif.byteLength);
      combined.set(bytes.subarray(0, 2), 0);
      combined.set(exif, 2);
      combined.set(bytes.subarray(2), 2 + exif.byteLength);
      return combined;
    });
    expect(() => validateArchiveSourceJpeg(validJpegHash, withExif)).toThrowError(
      /0xffe1 is not part of the admitted metadata-free baseline shape/,
    );
  });

  it("rejects dimensions above the shared 8192px admission limit", () => {
    const oversized = patchedJpeg((bytes) => {
      const sofIndex = bytes.findIndex(
        (value, index) => value === 0xff && bytes[index + 1] === 0xc0 && index > 0,
      );
      bytes[sofIndex + 5] = 0x20;
      bytes[sofIndex + 6] = 0x01;
      return bytes;
    });
    expect(() => validateArchiveSourceJpeg(validJpegHash, oversized)).toThrowError(/8192px limit/);
  });

  it("rejects decoded pixels above an explicit budget before decoding", () => {
    expect(() =>
      validateArchiveSourceJpeg(validJpegHash, validJpegBytes, { maxDecodedBytes: 8 }),
    ).toThrowError(/aggregate 8-byte limit/);
  });

  it("rejects an empty quantization-table segment even when its marker is present", () => {
    const emptied = patchedJpeg((bytes) => {
      const dqtIndex = bytes.findIndex((value, index) => value === 0xff && bytes[index + 1] === 0xdb);
      const dqtLength = (bytes[dqtIndex + 2] << 8) | bytes[dqtIndex + 3];
      const trimmed = new Uint8Array(bytes.byteLength - (dqtLength - 2));
      trimmed.set(bytes.subarray(0, dqtIndex + 4), 0);
      trimmed.set(bytes.subarray(dqtIndex + 2 + dqtLength), dqtIndex + 4);
      trimmed[dqtIndex + 2] = 0;
      trimmed[dqtIndex + 3] = 2;
      return trimmed;
    });
    expect(() => validateArchiveSourceJpeg(validJpegHash, emptied)).toThrowError(
      /empty quantization-table segment|references undefined quantization table/,
    );
  });

  it("rejects an empty Huffman-table segment even when its marker is present", () => {
    const emptied = patchedJpeg((bytes) => {
      const dhtIndex = bytes.findIndex((value, index) => value === 0xff && bytes[index + 1] === 0xc4);
      const dhtLength = (bytes[dhtIndex + 2] << 8) | bytes[dhtIndex + 3];
      const trimmed = new Uint8Array(bytes.byteLength - (dhtLength - 2));
      trimmed.set(bytes.subarray(0, dhtIndex + 4), 0);
      trimmed.set(bytes.subarray(dhtIndex + 2 + dhtLength), dhtIndex + 4);
      trimmed[dhtIndex + 2] = 0;
      trimmed[dhtIndex + 3] = 2;
      return trimmed;
    });
    expect(() => validateArchiveSourceJpeg(validJpegHash, emptied)).toThrowError(
      /empty Huffman-table segment|references undefined Huffman tables/,
    );
  });

  it("rejects a scan whose components reference undefined Huffman tables", () => {
    const rebound = patchedJpeg((bytes) => {
      const sosIndex = bytes.findIndex((value, index) => value === 0xff && bytes[index + 1] === 0xda);
      bytes[sosIndex + 6] = 0x33;
      return bytes;
    });
    expect(() => validateArchiveSourceJpeg(validJpegHash, rebound)).toThrowError(
      /references undefined Huffman tables/,
    );
  });
});

describe("JPEG durable source admission", () => {
  it("admits an intact JPEG source with a matching hash", async () => {
    await expect(validateSourceAsset(jpegSource, validJpegHash)).resolves.toMatchObject({
      hash: validJpegHash,
      mimeType: "image/jpeg",
    });
    await expect(sha256Hex(validJpegBytes)).resolves.toBe(validJpegHash);
  });

  it("rejects JPEG bytes labeled image/png", async () => {
    await expect(
      validateSourceAsset({ ...jpegSource, mimeType: "image/png" }, validJpegHash),
    ).rejects.toMatchObject({ code: "VISUAL_SOURCE_INVALID" });
  });

  it("rejects PNG bytes labeled image/jpeg", async () => {
    const hash = await sha256Hex(validPngBytes);
    await expect(
      validateSourceAsset({ hash, mimeType: "image/jpeg", bytes: validPngBytes }, hash),
    ).rejects.toMatchObject({ code: "VISUAL_SOURCE_INVALID" });
  });

  it("activates a catalogue record from JPEG source bytes and round-trips its backup", async () => {
    const app = new ArchiveApplication(repository(), { now: () => "2026-08-26T12:00:00.000Z" });
    const seeded = await app.initialize(jpegSeed());
    const withDefault = await app.updateQuotation(
      "catalogue:visited-acadia",
      sourceCheckedResponse,
      seeded.records[0]!.quotationRevision,
    );
    const record = withDefault.records[0]!;
    const result = await app.activate(
      {
        recordId: record.recordId,
        occurredStart: "2026-07-04",
        occurredEnd: "2026-07-05",
        note: null,
        visibility: "inherit",
        visualPin: jpegVisual,
      },
      jpegSource,
      sourceCheckedResponse,
      record.quotationRevision,
    );
    expect(result.record.lifecycle).toBe("earned");

    const resolved = await app.visual(record.recordId);
    expect(resolved.sourceAsset.mimeType).toBe("image/jpeg");
    expect(resolved.sourceAsset.bytes).toEqual(validJpegBytes);

    const backup = await app.exportBackup();
    const parsed = await parseArchiveBackup(backup);
    expect(parsed.sourceAssets).toHaveLength(1);
    expect(parsed.sourceAssets[0]).toMatchObject({ hash: validJpegHash, mimeType: "image/jpeg" });
  });

  it("refuses activation when fetched bytes do not hash to the pinned source", async () => {
    const app = new ArchiveApplication(repository(), { now: () => "2026-08-26T12:00:00.000Z" });
    const seeded = await app.initialize(jpegSeed());
    const withDefault = await app.updateQuotation(
      "catalogue:visited-acadia",
      sourceCheckedResponse,
      seeded.records[0]!.quotationRevision,
    );
    const record = withDefault.records[0]!;
    const tampered = patchedJpeg((bytes) => {
      bytes[bytes.byteLength - 3] ^= 0xff;
      return bytes;
    });
    await expect(
      app.activate(
        {
          recordId: record.recordId,
          occurredStart: "2026-07-04",
          occurredEnd: "2026-07-04",
          note: null,
          visibility: "inherit",
          visualPin: jpegVisual,
        },
        { hash: validJpegHash, mimeType: "image/jpeg", bytes: tampered },
        sourceCheckedResponse,
        record.quotationRevision,
      ),
    ).rejects.toMatchObject({ code: "VISUAL_SOURCE_HASH_MISMATCH" });
  });
});
