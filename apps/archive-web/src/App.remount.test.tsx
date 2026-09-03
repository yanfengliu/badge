// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSeededArchiveState, type ArchiveState } from "@badge/archive-domain";

import { STARTER_RECORD_IDS } from "./archive-state";

/**
 * The host hides the Archive surface while Badge Studio is open and remounts it on the way back,
 * so this surface's first read is not a one-time startup event — it happens again every round
 * trip. If it read a snapshot taken when the archive was opened, a badge Studio had just changed
 * would come back looking exactly as it was before the change.
 */
const world = vi.hoisted(() => ({
  stored: null as ArchiveState | null,
  opened: { ok: true } as { ok: boolean; error?: unknown },
  stateReads: 0,
}));

vi.mock("./archive-instance", () => ({
  archive: {
    state: () => {
      world.stateReads += 1;
      return Promise.resolve(world.stored);
    },
    visual: () => Promise.reject(new Error("no visual in this test")),
  },
  readOpenedArchiveState: async () => {
    if (!world.opened.ok) throw world.opened.error;
    world.stateReads += 1;
    return world.stored;
  },
  observeArchiveStateChanges: () => () => undefined,
  starterSourceAssets: new Map(),
  starterState: null,
}));

vi.mock("./use-resolved-visuals", () => ({
  useResolvedVisuals: () => ({ visuals: {}, error: null }),
  sourceUrlsForResolvedVisuals: () => ({}),
}));

import { App } from "./App";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const publishedVisual = {
  packRef: { packId: "badge.catalogue.starter", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: "b".repeat(64),
  accessibleDescription: "A crafted Yosemite badge.",
  renderRecipeVersion: 1,
  renderRecipe: {
    version: 1 as const,
    shape: "circle" as const,
    material: "metal" as const,
    borderColor: "#b87333",
    borderWidth: 0.08,
    thickness: 0.1,
    relief: 0.03,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};

function stateWithTitle(title: string): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: STARTER_RECORD_IDS[0],
        definitionRef: {
          namespace: "pack",
          packId: "badge.catalogue.starter",
          definitionId: "visited-yosemite",
        },
        collectionRefs: [
          { namespace: "pack", packId: "badge.catalogue.starter", collectionId: "us-national-parks" },
        ],
        title,
        criterion: "Visit Yosemite National Park",
        description: null,
        // Collected, because the Collection surface this test mounts renders earned records.
        lifecycle: "earned",
        publishedVisual,
        acceptedSaying: "“The mountains are calling.” — John Muir, Letter, 1873",
        note: null,
        visibility: "inherit",
        activation: {
          occurredStart: "2026-05-01",
          occurredEnd: "2026-05-01",
          recordedAt: "2026-05-02T00:00:00.000Z",
          activatedAt: "2026-05-02T00:00:00.000Z",
          visualPin: publishedVisual,
        },
      },
    ],
  });
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  world.stored = stateWithTitle("Yosemite");
  world.opened = { ok: true };
  world.stateReads = 0;
  window.history.replaceState(null, "", "/");
  container = document.createElement("div");
  document.body.replaceChildren(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
});

async function mount() {
  await act(async () => root.render(<App onShowStudio={() => undefined} />));
}

describe("Archive surface state on mount", () => {
  it("reads current state, not the snapshot taken when the archive opened", async () => {
    await mount();
    expect(container.textContent).toContain("Yosemite");
    const readsAfterFirstMount = world.stateReads;

    // Badge Studio saved while this surface was hidden and running no effects.
    world.stored = stateWithTitle("Yosemite, adjusted");
    await act(async () => root.unmount());
    root = createRoot(container);
    await mount();

    expect(world.stateReads).toBeGreaterThan(readsAfterFirstMount);
    expect(container.textContent).toContain("Yosemite, adjusted");
  });

  it("reports an unreadable archive instead of showing an empty one", async () => {
    world.opened = { ok: false, error: new Error("Local storage is unavailable.") };
    await mount();

    expect(container.textContent).toContain("Local storage is unavailable.");
  });
});
