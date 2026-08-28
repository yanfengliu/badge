import { readFile } from "node:fs/promises";

import {
  commonAchievementIdeas,
  selectedBookStudies,
  selectedEducationMilestoneStudies,
  selectedMichelinDiningStudies,
  selectedUsStateStudies,
  selectedVideoGameStudies,
  usNationalParks,
} from "@badge/catalogue-authoring";
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
  "referenceUrl",
  "regionId",
  "searchAliases",
  "setIds",
  "thumbnailKey",
  "title",
  "visualEvidenceUrl",
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
  "discovery-books.ts",
  "discovery-education-milestones.ts",
  "discovery-michelin-dining-bay-area-01.ts",
  "discovery-michelin-dining-bay-area-02.ts",
  "discovery-michelin-dining-bay-area.ts",
  "discovery-michelin-dining-dc.ts",
  "discovery-michelin-dining-nyc.ts",
  "discovery-michelin-dining-nyc-01.ts",
  "discovery-michelin-dining-nyc-02.ts",
  "discovery-michelin-dining.ts",
  "discovery-sets.ts",
  "discovery-source-studies.ts",
  "discovery-starters.ts",
  "discovery-types.ts",
  "discovery-us-states.ts",
  "discovery-video-games-01.ts",
  "discovery-video-games-02.ts",
  "discovery-video-games.ts",
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
        setId: "video-games-played",
        title: "Video Games",
        description: "Video-game milestones remembered through original abstract badge art.",
      },
      {
        setId: "life-milestones",
        title: "Life Milestones",
        description: "Education and life chapters worth remembering.",
      },
      {
        setId: "michelin-dining",
        title: "Michelin Dining",
        description: "Named restaurant memories grounded in the live Michelin Guide.",
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
          recordId: `catalogue:${park.definitionId}`,
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
        recordId: `catalogue:${state.definitionId}`,
        title: state.title,
        criterion: state.criterion,
        locationLabel: state.contextLabel,
        searchAliases: state.aliases,
        thumbnailKey: `us-states/${state.selectedSource.thumbnail.fileName}`,
        accessibleDescription: state.selectedSource.accessibleDescription,
        setIds: ["us-states"],
      })),
      ...selectedBookStudies.map((book) => ({
        discoveryId: book.definitionId,
        availability: "source-study" as const,
        recordId: `catalogue:${book.definitionId}`,
        title: book.title,
        criterion: book.criterion,
        locationLabel: book.contextLabel,
        searchAliases: book.aliases,
        thumbnailKey: `books-read/${book.selectedSource.thumbnail.fileName}`,
        accessibleDescription: book.selectedSource.accessibleDescription,
        setIds: ["books-read"],
      })),
      ...selectedVideoGameStudies.map((game) => ({
        discoveryId: game.definitionId,
        availability: "source-study" as const,
        recordId: `catalogue:${game.definitionId}`,
        title: game.title,
        criterion: game.criterion,
        locationLabel: game.contextLabel,
        searchAliases: game.aliases,
        thumbnailKey: `video-games/${game.selectedSource.thumbnail.fileName}`,
        accessibleDescription: game.selectedSource.accessibleDescription,
        setIds: ["video-games-played"],
      })),
      ...selectedEducationMilestoneStudies.map((milestone) => ({
        discoveryId: milestone.definitionId,
        availability: "source-study" as const,
        recordId: `catalogue:${milestone.definitionId}`,
        title: milestone.title,
        criterion: milestone.criterion,
        locationLabel: milestone.contextLabel,
        searchAliases: milestone.aliases,
        thumbnailKey: `life-milestones/${milestone.selectedSource.thumbnail.fileName}`,
        accessibleDescription: milestone.selectedSource.accessibleDescription,
        setIds: ["life-milestones"],
      })),
      ...selectedMichelinDiningStudies.map((milestone) => ({
        discoveryId: milestone.definitionId,
        availability: "source-study" as const,
        recordId: `catalogue:${milestone.definitionId}`,
        title: milestone.title,
        criterion: milestone.criterion,
        locationLabel: milestone.contextLabel,
        regionId: milestone.restaurant.regionId,
        searchAliases: milestone.aliases,
        referenceUrl: milestone.restaurant.guideUrl,
        ...visualEvidenceProjection(milestone.restaurant),
        thumbnailKey: `michelin-dining/${milestone.selectedSource.thumbnail.fileName}`,
        accessibleDescription: milestone.selectedSource.accessibleDescription,
        setIds: ["michelin-dining"],
      })),
    ];

    expect(publicProjection).toEqual(expected);
    expect(discoveryBadges).toHaveLength(350);
    expect(new Set(discoveryBadges.map((badge) => badge.discoveryId))).toHaveProperty("size", 350);
    expect(discoveryBadges.filter((badge) => badge.availability === "available")).toHaveLength(4);
    expect(discoveryBadges.filter((badge) => badge.availability === "source-study")).toHaveLength(346);
    expect(
      discoveryBadges.some((badge) => commonAchievementIdeas.some((idea) => idea.id === badge.discoveryId)),
    ).toBe(false);
  });

  it("keeps official listings separate from distinct reviewed visual-evidence sources", () => {
    const cafeBoulud = discoveryBadges.find((badge) => badge.discoveryId === "michelin-dining-cafe-boulud");
    expect(cafeBoulud?.availability).toBe("source-study");
    if (cafeBoulud?.availability !== "source-study") return;
    expect(cafeBoulud.referenceUrl).toBe(
      "https://guide.michelin.com/en/new-york-state/new-york/restaurant/cafe-boulud",
    );
    expect(cafeBoulud.visualEvidenceUrl).toBe("https://www.cafeboulud.com/nyc/our-menu/dinner/");
    expect(cafeBoulud.visualEvidenceUrl).not.toBe(cafeBoulud.referenceUrl);
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
      "books-read": 51,
      "video-games-played": 50,
      "life-milestones": 3,
      "michelin-dining": 132,
    });

    expect(
      Object.fromEntries(
        ["bay-area", "new-york-city", "washington-dc"].map((regionId) => [
          regionId,
          discoveryBadges.filter(
            (badge) =>
              badge.availability === "source-study" &&
              badge.setIds.includes("michelin-dining") &&
              badge.regionId === regionId,
          ).length,
        ]),
      ),
    ).toEqual({ "bay-area": 41, "new-york-city": 69, "washington-dc": 22 });
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

      expect(badge).toHaveProperty("recordId");
      if (badge.availability === "available") {
        expect(badge).toHaveProperty("previewUrl");
      } else {
        expect(badge.recordId).toBe(`catalogue:${badge.discoveryId}`);
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

function visualEvidenceProjection(restaurant: {
  readonly guideUrl: string;
  readonly evidenceSourceUrls: readonly string[];
}): { readonly visualEvidenceUrl: string } | Record<string, never> {
  const visualEvidenceUrl = restaurant.evidenceSourceUrls.find(
    (url) => new URL(url).hostname !== "guide.michelin.com",
  );
  return visualEvidenceUrl ? { visualEvidenceUrl } : {};
}
