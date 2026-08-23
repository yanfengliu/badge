import { useRef, type RefObject } from "react";
import { BadgeViewer } from "@badge/renderer-web";
import type { RenderRecipe } from "@badge/render-recipe";

import { CloseIcon } from "./icons";
import { useModalFocus } from "./use-modal-focus";

interface ActivationCeremonyProps {
  title: string;
  saying: string;
  sourceUrl: string;
  recipe: RenderRecipe;
  accessibleDescription: string;
  forceFallback: boolean;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function ActivationCeremony({
  title,
  saying,
  sourceUrl,
  recipe,
  accessibleDescription,
  forceFallback,
  returnFocus,
  onClose,
}: ActivationCeremonyProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useModalFocus(dialog, closeButton, onClose, { returnFocus });

  return (
    <div
      ref={dialog}
      className="ceremony"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ceremony-title"
      tabIndex={-1}
    >
      <div className="ceremony-card">
        <button
          ref={closeButton}
          className="icon-button ceremony-close"
          type="button"
          aria-label="Close activation ceremony"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <BadgeViewer
          className="ceremony-viewer"
          sourceUrl={sourceUrl}
          recipe={recipe}
          accessibleDescription={accessibleDescription}
          readOnly
          forceFallback={forceFallback}
        />
        <div className="ceremony-copy">
          <span className="eyebrow">Achievement activated</span>
          <h2 id="ceremony-title">{title}</h2>
          <p>“{saying}”</p>
        </div>
      </div>
    </div>
  );
}
