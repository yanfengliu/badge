import { useRef, type RefObject } from "react";
import { discoverySets, type SourceStudyDiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

import { CloseIcon } from "./icons";
import { useModalEnvironment } from "./modal-environment";
import { useModalFocus } from "./use-modal-focus";

interface DiscoveryStudyDialogProps {
  readonly badge: SourceStudyDiscoveryBadge;
  readonly sourceUrl: string | null;
  readonly returnFocus: RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
}

export function DiscoveryStudyDialog({ badge, sourceUrl, returnFocus, onClose }: DiscoveryStudyDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useModalEnvironment(dialog);
  useModalFocus(dialog, closeButton, onClose, { returnFocus });
  const setTitles = badge.setIds.map(
    (setId) => discoverySets.find((set) => set.setId === setId)?.title ?? setId,
  );

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
          {sourceUrl ? (
            <img src={sourceUrl} alt={badge.accessibleDescription} decoding="async" />
          ) : (
            <span role="img" aria-label={`${badge.title}: Preview unavailable`}>
              Preview unavailable
            </span>
          )}
          <span className="discovery-study__status">Selected study</span>
        </div>
        <div className="discovery-study__details">
          <p className="eyebrow">Potential badge</p>
          <h2 id="discovery-study-title">{badge.title}</h2>
          <p className="discovery-study__criterion">{badge.criterion}</p>
          <dl>
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
            This is a read-only selected visual study. It has no collectible 3D artifact, verified historical
            quote, or activation path yet.
          </p>
        </div>
      </article>
    </div>
  );
}
