import { useMemo, useState } from "react";
import type { ArchiveState } from "@badge/archive-domain";

import { formatDate } from "./browser-utilities";
import {
  buildCollectionShelves,
  collectionStats,
  filterCollectionShelves,
  type CollectedArchiveRecord,
  type CollectionShelf,
} from "./collection-view-model";
import { ArrowIcon } from "./icons";

interface CollectionViewProps {
  readonly state: ArchiveState;
  readonly sourceUrls: Readonly<Record<string, string>>;
  readonly onReplay: (recordId: string, trigger: HTMLButtonElement) => void;
  readonly onBrowseSet: (setId: string) => void;
  readonly onShowDiscover: () => void;
}

export function CollectionView({
  state,
  sourceUrls,
  onReplay,
  onBrowseSet,
  onShowDiscover,
}: CollectionViewProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const shelves = useMemo(() => buildCollectionShelves(state), [state]);
  const visibleShelves = useMemo(() => filterCollectionShelves(shelves, query), [query, shelves]);
  const stats = useMemo(() => collectionStats(state), [state]);

  function toggleShelf(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <main className="collection-main">
      <header className="collection-masthead">
        <div className="collection-introduction">
          <p className="eyebrow">A private collection of places, pages, and passages</p>
          <h1>The Field Archive</h1>
          <p>Every badge here marks a memory you activated and chose to keep.</p>
        </div>
        <div className="collection-tools">
          <label className="collection-search">
            <span>Search your collection</span>
            <input
              type="search"
              value={query}
              placeholder="Memory, set, or quote"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <CollectionStats stats={stats} />
        </div>
      </header>

      {stats.collectedCount === 0 ? (
        <div className="collection-empty-callout">
          <div>
            <strong>Your cabinet is waiting.</strong>
            <span>Activate a potential badge from Discover and it will appear here in full color.</span>
          </div>
          <button type="button" onClick={onShowDiscover}>
            Browse sets in Discover <ArrowIcon />
          </button>
        </div>
      ) : null}

      {stats.collectedCount > 0 ? (
        <>
          <div className="collection-result-count" aria-live="polite">
            {visibleShelves.length} {visibleShelves.length === 1 ? "set" : "sets"}
          </div>

          {visibleShelves.length > 0 ? (
            <section className="collection-cabinet" aria-label="Collected badge sets">
              {visibleShelves.map((shelf) => (
                <CollectionShelfRow
                  key={shelf.key}
                  shelf={shelf}
                  sourceUrls={sourceUrls}
                  open={expanded.has(shelf.key)}
                  onToggle={() => toggleShelf(shelf.key)}
                  onReplay={onReplay}
                  onBrowseSet={onBrowseSet}
                />
              ))}
            </section>
          ) : (
            <div className="collection-search-empty" role="status">
              <strong>No collected memories match this search.</strong>
              <span>Try a set name, title, criterion, note, or quote.</span>
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}

function CollectionStats({ stats }: { readonly stats: ReturnType<typeof collectionStats> }) {
  return (
    <dl className="collection-stats" aria-label="Collection statistics">
      <div>
        <dt>Collected</dt>
        <dd>{stats.collectedCount}</dd>
      </div>
      <div>
        <dt>Sets represented</dt>
        <dd>{stats.setCount}</dd>
      </div>
      <div>
        <dt>Years held</dt>
        <dd>{stats.yearsLabel}</dd>
      </div>
      <div>
        <dt>Latest memory</dt>
        <dd>{stats.latestRecord?.title ?? "—"}</dd>
      </div>
    </dl>
  );
}

function CollectionShelfRow({
  shelf,
  sourceUrls,
  open,
  onToggle,
  onReplay,
  onBrowseSet,
}: {
  readonly shelf: CollectionShelf;
  readonly sourceUrls: Readonly<Record<string, string>>;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onReplay: (recordId: string, trigger: HTMLButtonElement) => void;
  readonly onBrowseSet: (setId: string) => void;
}) {
  const panelId = `collection-shelf-${shelf.key.replace(/[^a-z0-9_-]/giu, "-")}`;
  const previews = shelf.records.slice(0, 3);
  return (
    <section className="collection-shelf" data-expanded={open || undefined}>
      <div className="collection-shelf__rail" aria-hidden="true" />
      <div className="collection-shelf__row">
        {shelf.setId ? (
          <button
            className="collection-shelf__browse-surface"
            type="button"
            aria-label={`Browse ${shelf.title} set`}
            onClick={() => onBrowseSet(shelf.setId!)}
          />
        ) : null}
        <div className="collection-shelf__art" aria-label={`${shelf.title} collected memories`}>
          {previews.length > 0 ? (
            previews.map((record) => (
              <CollectedBadgeButton
                key={record.recordId}
                record={record}
                sourceUrl={sourceUrls[record.recordId]}
                compact
                onReplay={onReplay}
              />
            ))
          ) : (
            <span className="collection-shelf__vacancy">No memories collected here yet</span>
          )}
        </div>
        <div className="collection-shelf__copy">
          <h2>{shelf.title}</h2>
          <p>{shelf.description}</p>
          <strong>
            {shelf.collectedCount} / {shelf.totalCount} collected
          </strong>
        </div>
        <div className="collection-shelf__actions">
          <button
            className="collection-disclosure"
            type="button"
            aria-label={`${open ? "Collapse" : "Expand"} ${shelf.title} collected memories`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            <ArrowIcon />
          </button>
        </div>
      </div>
      {open ? (
        <div id={panelId} className="collection-shelf__expanded">
          {shelf.records.length > 0 ? (
            <div className="collection-memory-grid">
              {shelf.records.map((record) => (
                <CollectedBadgeButton
                  key={record.recordId}
                  record={record}
                  sourceUrl={sourceUrls[record.recordId]}
                  onReplay={onReplay}
                />
              ))}
            </div>
          ) : (
            <p>
              This set has no collected memories yet. Browse it in Discover to find a potential next badge.
            </p>
          )}
        </div>
      ) : null}
      <div className="collection-shelf__rail collection-shelf__rail--lower" aria-hidden="true" />
    </section>
  );
}

function CollectedBadgeButton({
  record,
  sourceUrl,
  compact = false,
  onReplay,
}: {
  readonly record: CollectedArchiveRecord;
  readonly sourceUrl: string | undefined;
  readonly compact?: boolean;
  readonly onReplay: (recordId: string, trigger: HTMLButtonElement) => void;
}) {
  const shape = record.activation.visualPin.renderRecipe.shape;
  return (
    <button
      className={`collected-badge collected-badge--${shape}${compact ? " collected-badge--compact" : ""}`}
      type="button"
      aria-label={`Replay ${record.title} activation`}
      onClick={(event) => onReplay(record.recordId, event.currentTarget)}
    >
      <span className="collected-badge__art">
        {sourceUrl ? <img src={sourceUrl} alt="" /> : <span>Resolving visual</span>}
      </span>
      {!compact ? (
        <span className="collected-badge__copy">
          <strong>{record.title}</strong>
          <span>{formatDate(record.activation.occurredStart)}</span>
          <small>{record.criterion}</small>
        </span>
      ) : null}
    </button>
  );
}
