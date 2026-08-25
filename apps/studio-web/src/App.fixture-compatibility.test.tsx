// @vitest-environment happy-dom

import "fake-indexeddb/auto";

import { Blob as NodeBlob } from "node:buffer";
import { readFile } from "node:fs/promises";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { studioFixtureCandidates } from "@badge/catalogue-fixtures/studio";
import { deleteDB, openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generatedCandidateIdentity } from "./candidate-identity";
import {
  STUDIO_ASSET_STORE,
  STUDIO_DATABASE_NAME,
  STUDIO_DATABASE_VERSION,
  STUDIO_DRAFT_KEY,
  STUDIO_DRAFT_STORE,
} from "./studio-store";

vi.mock("@badge/renderer-web", () => ({
  BadgeViewer: ({ sourceUrl }: { sourceUrl: string }) => (
    <div data-testid="badge-viewer" data-source-url={sourceUrl} />
  ),
}));

import { App } from "./App";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FIXED_TIME = "2026-08-23T18:00:00.000Z";
const legacySymbolicFixture = {
  id: "candidate-symbolic",
  hash: "b2ef9b66c7009bfb0716e0b404ec9e236ad2d2723c252a917de3ac9de43848a1",
  path: "../../../packages/catalogue-fixtures/assets/yosemite-symbolic.webp",
} as const;
const currentFixturePaths: Readonly<Record<string, string>> = {
  "candidate-literal": "../../../packages/catalogue-fixtures/assets/yosemite-literal-manufactured-v2.webp",
  "candidate-symbolic": "../../../packages/catalogue-fixtures/assets/yosemite-symbolic-manufactured-v2.webp",
  "candidate-topographic":
    "../../../packages/catalogue-fixtures/assets/yosemite-topographic-manufactured-v2.webp",
};
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

describe("mounted Studio fixture compatibility", () => {
  let container: HTMLDivElement;
  let root: Root;
  let legacyBlob: Blob;

  beforeEach(async () => {
    await deleteDB(STUDIO_DATABASE_NAME);
    vi.stubGlobal("Blob", NodeBlob);
    legacyBlob = await fixtureBlob(legacySymbolicFixture.path);
    const currentBlobs = new Map<string, Blob>();
    for (const candidate of studioFixtureCandidates) {
      currentBlobs.set(candidate.sourceUrl, await fixtureBlob(currentFixturePaths[candidate.id]));
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const sourceUrl = input instanceof Request ? input.url : String(input);
        const blob = currentBlobs.get(sourceUrl);
        return {
          ok: blob !== undefined,
          status: blob ? 200 : 404,
          blob: async () => blob ?? new Blob([], { type: "image/webp" }),
        } as Response;
      }),
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 896, height: 896, close: vi.fn() }) as unknown as ImageBitmap),
    );
    vi.spyOn(URL, "createObjectURL").mockImplementation((source) => {
      if (!(source instanceof Blob)) throw new Error("Fixture compatibility expects Blob source art.");
      return `blob:restored-historical-${source.size}`;
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const selectedIdentity = generatedCandidateIdentity(legacySymbolicFixture.hash, legacySymbolicFixture.id);
    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION, {
      upgrade(database) {
        database.createObjectStore(STUDIO_ASSET_STORE, { keyPath: "hash" });
        database.createObjectStore(STUDIO_DRAFT_STORE, { keyPath: "key" });
      },
    });
    await raw.put(STUDIO_ASSET_STORE, {
      schemaVersion: 2,
      kind: "original",
      hash: legacySymbolicFixture.hash,
      blob: legacyBlob,
      mimeType: "image/webp",
      byteLength: legacyBlob.size,
      createdAt: FIXED_TIME,
      candidateIdentities: [selectedIdentity],
    });
    await raw.put(STUDIO_DRAFT_STORE, {
      key: STUDIO_DRAFT_KEY,
      schemaVersion: 2,
      selectedAssetHash: selectedIdentity.hash,
      selectedCandidateIdentity: selectedIdentity,
      renderRecipe: recipe,
      updatedAt: FIXED_TIME,
    });
    raw.close();

    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    await deleteDB(STUDIO_DATABASE_NAME);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("seeds the current proposals while keeping the exact historical draft selected", async () => {
    await act(async () =>
      root.render(<App onSectionChange={() => undefined} onLeaveGuardChange={() => undefined} />),
    );

    await waitFor(() => expect(container.textContent).toContain("Restored the last Studio draft"));
    const candidateButtons = [...container.querySelectorAll<HTMLButtonElement>("button.candidate")];
    expect(candidateButtons).toHaveLength(4);
    expect(candidateButtons.slice(0, 3).map((button) => button.textContent)).toEqual([
      expect.stringContaining("Cloisonné valley"),
      expect.stringContaining("Underglaze portal"),
      expect.stringContaining("Blockprint route"),
    ]);
    const historical = candidateButtons.find((button) =>
      button.textContent?.includes("Historical generated artwork"),
    );
    expect(historical).toBeDefined();
    expect(historical?.textContent).toContain("Restored generated fixture");
    expect(historical?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector('[data-testid="badge-viewer"]')?.getAttribute("data-source-url")).toBe(
      `blob:restored-historical-${legacyBlob.size}`,
    );

    const raw = await openDB(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION);
    const assets = await raw.getAll(STUDIO_ASSET_STORE);
    const preserved = (await raw.get(STUDIO_ASSET_STORE, legacySymbolicFixture.hash)) as {
      blob: Blob;
      byteLength: number;
      candidateIdentities: unknown[];
      createdAt: string;
      mimeType: string;
    };
    const draft = await raw.get(STUDIO_DRAFT_STORE, STUDIO_DRAFT_KEY);
    raw.close();
    expect(assets).toHaveLength(4);
    expect(new Uint8Array(await preserved.blob.arrayBuffer())).toEqual(
      new Uint8Array(await legacyBlob.arrayBuffer()),
    );
    expect(preserved).toMatchObject({
      byteLength: legacyBlob.size,
      createdAt: FIXED_TIME,
      mimeType: "image/webp",
    });
    expect(preserved.candidateIdentities).toEqual([
      generatedCandidateIdentity(legacySymbolicFixture.hash, legacySymbolicFixture.id),
    ]);
    expect(draft).toMatchObject({
      schemaVersion: 2,
      selectedAssetHash: legacySymbolicFixture.hash,
      selectedCandidateIdentity: generatedCandidateIdentity(
        legacySymbolicFixture.hash,
        legacySymbolicFixture.id,
      ),
    });
  });
});

async function fixtureBlob(path: string): Promise<Blob> {
  const bytes = await readFile(new URL(path, import.meta.url));
  return new Blob([new Uint8Array(bytes)], { type: "image/webp" });
}

async function waitFor(assertion: () => void, timeout = 3_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      assertion();
      return;
    } catch {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    }
  }
  assertion();
}
