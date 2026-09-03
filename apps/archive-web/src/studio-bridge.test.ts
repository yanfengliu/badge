import { describe, expect, it } from "vitest";

import { createSeededArchiveState, type ArchiveRecord, type ArchiveState } from "@badge/archive-domain";
import { studioBadgeTargetSchema, type StudioAdjustmentSubmission } from "@badge/studio-adjustment-contract";

import {
  adjustmentInputFor,
  applyStudioSubmission,
  buildStudioTarget,
  studioCollectionOptions,
} from "./studio-bridge";
import type { PublishedFixtureView } from "./published-fixtures";

const publishedVisual = {
  packRef: { packId: "badge.catalogue.starter", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: "b".repeat(64),
  accessibleDescription: "A crafted Yosemite badge.",
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
} as const;

const quotation = {
  id: "john-muir-yosemite-temple-1868",
  text: "It is by far the grandest of all the special temples of Nature I was ever permitted to enter.",
  person: "John Muir",
  sourceTitle: "Letters to a Friend, July 26, 1868",
  sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
} as const;

const fixture: PublishedFixtureView = {
  recordId: "starter:visited-yosemite",
  title: "Yosemite",
  sourceUrl: "/yosemite.png",
  sourceMimeType: "image/png",
  sourceAssetHash: publishedVisual.sourceAssetHash,
  defaultQuotationId: quotation.id,
  historicalQuotations: [quotation],
};

function seed(overrides: Partial<ArchiveRecord> = {}): ArchiveState {
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
        description: "Granite, river, and wonder.",
        lifecycle: "planned",
        publishedVisual,
        acceptedSaying: null,
        note: "A private note nobody outside the archive should see.",
        visibility: "private",
        activation: null,
        ...overrides,
      },
    ],
  });
}

function recordOf(state: ArchiveState): ArchiveRecord {
  return state.records[0];
}

const emptySubmission: StudioAdjustmentSubmission = {
  recordId: "starter:visited-yosemite",
  appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
  ownImage: null,
  useCatalogueImage: false,
  tags: [],
  collectionKeys: ["pack:badge.catalogue.starter:us-national-parks"],
  quotationId: null,
};

describe("Studio badge projection", () => {
  it("hands Studio exactly the contract's fields and nothing personal", () => {
    const target = buildStudioTarget({
      record: recordOf(seed()),
      fixture,
      sourceUrl: "/yosemite.png",
    });

    expect(target).not.toBeNull();
    // The strict schema bounds the key set; these check the values behind it. A collection key
    // does carry its pack id — it is an opaque handle Studio returns unread, and the pack a
    // catalogue set belongs to is release metadata, not something about the owner.
    expect(studioBadgeTargetSchema.parse(target)).toEqual(target);
    const serialized = JSON.stringify(target);
    for (const personal of [
      "A private note nobody outside the archive should see.",
      "private",
      publishedVisual.packRef.packDigest,
      publishedVisual.packRef.version,
      "2026-05-01",
      "2026-05-02T00:00:00.000Z",
    ]) {
      expect(serialized).not.toContain(personal);
    }
  });

  it("keeps a collected badge's dates, note and visibility out of the projection", () => {
    // The uncollected fixture has no dates to leak, so the check that matters runs here.
    const target = buildStudioTarget({
      record: recordOf(
        seed({
          lifecycle: "earned",
          note: "A private note nobody outside the archive should see.",
          visibility: "private",
          acceptedSaying: null,
          activation: {
            occurredStart: "2026-05-01",
            occurredEnd: "2026-05-03",
            recordedAt: "2026-05-04T00:00:00.000Z",
            activatedAt: "2026-05-04T00:00:00.000Z",
            visualPin: publishedVisual,
          },
        }),
      ),
      fixture,
      sourceUrl: "/yosemite.png",
    });

    expect(target?.collected).toBe(true);
    const serialized = JSON.stringify(target);
    for (const personal of [
      "A private note nobody outside the archive should see.",
      "private",
      "2026-05-01",
      "2026-05-03",
      "2026-05-04T00:00:00.000Z",
      publishedVisual.packRef.packDigest,
      publishedVisual.packRef.version,
    ]) {
      expect(serialized).not.toContain(personal);
    }
  });

  it("offers each collection once even when two packs ship the same set", () => {
    const options = studioCollectionOptions(recordOf(seed()));
    const parks = options.filter((option) => option.label === "U.S. National Parks");

    expect(parks).toHaveLength(1);
    expect(parks[0].fromCatalogue).toBe(true);
    expect(new Set(options.map((option) => option.key)).size).toBe(options.length);
    expect(new Set(options.map((option) => option.label)).size).toBe(options.length);
  });

  it("marks a collected badge so Studio can seal its face", () => {
    const target = buildStudioTarget({
      record: recordOf(
        seed({
          lifecycle: "earned",
          acceptedSaying: null,
          activation: {
            occurredStart: "2026-05-01",
            occurredEnd: "2026-05-01",
            recordedAt: "2026-05-02T00:00:00.000Z",
            activatedAt: "2026-05-02T00:00:00.000Z",
            visualPin: publishedVisual,
          },
        }),
      ),
      fixture,
      sourceUrl: "/yosemite.png",
    });

    expect(target?.collected).toBe(true);
  });

  it("returns null rather than a half-built target when no image resolves", () => {
    expect(buildStudioTarget({ record: recordOf(seed()), fixture: undefined, sourceUrl: null })).toBeNull();
  });
});

