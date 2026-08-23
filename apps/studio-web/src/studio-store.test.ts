import "fake-indexeddb/auto";

import { deleteDB, openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_STUDIO_IMAGE_BYTES, MAX_STUDIO_IMAGE_DIMENSION } from "./image-processing.js";
import { uploadedCandidateIdentity, type CandidateIdentity } from "./candidate-identity.js";

import {
  STUDIO_ASSET_STORE,
  STUDIO_DATABASE_NAME,
  STUDIO_DATABASE_VERSION,
  STUDIO_DRAFT_KEY,
  STUDIO_DRAFT_STORE,
  openStudioStore,
  type StudioStoreError,
  type StudioStore,
} from "./studio-store.js";

const FIXED_TIME = "2026-08-23T18:00:00.000Z";
const originalBytes = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181,
  28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102, 0, 0,
  0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);
const derivativeBytes = Uint8Array.from([
  ...originalBytes.slice(0, -12),
  0,
  0,
  0,
  3,
  116,
  69,
  88,
  116,
  120,
  0,
  121,
  69,
  219,
  243,
  40,
  ...originalBytes.slice(-12),
]);
const recipe = {
  version: 1 as const,
  shape: "circle" as const,
  material: "metal" as const,
  borderColor: "#b87333",
  borderWidth: 0.08,
  thickness: 0.1,
  relief: 0.03,
  crop: { x: 0.5, y: 0.5, scale: 1 },
};

let stores: StudioStore[] = [];

beforeEach(() => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() }) as unknown as ImageBitmap),
  );
});

async function store(): Promise<StudioStore> {
  const opened = await openStudioStore({ now: () => FIXED_TIME });
  stores.push(opened);
  return opened;
}

