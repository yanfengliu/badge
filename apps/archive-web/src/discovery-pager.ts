import { discoveryBadges, discoverySets, type DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

import { effectiveDiscoveryRegionId, filterDiscoveryBadges } from "./discovery-filter";

export interface DiscoveryPagerStep {
  readonly recordId: string;
  readonly title: string;
}

export interface DiscoveryPager {
  readonly contextTitle: string;
  readonly currentTitle: string;
  readonly index: number;
  readonly total: number;
  readonly previous: DiscoveryPagerStep | null;
  readonly next: DiscoveryPagerStep | null;
}

export interface PreparationPagerView {
  readonly selectedSetId: string | null;
  readonly query: string;
  readonly regionId?: string | null;
}

function pagerStep(badge: DiscoveryBadge | undefined): DiscoveryPagerStep | null {
  return badge ? { recordId: badge.recordId, title: badge.title } : null;
}

function pagerFor(
  sequence: readonly DiscoveryBadge[],
  recordId: string,
  contextTitle: string,
): DiscoveryPager | null {
  const position = sequence.findIndex((badge) => badge.recordId === recordId);
  if (position < 0) return null;
  return {
    contextTitle,
    currentTitle: sequence[position]!.title,
    index: position + 1,
    total: sequence.length,
    previous: pagerStep(position > 0 ? sequence[position - 1] : undefined),
    next: pagerStep(sequence[position + 1]),
  };
}

export function preparationDiscoveryPager(
  recordId: string,
  view: PreparationPagerView,
  badges: readonly DiscoveryBadge[] = discoveryBadges,
): DiscoveryPager | null {
  const sequence = filterDiscoveryBadges(
    badges,
    view.query,
    view.selectedSetId,
    effectiveDiscoveryRegionId(view.selectedSetId, view.regionId),
  );
  const set = discoverySets.find((candidate) => candidate.setId === view.selectedSetId);
  return pagerFor(sequence, recordId, set?.title ?? "All created badges");
}

export function replayDiscoveryPager(
  recordId: string,
  collectedRecordIds: ReadonlySet<string>,
  selectedSetId: string | null,
  badges: readonly DiscoveryBadge[] = discoveryBadges,
): DiscoveryPager | null {
  const current = badges.find((badge) => badge.recordId === recordId);
  if (!current) return null;
  const setId = selectedSetId && current.setIds.includes(selectedSetId) ? selectedSetId : current.setIds[0];
  const set = discoverySets.find((candidate) => candidate.setId === setId);
  if (!set) return null;
  const sequence = badges.filter(
    (badge) => badge.setIds.includes(set.setId) && collectedRecordIds.has(badge.recordId),
  );
  return pagerFor(sequence, recordId, `Collected in ${set.title}`);
}
