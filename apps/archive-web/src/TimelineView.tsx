import { useState } from "react";
import type { ActivationRecord, ArchiveState } from "@badge/archive-domain";
import { BadgePreview, BadgeViewer } from "@badge/renderer-web";

import { formatDate } from "./browser-utilities";
import { replaySetLinks } from "./collection-view-model";
import { ArrowIcon, InspectIcon } from "./icons";
import { orderedTimelineRecords, toggledTimelineInspection } from "./timeline-records";

interface TimelineViewProps {
  readonly state: ArchiveState;
  readonly sourceUrls: Readonly<Record<string, string>>;
  readonly forceFallback: boolean;
  readonly onOpenMemory: (recordId: string) => void;
  readonly onShowDiscover: () => void;
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

export function TimelineView({
  state,
  sourceUrls,
  forceFallback,
  onOpenMemory,
  onShowDiscover,
}: TimelineViewProps) {
  const records = orderedTimelineRecords(state);
  const [inspectedRecordId, setInspectedRecordId] = useState<string | null>(null);

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
            <p>Activate a badge from Discover and its real-world date will take its place here.</p>
            <button className="secondary-button" type="button" onClick={onShowDiscover}>
              Browse Discover <ArrowIcon />
            </button>
          </div>
        ) : (
          <ol className="timeline-list">
            {records.map((record) => {
              const sourceUrl = sourceUrls[record.recordId];
              const inspecting = inspectedRecordId === record.recordId;
              const visualPin = record.activation.visualPin;
              const artifactId = `timeline-artifact-${record.recordId}`;
              return (
                <li className="timeline-entry" key={record.recordId}>
                  <div className="timeline-marker" aria-hidden="true" />
                  <OccurrenceRange activation={record.activation} />
                  <article className="timeline-card">
                    <div className="timeline-art">
                      {sourceUrl ? (
                        <>
                          <button
                            className="timeline-inspect"
                            type="button"
                            aria-controls={artifactId}
                            aria-label={
                              inspecting
                                ? `Close ${record.title} badge inspector`
                                : `Inspect ${record.title} badge ${forceFallback ? "views" : "in 3D"}`
                            }
                            aria-pressed={inspecting}
                            onClick={() =>
                              setInspectedRecordId((current) =>
                                toggledTimelineInspection(current, record.recordId),
                              )
                            }
                          >
                            <InspectIcon />
                            <span>
                              {inspecting
                                ? "Close badge inspector"
                                : forceFallback
                                  ? "Inspect badge views"
                                  : "Inspect badge in 3D"}
                            </span>
                          </button>
                          <div id={artifactId} className="timeline-artifact-slot">
                            {inspecting ? (
                              <BadgeViewer
                                className="timeline-badge-viewer"
                                sourceUrl={sourceUrl}
                                recipe={visualPin.renderRecipe}
                                accessibleDescription={visualPin.accessibleDescription}
                                readOnly
                                forceFallback={forceFallback}
                              />
                            ) : (
                              <BadgePreview
                                className="timeline-badge-preview"
                                sourceUrl={sourceUrl}
                                recipe={visualPin.renderRecipe}
                                accessibleDescription={visualPin.accessibleDescription}
                              />
                            )}
                          </div>
                        </>
                      ) : (
                        <span role="status">Artifact is still resolving.</span>
                      )}
                    </div>
                    <div className="timeline-copy">
                      <p className="timeline-kicker">
                        {replaySetLinks(record)
                          .map((set) => set.title)
                          .join(" · ")}{" "}
                        · sealed{" "}
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
                        onClick={() => onOpenMemory(record.recordId)}
                      >
                        Replay {record.title} memory <ArrowIcon />
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
