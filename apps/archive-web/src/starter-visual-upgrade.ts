import {
  catalogueVisualLineage,
  type ArchiveCatalogueVisualUpgradePlan,
  type CatalogueVisualLineage,
} from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";
import { canonicalJson } from "@badge/pack-contract";

const legacyPackRef = {
  packId: "badge.catalogue.starter",
  version: "1.0.0-alpha.3",
  packDigest: "5b7135a70477130907050a9921da342e927980838ee9b1ae03a4d41809c6ffe3",
} as const;

export const LEGACY_STARTER_VISUAL_LINEAGES = [
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
    description: "Granite, river, and wonder—kept as one honest memory.",
    publishedVisual: {
      packRef: legacyPackRef,
      visualEditionId: "visual.yosemite.literal.png.v1",
      sourceAssetHash: "21173941d3ad44ff0f245dcef0f1bbf2606b39163442afcc24777d442dda2ece",
      accessibleDescription: "An engraved Yosemite valley with El Capitan and a turquoise river.",
      renderRecipeVersion: 1,
      renderRecipe: {
        version: 1,
        shape: "circle",
        material: "metal",
        borderColor: "#8f806c",
        borderWidth: 0.075,
        thickness: 0.13,
        relief: 0.032,
        crop: { x: 0.5, y: 0.5, scale: 1.03 },
      },
    },
  },
  {
    recordId: "starter:read-sapiens",
    definitionRef: {
      namespace: "pack",
      packId: "badge.catalogue.starter",
      definitionId: "read-sapiens",
    },
    collectionRefs: [{ namespace: "pack", packId: "badge.catalogue.starter", collectionId: "books-read" }],
    title: "Read Sapiens",
    criterion: "Finish reading Sapiens",
    description: "A long view of the stories people build together.",
    publishedVisual: {
      packRef: legacyPackRef,
      visualEditionId: "visual.sapiens.journey.png.v1",
      sourceAssetHash: "296c08b967b50dfbefdb8c8187f48943c11b3d3976d4d724fd248be335431729",
      accessibleDescription: "Layered human silhouettes and paths flowing toward a distant horizon.",
      renderRecipeVersion: 1,
      renderRecipe: {
        version: 1,
        shape: "rectangle",
        material: "wool",
        borderColor: "#a65c3e",
        borderWidth: 0.055,
        thickness: 0.075,
        relief: 0.018,
        crop: { x: 0.5, y: 0.52, scale: 1.05 },
      },
    },
  },
  {
    recordId: "starter:finished-bachelors-degree",
    definitionRef: {
      namespace: "pack",
      packId: "badge.catalogue.starter",
      definitionId: "finished-bachelors-degree",
    },
    collectionRefs: [
      { namespace: "pack", packId: "badge.catalogue.starter", collectionId: "life-milestones" },
    ],
    title: "Bachelor's degree",
    criterion: "Complete a bachelor's degree",
    description: "Years of patient work resolving into an open threshold.",
    publishedVisual: {
      packRef: legacyPackRef,
      visualEditionId: "visual.degree.threshold.png.v1",
      sourceAssetHash: "2af87c6a64740642f85ae37bc702a206c8c817531acb9d5aaf44269c5369a737",
      accessibleDescription: "Ascending stone planes lead to a bright open doorway.",
      renderRecipeVersion: 1,
      renderRecipe: {
        version: 1,
        shape: "shield",
        material: "enamel",
        borderColor: "#b8aa8e",
        borderWidth: 0.065,
        thickness: 0.11,
        relief: 0.026,
        crop: { x: 0.5, y: 0.48, scale: 1.08 },
      },
    },
  },
  {
    recordId: "starter:visited-all-us-national-parks",
    definitionRef: {
      namespace: "pack",
      packId: "badge.catalogue.starter",
      definitionId: "visited-all-us-national-parks",
    },
    collectionRefs: [
      { namespace: "pack", packId: "badge.catalogue.starter", collectionId: "us-national-parks" },
    ],
    title: "Every national park",
    criterion: "Visit every park in the active U.S. National Parks catalogue",
    description: "A composite journey whose final picture was published before the last activation.",
    publishedVisual: {
      packRef: legacyPackRef,
      visualEditionId: "visual.all-parks.constellation.png.v1",
      sourceAssetHash: "0b2ec88a2ee72eb85de9525020bfdc419fada5f1dfc6a6ea381df3ff32fa3c6c",
      accessibleDescription:
        "Many American landscapes connected by one fine trail across a topographic field.",
      renderRecipeVersion: 1,
      renderRecipe: {
        version: 1,
        shape: "circle",
        material: "enamel",
        borderColor: "#6f6657",
        borderWidth: 0.09,
        thickness: 0.14,
        relief: 0.035,
        crop: { x: 0.5, y: 0.5, scale: 1.02 },
      },
    },
  },
] as const satisfies readonly CatalogueVisualLineage[];

export function createStarterVisualUpgradePlan(
  expectedState: ArchiveState,
): ArchiveCatalogueVisualUpgradePlan {
  const currentByRecordId = new Map(expectedState.records.map((record) => [record.recordId, record]));
  const upgrades = LEGACY_STARTER_VISUAL_LINEAGES.flatMap((from) => {
    const current = currentByRecordId.get(from.recordId);
    if (!current) {
      throw new Error(
        `Current starter catalogue is missing ${from.recordId}; keep the visual-upgrade plan aligned with the four starter records.`,
      );
    }
    const to = catalogueVisualLineage(current);
    return canonicalJson(from.publishedVisual) === canonicalJson(to.publishedVisual) ? [] : [{ from, to }];
  });
  return { upgrades };
}
