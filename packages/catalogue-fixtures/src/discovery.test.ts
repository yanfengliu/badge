import { readFile } from "node:fs/promises";

import { commonAchievementIdeas, selectedUsStateStudies, usNationalParks } from "@badge/catalogue-authoring";
import { discoveryBadges, discoverySets, type DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";
import { describe, expect, it } from "vitest";

import { STARTER_PACK_ID, starterBadges } from "./archive.js";

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
  "searchAliases",
  "setIds",
  "thumbnailKey",
  "title",
]);

const forbiddenFields = new Set([
  "acceptedSaying",
  "activatedAt",
  "activation",
  "candidateKey",
  "candidateStyles",
  "candidates",
  "collectionRefs",
  "definitionRef",
  "historicalQuotations",
  "note",
  "ownerId",
  "packId",
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
  "discovery-sets.ts",
  "discovery-source-studies.ts",
  "discovery-starters.ts",
  "discovery-types.ts",
  "discovery-us-states.ts",
] as const;

const publicProjection: readonly DiscoveryBadge[] = discoveryBadges;

describe("the Archive-safe discovery catalogue", () => {
  it("defines the exact closed display-only set registry", () => {
    expect(discoverySets).toEqual([
      {
        setId: "us-national-parks",
        title: "U.S. National Parks",
        description: "Individual parks and the larger journey across the national park catalogue.",
      },
      {
        setId: "us-states",
        title: "U.S. States",
        description: "A visual field record for visiting every one of the fifty states.",
      },
      {
        setId: "books-read",
        title: "Books Read",
        description: "Finished books kept as cultural memories.",
      },
      {
        setId: "life-milestones",
        title: "Life Milestones",
        description: "Education and life chapters worth remembering.",
      },
    ]);
    for (const set of discoverySets) {
      expect(Object.keys(set).sort()).toEqual(["description", "setId", "title"]);
    }
    expect(new Set(starterBadges.map((badge) => badge.packRef.packId))).toEqual(new Set([STARTER_PACK_ID]));
  });

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
        setIds: [badge.collectionId],
      })),
      ...usNationalParks
        .filter((park) => park.definitionId !== "visited-yosemite")
        .map((park) => ({
          discoveryId: park.definitionId,
          availability: "source-study" as const,
          title: park.shortName,
          criterion: park.criterion,
          locationLabel: park.locationLabel,
          thumbnailKey: `national-parks/${park.selectedSource.thumbnail.fileName}`,
          accessibleDescription: park.selectedSource.accessibleDescription,
          setIds: ["us-national-parks"],
        })),
      ...selectedUsStateStudies.map((state) => ({
        discoveryId: state.definitionId,
        availability: "source-study" as const,
        title: state.title,
        criterion: state.criterion,
        locationLabel: state.contextLabel,
        searchAliases: state.aliases,
        thumbnailKey: `us-states/${state.selectedSource.thumbnail.fileName}`,
        accessibleDescription: state.selectedSource.accessibleDescription,
        setIds: ["us-states"],
      })),
    ];

    expect(publicProjection).toEqual(expected);
    expect(discoveryBadges).toHaveLength(116);
    expect(new Set(discoveryBadges.map((badge) => badge.discoveryId))).toHaveProperty("size", 116);
    expect(discoveryBadges.filter((badge) => badge.availability === "available")).toHaveLength(4);
    expect(discoveryBadges.filter((badge) => badge.availability === "source-study")).toHaveLength(112);
    expect(
      discoveryBadges.some((badge) => commonAchievementIdeas.some((idea) => idea.id === badge.discoveryId)),
    ).toBe(false);
  });

  it("assigns every entry to known sets with exact catalogue cardinalities", () => {
    const knownSetIds = new Set<string>(discoverySets.map((set) => set.setId));
    for (const badge of discoveryBadges) {
      expect(badge.setIds.length, badge.discoveryId).toBeGreaterThan(0);
      expect(new Set(badge.setIds).size, badge.discoveryId).toBe(badge.setIds.length);
      expect(
        badge.setIds.every((setId) => knownSetIds.has(setId)),
        badge.discoveryId,
      ).toBe(true);
    }

    expect(
      Object.fromEntries(
        discoverySets.map((set) => [
          set.setId,
          discoveryBadges.filter((badge) => badge.setIds.includes(set.setId)).length,
        ]),
      ),
    ).toEqual({
      "us-national-parks": 64,
      "us-states": 50,
      "books-read": 1,
      "life-milestones": 1,
    });
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
