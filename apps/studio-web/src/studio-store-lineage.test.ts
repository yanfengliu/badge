import "fake-indexeddb/auto";

import { readFile } from "node:fs/promises";
import { deleteDB, openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

import {
  generatedCandidateIdentity,
  processedCandidateIdentity,
  uploadedCandidateIdentity,
} from "./candidate-identity.js";
import { candidateKey, initialCandidates, restoreStudioCandidates } from "./studio-candidates.js";
import {
  STUDIO_ASSET_STORE,
  STUDIO_DATABASE_NAME,
  STUDIO_DATABASE_VERSION,
  STUDIO_DRAFT_KEY,
  STUDIO_DRAFT_STORE,
  StudioStoreError,
  openStudioStore,
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
const descendantBytes = Uint8Array.from(derivativeBytes);
descendantBytes[descendantBytes.length - 13] ^= 1;
const recipe = DEFAULT_RENDER_RECIPE;
const currentGeneratedFixturePaths = [
  "../../../packages/catalogue-fixtures/assets/yosemite-literal-manufactured-v2.webp",
  "../../../packages/catalogue-fixtures/assets/yosemite-symbolic-manufactured-v2.webp",
  "../../../packages/catalogue-fixtures/assets/yosemite-topographic-manufactured-v2.webp",
] as const;

let stores: StudioStore[] = [];

beforeEach(() => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async (source: ImageBitmapSource) => {
      const dimension = source instanceof Blob && source.type === "image/webp" ? 896 : 1;
      return { width: dimension, height: dimension, close: vi.fn() } as unknown as ImageBitmap;
    }),
  );
});

