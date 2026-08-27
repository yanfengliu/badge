import { createSeededArchiveState, type ArchiveState } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import {
  CATALOGUE_PACK_ID,
  cataloguePackBadges,
  cataloguePackRef,
  type CataloguePackBadgeFixture,
} from "@badge/catalogue-fixtures/catalogue-pack";
import type { SayingRequest } from "@badge/saying-contract";

import { defaultFixtureQuotation, formatFixtureQuotation } from "./fixture-quotations";

export const STARTER_OWNER_ID = "local-owner";
export const STARTER_RECORD_IDS = starterBadges.map((badge) => `starter:${badge.definitionId}`);

export function createStarterQuotationRequests(): Readonly<Record<string, SayingRequest>> {
  return Object.fromEntries([
    ...starterBadges.map((badge, index) => [
      STARTER_RECORD_IDS[index]!,
      {
        title: badge.title,
        criterion: badge.criterion,
        allowedQuotations: badge.historicalQuotations.map((quotation) => ({ ...quotation })),
      },
    ]),
    ...cataloguePackBadges.map((badge) => [
      badge.recordId,
      {
        title: badge.title,
        criterion: badge.criterion,
        allowedQuotations: badge.historicalQuotations.map((quotation) => ({ ...quotation })),
      },
    ]),
  ]);
}

function catalogueRecordSeed(badge: CataloguePackBadgeFixture) {
  return {
    recordId: badge.recordId,
    definitionRef: {
      namespace: "pack" as const,
      packId: CATALOGUE_PACK_ID,
      definitionId: badge.definitionId,
    },
    collectionRefs: [
      {
        namespace: "pack" as const,
        packId: CATALOGUE_PACK_ID,
        collectionId: badge.setId,
      },
    ],
    title: badge.title,
    criterion: badge.criterion,
    description: badge.description,
    lifecycle: "suggested" as const,
    publishedVisual: {
      packRef: cataloguePackRef,
      visualEditionId: badge.visualEditionId,
      sourceAssetHash: badge.sourceAssetHash,
      accessibleDescription: badge.accessibleDescription,
      renderRecipeVersion: badge.renderRecipe.version,
      renderRecipe: badge.renderRecipe,
    },
    acceptedSaying: formatFixtureQuotation(defaultFixtureQuotation(badge)),
    note: null,
    visibility: "inherit" as const,
    activation: null,
  };
}

export function createStarterArchiveState(): ArchiveState {
  return createSeededArchiveState({
    ownerId: STARTER_OWNER_ID,
    records: [
      ...starterBadges.map((badge, index) => ({
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
        acceptedSaying: formatFixtureQuotation(defaultFixtureQuotation(badge)),
        note: null,
        visibility: "inherit" as const,
        activation: null,
      })),
      ...cataloguePackBadges.map(catalogueRecordSeed),
    ],
  });
}
