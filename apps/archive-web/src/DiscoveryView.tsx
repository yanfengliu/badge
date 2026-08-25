import { useMemo, useState } from "react";
import { discoveryBadges, type DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

import { resolveDiscoveryThumbnail } from "./discovery-media";
import { filterDiscoveryBadges, type DiscoveryFilter } from "./discovery-filter";

interface DiscoveryViewProps {
  readonly badges?: readonly DiscoveryBadge[];
  readonly onOpenAvailableBadge: (recordId: string) => void;
  readonly resolveThumbnail?: (fileName: string) => string | null;
}

export function DiscoveryView({
  badges = discoveryBadges,
  onOpenAvailableBadge,
  resolveThumbnail = resolveDiscoveryThumbnail,
}: DiscoveryViewProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DiscoveryFilter>("all");
  const visibleBadges = useMemo(() => filterDiscoveryBadges(badges, query, filter), [badges, filter, query]);
  const availableCount = badges.filter((badge) => badge.availability === "available").length;
  const studyCount = badges.length - availableCount;

  return (
    <main className="discovery-main">
      <header className="discovery-hero">
        <div>
          <p className="eyebrow">Complete badge catalogue</p>
          <h1>Discover every badge</h1>
          <p className="discovery-intro">
            Browse every visualized badge created so far. Published badges open in your Collection; selected
            Studio studies remain previews until publication.
          </p>
        </div>
        <dl className="discovery-totals" aria-label="Discovery catalogue totals">
          <div>
            <dt>All</dt>
            <dd>{badges.length} badges</dd>
          </div>
          <div>
            <dt>Ready</dt>
            <dd>{availableCount} available</dd>
          </div>
          <div>
            <dt>Not published</dt>
            <dd>{studyCount} selected studies</dd>
          </div>
        </dl>
      </header>

      <section className="discovery-browser" aria-labelledby="discovery-results-title">
        <div className="discovery-controls">
          <label>
            <span>Search badges</span>
            <input
              type="search"
              value={query}
              placeholder="Badge, place, or criterion"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span>Availability</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as DiscoveryFilter)}>
              <option value="all">All created badges</option>
              <option value="available">Available in Archive</option>
              <option value="source-study">Selected studies</option>
            </select>
          </label>
        </div>

        <div className="discovery-results-heading">
          <h2 id="discovery-results-title">Created badges</h2>
          <p aria-live="polite">
            {visibleBadges.length} {visibleBadges.length === 1 ? "result" : "results"}
          </p>
        </div>

        {visibleBadges.length > 0 ? (
          <div className="discovery-grid">
            {visibleBadges.map((badge) => (
              <DiscoveryCard
                key={badge.discoveryId}
                badge={badge}
                resolveThumbnail={resolveThumbnail}
                onOpenAvailableBadge={onOpenAvailableBadge}
              />
            ))}
          </div>
        ) : (
          <div className="discovery-empty" role="status">
            <strong>No badges match this search.</strong>
            <span>Try a park, place, or broader criterion.</span>
          </div>
        )}
      </section>
    </main>
  );
}

function DiscoveryCard({
  badge,
  resolveThumbnail,
  onOpenAvailableBadge,
}: {
  readonly badge: DiscoveryBadge;
  readonly resolveThumbnail: (fileName: string) => string | null;
  readonly onOpenAvailableBadge: (recordId: string) => void;
}) {
  const sourceUrl =
    badge.availability === "available" ? badge.previewUrl : resolveThumbnail(badge.thumbnailFileName);
  const description = badge.accessibleDescription;

  return (
    <article className={`discovery-card discovery-card--${badge.availability}`}>
      <div className="discovery-card__art">
        {sourceUrl ? (
          <img src={sourceUrl} alt={description} loading="lazy" decoding="async" />
        ) : (
          <span role="img" aria-label={`${badge.title}: Preview unavailable`}>
            Preview unavailable
          </span>
        )}
        <span className="discovery-card__status">
          {badge.availability === "available" ? (
            <>
              Available<span className="visually-hidden"> in Archive</span>
            </>
          ) : (
            "Selected study"
          )}
        </span>
      </div>
      <div className="discovery-card__copy">
        <p>{badge.availability === "available" ? badge.collectionLabel : badge.locationLabel}</p>
        <h3>{badge.title}</h3>
        <span>{badge.criterion}</span>
        {badge.availability === "available" ? (
          <button
            type="button"
            aria-label={`Open ${badge.title} in Collection`}
            onClick={() => onOpenAvailableBadge(badge.recordId)}
          >
            Open in Collection
          </button>
        ) : (
          <small>Not yet published</small>
        )}
      </div>
    </article>
  );
}
