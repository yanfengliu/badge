import "fake-indexeddb/auto";

import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  createSeededArchiveState,
  effectiveTags,
  effectiveVisual,
  type ArchiveState,
  type BadgeAdjustmentInput,
  type PublishedVisual,
} from "@badge/archive-domain";

import {
  ArchiveApplication,
  ARCHIVE_DATABASE_NAME,
  IndexedDbArchiveRepository,
  parseArchiveBackup,
  reconcileCatalogueRecords,
  applyCatalogueVisualUpgradePlan,
  catalogueVisualLineage,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import { validJpegBytes, validJpegHash, validPngBytes, validPngHash } from "./image-fixtures.js";
import { historicalQuotationRequest, withAcceptedQuotation } from "./historical-quotation-fixtures.js";

const catalogueVisual: PublishedVisual = {
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

const catalogueAsset: ArchiveSourceAssetInput = {
  hash: validPngHash,
  mimeType: "image/png",
  bytes: validPngBytes,
};

const ownImage: ArchiveSourceAssetInput = {
  hash: validJpegHash,
  mimeType: "image/jpeg",
  bytes: validJpegBytes,
};

const emptyInput: BadgeAdjustmentInput = {
  appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
  source: null,
  tags: [],
  collectionRefs: null,
};

function seed(): ArchiveState {
  return withAcceptedQuotation(
    createSeededArchiveState({
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
          publishedVisual: catalogueVisual,
          acceptedSaying: null,
          note: null,
          visibility: "inherit",
          activation: null,
        },
      ],
    }),
  );
}

let repositories: IndexedDbArchiveRepository[] = [];

function application(): ArchiveApplication {
  const repository = new IndexedDbArchiveRepository({
    trustedQuotationRequests: { "record-yosemite": historicalQuotationRequest },
  });
  repositories.push(repository);
  return new ArchiveApplication(repository, { now: () => "2026-09-02T10:00:00.000Z" });
}

afterEach(async () => {
  for (const current of repositories) current.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("badge adjustment storage", () => {
  it("persists an adjustment across a reopened archive", async () => {
    const first = application();
    await first.initialize(seed(), [catalogueAsset]);
    await first.adjustBadge("record-yosemite", {
      ...emptyInput,
      appearance: { shape: "shield", material: "enamel", borderColor: null, borderWidth: 0.12 },
      tags: ["granite", "with dad"],
    });
    for (const current of repositories) current.close();

    const reopened = application();
    const state = await reopened.initialize(seed(), [catalogueAsset]);
    const record = state.records[0];
    expect(effectiveTags(record)).toEqual(["granite", "with dad"]);
    expect(effectiveVisual(record).renderRecipe.shape).toBe("shield");
    expect(effectiveVisual(record).renderRecipe.borderWidth).toBe(0.12);
    expect(record.publishedVisual).toEqual(catalogueVisual);
  });

  it("resolves the adjusted visual and the owner's own image bytes", async () => {
    const archive = application();
    await archive.initialize(seed(), [catalogueAsset]);
    await archive.adjustBadge(
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "square", material: null, borderColor: null, borderWidth: null },
        source: { sourceAssetHash: validJpegHash, accessibleDescription: "A picture I took myself." },
      },
      ownImage,
    );

    const resolved = await archive.visual("record-yosemite");
    expect(resolved.pin.sourceAssetHash).toBe(validJpegHash);
    expect(resolved.pin.renderRecipe.shape).toBe("square");
    expect(resolved.pin.accessibleDescription).toBe("A picture I took myself.");
    expect(resolved.sourceAsset.mimeType).toBe("image/jpeg");
  });

  it("refuses an adjustment that names bytes the archive does not hold, and names the fix", async () => {
    const archive = application();
    await archive.initialize(seed(), [catalogueAsset]);
    await expect(
      archive.adjustBadge("record-yosemite", {
        ...emptyInput,
        source: { sourceAssetHash: validJpegHash, accessibleDescription: "Not stored." },
      }),
    ).rejects.toThrow(/does not hold those bytes; choose the image again in Badge Studio/u);
    const state = await archive.state();
    expect(state.records[0].adjustment).toBeNull();
  });

  it("refuses image bytes that do not hash to the adjustment's declared source", async () => {
    const archive = application();
    await archive.initialize(seed(), [catalogueAsset]);
    await expect(
      archive.adjustBadge(
        "record-yosemite",
        {
          ...emptyInput,
          source: { sourceAssetHash: validJpegHash, accessibleDescription: "Mismatched." },
        },
        catalogueAsset,
      ),
    ).rejects.toThrow();
    expect((await archive.state()).records[0].adjustment).toBeNull();
  });

  it("carries the owner's own image into the backup even though the badge is not collected", async () => {
    const archive = application();
    await archive.initialize(seed(), [catalogueAsset]);
    await archive.adjustBadge(
      "record-yosemite",
      {
        ...emptyInput,
        source: { sourceAssetHash: validJpegHash, accessibleDescription: "A picture I took myself." },
      },
      ownImage,
    );

    const backup = await parseArchiveBackup(await archive.exportBackup());
    expect(backup.sourceAssets.map((asset) => asset.hash)).toEqual([validJpegHash]);
    expect(backup.state.records[0].adjustment?.source?.sourceAssetHash).toBe(validJpegHash);
  });

  it("keeps a catalogue-only archive's backup free of unearned catalogue art", async () => {
    const archive = application();
    await archive.initialize(seed(), [catalogueAsset]);
    const backup = await parseArchiveBackup(await archive.exportBackup());
    expect(backup.sourceAssets).toEqual([]);
  });

  // Bound: this restores into the same application that exported, so it exercises the export and
  // read-back path, not a second archive's monotonic policy or its missing-asset closure.
  it("restores an adjusted badge, its tags and its own image back over itself", async () => {
    const source = application();
    await source.initialize(seed(), [catalogueAsset]);
    await source.adjustBadge(
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "shield", material: null, borderColor: null, borderWidth: null },
        source: { sourceAssetHash: validJpegHash, accessibleDescription: "A picture I took myself." },
        tags: ["granite"],
        collectionRefs: [{ namespace: "local", collectionId: "road-trips" }],
      },
      ownImage,
    );
    const bytes = await source.exportBackup();
    const current = await source.state();

    const restored = await source.restoreBackup(bytes, current);
    const record = restored.records[0];
    expect(effectiveTags(record)).toEqual(["granite"]);
    expect(record.adjustment?.collectionRefs).toEqual([{ namespace: "local", collectionId: "road-trips" }]);
    expect((await source.visual("record-yosemite")).pin.sourceAssetHash).toBe(validJpegHash);
  });
});

