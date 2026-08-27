import type { FormEvent, RefObject } from "react";
import type { ArchiveRecord } from "@badge/archive-domain";
import { BadgeViewer } from "@badge/renderer-web";

import type { ActivationDraft, ArchiveVisualDisplay } from "./app-types";
import { formatDate } from "./browser-utilities";
import { replaySetLinks } from "./collection-view-model";
import type { DiscoveryPager, DiscoveryPagerStep } from "./discovery-pager";
import { DiscoveryPagerControls } from "./DiscoveryPagerControls";
import { MemoryActivationForm } from "./MemoryActivationForm";
import { ReplayActivationButton } from "./ReplayActivationButton";
import { SayingComposer } from "./SayingComposer";
import type { SayingWorkflow } from "./use-saying-workflow";

interface BadgePreparationViewProps {
  readonly record: ArchiveRecord;
  readonly referenceUrl?: string;
  readonly visual: ArchiveVisualDisplay | null;
  readonly draft: ActivationDraft;
  readonly saying: SayingWorkflow;
  readonly activating: boolean;
  readonly forceFallback: boolean;
  readonly pager: DiscoveryPager | null;
  readonly actionButtonRef: RefObject<HTMLButtonElement | null>;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly sayingFocusRef: RefObject<HTMLDivElement | null>;
  readonly onBack: () => void;
  readonly onPagerStep: (step: DiscoveryPagerStep) => void;
  readonly onDraftChange: (patch: Partial<ActivationDraft>) => void;
  readonly onActivate: (event: FormEvent) => void;
  readonly onReplay: () => void;
}

function formatCriterionSentence(criterion: string): string {
  return /[.!?]$/u.test(criterion) ? criterion : `${criterion}.`;
}

export function BadgePreparationView({
  record,
  referenceUrl,
  visual,
  draft,
  saying,
  activating,
  forceFallback,
  pager,
  actionButtonRef,
  headingRef,
  sayingFocusRef,
  onBack,
  onPagerStep,
  onDraftChange,
  onActivate,
  onReplay,
}: BadgePreparationViewProps) {
  const sets = replaySetLinks(record);
  const paged = pager !== null && pager.total > 1;
  return (
    <main className={`archive-main badge-preparation${paged ? " badge-preparation--paged" : ""}`}>
      <section className="artifact-pane" aria-label={`${record.title} badge preview`}>
        <div className="collection-heading">
          <div>
            <p className="eyebrow">Prepare from Discover</p>
            <h1 id="badge-preparation-heading" ref={headingRef} tabIndex={-1}>
              {record.title}
            </h1>
          </div>
          <button className="text-button" type="button" onClick={onBack}>
            Back to set
          </button>
        </div>
        {paged && pager ? <DiscoveryPagerControls pager={pager} onStep={onPagerStep} /> : null}
        <div className={`artifact-stage${forceFallback ? " fallback-stage" : ""}`}>
          {visual ? (
            <BadgeViewer
              sourceUrl={visual.sourceUrl}
              recipe={visual.pin.renderRecipe}
              accessibleDescription={visual.pin.accessibleDescription}
              readOnly
              forceFallback={forceFallback}
            />
          ) : (
            <p className="visual-loading" role="status">
              Resolving the published visual…
            </p>
          )}
        </div>
      </section>

      <section className="story-pane" aria-label={`${record.title} preparation details`}>
        <div className="story-content">
          <div className="pack-line">
            <span>{sets.map((set) => set.title).join(" · ")}</span>
            <span>Published artifact · v1</span>
          </div>
          <h2 className="story-title">{record.title}</h2>
          <p className="criterion">
            <strong>{formatCriterionSentence(record.criterion)}</strong> {record.description}
          </p>
          {referenceUrl ? (
            <p className="preparation-reference">
              <a href={referenceUrl} target="_blank" rel="noreferrer">
                View the official listing for this badge
              </a>
            </p>
          ) : null}

          <SayingComposer
            lifecycle={record.lifecycle}
            acceptedSaying={record.acceptedSaying}
            acceptedQuotation={saying.acceptedQuotation}
            proposal={saying.proposal}
            saving={saying.saving}
            generationBlocked={saying.disclosure.phase !== "idle"}
            providerNote={saying.providerNote}
            successAnnouncement={saying.successAnnouncement}
            hasAlternatives={saying.hasAlternatives}
            focusTargetRef={sayingFocusRef}
            onGenerate={saying.request}
          />

          {record.lifecycle === "earned" && record.activation ? (
            <div className="earned-memory">
              <h2>This memory is collected.</h2>
              <div className="memory-meta">
                <div>
                  <span>Happened</span>
                  <strong>
                    {formatDate(record.activation.occurredStart)}
                    {record.activation.occurredEnd !== record.activation.occurredStart
                      ? ` – ${formatDate(record.activation.occurredEnd)}`
                      : ""}
                  </strong>
                </div>
                <div>
                  <span>Visibility</span>
                  <strong>{record.visibility === "inherit" ? "Archive default" : record.visibility}</strong>
                </div>
              </div>
              {record.note ? <p className="memory-note">{record.note}</p> : null}
              <ReplayActivationButton buttonRef={actionButtonRef} onReplay={onReplay} />
            </div>
          ) : (
            <MemoryActivationForm
              draft={draft}
              acceptedSaying={record.acceptedSaying}
              sourceChecked={saying.acceptedQuotation !== null}
              activating={activating}
              saving={saying.saving}
              buttonRef={actionButtonRef}
              onDraftChange={onDraftChange}
              onSubmit={onActivate}
            />
          )}
        </div>
      </section>
    </main>
  );
}
