import { useMemo, useState } from "react";
import {
  discoveryBadges,
  discoverySets,
  type DiscoveryBadge,
  type DiscoverySet,
} from "@badge/catalogue-fixtures/discovery";

import { filterDiscoveryBadges } from "./discovery-filter";
import { resolveDiscoveryThumbnail } from "./discovery-media";

interface DiscoveryViewProps {
  readonly badges?: readonly DiscoveryBadge[];
  readonly collectedRecordIds: ReadonlySet<string>;
  readonly resolvedSourceUrls: Readonly<Record<string, string>>;
  readonly selectedSetId: string | null;
  readonly selectedRegionId?: string | null;
  readonly query: string;
  readonly visibleLimit?: number;
  readonly onVisibleLimitChange?: (visibleLimit: number) => void;
  readonly onSetChange: (setId: string | null) => void;
  readonly onRegionChange?: (regionId: string | null) => void;
  readonly onQueryChange: (query: string) => void;
  readonly onOpenAvailableBadge: (recordId: string, trigger: HTMLButtonElement) => void;
  readonly onOpenCollectedBadge: (recordId: string, trigger: HTMLButtonElement) => void;
  readonly resolveThumbnail?: (fileName: string) => string | null;
}

export const DISCOVERY_PAGE_SIZE = 24;
const MICHELIN_SET_ID = "michelin-dining";
const MICHELIN_REGIONS = [
  { regionId: "bay-area", label: "Bay Area" },
  { regionId: "new-york-city", label: "New York City" },
  { regionId: "washington-dc", label: "Washington, DC & surroundings" },
] as const;

function discoveryPageKey(
  setId: string | null,
  query: string,
  regionId: string | null,
  badgeCount: number,
): string {
  return `${setId ?? "all"}\u0000${query}\u0000${regionId ?? "all-regions"}\u0000${badgeCount}`;
}

