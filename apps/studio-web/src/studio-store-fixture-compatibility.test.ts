import "fake-indexeddb/auto";

import { readFile } from "node:fs/promises";
import { deleteDB, openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

import { candidateIdentityKey, generatedCandidateIdentity } from "./candidate-identity.js";
import {
  attachVerifiedFixtureSnapshots,
  candidateKey,
  initialCandidates,
  restoreStudioCandidates,
} from "./studio-candidates.js";
import {
  STUDIO_ASSET_STORE,
  STUDIO_DATABASE_NAME,
  STUDIO_DATABASE_VERSION,
  STUDIO_DRAFT_KEY,
  STUDIO_DRAFT_STORE,
  openStudioStore,
  type StudioStore,
} from "./studio-store.js";

const FIXED_TIME = "2026-08-23T18:00:00.000Z";
const legacyGeneratedFixtures = [
  {
    id: "candidate-literal",
    hash: "66ff0b12c95341493dd674f77b427be0c8de81350e7e20286d1984e20722a35b",
    path: "../../../packages/catalogue-fixtures/assets/yosemite-literal.webp",
  },
  {
    id: "candidate-symbolic",
    hash: "b2ef9b66c7009bfb0716e0b404ec9e236ad2d2723c252a917de3ac9de43848a1",
    path: "../../../packages/catalogue-fixtures/assets/yosemite-symbolic.webp",
  },
  {
    id: "candidate-topographic",
    hash: "1c1c4396a99ec00a142d0fee2317482858133cf6ca667d1bee1aa1fb3616ece6",
    path: "../../../packages/catalogue-fixtures/assets/yosemite-topographic.webp",
  },
] as const;
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

async function fixtureBlob(path: string): Promise<Blob> {
  const bytes = await readFile(new URL(path, import.meta.url));
  return new Blob([new Uint8Array(bytes)], { type: "image/webp" });
}

describe("Studio fixture compatibility", () => {
  it("replays App startup over pre-alpha.4 generated rows without rewriting their identities or draft", async () => {
    const initial = await store();
    initial.close();
    const legacyRows = await Promise.all(
      legacyGeneratedFixtures.map(async (fixture) => {
        const blob = await fixtureBlob(fixture.path);
        return {
          schemaVersion: 2 as const,
          kind: "original" as const,
          hash: fixture.hash,
          blob,
          mimeType: "image/webp" as const,
          byteLength: blob.size,
          createdAt: FIXED_TIME,
          candidateIdentities: [generatedCandidateIdentity(fixture.hash, fixture.id)],
        };
      }),
    );
    const selectedIdentity = legacyRows[1].candidateIdentities[0];
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    for (const row of legacyRows) await raw.put(STUDIO_ASSET_STORE, row);
    await raw.put(STUDIO_DRAFT_STORE, {
      key: STUDIO_DRAFT_KEY,
      schemaVersion: 2,
      selectedAssetHash: selectedIdentity.hash,
      selectedCandidateIdentity: selectedIdentity,
      renderRecipe: DEFAULT_RENDER_RECIPE,
      updatedAt: FIXED_TIME,
    });
    raw.close();

    const reopened = await store();
    const restoredLegacyRows = await reopened.loadAssets();
    expect(restoredLegacyRows).toHaveLength(3);
    expect(restoredLegacyRows.map((asset) => asset.hash).sort()).toEqual(
      legacyGeneratedFixtures.map((fixture) => fixture.hash).sort(),
    );

    const currentSnapshots = await Promise.all(
      currentGeneratedFixturePaths.map(async (path, index) => ({
        hash: initialCandidates[index].hash,
        blob: await fixtureBlob(path),
      })),
    );
    for (const [index, snapshot] of currentSnapshots.entries()) {
      await reopened.saveOriginal(snapshot.blob, initialCandidates[index].identity);
    }

    const assets = await reopened.loadAssets();
    const draft = await reopened.loadDraft();
    const restored = restoreStudioCandidates({
      fixtureCandidates: attachVerifiedFixtureSnapshots(initialCandidates, currentSnapshots),
      assets,
      selectedIdentity: draft?.selectedCandidateIdentity ?? null,
      legacySelectedHash: draft?.selectedAssetHash ?? null,
      createSourceUrl: (blob) => `blob:restored-${blob.size}`,
    });

    expect(assets).toHaveLength(6);
    for (const legacyRow of legacyRows) {
      const preserved = assets.find((asset) => asset.hash === legacyRow.hash);
      expect(preserved).toMatchObject({
        schemaVersion: 2,
        kind: "original",
        mimeType: "image/webp",
        byteLength: legacyRow.byteLength,
        createdAt: FIXED_TIME,
        candidateIdentities: legacyRow.candidateIdentities,
      });
      expect(new Uint8Array(await preserved!.blob.arrayBuffer())).toEqual(
        new Uint8Array(await legacyRow.blob.arrayBuffer()),
      );
    }
    expect(draft).toMatchObject({
      selectedAssetHash: selectedIdentity.hash,
      selectedCandidateIdentity: selectedIdentity,
      renderRecipe: DEFAULT_RENDER_RECIPE,
      updatedAt: FIXED_TIME,
    });
    expect(restored.candidates.slice(0, initialCandidates.length).map(candidateKey)).toEqual(
      initialCandidates.map(candidateKey),
    );
    expect(restored.candidates).toHaveLength(6);
    expect(restored.selectedKey).toBe(candidateIdentityKey(selectedIdentity));
    expect(restored.selectedKey).not.toBe(candidateKey(initialCandidates[1]));
    expect(
      restored.candidates.find((candidate) => candidateKey(candidate) === restored.selectedKey),
    ).toMatchObject({
      label: "Historical generated artwork",
      direction: "Restored generated fixture",
      hash: selectedIdentity.hash,
      identity: selectedIdentity,
    });
  });

  it("keeps a pre-identity alpha.3 fixture selection ambiguous instead of relabeling it as an upload", async () => {
    const initial = await store();
    initial.close();
    const legacyFixture = legacyGeneratedFixtures[0];
    const blob = await fixtureBlob(legacyFixture.path);
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    await raw.put(STUDIO_ASSET_STORE, {
      schemaVersion: 1,
      kind: "original",
      hash: legacyFixture.hash,
      blob,
      mimeType: "image/webp",
      byteLength: blob.size,
      createdAt: FIXED_TIME,
    });
    await raw.put(STUDIO_DRAFT_STORE, {
      key: STUDIO_DRAFT_KEY,
      schemaVersion: 1,
      selectedAssetHash: legacyFixture.hash,
      renderRecipe: DEFAULT_RENDER_RECIPE,
      updatedAt: FIXED_TIME,
    });
    raw.close();

    const reopened = await store();
    const assets = await reopened.loadAssets();
    const draft = await reopened.loadDraft();
    const restored = restoreStudioCandidates({
      fixtureCandidates: initialCandidates,
      assets,
      selectedIdentity: draft?.selectedCandidateIdentity ?? null,
      legacySelectedHash: draft?.selectedAssetHash ?? null,
      createSourceUrl: (source) => `blob:legacy-${source.size}`,
    });

    expect(
      restored.candidates
        .filter((candidate) => candidate.hash === legacyFixture.hash)
        .map((candidate) => candidate.provenance)
        .sort(),
    ).toEqual(["generated", "uploaded"]);
    expect(restored.selectedKey).toBeNull();
    expect(restored.selectionWarning).toMatch(/older.*provenance.*not.*guess/i);
    const verifyRaw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    expect(await verifyRaw.get(STUDIO_ASSET_STORE, legacyFixture.hash)).toMatchObject({
      schemaVersion: 1,
      hash: legacyFixture.hash,
    });
    expect(await verifyRaw.get(STUDIO_DRAFT_STORE, STUDIO_DRAFT_KEY)).toMatchObject({
      schemaVersion: 1,
      selectedAssetHash: legacyFixture.hash,
    });
    verifyRaw.close();
  });
});