describe("Studio submission mapping", () => {
  it("keeps the catalogue's own collections as no overlay at all", () => {
    expect(adjustmentInputFor(recordOf(seed()), emptySubmission).collectionRefs).toBeNull();
  });

  it("maps chosen collection keys back to their refs", () => {
    const input = adjustmentInputFor(recordOf(seed()), {
      ...emptySubmission,
      collectionKeys: [
        "pack:badge.catalogue.starter:us-national-parks",
        "pack:badge.catalogue.discovery:books-read",
      ],
    });

    expect(input.collectionRefs).toEqual([
      { namespace: "pack", packId: "badge.catalogue.starter", collectionId: "us-national-parks" },
      { namespace: "pack", packId: "badge.catalogue.discovery", collectionId: "books-read" },
    ]);
  });

  it("refuses a collection key that was never offered and says how to recover", () => {
    expect(() =>
      adjustmentInputFor(recordOf(seed()), {
        ...emptySubmission,
        collectionKeys: ["pack:elsewhere:made-up"],
      }),
    ).toThrow(/is not one of the collections offered for Yosemite; reopen the badge/u);
  });

  it("keeps an existing own image when the owner changed nothing about the picture", () => {
    const state = seed({
      adjustment: {
        adjustedAt: "2026-09-02T10:00:00.000Z",
        appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
        source: { sourceAssetHash: "c".repeat(64), accessibleDescription: "Mine." },
        tags: [],
        collectionRefs: null,
      },
    });

    expect(adjustmentInputFor(recordOf(state), emptySubmission).source).toEqual({
      sourceAssetHash: "c".repeat(64),
      accessibleDescription: "Mine.",
    });
    expect(
      adjustmentInputFor(recordOf(state), { ...emptySubmission, useCatalogueImage: true }).source,
    ).toBeNull();
  });
});

describe("applying a Studio submission", () => {
  it("reports the badge unchanged when the adjustment could not be stored", async () => {
    const outcome = await applyStudioSubmission(
      {
        adjustBadge: () => Promise.reject(new Error("Local storage is unavailable.")),
        updateQuotation: () => Promise.reject(new Error("must not be called")),
      } as never,
      recordOf(seed()),
      fixture,
      emptySubmission,
    );

    expect(outcome.state).toBeNull();
    expect(outcome.result.ok).toBe(false);
    expect(outcome.result.message).toBe("Yosemite was not changed. Local storage is unavailable.");
  });

  it("says the badge was adjusted but the quote was not when only the quote fails", async () => {
    const state = seed();
    const outcome = await applyStudioSubmission(
      {
        adjustBadge: () => Promise.resolve(state),
        updateQuotation: () => Promise.reject(new Error("That wording is already on another badge.")),
      } as never,
      recordOf(state),
      fixture,
      { ...emptySubmission, quotationId: quotation.id },
    );

    expect(outcome.state).toBe(state);
    expect(outcome.result.ok).toBe(false);
    expect(outcome.result.message).toMatch(/adjusted, but its quote was not changed/u);
  });

  it("never changes a collected badge's quote", async () => {
    const state = seed({
      lifecycle: "earned",
      acceptedSaying: null,
      activation: {
        occurredStart: "2026-05-01",
        occurredEnd: "2026-05-01",
        recordedAt: "2026-05-02T00:00:00.000Z",
        activatedAt: "2026-05-02T00:00:00.000Z",
        visualPin: publishedVisual,
      },
    });
    let quotationCalls = 0;
    const outcome = await applyStudioSubmission(
      {
        adjustBadge: () => Promise.resolve(state),
        updateQuotation: () => {
          quotationCalls += 1;
          return Promise.resolve(state);
        },
      } as never,
      recordOf(state),
      fixture,
      { ...emptySubmission, quotationId: quotation.id },
    );

    expect(quotationCalls).toBe(0);
    expect(outcome.result.ok).toBe(true);
    expect(outcome.result.message).not.toContain("a new quote");
  });
});