export function DiscoveryView({
  badges = discoveryBadges,
  collectedRecordIds,
  resolvedSourceUrls,
  selectedSetId,
  selectedRegionId: controlledRegionId,
  query,
  visibleLimit: controlledVisibleLimit,
  onVisibleLimitChange,
  onSetChange,
  onRegionChange,
  onQueryChange,
  onOpenAvailableBadge,
  onOpenCollectedBadge,
  resolveThumbnail = resolveDiscoveryThumbnail,
}: DiscoveryViewProps) {
  const [localRegionId, setLocalRegionId] = useState<string | null>(null);
  const regionIsControlled = controlledRegionId !== undefined && onRegionChange !== undefined;
  const selectedRegionId = regionIsControlled ? controlledRegionId : localRegionId;
  const setSelectedRegionId = regionIsControlled ? onRegionChange : setLocalRegionId;
  const activeRegionId = selectedSetId === MICHELIN_SET_ID ? selectedRegionId : null;
  const visibleBadges = useMemo(
    () => filterDiscoveryBadges(badges, query, selectedSetId, activeRegionId),
    [activeRegionId, badges, query, selectedSetId],
  );
  const pageKey = discoveryPageKey(selectedSetId, query, activeRegionId, badges.length);
  const [page, setPage] = useState({ key: pageKey, limit: DISCOVERY_PAGE_SIZE });
  const paginationIsControlled = controlledVisibleLimit !== undefined && onVisibleLimitChange !== undefined;
  const visibleLimit = paginationIsControlled
    ? controlledVisibleLimit
    : page.key === pageKey
      ? page.limit
      : DISCOVERY_PAGE_SIZE;
  const renderedBadges = visibleBadges.slice(0, visibleLimit);
  const selectedSet = discoverySets.find((set) => set.setId === selectedSetId) ?? null;
  const allProgress = progressForBadges(badges, collectedRecordIds);

  function updateVisibleLimit(nextKey: string, nextLimit: number) {
    if (paginationIsControlled) onVisibleLimitChange(nextLimit);
    else setPage({ key: nextKey, limit: nextLimit });
  }

  return (
    <main className="discovery-main">
      <header className="discovery-hero">
        <div>
          <p className="eyebrow">A catalogue of possible memories</p>
          <h1 id="discovery-set-heading" tabIndex={-1}>
            {selectedSet?.title ?? "Discover sets"}
          </h1>
          <p className="discovery-intro">
            {selectedSet?.description ??
              "Browse every set and every badge created so far. Collected badges stay in color; the rest wait in quiet grey until you collect them."}
          </p>
        </div>
        <div className="discovery-overview">
          <span>{selectedSet ? "Set progress" : "Archive progress"}</span>
          <strong>
            {selectedSet
              ? progressForSet(badges, selectedSet.setId, collectedRecordIds)
              : `${allProgress.collected} / ${allProgress.total} collected`}
          </strong>
        </div>
      </header>

      <nav className="discovery-set-browser" aria-label="Badge sets">
        <button
          className="discovery-set-button"
          type="button"
          aria-pressed={selectedSetId === null}
          onClick={() => {
            setSelectedRegionId(null);
            updateVisibleLimit(discoveryPageKey(null, query, null, badges.length), DISCOVERY_PAGE_SIZE);
            onSetChange(null);
          }}
        >
          <strong>All sets</strong>
          <span>Browse everything</span>
        </button>
        {discoverySets.map((set) => (
          <DiscoverySetButton
            key={set.setId}
            set={set}
            badges={badges}
            collectedRecordIds={collectedRecordIds}
            active={selectedSetId === set.setId}
            onSelect={() => {
              setSelectedRegionId(null);
              updateVisibleLimit(
                discoveryPageKey(set.setId, query, null, badges.length),
                DISCOVERY_PAGE_SIZE,
              );
              onSetChange(set.setId);
            }}
          />
        ))}
      </nav>

      <section className="discovery-browser" aria-labelledby="discovery-results-title">
        <div className="discovery-controls">
          <label>
            <span>Search badges</span>
            <input
              type="search"
              value={query}
              placeholder="Badge, place, or criterion"
              onChange={(event) => {
                const nextQuery = event.target.value;
                updateVisibleLimit(
                  discoveryPageKey(selectedSetId, nextQuery, activeRegionId, badges.length),
                  DISCOVERY_PAGE_SIZE,
                );
                onQueryChange(nextQuery);
              }}
            />
          </label>
          {selectedSetId === MICHELIN_SET_ID ? (
            <fieldset className="discovery-region-filter">
              <legend>Region</legend>
              <div role="group" aria-label="Michelin dining regions">
                <button
                  type="button"
                  aria-pressed={activeRegionId === null}
                  onClick={() => {
                    setSelectedRegionId(null);
                    updateVisibleLimit(
                      discoveryPageKey(selectedSetId, query, null, badges.length),
                      DISCOVERY_PAGE_SIZE,
                    );
                  }}
                >
                  All regions
                </button>
                {MICHELIN_REGIONS.map(({ regionId, label }) => (
                  <button
                    key={regionId}
                    type="button"
                    aria-pressed={activeRegionId === regionId}
                    onClick={() => {
                      setSelectedRegionId(regionId);
                      updateVisibleLimit(
                        discoveryPageKey(selectedSetId, query, regionId, badges.length),
                        DISCOVERY_PAGE_SIZE,
                      );
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>

        <div className="discovery-results-heading">
          <h2 id="discovery-results-title">{selectedSet?.title ?? "All created badges"}</h2>
          <p aria-live="polite">
            {visibleBadges.length} {visibleBadges.length === 1 ? "result" : "results"}
          </p>
        </div>

        {visibleBadges.length > 0 ? (
          <div className="discovery-grid">
            {renderedBadges.map((badge) => (
              <DiscoveryCard
                key={badge.discoveryId}
                badge={badge}
                selectedSetId={selectedSet?.setId ?? null}
                collected={collectedRecordIds.has(badge.recordId)}
                resolvedSourceUrl={
                  badge.availability === "available" ? resolvedSourceUrls[badge.recordId] : undefined
                }
                resolveThumbnail={resolveThumbnail}
                onOpenAvailableBadge={onOpenAvailableBadge}
                onOpenCollectedBadge={onOpenCollectedBadge}
              />
            ))}
          </div>
        ) : (
          <div className="discovery-empty" role="status">
            <strong>No badges match this search.</strong>
            <span>Try a park, place, criterion, or another set.</span>
          </div>
        )}
        {visibleBadges.length > DISCOVERY_PAGE_SIZE ? (
          <div className="discovery-pagination" aria-live="polite">
            <span>
              Showing {renderedBadges.length} of {visibleBadges.length} results
            </span>
            {renderedBadges.length < visibleBadges.length ? (
              <button
                type="button"
                onClick={() => updateVisibleLimit(pageKey, renderedBadges.length + DISCOVERY_PAGE_SIZE)}
              >
                Show {Math.min(DISCOVERY_PAGE_SIZE, visibleBadges.length - renderedBadges.length)} more
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function DiscoverySetButton({
  set,
  badges,
  collectedRecordIds,
  active,
  onSelect,
}: {
  readonly set: DiscoverySet;
  readonly badges: readonly DiscoveryBadge[];
  readonly collectedRecordIds: ReadonlySet<string>;
  readonly active: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button className="discovery-set-button" type="button" aria-pressed={active} onClick={onSelect}>
      <strong>{set.title}</strong>
      <span>{progressForSet(badges, set.setId, collectedRecordIds)}</span>
    </button>
  );
}

function progressForBadges(badges: readonly DiscoveryBadge[], collectedRecordIds: ReadonlySet<string>) {
  return {
    collected: badges.filter((badge) => collectedRecordIds.has(badge.recordId)).length,
    total: badges.length,
  };
}

function progressForSet(
  badges: readonly DiscoveryBadge[],
  setId: string,
  collectedRecordIds: ReadonlySet<string>,
): string {
  const setBadges = badges.filter((badge) => badge.setIds.includes(setId));
  const collected = setBadges.filter((badge) => collectedRecordIds.has(badge.recordId)).length;
  return `${collected} / ${setBadges.length} collected`;
}

function DiscoveryCard({
  badge,
  selectedSetId,
  collected,
  resolvedSourceUrl,
  resolveThumbnail,
  onOpenAvailableBadge,
  onOpenCollectedBadge,
}: {
  readonly badge: DiscoveryBadge;
  readonly selectedSetId: string | null;
  readonly collected: boolean;
  readonly resolvedSourceUrl: string | undefined;
  readonly resolveThumbnail: (fileName: string) => string | null;
  readonly onOpenAvailableBadge: (recordId: string, trigger: HTMLButtonElement) => void;
  readonly onOpenCollectedBadge: (recordId: string, trigger: HTMLButtonElement) => void;
}) {
  const sourceUrl =
    badge.availability === "available"
      ? (resolvedSourceUrl ?? badge.previewUrl)
      : resolveThumbnail(badge.thumbnailKey);
  const displayedSetId =
    selectedSetId && badge.setIds.includes(selectedSetId) ? selectedSetId : badge.setIds[0];
  const setTitle = discoverySets.find((set) => set.setId === displayedSetId)?.title;
  const state = collected ? "collected" : "uncollected";
  const actionLabel = collected
    ? `Open collected memory ${badge.title}`
    : `Open ${badge.title} to collect it`;

  function openBadge(trigger: HTMLButtonElement) {
    if (collected) onOpenCollectedBadge(badge.recordId, trigger);
    else onOpenAvailableBadge(badge.recordId, trigger);
  }

  return (
    <article className={`discovery-card discovery-card--${state} discovery-card--actionable`}>
      <div className="discovery-card__art">
        {sourceUrl ? (
          <img src={sourceUrl} alt={badge.accessibleDescription} loading="lazy" decoding="async" />
        ) : (
          <span role="img" aria-label={`${badge.title}: Preview unavailable`}>
            Preview unavailable
          </span>
        )}
      </div>
      <div className="discovery-card__copy">
        <p>
          {setTitle ?? (badge.availability === "source-study" ? badge.locationLabel : badge.collectionLabel)}
        </p>
        <h3>{badge.title}</h3>
        <span className={badge.availability === "source-study" ? "discovery-card__metadata" : undefined}>
          {badge.availability === "source-study" ? badge.locationLabel : badge.criterion}
        </span>
      </div>
      <button
        className="discovery-card__action"
        type="button"
        aria-label={actionLabel}
        {...(collected ? {} : { "data-prepare-record-id": badge.recordId })}
        onClick={(event) => openBadge(event.currentTarget)}
      >
        <span className="visually-hidden">{actionLabel}</span>
      </button>
    </article>
  );
}
