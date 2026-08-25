import { requireDiscoverySet } from "./discovery-sets.js";
import type { SourceStudyDiscoveryBadge } from "./discovery-types.js";

const nationalParksSet = requireDiscoverySet("us-national-parks");

export type SourceStudyDiscoveryRow = readonly [
  discoveryId: string,
  title: string,
  criterion: string,
  locationLabel: string,
  thumbnailFileName: string,
  accessibleDescription: string,
];

export function defineSourceStudyBadges(
  rows: readonly SourceStudyDiscoveryRow[],
): readonly SourceStudyDiscoveryBadge[] {
  return rows.map(
    ([discoveryId, title, criterion, locationLabel, thumbnailFileName, accessibleDescription]) => ({
      discoveryId,
      availability: "source-study",
      title,
      criterion,
      locationLabel,
      thumbnailFileName,
      accessibleDescription,
      setIds: [nationalParksSet.setId],
    }),
  );
}
