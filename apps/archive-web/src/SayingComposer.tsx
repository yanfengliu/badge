import type { RefObject } from "react";
import {
  SAYING_GRAPHEME_LIMIT,
  SAYING_RAW_UTF16_CODE_UNIT_LIMIT,
  countSayingGraphemes,
  type ArchiveLifecycle,
} from "@badge/archive-domain";
import type { SayingProposalSnapshot } from "@badge/archive-application";
import { formatSayingForArchive, type SayingResponse } from "@badge/saying-contract";

import { canActivateWithSaying } from "./app-types";
import type { AcceptedSayingProtection } from "./accepted-saying-attribution";
import { ArrowIcon, SparkIcon } from "./icons";

interface SayingComposerProps {
  readonly title: string;
  readonly lifecycle: ArchiveLifecycle;
  readonly acceptedSaying: string | null;
  readonly proposal: SayingProposalSnapshot;
  readonly editing: boolean;
  readonly manualValue: string;
  readonly manualError: string | null;
  readonly acceptedSayingProtection: AcceptedSayingProtection;
  readonly saving: boolean;
  readonly generationBlocked: boolean;
  readonly proposalSourceLabel: string;
  readonly providerNote: string;
  readonly focusTargetRef: RefObject<HTMLDivElement | null>;
  readonly onGenerate: () => void;
  readonly onUseProposal: () => void;
  readonly onStartWriting: () => void;
  readonly onCancelWriting: () => void;
  readonly onManualChange: (value: string) => void;
  readonly onSaveManual: () => void;
}

interface SayingActivationControlProps {
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
  readonly acceptedSaying: string | null;
  readonly activating: boolean;
  readonly editing: boolean;
  readonly saving: boolean;
  readonly hasUnsavedDraft: boolean;
}

function proposalAnnouncement(proposal: SayingProposalSnapshot): string {
  if (proposal.status === "requesting") return "Preparing a saying proposal.";
  if (proposal.status === "error") {
    return proposal.proposal
      ? `Could not prepare another saying. ${proposal.error ?? "The request failed."} The previous proposal remains available.`
      : `Could not prepare a saying. ${proposal.error ?? "The request failed."}`;
  }
  return proposal.status === "ready" && proposal.proposal
    ? `${proposal.proposal.kind === "quotation" ? "Historical quotation" : "Source-unverified suggestion"} ready: ${formatSayingForArchive(proposal.proposal)}`
    : "";
}

function SayingProposalContent({ proposal }: { readonly proposal: SayingResponse }) {
  if (proposal.kind === "original") return <p>{proposal.saying}</p>;
  return (
    <figure className="quotation-proposal">
      <blockquote>“{proposal.saying}”</blockquote>
      <figcaption>
        — {proposal.quotation.person}, {proposal.quotation.sourceTitle}
        <a href={proposal.quotation.sourceUrl} target="_blank" rel="noreferrer">
          View source
        </a>
      </figcaption>
    </figure>
  );
}

export function SayingActivationControl({
  buttonRef,
  acceptedSaying,
  activating,
  editing,
  saving,
  hasUnsavedDraft,
}: SayingActivationControlProps) {
  const sayingReady = canActivateWithSaying(acceptedSaying, {
    editing,
    saving,
    hasUnsavedDraft,
  });

  return (
    <>
      <button ref={buttonRef} className="primary-button" type="submit" disabled={activating || !sayingReady}>
        {activating
          ? "Sealing memory…"
          : saving
            ? "Saving saying…"
            : hasUnsavedDraft
              ? "Resolve saying draft"
              : editing
                ? "Finish saying edit"
                : "Activate this badge"}
        <ArrowIcon />
      </button>
      {hasUnsavedDraft ? (
        <p className="field-hint activation-saying-hint">
          Save or cancel your unsaved saying draft before activation.
        </p>
      ) : editing ? (
        <p className="field-hint activation-saying-hint">
          Save or cancel your saying edit before activation.
        </p>
      ) : !acceptedSaying ? (
        <p className="field-hint activation-saying-hint">
          Choose a proposed saying or save your own before activation.
        </p>
      ) : null}
    </>
  );
}

