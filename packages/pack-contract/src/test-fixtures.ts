import type { CatalogueBadgePackManifest } from "./schema.js";

export const fixtureObjectBytes = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181,
  28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102, 0, 0,
  0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

export const fixtureObjectHash = "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460";

const fixtureThemeRef = {
  packId: "badge.fixture.field-theme",
  version: "1.0.0",
  packDigest: "b".repeat(64),
} as const;

export const catalogueManifestFixture: CatalogueBadgePackManifest = {
  schemaVersion: 1,
  kind: "catalogue",
  packId: "badge.fixture.yosemite",
  version: "1.0.0",
  minimumArchiveVersion: "0.1.0",
  dependencies: [fixtureThemeRef],
  objects: [
    {
      hash: fixtureObjectHash,
      mimeType: "image/png",
      byteLength: fixtureObjectBytes.byteLength,
      role: "source-art",
      width: 1,
      height: 1,
    },
  ],
  compatibility: { renderRecipeVersions: [1] },
  licenses: [{ id: "cc0-1.0", name: "CC0 1.0" }],
  provenance: { source: "curated", summary: "Deterministic contract fixture." },
  themePack: fixtureThemeRef,
  collections: [
    {
      collectionId: "national-parks",
      title: "U.S. National Parks",
      description: "A deterministic fixture collection.",
      definitionIds: ["visited-yosemite"],
    },
  ],
  entries: [
    {
      definition: {
        definitionId: "visited-yosemite",
        semanticRevision: 1,
        title: "Visited Yosemite",
        criterion: "Spend meaningful time in Yosemite National Park.",
        description: "A Yosemite fixture used to prove the pack boundary.",
        collectionIds: ["national-parks"],
      },
      visual: {
        visualEditionId: "yosemite-field-edition",
        version: "1.0.0",
        sourceArtHash: fixtureObjectHash,
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
        fallback: {
          frontTemplateId: "field-front-v1",
          edgeTemplateId: "field-edge-v1",
          backTemplateId: "field-back-v1",
        },
        accessibleDescription: "A Yosemite valley badge rendered as a substantial bronze artifact.",
      },
    },
  ],
};
