import { useRef, type RefObject } from "react";
import type { HistoricalQuotation } from "@badge/saying-contract";
import { BadgeViewer } from "@badge/renderer-web";

import { formatDate, formatDateTime } from "./browser-utilities";
import { type CollectedArchiveRecord, type ReplaySetLink } from "./collection-view-model";
import type { DiscoveryPager, DiscoveryPagerStep } from "./discovery-pager";
import { DiscoveryPagerControls } from "./DiscoveryPagerControls";
import { CloseIcon } from "./icons";
import { useModalEnvironment } from "./modal-environment";
import { useModalFocus } from "./use-modal-focus";

interface MemoryReplayDialogProps {
  readonly record: CollectedArchiveRecord;
  readonly sourceUrl: string;
  readonly quotation: HistoricalQuotation | null;
  readonly sets: readonly ReplaySetLink[];
  readonly forceFallback: boolean;
  readonly pager?: DiscoveryPager | null;
  readonly returnFocus: RefObject<HTMLButtonElement | null>;
  readonly onBrowseSet: (set: ReplaySetLink) => void;
  readonly onPagerStep?: (step: DiscoveryPagerStep) => void;
  readonly onClose: () => void;
}

export function MemoryReplayDialog({
  record,
  sourceUrl,
  quotation,
  sets,
  forceFallback,
  pager = null,
  returnFocus,
  onBrowseSet,
  onPagerStep,
  onClose,
}: MemoryReplayDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useModalEnvironment(dialog);
  useModalFocus(dialog, closeButton, onClose, { returnFocus });
  const { activation } = record;

  return (
    <div
      ref={dialog}
      className="memory-replay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-replay-title"
      tabIndex={-1}
    >
      <article className="memory-replay__card">
        <button
          ref={closeButton}
          className="icon-button memory-replay__close"
          type="button"
          aria-label="Close memory replay"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <BadgeViewer
          className="memory-replay__viewer"
          sourceUrl={sourceUrl}
          recipe={activation.visualPin.renderRecipe}
          accessibleDescription={activation.visualPin.accessibleDescription}
          readOnly
          forceFallback={forceFallback}
          presentation="single-turn"
        />
        <div className="memory-replay__details">
          <p className="eyebrow">Collected memory</p>
          <h2 id="memory-replay-title">{record.title}</h2>
          <dl className="memory-replay__times">
            <div>
              <dt>Happened</dt>
              <dd>
                <time dateTime={activation.occurredStart}>{formatDate(activation.occurredStart)}</time>
                {activation.occurredEnd !== activation.occurredStart ? (
                  <>
                    <span aria-hidden="true"> – </span>
                    <time dateTime={activation.occurredEnd}>{formatDate(activation.occurredEnd)}</time>
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Sealed</dt>
              <dd>
                <time dateTime={activation.activatedAt}>{formatDateTime(activation.activatedAt)}</time>
              </dd>
            </div>
          </dl>
          <figure className="memory-replay__quote">
            <blockquote>{quotation?.text ?? record.acceptedSaying}</blockquote>
            {quotation ? (
              <figcaption>
                <span>
                  —{" "}
                  {quotation.personWikipediaUrl ? (
                    <a href={quotation.personWikipediaUrl}>{quotation.person}</a>
                  ) : (
                    quotation.person
                  )}
                </span>
                <a href={quotation.sourceUrl}>{quotation.sourceTitle}</a>
              </figcaption>
            ) : null}
          </figure>
          {record.note ? <p className="memory-replay__note">{record.note}</p> : null}
          <div className="memory-replay__sets">
            <span>Belongs to</span>
            <div>
              {sets.length > 0 ? (
                sets.map((set) => (
                  <span key={set.key}>
                    {set.setId ? (
                      <button type="button" data-set-link onClick={() => onBrowseSet(set)}>
                        {set.title}
                      </button>
                    ) : (
                      <span
                        className="memory-replay__set-label"
                        title="This set is not available in Discover"
                      >
                        {set.title}
                      </span>
                    )}
                  </span>
                ))
              ) : (
                <em>No set information available</em>
              )}
            </div>
          </div>
          {pager && onPagerStep ? <DiscoveryPagerControls pager={pager} onStep={onPagerStep} /> : null}
        </div>
      </article>
    </div>
  );
}