function imageBlob(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

async function saveUploadedOriginal(current: StudioStore, bytes: Uint8Array = originalBytes) {
  const blob = imageBlob(bytes);
  return current.saveOriginal(blob, uploadedCandidateIdentity(await current.hashBlob(blob)));
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

afterEach(async () => {
  stores.forEach((current) => current.close());
  stores = [];
  await deleteDB(STUDIO_DATABASE_NAME);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Studio original and derivative persistence", () => {
  it("uses the separate canonical Studio database and restores exact original Blob bytes", async () => {
    expect(STUDIO_DATABASE_NAME).toBe("badge-studio-v1");
    expect(STUDIO_DATABASE_VERSION).toBe(1);

    const current = await store();
    const saved = await saveUploadedOriginal(current);
    expect(saved.kind).toBe("original");
    expect(saved.hash).toMatch(/^[0-9a-f]{64}$/);
    current.close();

    const reopened = await store();
    const [restored] = await reopened.loadAssets();
    expect(restored).toMatchObject({
      schemaVersion: 2,
      kind: "original",
      hash: saved.hash,
      mimeType: "image/png",
      byteLength: originalBytes.byteLength,
      createdAt: FIXED_TIME,
    });
    expect(restored.blob).toBeInstanceOf(Blob);
    expect(await blobBytes(restored.blob)).toEqual(originalBytes);

    const replay = await reopened.saveOriginal(
      imageBlob(originalBytes),
      uploadedCandidateIdentity(saved.hash),
    );
    expect(replay).toEqual(restored);
    expect(await reopened.loadAssets()).toHaveLength(1);
  });

  it("saves a derivative with an immutable parent without changing the original", async () => {
    const current = await store();
    const original = await saveUploadedOriginal(current);
    const savedDerivative = await current.saveDerivative(
      uploadedCandidateIdentity(original.hash),
      imageBlob(derivativeBytes),
      "normalized-preview-v1",
    );
    const derivative = savedDerivative.asset;

    expect(derivative).toMatchObject({
      kind: "derivative",
      schemaVersion: 2,
      candidateLineages: [
        {
          parentHash: original.hash,
          operation: "normalized-preview-v1",
          parentCandidateIdentity: uploadedCandidateIdentity(original.hash),
          candidateIdentity: savedDerivative.candidateIdentity,
        },
      ],
    });
    const assets = await current.loadAssets();
    expect(assets).toHaveLength(2);
    expect(await blobBytes(assets.find((asset) => asset.hash === original.hash)!.blob)).toEqual(
      originalBytes,
    );
    expect(await blobBytes(assets.find((asset) => asset.hash === derivative.hash)!.blob)).toEqual(
      derivativeBytes,
    );

    const replay = await current.saveDerivative(
      uploadedCandidateIdentity(original.hash),
      imageBlob(derivativeBytes),
      "normalized-preview-v1",
    );
    expect(replay).toEqual(savedDerivative);
    expect(await current.loadAssets()).toHaveLength(2);
  });

  it("refuses a derivative whose parent is missing without writing an orphan", async () => {
    const current = await store();

    await expect(
      current.saveDerivative(
        uploadedCandidateIdentity("a".repeat(64)),
        imageBlob(derivativeBytes),
        "crop-v1",
      ),
    ).rejects.toMatchObject({ code: "ASSET_PARENT_MISSING" });
    expect(await current.loadAssets()).toEqual([]);
  });

  it("returns an actionable typed error for invalid asset input", async () => {
    const current = await store();

    await expect(
      current.saveDerivative(
        {
          version: 1,
          hash: "not-a-hash",
          provenance: "uploaded",
          origin: "uploaded",
          lineage: "uploaded:immutable-original-v1",
        } as CandidateIdentity,
        imageBlob(derivativeBytes),
        "Invalid Operation",
      ),
    ).rejects.toMatchObject({ code: "ASSET_INVALID" });
    await expect(
      current.saveOriginal(new Blob([], { type: "image/png" }), uploadedCandidateIdentity("a".repeat(64))),
    ).rejects.toMatchObject({ code: "ASSET_INVALID" });
    expect(await current.loadAssets()).toEqual([]);
  });

  it("refuses an oversized original before decode or byte read and leaves persistence empty", async () => {
    const current = await store();
    const source = imageBlob(originalBytes);
    Object.defineProperty(source, "size", { value: MAX_STUDIO_IMAGE_BYTES + 1 });
    const read = vi.spyOn(source, "arrayBuffer");
    const decode = vi.mocked(globalThis.createImageBitmap);

    await expect(
      current.saveOriginal(source, uploadedCandidateIdentity("a".repeat(64))),
    ).rejects.toMatchObject({
      code: "ASSET_INVALID",
      message: expect.stringMatching(/original.*bytes.*choose.*No asset was written/i),
    });

    expect(decode).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    expect(await current.loadAssets()).toEqual([]);
  });

  it("refuses extreme decoded dimensions before hashing or persistence", async () => {
    const current = await store();
    const source = imageBlob(originalBytes);
    const read = vi.spyOn(source, "arrayBuffer");
    const close = vi.fn();
    vi.mocked(globalThis.createImageBitmap).mockResolvedValueOnce({
      width: MAX_STUDIO_IMAGE_DIMENSION,
      height: MAX_STUDIO_IMAGE_DIMENSION,
      close,
    } as unknown as ImageBitmap);

    await expect(
      current.saveOriginal(source, uploadedCandidateIdentity("a".repeat(64))),
    ).rejects.toMatchObject({
      code: "ASSET_INVALID",
      message: expect.stringMatching(/original.*pixels.*choose.*No asset was written/i),
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
    expect(await current.loadAssets()).toEqual([]);
  });

  it("refuses an unsafe derivative without changing its bounded parent", async () => {
    const current = await store();
    const original = await saveUploadedOriginal(current);
    const unsafe = imageBlob(derivativeBytes);
    const read = vi.spyOn(unsafe, "arrayBuffer");
    const decode = vi.mocked(globalThis.createImageBitmap);
    const close = vi.fn();
    decode.mockClear();
    decode
      .mockResolvedValueOnce({ width: 1, height: 1, close: vi.fn() } as unknown as ImageBitmap)
      .mockResolvedValueOnce({
        width: MAX_STUDIO_IMAGE_DIMENSION,
        height: MAX_STUDIO_IMAGE_DIMENSION,
        close,
      } as unknown as ImageBitmap);

    await expect(
      current.saveDerivative(uploadedCandidateIdentity(original.hash), unsafe, "unsafe-derivative-v1"),
    ).rejects.toMatchObject({ code: "ASSET_INVALID" });

    expect(close).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
    expect((await current.loadAssets()).map((asset) => asset.hash)).toEqual([original.hash]);
  });
});

describe("Studio draft persistence", () => {
  it("round-trips selection and a strict RenderRecipe independently from Blob rows", async () => {
    const current = await store();
    const original = await saveUploadedOriginal(current);
    const selectedCandidateIdentity = uploadedCandidateIdentity(original.hash);
    await current.saveDraft({
      selectedAssetHash: original.hash,
      selectedCandidateIdentity,
      renderRecipe: recipe,
    });
    current.close();

    const reopened = await store();
    expect(await reopened.loadDraft()).toEqual({
      schemaVersion: 2,
      selectedAssetHash: original.hash,
      selectedCandidateIdentity,
      renderRecipe: recipe,
      updatedAt: FIXED_TIME,
    });

    await reopened.saveDraft({
      selectedAssetHash: original.hash,
      selectedCandidateIdentity,
      renderRecipe: { ...recipe, shape: "shield", borderWidth: 0.12 },
    });
    expect((await reopened.loadDraft())?.renderRecipe).toMatchObject({
      shape: "shield",
      borderWidth: 0.12,
    });
    expect(await blobBytes((await reopened.loadAssets())[0].blob)).toEqual(originalBytes);
  });

  it("refuses to save a draft that selects a missing asset", async () => {
    const current = await store();
    const missingHash = "c".repeat(64);

    await expect(
      current.saveDraft({
        selectedAssetHash: missingHash,
        selectedCandidateIdentity: uploadedCandidateIdentity(missingHash),
        renderRecipe: recipe,
      }),
    ).rejects.toMatchObject({ code: "ASSET_PARENT_MISSING" });
    expect(await current.loadDraft()).toBeNull();
  });

  it("loads a readable version-1 draft without inventing candidate provenance", async () => {
    const current = await store();
    const original = await saveUploadedOriginal(current);
    current.close();
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    await raw.put(STUDIO_DRAFT_STORE, {
      key: STUDIO_DRAFT_KEY,
      schemaVersion: 1,
      selectedAssetHash: original.hash,
      renderRecipe: recipe,
      updatedAt: FIXED_TIME,
    });
    raw.close();

    const reopened = await store();
    expect(await reopened.loadDraft()).toEqual({
      schemaVersion: 2,
      selectedAssetHash: original.hash,
      selectedCandidateIdentity: null,
      renderRecipe: recipe,
      updatedAt: FIXED_TIME,
    });
  });
});

describe("fail-closed recovery behavior", () => {
  it("rejects over-limit stored asset metadata before decode or byte read", async () => {
    const initial = await store();
    initial.close();
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    await raw.put(STUDIO_ASSET_STORE, {
      schemaVersion: 1,
      kind: "original",
      hash: "e".repeat(64),
      blob: imageBlob(originalBytes),
      mimeType: "image/png",
      byteLength: MAX_STUDIO_IMAGE_BYTES + 1,
      createdAt: FIXED_TIME,
    });
    raw.close();
    const decode = vi.mocked(globalThis.createImageBitmap);
    const read = vi.spyOn(Blob.prototype, "arrayBuffer");
    decode.mockClear();

    const reopened = await store();
    await expect(reopened.loadAssets()).rejects.toMatchObject({
      code: "ASSET_UNREADABLE",
      message: expect.stringMatching(/asset.*byteLength.*limit|asset.*byteLength.*exceed/i),
    });
    expect(decode).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("rejects unsafe dimensions decoded from a stored asset before hashing it", async () => {
    const initial = await store();
    initial.close();
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    await raw.put(STUDIO_ASSET_STORE, {
      schemaVersion: 1,
      kind: "original",
      hash: "f".repeat(64),
      blob: imageBlob(originalBytes),
      mimeType: "image/png",
      byteLength: originalBytes.byteLength,
      createdAt: FIXED_TIME,
    });
    raw.close();
    const read = vi.spyOn(Blob.prototype, "arrayBuffer");
    const close = vi.fn();
    vi.mocked(globalThis.createImageBitmap).mockResolvedValueOnce({
      width: MAX_STUDIO_IMAGE_DIMENSION,
      height: MAX_STUDIO_IMAGE_DIMENSION,
      close,
    } as unknown as ImageBitmap);

    const reopened = await store();
    await expect(reopened.loadAssets()).rejects.toMatchObject({
      code: "ASSET_UNREADABLE",
      message: expect.stringMatching(/stored Studio original.*pixels.*restore/i),
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("closes and quarantines a connection that blocks a future database upgrade", async () => {
    const issues: StudioStoreError[] = [];
    const current = await openStudioStore({
      now: () => FIXED_TIME,
      onConnectionIssue: (error) => issues.push(error),
    });
    stores.push(current);
    await current.loadAssets();

    const future = await openDB(STUDIO_DATABASE_NAME, 2, {
      upgrade(database) {
        database.createObjectStore("future-data");
      },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "DATABASE_BLOCKED" });
    await expect(current.loadAssets()).rejects.toMatchObject({ code: "DATABASE_BLOCKED" });
    future.close();
  });

  it("preserves an unsupported asset row and blocks later writes", async () => {
    const initial = await store();
    const expectedHash = await initial.hashBlob(imageBlob(originalBytes));
    initial.close();

    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    const unsupported = {
      schemaVersion: 3,
      kind: "original",
      hash: expectedHash,
      blob: imageBlob(originalBytes),
      mimeType: "image/png",
      byteLength: originalBytes.byteLength,
      createdAt: FIXED_TIME,
    };
    await raw.put(STUDIO_ASSET_STORE, unsupported);
    raw.close();

    const reopened = await store();
    await expect(reopened.loadAssets()).rejects.toMatchObject({ code: "ASSET_UNSUPPORTED" });
    await expect(
      reopened.saveOriginal(imageBlob(originalBytes), uploadedCandidateIdentity(expectedHash)),
    ).rejects.toMatchObject({ code: "ASSET_UNSUPPORTED" });
    reopened.close();

    const evidence = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    expect(await evidence.get(STUDIO_ASSET_STORE, expectedHash)).toEqual(unsupported);
    evidence.close();
  });

  it("preserves an unreadable draft rather than treating it as empty", async () => {
    const initial = await store();
    initial.close();
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    const corrupt = {
      key: STUDIO_DRAFT_KEY,
      schemaVersion: 1,
      selectedAssetHash: null,
      renderRecipe: { ...recipe, borderWidth: 9 },
      updatedAt: FIXED_TIME,
    };
    await raw.put(STUDIO_DRAFT_STORE, corrupt);
    raw.close();

    const reopened = await store();
    await expect(reopened.loadDraft()).rejects.toMatchObject({ code: "DRAFT_UNREADABLE" });
    await expect(
      reopened.saveDraft({
        selectedAssetHash: null,
        selectedCandidateIdentity: null,
        renderRecipe: recipe,
      }),
    ).rejects.toMatchObject({ code: "DRAFT_UNREADABLE" });
    reopened.close();

    const evidence = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    expect(await evidence.get(STUDIO_DRAFT_STORE, STUDIO_DRAFT_KEY)).toEqual(corrupt);
    evidence.close();
  });

  it("reports a newer database version without deleting it", async () => {
    const future = await openDB(STUDIO_DATABASE_NAME, 2, {
      upgrade(database) {
        database.createObjectStore("future-data");
      },
    });
    await future.put("future-data", { keep: true }, "evidence");
    future.close();

    await expect(store()).rejects.toMatchObject({ code: "DATABASE_UNSUPPORTED" });

    const evidence = await openDB(STUDIO_DATABASE_NAME, 2);
    expect(await evidence.get("future-data", "evidence")).toEqual({ keep: true });
    evidence.close();
  });
});
