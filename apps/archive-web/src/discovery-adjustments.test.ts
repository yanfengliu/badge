import { describe, expect, it } from "vitest";

import { createSeededArchiveState, type ArchiveRecord, type ArchiveState } from "@badge/archive-domain";
import type { DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

import { applyDiscoveryAdjustments, discoveryAdjustmentsFor } from "./discovery-adjustments";
import { filterDiscoveryBadges } from "./discovery-filter";

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

const badges: readonly DiscoveryBadge[] = [
  {
    availability: "available",
    discoveryId: "yosemite",
    recordId: "starter:visited-yosemite",
    title: "Yosemite",
    criterion: "Visit Yosemite National Park",
    setIds: ["us-national-parks"],
    previewUrl: "/yosemite.png",
    accessibleDescription: "A crafted Yosemite badge.",
    collectionLabel: "U.S. National Parks",
    description: "Granite, river, and wonder.",
  },
  {
    availability: "available",
    discoveryId: "acadia",
    recordId: "catalogue:acadia",
    title: "Acadia",
    criterion: "Visit Acadia National Park",
    setIds: ["us-national-parks"],
    previewUrl: "/acadia.png",
    accessibleDescription: "A crafted Acadia badge.",
    collectionLabel: "U.S. National Parks",
    description: "Granite coast and spruce.",
  },
];

function seed(adjustment: ArchiveRecord["adjustment"]): ArchiveState {
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
        adjustment,
        activation: null,
      },
    ],
  });
}

describe("Discover follows the owner's adjustments", () => {
  it("changes nothing when no badge is adjusted", () => {
    const adjustments = discoveryAdjustmentsFor(seed(null));
    expect(adjustments.setIdsByRecordId.size).toBe(0);
    expect(applyDiscoveryAdjustments(badges, adjustments)).toBe(badges);
  });

  it("moves a badge onto the shelf the owner chose and off the one they left", () => {
    const adjustments = discoveryAdjustmentsFor(
      seed({
        adjustedAt: "2026-09-02T10:00:00.000Z",
        appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
        source: null,
        tags: [],
        collectionRefs: [
          { namespace: "pack", packId: "badge.catalogue.discovery", collectionId: "books-read" },
        ],
      }),
    );
    const adjusted = applyDiscoveryAdjustments(badges, adjustments);

    expect(filterDiscoveryBadges(adjusted, "", "books-read").map((badge) => badge.recordId)).toEqual([
      "starter:visited-yosemite",
    ]);
    expect(filterDiscoveryBadges(adjusted, "", "us-national-parks").map((badge) => badge.recordId)).toEqual([
      "catalogue:acadia",
    ]);
  });

  it("finds a badge by a tag the owner wrote, and only that badge", () => {
    const adjustments = discoveryAdjustmentsFor(
      seed({
        adjustedAt: "2026-09-02T10:00:00.000Z",
        appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
        source: null,
        tags: ["with dad"],
        collectionRefs: null,
      }),
    );

    expect(
      filterDiscoveryBadges(badges, "with dad", null, null, adjustments.tagsByRecordId).map(
        (badge) => badge.recordId,
      ),
    ).toEqual(["starter:visited-yosemite"]);
    // The catalogue word "granite" is in both descriptions; a tag must not narrow that away.
    expect(filterDiscoveryBadges(badges, "granite", null, null, adjustments.tagsByRecordId)).toHaveLength(2);
    expect(filterDiscoveryBadges(badges, "with dad", null)).toHaveLength(0);
  });
});
