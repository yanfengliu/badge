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
  readonly query: string;
  readonly onSetChange: (setId: string | null) => void;
  readonly onQueryChange: (query: string) => void;
  readonly onOpenAvailableBadge: (recordId: string, trigger: HTMLButtonElement) => void;
  readonly onOpenCollectedBadge: (recordId: string, trigger: HTMLButtonElement) => void;
  readonly resolveThumbnail?: (fileName: string) => string | null;
}

export const DISCOVERY_PAGE_SIZE = 24;

function discoveryPageKey(setId: string | null, query: string, badgeCount: number): string {
  return `${setId ?? "all"}\u0000${query}\u0000${badgeCount}`;
}

export function DiscoveryView({
  badges = discoveryBadges,
  collectedRecordIds,
  resolvedSourceUrls,
  selectedSetId,
  query,
  onSetChange,
  onQueryChange,
  onOpenAvailableBadge,
  onOpenCollectedBadge,
  resolveThumbnail = resolveDiscoveryThumbnail,
}: DiscoveryViewProps) {
  const visibleBadges = useMemo(
    () => filterDiscoveryBadges(badges, query, selectedSetId),
    [badges, query, selectedSetId],
  );
  const pageKey = discoveryPageKey(selectedSetId, query, badges.length);
  const [page, setPage] = useState({ key: pageKey, limit: DISCOVERY_PAGE_SIZE });
  const visibleLimit = page.key === pageKey ? page.limit : DISCOVERY_PAGE_SIZE;
  const renderedBadges = visibleBadges.slice(0, visibleLimit);
  const selectedSet = discoverySets.find((set) => set.setId === selectedSetId) ?? null;
  const allProgress = progressForBadges(badges, collectedRecordIds);

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
              "Browse every set and every badge created so far. Collected memories stay in color; potential ones wait in quiet grey."}
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
            setPage({ key: discoveryPageKey(null, query, badges.length), limit: DISCOVERY_PAGE_SIZE });
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
              setPage({
                key: discoveryPageKey(set.setId, query, badges.length),
                limit: DISCOVERY_PAGE_SIZE,
              });
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
                setPage({
                  key: discoveryPageKey(selectedSetId, nextQuery, badges.length),
                  limit: DISCOVERY_PAGE_SIZE,
                });
                onQueryChange(nextQuery);
              }}
            />
          </label>
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
                collected={badge.availability === "available" && collectedRecordIds.has(badge.recordId)}
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
                onClick={() => setPage({ key: pageKey, limit: renderedBadges.length + DISCOVERY_PAGE_SIZE })}
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
    collected: badges.filter(
      (badge) => badge.availability === "available" && collectedRecordIds.has(badge.recordId),
    ).length,
    total: badges.length,
  };
}

function progressForSet(
  badges: readonly DiscoveryBadge[],
  setId: string,
  collectedRecordIds: ReadonlySet<string>,
): string {
  const setBadges = badges.filter((badge) => badge.setIds.includes(setId));
  const collected = setBadges.filter(
    (badge) => badge.availability === "available" && collectedRecordIds.has(badge.recordId),
  ).length;
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
  const state = collected ? "collected" : "potential";
  const status = collected
    ? "Collected"
    : badge.availability === "available"
      ? "Ready to collect"
      : "Potential";

  return (
    <article className={`discovery-card discovery-card--${state}`}>
      <div className="discovery-card__art">
        {sourceUrl ? (
          <img src={sourceUrl} alt={badge.accessibleDescription} loading="lazy" decoding="async" />
        ) : (
          <span role="img" aria-label={`${badge.title}: Preview unavailable`}>
            Preview unavailable
          </span>
        )}
        <span className="discovery-card__status">{status}</span>
      </div>
      <div className="discovery-card__copy">
        <p>
          {setTitle ?? (badge.availability === "source-study" ? badge.locationLabel : badge.collectionLabel)}
        </p>
        <h3>{badge.title}</h3>
        <span>{badge.criterion}</span>
        {badge.availability === "available" ? (
          collected ? (
            <button
              type="button"
              aria-label={`Replay collected memory ${badge.title}`}
              onClick={(event) => onOpenCollectedBadge(badge.recordId, event.currentTarget)}
            >
              View memory
            </button>
          ) : (
            <button
              type="button"
              aria-label={`Prepare ${badge.title} to collect`}
              data-prepare-record-id={badge.recordId}
              onClick={(event) => onOpenAvailableBadge(badge.recordId, event.currentTarget)}
            >
              Prepare badge
            </button>
          )
        ) : (
          <small>Not yet published</small>
        )}
      </div>
    </article>
  );
}
