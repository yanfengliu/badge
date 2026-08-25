import { readFile } from "node:fs/promises";

import { commonAchievementIdeas, usNationalParks } from "@badge/catalogue-authoring";
import { discoveryBadges, type DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";
import { describe, expect, it } from "vitest";

import { starterBadges } from "./archive.js";

const allowedFields = new Set([
  "accessibleDescription",
  "availability",
  "collectionLabel",
  "criterion",
  "description",
  "discoveryId",
  "locationLabel",
  "previewUrl",
  "recordId",
  "thumbnailFileName",
  "title",
]);

const forbiddenFields = new Set([
  "acceptedSaying",
  "activatedAt",
  "activation",
  "candidateKey",
  "candidateStyles",
  "candidates",
  "historicalQuotations",
  "note",
  "ownerId",
  "packRef",
  "prompt",
  "promptSha256",
  "provenance",
  "quotation",
  "renderRecipe",
  "selectedSource",
  "sourceAssetHash",
  "sourceUrl",
  "styleId",
  "suggestedStyleIds",
  "themeCues",
  "visibility",
]);

const starterCollectionLabels: Readonly<Record<string, string>> = {
  "books-read": "Books Read",
  "life-milestones": "Life Milestones",
  "us-national-parks": "U.S. National Parks",
};

const productionFiles = [
  "discovery.ts",
  "discovery-parks-a-g.ts",
  "discovery-parks-h-m.ts",
  "discovery-parks-n-z.ts",
  "discovery-source-studies.ts",
  "discovery-starters.ts",
  "discovery-types.ts",
] as const;

const publicProjection: readonly DiscoveryBadge[] = discoveryBadges;

describe("the Archive-safe discovery catalogue", () => {
  it("projects every created catalogue concept exactly once with truthful availability", () => {
    const expected = [
      ...starterBadges.map((badge) => ({
        discoveryId: badge.definitionId,
        availability: "available" as const,
        title: badge.title,
        criterion: badge.criterion,
        accessibleDescription: badge.accessibleDescription,
        collectionLabel: starterCollectionLabels[badge.collectionId],
        description: badge.description,
        recordId: `starter:${badge.definitionId}`,
        previewUrl: badge.sourceUrl,
      })),
      ...usNationalParks
        .filter((park) => park.definitionId !== "visited-yosemite")
        .map((park) => ({
          discoveryId: park.definitionId,
          availability: "source-study" as const,
          title: park.shortName,
          criterion: park.criterion,
          locationLabel: park.locationLabel,
          thumbnailFileName: park.selectedSource.thumbnail.fileName,
          accessibleDescription: park.selectedSource.accessibleDescription,
        })),
    ];

    expect(publicProjection).toEqual(expected);
    expect(discoveryBadges).toHaveLength(66);
    expect(new Set(discoveryBadges.map((badge) => badge.discoveryId))).toHaveProperty("size", 66);
    expect(discoveryBadges.filter((badge) => badge.availability === "available")).toHaveLength(4);
    expect(discoveryBadges.filter((badge) => badge.availability === "source-study")).toHaveLength(62);
    expect(
      discoveryBadges.some((badge) => commonAchievementIdeas.some((idea) => idea.id === badge.discoveryId)),
    ).toBe(false);
  });

  it("deduplicates Yosemite in favor of the available Archive record", () => {
    expect(discoveryBadges.filter((badge) => badge.discoveryId === "visited-yosemite")).toEqual([
      expect.objectContaining({
        availability: "available",
        recordId: "starter:visited-yosemite",
      }),
    ]);
  });

  it("keeps the projection closed, non-personal, and free of Studio authoring internals", () => {
    for (const badge of discoveryBadges) {
      const fields = Object.keys(badge);
      expect(
        fields.every((field) => allowedFields.has(field)),
        badge.discoveryId,
      ).toBe(true);
      expect(
        fields.some((field) => forbiddenFields.has(field)),
        badge.discoveryId,
      ).toBe(false);

      if (badge.availability === "available") {
        expect(badge).toHaveProperty("recordId");
        expect(badge).toHaveProperty("previewUrl");
      } else {
        expect(badge).not.toHaveProperty("recordId");
        expect(badge).not.toHaveProperty("previewUrl");
      }
    }
  });

  it("keeps catalogue-authoring out of every production discovery module", async () => {
    for (const fileName of productionFiles) {
      const source = await readFile(new URL(fileName, import.meta.url), "utf8");
      expect(source, fileName).not.toMatch(/catalogue-authoring/u);
    }
  });
});