export function SayingComposer({
  title,
  lifecycle,
  acceptedSaying,
  proposal,
  editing,
  manualValue,
  manualError,
  acceptedSayingProtection,
  saving,
  generationBlocked,
  proposalSourceLabel,
  providerNote,
  focusTargetRef,
  onGenerate,
  onUseProposal,
  onStartWriting,
  onCancelWriting,
  onManualChange,
  onSaveManual,
}: SayingComposerProps) {
  const isEarned = lifecycle === "earned";
  const inputDescriptionId = `saying-guidance-${title.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`;
  const graphemeCount =
    manualError === null && manualValue.length <= SAYING_RAW_UTF16_CODE_UNIT_LIMIT
      ? countSayingGraphemes(manualValue.trim().replace(/\s+/gu, " "))
      : null;

  return (
    <div ref={focusTargetRef} className="saying-block" tabIndex={-1}>
      <span className="saying-label">Badge saying</span>
      {acceptedSaying ? (
        <p className="saying-display">{acceptedSaying}</p>
      ) : (
        <p className="saying-empty">No saying chosen yet.</p>
      )}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {proposalAnnouncement(proposal)}
      </div>

      {!isEarned && acceptedSayingProtection ? (
        <p className="field-hint">
          The attributed quotation stays exact. Replacing it starts a blank personal saying and changes
          nothing until you save.
        </p>
      ) : null}

      <div className="saying-interactions" aria-busy={proposal.status === "requesting"}>
        {!isEarned && editing ? (
          <div className="saying-editor">
            <label className="field">
              <span className="visually-hidden">Write your saying</span>
              <textarea
                value={manualValue}
                aria-invalid={manualError ? true : undefined}
                aria-describedby={inputDescriptionId}
                disabled={saving}
                onChange={(event) => onManualChange(event.target.value)}
                rows={4}
                autoFocus
              />
            </label>
            <p
              id={inputDescriptionId}
              className={manualError ? "error-copy" : "field-hint"}
              role={manualError ? "alert" : undefined}
            >
              {manualError ??
                `${graphemeCount ?? 0} of ${SAYING_GRAPHEME_LIMIT} graphemes. Use one compact paragraph; when quoting someone, include quotation marks and attribution.`}
            </p>
            <div className="proposal-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={saving || manualError !== null}
                onClick={onSaveManual}
              >
                {saving ? "Saving…" : "Save my saying"}
              </button>
              <button className="text-button" type="button" disabled={saving} onClick={onCancelWriting}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {!isEarned && proposal.proposal ? (
          <div className="proposal">
            <span className="proposal-label">
              {proposal.proposal.kind === "quotation" ? (
                <>Historical quotation · {proposalSourceLabel}</>
              ) : (
                <>Suggestion · source not verified · {proposalSourceLabel}</>
              )}
            </span>
            <SayingProposalContent proposal={proposal.proposal} />
            <div className="proposal-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={saving || generationBlocked || proposal.status === "requesting"}
                onClick={onUseProposal}
              >
                {saving ? "Saving…" : "Use this saying"}
              </button>
            </div>
          </div>
        ) : null}

        {!isEarned ? (
          <>
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
                  : proposal.status === "requesting"
                    ? "Preparing…"
                    : proposal.proposal
                      ? "Try another"
                      : "Generate saying"}
              </button>
              {!editing ? (
                <button className="text-button" type="button" disabled={saving} onClick={onStartWriting}>
                  {acceptedSayingProtection ? "Replace with my own" : "Write my own"}
                </button>
              ) : null}
            </div>
            <p className="saying-provider-note">{providerNote}</p>
            {proposal.error ? <p className="error-copy">{proposal.error}</p> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