afterEach(async () => {
  stores.forEach((current) => current.close());
  stores = [];
  await deleteDB(STUDIO_DATABASE_NAME);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function store(): Promise<StudioStore> {
  const opened = await openStudioStore({ now: () => FIXED_TIME });
  stores.push(opened);
  return opened;
}

function imageBlob(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

async function fixtureBlob(path: string): Promise<Blob> {
  const bytes = await readFile(new URL(path, import.meta.url));
  return new Blob([new Uint8Array(bytes)], { type: "image/webp" });
}

async function saveUploadedOriginal(current: StudioStore) {
  const blob = imageBlob(originalBytes);
  return current.saveOriginal(blob, uploadedCandidateIdentity(await current.hashBlob(blob)));
}

async function pinnedFixtureBlob(): Promise<Blob> {
  return fixtureBlob(currentGeneratedFixturePaths[0]);
}

function graphMetadata(assets: Awaited<ReturnType<StudioStore["loadAssets"]>>) {
  return assets.map((asset) => ({
    ...asset,
    blob: { size: asset.blob.size, type: asset.blob.type },
  }));
}

describe("Studio durable candidate lineage", () => {
  it("uses actionable typed errors", () => {
    const error = new StudioStoreError(
      "ASSET_UNREADABLE",
      "Studio asset abc is unreadable; restore a Studio backup before making changes.",
    );
    expect(error.message).toContain("abc");
    expect(error.message).toContain("restore");
  });

  it("does not authorize fabricated generated provenance for uploaded bytes", async () => {
    const current = await store();
    const original = await saveUploadedOriginal(current);

    await expect(
      current.saveOriginal(
        imageBlob(originalBytes),
        generatedCandidateIdentity(original.hash, "fabricated-generator"),
      ),
    ).rejects.toMatchObject({
      code: "ASSET_INVALID",
      message: expect.stringMatching(/generated.*admitted.*fixture/i),
    });
    expect((await current.loadAssets())[0]).toMatchObject({
      candidateIdentities: [uploadedCandidateIdentity(original.hash)],
    });
  });

  it("merges byte-identical generated and uploaded treatment lineages and restores both", async () => {
    const current = await store();
    const fixture = initialCandidates[0];
    const source = await pinnedFixtureBlob();
    const uploadedIdentity = uploadedCandidateIdentity(fixture.hash);
    await current.saveOriginal(source, fixture.identity);
    await current.saveOriginal(source, uploadedIdentity);

    const generatedTreatment = await current.saveDerivative(
      fixture.identity,
      imageBlob(derivativeBytes),
      "warm-mineral-treatment-v1",
    );
    const uploadedTreatment = await current.saveDerivative(
      uploadedIdentity,
      imageBlob(derivativeBytes),
      "warm-mineral-treatment-v1",
    );
    const replay = await current.saveDerivative(
      uploadedIdentity,
      imageBlob(derivativeBytes),
      "warm-mineral-treatment-v1",
    );

    expect(generatedTreatment.asset.hash).toBe(uploadedTreatment.asset.hash);
    expect(replay.candidateIdentity).toEqual(uploadedTreatment.candidateIdentity);
    const assets = await current.loadAssets();
    expect(assets.find((asset) => asset.hash === generatedTreatment.asset.hash)).toMatchObject({
      kind: "derivative",
      schemaVersion: 2,
      candidateLineages: [
        { candidateIdentity: { provenance: "generated" } },
        { candidateIdentity: { provenance: "uploaded" } },
      ],
    });

    const restored = restoreStudioCandidates({
      fixtureCandidates: [{ ...fixture, blob: source }],
      assets,
      selectedIdentity: fixture.identity,
      legacySelectedHash: fixture.hash,
      createSourceUrl: () => "blob:restored",
    });
    expect(restored.candidates.filter((candidate) => candidate.origin === "processed")).toHaveLength(2);
    expect(new Set(restored.candidates.map(candidateKey)).size).toBe(restored.candidates.length);
  });

  it("upgrades a version-1 fixture original without erasing legacy provenance ambiguity", async () => {
    const initial = await store();
    initial.close();
    const fixture = initialCandidates[0];
    const source = await pinnedFixtureBlob();
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    await raw.put(STUDIO_ASSET_STORE, {
      schemaVersion: 1,
      kind: "original",
      hash: fixture.hash,
      blob: source,
      mimeType: "image/webp",
      byteLength: source.size,
      createdAt: FIXED_TIME,
    });
    await raw.put(STUDIO_DRAFT_STORE, {
      key: STUDIO_DRAFT_KEY,
      schemaVersion: 1,
      selectedAssetHash: fixture.hash,
      renderRecipe: recipe,
      updatedAt: FIXED_TIME,
    });
    raw.close();

    const reopened = await store();
    const upgraded = await reopened.saveOriginal(source, fixture.identity);
    expect(upgraded.candidateIdentities.map((identity) => identity.provenance).sort()).toEqual([
      "generated",
      "uploaded",
    ]);
    const draft = await reopened.loadDraft();
    const restored = restoreStudioCandidates({
      fixtureCandidates: [{ ...fixture, blob: source }],
      assets: await reopened.loadAssets(),
      selectedIdentity: draft?.selectedCandidateIdentity ?? null,
      legacySelectedHash: draft?.selectedAssetHash ?? null,
      createSourceUrl: () => "blob:ambiguous-legacy",
    });
    expect(restored.selectedKey).toBeNull();
    expect(restored.selectionWarning).toMatch(/older.*provenance.*not.*guess/i);
    expect(restored.candidates.map((candidate) => candidate.provenance).sort()).toEqual([
      "generated",
      "uploaded",
    ]);
  });

  it("loads a preserved v2 draft over a v1 derivative but requires explicit reselection", async () => {
    const initial = await store();
    const original = imageBlob(originalBytes);
    const derivative = imageBlob(derivativeBytes);
    const originalHash = await initial.hashBlob(original);
    const derivativeHash = await initial.hashBlob(derivative);
    const selectedIdentity = await processedCandidateIdentity(
      derivativeHash,
      "uploaded",
      uploadedCandidateIdentity(originalHash),
      "normalized-preview-v1",
    );
    initial.close();
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    await raw.put(STUDIO_ASSET_STORE, {
      schemaVersion: 1,
      kind: "original",
      hash: originalHash,
      blob: original,
      mimeType: "image/png",
      byteLength: original.size,
      createdAt: FIXED_TIME,
    });
    await raw.put(STUDIO_ASSET_STORE, {
      schemaVersion: 1,
      kind: "derivative",
      hash: derivativeHash,
      parentHash: originalHash,
      operation: "normalized-preview-v1",
      blob: derivative,
      mimeType: "image/png",
      byteLength: derivative.size,
      createdAt: FIXED_TIME,
    });
    await raw.put(STUDIO_DRAFT_STORE, {
      key: STUDIO_DRAFT_KEY,
      schemaVersion: 2,
      selectedAssetHash: derivativeHash,
      selectedCandidateIdentity: selectedIdentity,
      renderRecipe: recipe,
      updatedAt: FIXED_TIME,
    });
    raw.close();

    const reopened = await store();
    const draft = await reopened.loadDraft();
    expect(draft?.selectedCandidateIdentity).toEqual(selectedIdentity);
    const restored = restoreStudioCandidates({
      fixtureCandidates: [],
      assets: await reopened.loadAssets(),
      selectedIdentity: draft?.selectedCandidateIdentity ?? null,
      legacySelectedHash: draft?.selectedAssetHash ?? null,
      createSourceUrl: () => "blob:legacy-original",
    });
    expect(restored.selectedKey).toBeNull();
    expect(restored.selectionWarning).toMatch(/cannot be selected, processed, or published/i);
    expect(restored.candidates.some((candidate) => candidate.hash === derivativeHash)).toBe(false);
  });

  it("rejects a derivative merge whose bytes would close a cycle through an ancestor", async () => {
    const current = await store();
    const original = await saveUploadedOriginal(current);
    const first = await current.saveDerivative(
      uploadedCandidateIdentity(original.hash),
      imageBlob(derivativeBytes),
      "first-treatment-v1",
    );
    const descendant = await current.saveDerivative(
      first.candidateIdentity,
      imageBlob(descendantBytes),
      "descendant-treatment-v1",
    );
    const before = graphMetadata(await current.loadAssets());

    await expect(
      current.saveDerivative(descendant.candidateIdentity, imageBlob(derivativeBytes), "ancestor-cycle-v1"),
    ).rejects.toMatchObject({
      code: "ASSET_UNREADABLE",
      message: expect.stringMatching(/derivation graph.*cycle/i),
    });

    expect(graphMetadata(await current.loadAssets())).toEqual(before);
  });

  it.each([
    {
      name: "lineage digest",
      mutate: (asset: Awaited<ReturnType<StudioStore["saveDerivative"]>>["asset"]) => ({
        ...asset,
        candidateLineages: asset.candidateLineages.map((lineage) => ({
          ...lineage,
          candidateIdentity: {
            ...lineage.candidateIdentity,
            lineage: `processed:normalized-preview-v1:${"f".repeat(64)}`,
          },
        })),
      }),
      message: /identity.*does not match.*parent.*transform/i,
    },
    {
      name: "provenance",
      mutate: (asset: Awaited<ReturnType<StudioStore["saveDerivative"]>>["asset"]) => ({
        ...asset,
        candidateLineages: asset.candidateLineages.map((lineage) => ({
          ...lineage,
          candidateIdentity: { ...lineage.candidateIdentity, provenance: "generated" as const },
        })),
      }),
      message: /candidateLineages.*provenance|provenance.*parent/i,
    },
  ])("fails closed when persisted derivative $name is tampered", async ({ mutate, message }) => {
    const current = await store();
    const original = await saveUploadedOriginal(current);
    const derivative = await current.saveDerivative(
      uploadedCandidateIdentity(original.hash),
      imageBlob(derivativeBytes),
      "normalized-preview-v1",
    );
    current.close();
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    await raw.put(STUDIO_ASSET_STORE, mutate(derivative.asset));
    raw.close();

    const reopened = await store();
    await expect(reopened.loadAssets()).rejects.toMatchObject({
      code: "ASSET_UNREADABLE",
      message: expect.stringMatching(message),
    });
  });
});
