import type { RefObject } from "react";
import type { SayingProposalSnapshot } from "@badge/archive-application";
import type { ArchiveLifecycle } from "@badge/archive-domain";
import type { HistoricalQuotation } from "@badge/saying-contract";

import { canActivateWithSaying } from "./app-types";
import { ArrowIcon, SparkIcon } from "./icons";

interface SayingComposerProps {
  readonly lifecycle: ArchiveLifecycle;
  readonly acceptedSaying: string | null;
  readonly acceptedQuotation: HistoricalQuotation | null;
  readonly proposal: SayingProposalSnapshot;
  readonly saving: boolean;
  readonly generationBlocked: boolean;
  readonly providerNote: string;
  readonly successAnnouncement: string | null;
  readonly hasAlternatives?: boolean;
  readonly focusTargetRef: RefObject<HTMLDivElement | null>;
  readonly onGenerate: () => void;
}

interface SayingActivationControlProps {
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
  readonly acceptedSaying: string | null;
  readonly sourceChecked: boolean;
  readonly activating: boolean;
  readonly saving: boolean;
}

function proposalAnnouncement(
  proposal: SayingProposalSnapshot,
  saving: boolean,
  successAnnouncement: string | null,
): string {
  if (proposal.status === "requesting") return "Finding another source-checked quotation.";
  if (saving) return "Saving the regenerated quotation.";
  if (proposal.status === "error") {
    return `Could not regenerate the quote. ${proposal.error ?? "The request failed."} The current quote remains selected.`;
  }
  return successAnnouncement ?? "";
}

function AcceptedSaying({
  acceptedSaying,
  acceptedQuotation,
}: {
  readonly acceptedSaying: string | null;
  readonly acceptedQuotation: HistoricalQuotation | null;
}) {
  if (acceptedQuotation) {
    return (
      <figure className="quotation-proposal accepted-quotation">
        <blockquote>“{acceptedQuotation.text}”</blockquote>
        <figcaption>
          <span className="quotation-provenance-row">
            <span className="quotation-provenance-label">Historical figure</span>
            <strong>{acceptedQuotation.person}</strong>
            {acceptedQuotation.personWikipediaUrl ? (
              <a href={acceptedQuotation.personWikipediaUrl} target="_blank" rel="noreferrer">
                Wikipedia
              </a>
            ) : null}
          </span>
          <span className="quotation-provenance-row">
            <span className="quotation-provenance-label">Quote source</span>
            <cite>{acceptedQuotation.sourceTitle}</cite>
            <a href={acceptedQuotation.sourceUrl} target="_blank" rel="noreferrer">
              View quote source
            </a>
          </span>
        </figcaption>
      </figure>
    );
  }
  return acceptedSaying ? (
    <p className="saying-display">{acceptedSaying}</p>
  ) : (
    <p className="saying-empty">No source-checked quote is available yet.</p>
  );
}

export function SayingActivationControl({
  buttonRef,
  acceptedSaying,
  sourceChecked,
  activating,
  saving,
}: SayingActivationControlProps) {
  const sayingReady = canActivateWithSaying({ sourceChecked, saving });

  return (
    <>
      <button ref={buttonRef} className="primary-button" type="submit" disabled={activating || !sayingReady}>
        {activating ? "Sealing memory…" : saving ? "Saving quote…" : "Activate this badge"}
        <ArrowIcon />
      </button>
      {!sourceChecked ? (
        <p className="field-hint activation-saying-hint">
          {acceptedSaying
            ? "This preserved legacy saying has no verified source. Regenerate it before activation."
            : "A source-checked historical quotation is required before activation."}
        </p>
      ) : null}
    </>
  );
}

export function SayingComposer({
  lifecycle,
  acceptedSaying,
  acceptedQuotation,
  proposal,
  saving,
  generationBlocked,
  providerNote,
  successAnnouncement,
  hasAlternatives = true,
  focusTargetRef,
  onGenerate,
}: SayingComposerProps) {
  const isEarned = lifecycle === "earned";
  const busy = proposal.status === "requesting" || saving;

  return (
    <div ref={focusTargetRef} className="saying-block" tabIndex={-1}>
      <h3 className="saying-label">
        {acceptedQuotation
          ? "Verified historical quotation"
          : acceptedSaying
            ? "Legacy saying · source unverified"
            : "Historical quote"}
      </h3>
      <AcceptedSaying acceptedSaying={acceptedSaying} acceptedQuotation={acceptedQuotation} />
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {proposalAnnouncement(proposal, saving, successAnnouncement)}
      </div>

      {!isEarned && hasAlternatives ? (
        <div className="saying-interactions" aria-busy={busy}>
          <div className="saying-actions">
            <button
              className="text-button"
              type="button"
              disabled={saving || generationBlocked || proposal.status === "requesting"}
              onClick={onGenerate}
            >
              <SparkIcon />
              {generationBlocked
                ? "Review Claude access…"
                : saving
                  ? "Saving quote…"
                  : proposal.status === "requesting"
                    ? "Regenerating…"
                    : "Regenerate quote"}
            </button>
          </div>
          <p className="saying-provider-note">{providerNote}</p>
          {proposal.error ? <p className="error-copy">{proposal.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
