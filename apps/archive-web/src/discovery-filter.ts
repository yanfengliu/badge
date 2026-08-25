import type { DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

export type DiscoveryFilter = "all" | DiscoveryBadge["availability"];

export function filterDiscoveryBadges(
  badges: readonly DiscoveryBadge[],
  query: string,
  filter: DiscoveryFilter,
): readonly DiscoveryBadge[] {
  const terms = normalizeSearch(query).split(/\s+/u).filter(Boolean);
  return badges.filter((badge) => {
    if (filter !== "all" && badge.availability !== filter) return false;
    if (terms.length === 0) return true;
    const searchable =
      badge.availability === "source-study"
        ? [badge.title, badge.criterion, badge.locationLabel]
        : [badge.title, badge.criterion, badge.description, badge.collectionLabel];
    const haystack = normalizeSearch(searchable.join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}
