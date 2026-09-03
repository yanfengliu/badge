// @vitest-environment happy-dom

import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSeededArchiveState, type ArchiveState } from "@badge/archive-domain";

import { useResolvedVisuals } from "./use-resolved-visuals";

/**
 * The host hides the Archive surface when Badge Studio opens, which unmounts its effects while
 * keeping its state. A URL revoked on that teardown is one the preserved state still points at,
 * so the badge a memory dialog is showing goes blank and the renderer reports a load failure.
 *
 * Bound: this unmounts the probe outright, which runs the same effect cleanup that hiding does
 * but is a stronger teardown. It gates the cleanup's behaviour, not React's hiding semantics.
 */
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

function earnedState(): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "starter:visited-yosemite",
        definitionRef: {
          namespace: "pack",
          packId: "badge.catalogue.starter",
          definitionId: "visited-yosemite",
        },
        collectionRefs: [
          { namespace: "pack", packId: "badge.catalogue.starter", collectionId: "us-national-parks" },
        ],
        title: "Yosemite",
        criterion: "Visit Yosemite National Park",
        description: null,
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

const archive = {
  visual: () =>
    Promise.resolve({
      recordId: "starter:visited-yosemite",
      pin: publishedVisual,
      sourceAsset: {
        hash: publishedVisual.sourceAssetHash,
        mimeType: "image/png",
        bytes: new Uint8Array([1]),
      },
    }),
} as never;

let created: string[] = [];
let revoked: string[] = [];
let container: HTMLDivElement;
let root: Root;
const latest: { visuals: Record<string, { sourceUrl: string }> } = { visuals: {} };

function Probe({
  state,
  onVisuals,
}: {
  readonly state: ArchiveState | null;
  readonly onVisuals: (visuals: Record<string, { sourceUrl: string }>) => void;
}) {
  const { visuals } = useResolvedVisuals(archive, state);
  useEffect(() => onVisuals(visuals), [onVisuals, visuals]);
  return null;
}

function capture(visuals: Record<string, { sourceUrl: string }>): void {
  latest.visuals = visuals;
}

beforeEach(() => {
  created = [];
  revoked = [];
  latest.visuals = {};
  let next = 0;
  vi.stubGlobal("URL", {
    createObjectURL: () => {
      const url = `blob:visual-${(next += 1)}`;
      created.push(url);
      return url;
    },
    revokeObjectURL: (url: string) => revoked.push(url),
  });
  container = document.createElement("div");
  document.body.replaceChildren(container);
  root = createRoot(container);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolved visual URL lifetime", () => {
  it("keeps the URL the surface is still showing when its effects are torn down", async () => {
    await act(async () => root.render(<Probe state={earnedState()} onVisuals={capture} />));
    const shown = latest.visuals["starter:visited-yosemite"]?.sourceUrl;
    expect(shown).toBeDefined();
    expect(created).toContain(shown);

    // Badge Studio opens: this surface keeps its state and loses its effects.
    await act(async () => root.unmount());

    expect(revoked).not.toContain(shown);
  });

  it("releases a batch once a later one has replaced it", async () => {
    await act(async () => root.render(<Probe state={earnedState()} onVisuals={capture} />));
    const first = latest.visuals["starter:visited-yosemite"]?.sourceUrl;

    await act(async () => root.render(<Probe state={earnedState()} onVisuals={capture} />));
    const second = latest.visuals["starter:visited-yosemite"]?.sourceUrl;

    expect(second).not.toBe(first);
    expect(revoked).toContain(first);
    expect(revoked).not.toContain(second);
  });
});