describe("adjustments and catalogue updates", () => {
  it("survives a catalogue reseed that refreshes the shipped visual", () => {
    const stored = seed();
    const adjusted: ArchiveState = {
      ...stored,
      records: [
        {
          ...stored.records[0],
          adjustment: {
            adjustedAt: "2026-09-02T10:00:00.000Z",
            appearance: { shape: "shield", material: null, borderColor: null, borderWidth: null },
            source: null,
            tags: ["granite"],
            collectionRefs: null,
          },
        },
      ],
    };
    const refreshed: ArchiveState = {
      ...stored,
      records: [
        {
          ...stored.records[0],
          publishedVisual: { ...catalogueVisual, sourceAssetHash: validJpegHash },
        },
      ],
    };

    const result = reconcileCatalogueRecords(adjusted, refreshed);
    expect(result.reseededRecordIds).toEqual(["record-yosemite"]);
    const record = result.state.records[0];
    expect(record.publishedVisual.sourceAssetHash).toBe(validJpegHash);
    expect(effectiveTags(record)).toEqual(["granite"]);
    expect(effectiveVisual(record).renderRecipe.shape).toBe("shield");
  });

  it("survives a catalogue visual upgrade", () => {
    const stored = seed();
    const upgradedVisual = { ...catalogueVisual, sourceAssetHash: validJpegHash };
    const adjusted: ArchiveState = {
      ...stored,
      records: [
        {
          ...stored.records[0],
          adjustment: {
            adjustedAt: "2026-09-02T10:00:00.000Z",
            appearance: { shape: null, material: "wool", borderColor: null, borderWidth: null },
            source: null,
            tags: [],
            collectionRefs: null,
          },
        },
      ],
    };
    const applied = applyCatalogueVisualUpgradePlan(adjusted, {
      upgrades: [
        {
          from: catalogueVisualLineage(stored.records[0]),
          to: catalogueVisualLineage({ ...stored.records[0], publishedVisual: upgradedVisual }),
        },
      ],
    });
    const record = applied.state.records[0];
    expect(applied.upgradedRecordIds).toEqual(["record-yosemite"]);
    expect(record.publishedVisual.sourceAssetHash).toBe(validJpegHash);
    expect(effectiveVisual(record).renderRecipe.material).toBe("wool");
  });
});
