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
          aria-label="Close quote provider review without regenerating"
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
              {state.error ?? "Badge could not load the quote provider disclosure."}
            </p>
            <p>
              Quote regeneration remains off. Retry the disclosure or close this review without making a model
              call.
            </p>
            <div className="saying-disclosure-actions">
              <button className="secondary-button" type="button" onClick={onClose}>
                Close without regenerating
              </button>
              <button className="primary-button" type="button" onClick={onRetry}>
                Retry disclosure
              </button>
            </div>
          </>
        ) : review ? (
          <>
            <p id="saying-disclosure-summary" className="saying-disclosure-summary">
              No achievement data has been sent to Claude yet. These exact values let Claude select one
              source-checked historical quotation ID; Badge supplies its words and attribution. Confirming
              approves this field contract for the page session, so later explicit regeneration requests may
              use a different badge title, criterion, direction, or quotation shortlist without reopening this
              sheet. Reloading or a provider, destination, model, prompt, field, quotation contract,
              normalization, or limit change asks again.
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
              <h3 id="saying-outbound-title">Exact outbound values for this request</h3>
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
                <div>
                  <dt>allowedQuotations</dt>
                  <dd>
                    <pre>{JSON.stringify(review.outbound.allowedQuotations, null, 2)}</pre>
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
                  <dt>allowedQuotations may contain</dt>
                  <dd>{review.disclosure.scope.allowedQuotationFields.join(", ")}</dd>
                </div>
                <div>
                  <dt>Quotation contract</dt>
                  <dd>{review.disclosure.scope.quotationContractVersion}</dd>
                </div>
                <div>
                  <dt>Model output</dt>
                  <dd>{review.disclosure.scope.output}</dd>
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
                Close without regenerating
              </button>
              <button className="primary-button" type="button" onClick={onApprove}>
                Regenerate with Claude
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
