import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { effectiveTags } from "@badge/archive-domain";
import type { HistoricalQuotation } from "@badge/saying-contract";
import { LazyBadgeViewer as BadgeViewer } from "./LazyBadgeViewer";

import { formatDate, formatDateTime } from "./browser-utilities";
import { type CollectedArchiveRecord, type ReplaySetLink } from "./collection-view-model";
import type { DiscoveryPager, DiscoveryPagerStep } from "./discovery-pager";
import { DiscoveryPagerControls } from "./DiscoveryPagerControls";
import { CloseIcon } from "./icons";
import { useModalEnvironment } from "./modal-environment";
import { useDiscoveryPagerKeys } from "./use-discovery-pager-keys";
import { useModalFocus } from "./use-modal-focus";

interface MemoryReplayDialogProps {
  readonly record: CollectedArchiveRecord;
  readonly sourceUrl: string;
  readonly quotation: HistoricalQuotation | null;
  readonly sets: readonly ReplaySetLink[];
  readonly forceFallback: boolean;
  readonly pager?: DiscoveryPager | null;
  readonly keyboardPagingEnabled?: boolean;
  readonly returnFocus: RefObject<HTMLButtonElement | null>;
  readonly onBrowseSet: (set: ReplaySetLink) => void;
  readonly onAdjustInStudio: () => void;
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
  keyboardPagingEnabled = true,
  returnFocus,
  onBrowseSet,
  onAdjustInStudio,
  onPagerStep,
  onClose,
}: MemoryReplayDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const contentFocusTarget = useRef<string | null>(null);
  useModalEnvironment(dialog);
  useModalFocus(dialog, closeButton, onClose, { returnFocus });
  const { activation } = record;
  const tags = effectiveTags(record);
  const paged = pager !== null && pager.total > 1 && onPagerStep !== undefined;
  const stepReplay = useCallback(
    (step: DiscoveryPagerStep) => {
      contentFocusTarget.current = content.current?.contains(document.activeElement) ? step.recordId : null;
      onPagerStep?.(step);
    },
    [onPagerStep],
  );
  useDiscoveryPagerKeys(paged && keyboardPagingEnabled ? pager : null, stepReplay);
  useLayoutEffect(() => {
    const contentNode = content.current;
    if (!contentNode) return;
    const shouldFocusContent = contentFocusTarget.current === record.recordId;
    contentFocusTarget.current = null;
    contentNode.scrollTop = 0;
    if (shouldFocusContent && document.activeElement !== contentNode) {
      contentNode.focus({ preventScroll: true });
    }
  }, [record.recordId]);

  return (
    <div
      ref={dialog}
      className={`memory-replay${paged ? " memory-replay--paged" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-replay-title"
      tabIndex={-1}
    >
      <article className={`memory-replay__card${paged ? " memory-replay__card--paged" : ""}`}>
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
        <div className={`memory-replay__details${paged ? " memory-replay__details--paged" : ""}`}>
          {paged && pager ? (
            <div className="memory-replay__pager-slot">
              <DiscoveryPagerControls pager={pager} onStep={stepReplay} />
            </div>
          ) : null}
          <div
            ref={content}
            className="memory-replay__content"
            role={paged ? "region" : undefined}
            aria-label={paged ? "Memory details" : undefined}
            tabIndex={paged ? 0 : undefined}
          >
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
            {tags.length > 0 ? (
              <ul className="memory-replay__tags" aria-label={`Your tags on ${record.title}`}>
                {tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : null}
            <p className="memory-replay__studio">
              <button className="text-button" type="button" onClick={onAdjustInStudio}>
                Adjust in Badge Studio
              </button>
              <small>
                This memory is sealed, so its picture, shape, border, material and quote cannot change. Its
                tags and collections still can.
              </small>
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
