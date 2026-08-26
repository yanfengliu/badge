import { useEffect, useRef, useState, type RefObject } from "react";
import { discoverySets, type SourceStudyDiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

import { CloseIcon } from "./icons";
import { useModalEnvironment } from "./modal-environment";
import { useModalFocus } from "./use-modal-focus";

interface DiscoveryStudyDialogProps {
  readonly badge: SourceStudyDiscoveryBadge;
  readonly thumbnailUrl: string | null;
  readonly resolveDetail: (thumbnailKey: string) => Promise<string | null>;
  readonly returnFocus: RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
}

export function DiscoveryStudyDialog({
  badge,
  thumbnailUrl,
  resolveDetail,
  returnFocus,
  onClose,
}: DiscoveryStudyDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [detailState, setDetailState] = useState<
    | { readonly status: "loading"; readonly url: null }
    | { readonly status: "ready"; readonly url: string }
    | { readonly status: "fallback"; readonly url: string | null }
  >({ status: "loading", url: null });
  useModalEnvironment(dialog);
  useModalFocus(dialog, closeButton, onClose, { returnFocus });
  const setTitles = badge.setIds.map(
    (setId) => discoverySets.find((set) => set.setId === setId)?.title ?? setId,
  );
  useEffect(() => {
    let current = true;
    void resolveDetail(badge.thumbnailKey)
      .then((url) => {
        if (current)
          setDetailState(url ? { status: "ready", url } : { status: "fallback", url: thumbnailUrl });
      })
      .catch(() => {
        if (current) setDetailState({ status: "fallback", url: thumbnailUrl });
      });
    return () => {
      current = false;
    };
  }, [badge.thumbnailKey, resolveDetail, thumbnailUrl]);

  return (
    <div
      ref={dialog}
      className="discovery-study"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-study-title"
      tabIndex={-1}
    >
      <article className="discovery-study__card">
        <button
          ref={closeButton}
          className="icon-button discovery-study__close"
          type="button"
          aria-label="Close potential badge preview"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <div className="discovery-study__art">
          {detailState.status === "loading" ? (
            <span role="status">Loading detailed preview…</span>
          ) : detailState.url ? (
            <img
              className={detailState.status === "fallback" ? "discovery-study__fallback-art" : undefined}
              src={detailState.url}
              alt={badge.accessibleDescription}
              decoding="async"
            />
          ) : (
            <span role="img" aria-label={`${badge.title}: Preview unavailable`}>
              Preview unavailable
            </span>
          )}
          <span className="discovery-study__status">
            {detailState.status === "fallback" ? "List preview" : "Selected study"}
          </span>
        </div>
        <div className="discovery-study__details">
          <p className="eyebrow">Potential badge</p>
          <h2 id="discovery-study-title">{badge.title}</h2>
          <p className="discovery-study__criterion">{badge.criterion}</p>
          <dl>
            <div>
              <dt>Location & cuisine</dt>
              <dd>{badge.locationLabel}</dd>
            </div>
            <div>
              <dt>Visual basis</dt>
              <dd>{badge.accessibleDescription}</dd>
            </div>
            {badge.referenceUrl ? (
              <div>
                <dt>Official Michelin listing</dt>
                <dd>
                  <a href={badge.referenceUrl} target="_blank" rel="noreferrer">
                    View Michelin Guide listing
                  </a>
                </dd>
              </div>
            ) : null}
            {badge.visualEvidenceUrl ? (
              <div>
                <dt>Reviewed visual evidence</dt>
                <dd>
                  <a href={badge.visualEvidenceUrl} target="_blank" rel="noreferrer">
                    View source for this visual cue
                  </a>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Status</dt>
              <dd>Not yet published</dd>
            </div>
            <div>
              <dt>Belongs to</dt>
              <dd>{setTitles.join(" · ")}</dd>
            </div>
          </dl>
          <p className="discovery-study__note">
            This is a read-only selected visual study. It has no admitted collectible 3D artifact, runtime
            quotation bank, or activation path yet.
          </p>
        </div>
      </article>
    </div>
  );
}
