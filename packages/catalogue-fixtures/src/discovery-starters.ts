import { starterBadges } from "./archive.js";
import { requireDiscoverySet } from "./discovery-sets.js";
import type { AvailableDiscoveryBadge } from "./discovery-types.js";

export const availableDiscoveryBadges: readonly AvailableDiscoveryBadge[] = starterBadges.map((badge) => {
  const set = requireDiscoverySet(badge.collectionId);
  return {
    discoveryId: badge.definitionId,
    availability: "available",
    title: badge.title,
    criterion: badge.criterion,
    accessibleDescription: badge.accessibleDescription,
    collectionLabel: set.title,
    description: badge.description,
    recordId: `starter:${badge.definitionId}`,
    previewUrl: badge.sourceUrl,
    setIds: [set.setId],
  };
});
