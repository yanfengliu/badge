import { archiveStateSchema, type ArchiveRecord } from "@badge/archive-domain";
import { describe, expect, it } from "vitest";

import { assertMonotonicArchiveRestore } from "../src/restore-policy.js";

const originalRecord: ArchiveRecord = archiveStateSchema.parse({
  schemaVersion: 1,
  ownerId: "local-owner",
  records: [
    {
      recordId: "record-yosemite",
      definitionRef: {
        namespace: "pack",
        packId: "badge.catalogue.parks",
        definitionId: "visited-yosemite",
      },
      collectionRefs: [
        {
          namespace: "pack",
          packId: "badge.catalogue.parks",
          collectionId: "national-parks",
        },
      ],
      title: "Visited Yosemite",
      criterion: "Visit Yosemite honestly.",
      description: null,
      lifecycle: "planned",
      publishedVisual: {
        packRef: {
          packId: "badge.catalogue.parks",
          version: "1.0.0",
          packDigest: "a".repeat(64),
        },
        visualEditionId: "yosemite-v1",
        sourceAssetHash: "b".repeat(64),
        accessibleDescription: "Yosemite valley in metal.",
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
      },
      acceptedSaying: null,
      note: null,
      visibility: "inherit",
      activation: null,
    },
  ],
}).records[0];

if (!originalRecord) throw new Error("restore-policy fixture must contain a record");

describe("monotonic restore identity", () => {
  it("allows an earned historical snapshot to drift within the same definition and pack lineage", () => {
    const historicalVisual = {
      ...originalRecord.publishedVisual,
      packRef: {
        ...originalRecord.publishedVisual.packRef,
        version: "2.0.0",
        packDigest: "c".repeat(64),
      },
      visualEditionId: "yosemite-v2",
      sourceAssetHash: "d".repeat(64),
      accessibleDescription: "A later Yosemite edition in darkened bronze.",
    };
    const incoming = archiveStateSchema.parse({
      schemaVersion: 1,
      ownerId: "local-owner",
      records: [
        {
          ...originalRecord,
          title: "Yosemite, remembered",
          criterion: "Stand beneath Yosemite's granite walls.",
          description: "Historical wording pinned when this memory was activated.",
          lifecycle: "earned",
          publishedVisual: historicalVisual,
          activation: {
            occurredStart: "2026-06-12",
            occurredEnd: "2026-06-14",
            recordedAt: "2026-08-23T17:00:00.000Z",
            activatedAt: "2026-08-23T17:00:00.000Z",
            visualPin: historicalVisual,
          },
        },
      ],
    });
    const current = archiveStateSchema.parse({
      schemaVersion: 1,
      ownerId: "local-owner",
      records: [originalRecord],
    });

    expect(() => assertMonotonicArchiveRestore(current, incoming)).not.toThrow();
  });
});
