import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSeededArchiveState, type ArchiveState } from "@badge/archive-domain";
import type { StudioAdjustmentSubmission } from "@badge/studio-adjustment-contract";

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

function stateWith(shape: "circle" | "shield"): ArchiveState {
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
        lifecycle: "planned",
        publishedVisual,
        acceptedSaying: null,
        note: null,
        visibility: "inherit",
        adjustment:
          shape === "shield"
            ? {
                adjustedAt: "2026-09-02T10:00:00.000Z",
                appearance: { shape: "shield", material: null, borderColor: null, borderWidth: null },
                source: null,
                tags: [],
                collectionRefs: null,
              }
            : null,
        activation: null,
      },
    ],
  });
}

const instance = vi.hoisted(() => ({
  opened: null as { ok: boolean; state?: ArchiveState; error?: unknown } | null,
  openCalls: 0,
  stored: null as ArchiveState | null,
  announced: [] as ArchiveState[],
  adjusted: [] as unknown[],
}));

vi.mock("./archive-instance", () => ({
  archive: {
    state: () => Promise.resolve(instance.stored),
    visual: () => Promise.reject(new Error("not needed")),
    adjustBadge: (...args: unknown[]) => {
      instance.adjusted.push(args);
      instance.stored = stateWith("shield");
      return Promise.resolve(instance.stored);
    },
    updateQuotation: () => Promise.reject(new Error("not expected")),
  },
  readOpenedArchiveState: async () => {
    instance.openCalls += 1;
    // The archive only becomes readable once it has been opened; before that it holds nothing.
    if (!instance.opened?.ok) throw instance.opened?.error ?? new Error("unreadable");
    instance.stored ??= stateWith("circle");
    return instance.stored;
  },
  notifyArchiveStateChanged: (state: ArchiveState) => instance.announced.push(state),
}));

const { archiveStudioBridge } = await import("./studio-bridge-host");

const submission: StudioAdjustmentSubmission = {
  recordId: "starter:visited-yosemite",
  appearance: { shape: "shield", material: null, borderColor: null, borderWidth: null },
  ownImage: null,
  useCatalogueImage: false,
  tags: [],
  collectionKeys: ["pack:badge.catalogue.starter:us-national-parks"],
  quotationId: null,
};

beforeEach(() => {
  instance.opened = { ok: true };
  instance.openCalls = 0;
  instance.stored = null;
  instance.announced = [];
  instance.adjusted = [];
});

describe("the Archive's side of the Studio handoff", () => {
  it("opens the archive itself, because Studio can be the first thing the document shows", async () => {
    const target = await archiveStudioBridge.resolveTarget("starter:visited-yosemite");

    expect(instance.openCalls).toBe(1);
    expect(target?.title).toBe("Yosemite");
  });

  it("reports no badge rather than a broken one when the archive cannot be opened", async () => {
    instance.opened = { ok: false, error: new Error("unreadable") };
    expect(await archiveStudioBridge.resolveTarget("starter:visited-yosemite")).toBeNull();
    expect(await archiveStudioBridge.apply(submission)).toEqual({
      ok: false,
      message: "Your archive could not be opened, so nothing was saved. Reload Badge and try again.",
    });
    expect(instance.adjusted).toHaveLength(0);
  });

  it("announces the saved state so a visible Archive surface catches up", async () => {
    const result = await archiveStudioBridge.apply(submission);

    expect(result.ok).toBe(true);
    expect(instance.announced).toHaveLength(1);
    expect(instance.announced[0].records[0].adjustment?.appearance.shape).toBe("shield");
    // Bound: this covers only the visible surface. A hidden one hears nothing and instead
    // re-reads current state on being shown, which `App.remount.test.tsx` gates.
  });

  it("announces nothing when the badge is gone", async () => {
    instance.stored = createSeededArchiveState({ ownerId: "local-owner", records: [] });
    const result = await archiveStudioBridge.apply({ ...submission, recordId: "starter:missing" });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no longer in your archive; reopen it from Discover/u);
    expect(instance.announced).toHaveLength(0);
  });
});
