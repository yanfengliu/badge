import { discoverySets, type DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

export function filterDiscoveryBadges(
  badges: readonly DiscoveryBadge[],
  query: string,
  setId: string | null,
  regionId: string | null = null,
): readonly DiscoveryBadge[] {
  const normalizedQuery = normalizeSearch(query);
  const terms = normalizeSearch(query).split(/\s+/u).filter(Boolean);
  const setBadges = badges.filter(
    (badge) => (!setId || badge.setIds.includes(setId)) && (!regionId || badge.regionId === regionId),
  );
  const exactAliasMatches = setBadges.filter(
    (badge) =>
      badge.availability === "source-study" &&
      badge.searchAliases?.some((alias) => normalizeSearch(alias) === normalizedQuery),
  );
  if (normalizedQuery && exactAliasMatches.length > 0) return exactAliasMatches;
  return setBadges.filter((badge) => {
    if (terms.length === 0) return true;
    const setTitles = badge.setIds.flatMap((candidate) =>
      discoverySets.filter((set) => set.setId === candidate).map((set) => set.title),
    );
    const searchable =
      badge.availability === "source-study"
        ? [badge.title, badge.criterion, badge.locationLabel, ...(badge.searchAliases ?? []), ...setTitles]
        : [badge.title, badge.criterion, badge.description, badge.collectionLabel, ...setTitles];
    const haystack = normalizeSearch(searchable.join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}
