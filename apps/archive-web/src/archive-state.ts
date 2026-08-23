import { createSeededArchiveState, type ArchiveState } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";

export const STARTER_OWNER_ID = "local-owner";
export const STARTER_RECORD_IDS = starterBadges.map((badge) => `starter:${badge.definitionId}`);

export function createStarterArchiveState(): ArchiveState {
  return createSeededArchiveState({
    ownerId: STARTER_OWNER_ID,
    records: starterBadges.map((badge, index) => ({
      recordId: STARTER_RECORD_IDS[index],
      definitionRef: {
        namespace: "pack" as const,
        packId: badge.packRef.packId,
        definitionId: badge.definitionId,
      },
      collectionRefs: [
        {
          namespace: "pack" as const,
          packId: badge.packRef.packId,
          collectionId: badge.collectionId,
        },
      ],
      title: badge.title,
      criterion: badge.criterion,
      description: badge.description,
      lifecycle: badge.initialLifecycle,
      publishedVisual: {
        packRef: badge.packRef,
        visualEditionId: badge.visualEditionId,
        sourceAssetHash: badge.sourceAssetHash,
        accessibleDescription: badge.accessibleDescription,
        renderRecipeVersion: badge.renderRecipe.version,
        renderRecipe: badge.renderRecipe,
      },
      acceptedSaying: null,
      note: null,
      visibility: "inherit" as const,
      activation: null,
    })),
  });
}
