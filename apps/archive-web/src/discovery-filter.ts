import { discoverySets, type DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

export function filterDiscoveryBadges(
  badges: readonly DiscoveryBadge[],
  query: string,
  setId: string | null,
): readonly DiscoveryBadge[] {
  const terms = normalizeSearch(query).split(/\s+/u).filter(Boolean);
  return badges.filter((badge) => {
    if (setId && !badge.setIds.includes(setId)) return false;
    if (terms.length === 0) return true;
    const setTitles = badge.setIds.flatMap((candidate) =>
      discoverySets.filter((set) => set.setId === candidate).map((set) => set.title),
    );
    const searchable =
      badge.availability === "source-study"
        ? [badge.title, badge.criterion, badge.locationLabel, ...setTitles]
        : [badge.title, badge.criterion, badge.description, badge.collectionLabel, ...setTitles];
    const haystack = normalizeSearch(searchable.join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}
