import type { ActivationRecord, ArchiveRecord, ArchiveState } from "@badge/archive-domain";

import { focusArchiveSection } from "./archive-section-focus";
import { formatDate } from "./browser-utilities";
import { ArrowIcon } from "./icons";
import { orderedTimelineRecords } from "./timeline-records";

interface TimelineViewProps {
  readonly state: ArchiveState;
  readonly sourceUrls: Readonly<Record<string, string>>;
  readonly onOpenMemory: (recordId: string) => void;
  readonly onShowCollection: () => void;
}

function OccurrenceRange({ activation }: { readonly activation: ActivationRecord }) {
  return (
    <p className="timeline-occurrence">
      <time dateTime={activation.occurredStart}>{formatDate(activation.occurredStart)}</time>
      {activation.occurredEnd === activation.occurredStart ? null : (
        <>
          {" – "}
          <time dateTime={activation.occurredEnd}>{formatDate(activation.occurredEnd)}</time>
        </>
      )}
    </p>
  );
}

function sealedLabel(activatedAt: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(activatedAt),
  );
}

function collectionLabel(record: ArchiveRecord): string {
  return (record.collectionRefs[0]?.collectionId ?? "personal archive").replaceAll("-", " ");
}

function leaveTimeline(action: () => void): void {
  focusArchiveSection("collection");
  action();
}

export function TimelineView({ state, sourceUrls, onOpenMemory, onShowCollection }: TimelineViewProps) {
  const records = orderedTimelineRecords(state);

  return (
    <main className="timeline-main">
      <section className="timeline-view" aria-labelledby="timeline-title">
        <header className="timeline-heading">
          <div>
            <p className="eyebrow">Chronicle</p>
            <h1 id="timeline-title">Memory timeline</h1>
            <p>The moments you chose to seal, ordered by when they happened.</p>
          </div>
          <div
            className="timeline-count"
            aria-label={`${records.length} earned ${records.length === 1 ? "memory" : "memories"}`}
          >
            <strong>{records.length}</strong>
            <span>{records.length === 1 ? "memory" : "memories"}</span>
          </div>
        </header>

        {records.length === 0 ? (
          <div className="timeline-empty">
            <p className="eyebrow">The first marker is waiting</p>
            <h2>No memories sealed yet</h2>
            <p>Activate a badge from the collection and its real-world date will take its place here.</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => leaveTimeline(onShowCollection)}
            >
              Return to collection <ArrowIcon />
            </button>
          </div>
        ) : (
          <ol className="timeline-list">
            {records.map((record) => {
              const sourceUrl = sourceUrls[record.recordId];
              return (
                <li className="timeline-entry" key={record.recordId}>
                  <div className="timeline-marker" aria-hidden="true" />
                  <OccurrenceRange activation={record.activation} />
                  <article className="timeline-card">
                    <div className="timeline-art">
                      {sourceUrl ? (
                        <img src={sourceUrl} alt={record.publishedVisual.accessibleDescription} />
                      ) : (
                        <span role="status">Artifact is still resolving.</span>
                      )}
                    </div>
                    <div className="timeline-copy">
                      <p className="timeline-kicker">
                        {collectionLabel(record)} · sealed{" "}
                        <time dateTime={record.activation.activatedAt}>
                          {sealedLabel(record.activation.activatedAt)}
                        </time>
                      </p>
                      <h2>{record.title}</h2>
                      {record.acceptedSaying ? (
                        <p className="timeline-saying">{record.acceptedSaying}</p>
                      ) : null}
                      {record.note ? <p className="timeline-note">{record.note}</p> : null}
                      <button
                        className="text-button timeline-open"
                        type="button"
                        onClick={() => leaveTimeline(() => onOpenMemory(record.recordId))}
                      >
                        Open {record.title} memory <ArrowIcon />
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
