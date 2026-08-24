import { useRef, type RefObject } from "react";

import { CloseIcon } from "./icons";
import type { SayingDisclosureGateSnapshot } from "./saying-disclosure-gate";
import { useModalFocus } from "./use-modal-focus";

interface SayingDisclosureDialogProps {
  readonly state: SayingDisclosureGateSnapshot;
  readonly returnFocus: RefObject<HTMLElement | null>;
  readonly onClose: () => void;
  readonly onApprove: () => void;
  readonly onRetry: () => void;
}

export function SayingDisclosureDialog({
  state,
  returnFocus,
  onClose,
  onApprove,
  onRetry,
}: SayingDisclosureDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useModalFocus(dialog, closeButton, onClose, { returnFocus });

  if (state.phase === "idle") return null;
  const review = state.review;

  return (
    <div
      ref={dialog}
      className="ceremony saying-disclosure-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saying-disclosure-title"
      aria-describedby="saying-disclosure-summary"
      tabIndex={-1}
    >
      <div className="saying-disclosure-card">
        <button
          ref={closeButton}
          className="icon-button saying-disclosure-close"
          type="button"
          aria-label="Close saying provider review without generating"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <p className="eyebrow">Private Archive · explicit provider review</p>
        <h2 id="saying-disclosure-title">
          {state.phase === "loading"
            ? "Loading Claude details…"
            : state.phase === "error"
              ? "Claude details are unavailable"
              : "Review what leaves Badge"}
        </h2>

        {state.phase === "loading" ? (
          <p id="saying-disclosure-summary" className="saying-disclosure-loading" role="status">
            Reading the same-origin provider disclosure. No achievement text has been sent to Claude.
          </p>
        ) : state.phase === "error" ? (
          <>
            <p id="saying-disclosure-summary" className="error-copy" role="alert">
              {state.error ?? "Badge could not load the saying provider disclosure."}
            </p>
            <p>
              Generating remains off. Retry the disclosure or close this review without making a model call.
            </p>
            <div className="saying-disclosure-actions">
              <button className="secondary-button" type="button" onClick={onClose}>
                Close without generating
              </button>
              <button className="primary-button" type="button" onClick={onRetry}>
                Retry disclosure
              </button>
            </div>
          </>
        ) : review ? (
          <>
            <p id="saying-disclosure-summary" className="saying-disclosure-summary">
              No achievement data has been sent to Claude yet. Confirm once for this page session; Badge will
              ask again if any disclosed detail changes.
            </p>

            <dl className="saying-disclosure-facts">
              <div>
                <dt>Provider</dt>
                <dd>{review.disclosure.providerLabel}</dd>
              </div>
              <div>
                <dt>Pinned model</dt>
                <dd>{review.disclosure.model}</dd>
              </div>
              <div className="wide">
                <dt>Destination</dt>
                <dd>{review.disclosure.destination}</dd>
              </div>
            </dl>

            <section className="saying-disclosure-section" aria-labelledby="saying-outbound-title">
              <h3 id="saying-outbound-title">Exact outbound values</h3>
              <dl className="saying-outbound-values">
                <div>
                  <dt>title</dt>
                  <dd>{review.outbound.title}</dd>
                </div>
                <div>
                  <dt>criterion</dt>
                  <dd>{review.outbound.criterion}</dd>
                </div>
                <div>
                  <dt>direction</dt>
                  <dd>
                    {review.outbound.direction === undefined ? (
                      <span className="not-sent">Not sent</span>
                    ) : (
                      <pre>{JSON.stringify(review.outbound.direction, null, 2)}</pre>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="saying-disclosure-section" aria-labelledby="saying-not-sent-title">
              <h3 id="saying-not-sent-title">Not sent</h3>
              <p className="saying-scope-intro">
                Badge excludes these Archive fields and transient request controls from the model request.
              </p>
              <ul className="saying-excluded-fields">
                {review.disclosure.scope.excludedFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </section>

            <details className="saying-disclosure-scope">
              <summary>Review field rules and limits</summary>
              <dl>
                <div>
                  <dt>Required</dt>
                  <dd>{review.disclosure.scope.requiredFields.join(", ")}</dd>
                </div>
                <div>
                  <dt>Optional</dt>
                  <dd>{review.disclosure.scope.optionalFields.join(", ")}</dd>
                </div>
                <div>
                  <dt>direction may contain</dt>
                  <dd>{review.disclosure.scope.directionFields.join(", ")}</dd>
                </div>
                <div>
                  <dt>Normalization</dt>
                  <dd>{review.disclosure.scope.normalization}</dd>
                </div>
                <div>
                  <dt>Limits</dt>
                  <dd>
                    {Object.entries(review.disclosure.scope.limits)
                      .map(([name, value]) => `${name}: ${value}`)
                      .join(" · ")}
                  </dd>
                </div>
              </dl>
            </details>

            <section className="saying-disclosure-section" aria-labelledby="saying-system-prompt-title">
              <h3 id="saying-system-prompt-title">Exact system prompt</h3>
              <pre className="saying-system-prompt">{review.disclosure.systemPrompt}</pre>
            </section>

            <p className="saying-fingerprint">Disclosure fingerprint · {review.disclosure.fingerprint}</p>
            <div className="saying-disclosure-actions">
              <button className="secondary-button" type="button" onClick={onClose}>
                Close without generating
              </button>
              <button className="primary-button" type="button" onClick={onApprove}>
                Generate with Claude
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
