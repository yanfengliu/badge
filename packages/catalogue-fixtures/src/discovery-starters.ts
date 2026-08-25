import { starterBadges } from "./archive.js";
import type { AvailableDiscoveryBadge } from "./discovery-types.js";

const collectionLabels: Readonly<Record<string, string>> = {
  "books-read": "Books Read",
  "life-milestones": "Life Milestones",
  "us-national-parks": "U.S. National Parks",
};

export const availableDiscoveryBadges: readonly AvailableDiscoveryBadge[] = starterBadges.map((badge) => {
  const collectionLabel = collectionLabels[badge.collectionId];
  if (!collectionLabel) {
    throw new Error(
      `Starter discovery badge ${badge.definitionId} has unknown collection ${badge.collectionId}.`,
    );
  }
  return {
    discoveryId: badge.definitionId,
    availability: "available",
    title: badge.title,
    criterion: badge.criterion,
    accessibleDescription: badge.accessibleDescription,
    collectionLabel,
    description: badge.description,
    recordId: `starter:${badge.definitionId}`,
    previewUrl: badge.sourceUrl,
  };
});
