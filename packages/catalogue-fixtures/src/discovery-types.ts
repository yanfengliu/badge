interface DiscoveryBadgeBase {
  readonly discoveryId: string;
  readonly title: string;
  readonly criterion: string;
  readonly setIds: readonly string[];
}

export interface AvailableDiscoveryBadge extends DiscoveryBadgeBase {
  readonly availability: "available";
  readonly recordId: string;
  readonly previewUrl: string;
  readonly accessibleDescription: string;
  readonly collectionLabel: string;
  readonly description: string;
}

export interface SourceStudyDiscoveryBadge extends DiscoveryBadgeBase {
  readonly availability: "source-study";
  readonly locationLabel: string;
  readonly searchAliases?: readonly string[];
  readonly thumbnailKey: string;
  readonly accessibleDescription: string;
}

export type DiscoveryBadge = AvailableDiscoveryBadge | SourceStudyDiscoveryBadge;
