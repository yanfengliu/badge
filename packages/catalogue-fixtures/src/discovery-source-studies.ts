import { requireDiscoverySet } from "./discovery-sets.js";
import type { SourceStudyDiscoveryBadge } from "./discovery-types.js";

export type SourceStudyDiscoveryRow = readonly [
  discoveryId: string,
  title: string,
  criterion: string,
  locationLabel: string,
  thumbnailFileName: string,
  accessibleDescription: string,
  searchAliases?: readonly string[],
  referenceUrl?: string,
  visualEvidenceUrl?: string,
];

export function defineSourceStudyBadges(
  rows: readonly SourceStudyDiscoveryRow[],
  options: {
    readonly setId?: string;
    readonly assetDirectory?: string;
    readonly regionId?: string;
  } = {},
): readonly SourceStudyDiscoveryBadge[] {
  const set = requireDiscoverySet(options.setId ?? "us-national-parks");
  const assetDirectory = options.assetDirectory ?? "national-parks";
  return rows.map(
    ([
      discoveryId,
      title,
      criterion,
      locationLabel,
      thumbnailFileName,
      accessibleDescription,
      searchAliases,
      referenceUrl,
      visualEvidenceUrl,
    ]) => ({
      discoveryId,
      availability: "source-study",
      title,
      criterion,
      locationLabel,
      ...(options.regionId ? { regionId: options.regionId } : {}),
      ...(searchAliases ? { searchAliases } : {}),
      ...(referenceUrl ? { referenceUrl } : {}),
      ...(visualEvidenceUrl ? { visualEvidenceUrl } : {}),
      thumbnailKey: `${assetDirectory}/${thumbnailFileName}`,
      accessibleDescription,
      setIds: [set.setId],
    }),
  );
}
