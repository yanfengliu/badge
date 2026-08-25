import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArchiveApplication,
  IndexedDbArchiveRepository,
  type ArchiveRecoveryMode,
  type ArchiveRecoveryReasonCode,
  type ArchiveSourceAssetInput,
} from "@badge/archive-application";
import { toExactVisualPin, type ArchiveState } from "@badge/archive-domain";
import { starterBadges, starterCollection } from "@badge/catalogue-fixtures/archive";
import { BadgeViewer } from "@badge/renderer-web";

import { ActivationCeremony } from "./ActivationCeremony";
import {
  activationInputFor,
  defaultActivationDraft,
  selectedArchiveVisual,
  type ActivationDraft,
} from "./app-types";
import { ArchiveHeader, type ArchiveSection } from "./ArchiveHeader";
import { focusCollectionThen } from "./archive-section-focus";
import { ArchiveNotice, type ArchiveNoticeState } from "./ArchiveNotice";
import {
  initializeReviewedSayingDefaults,
  initializeStarterArchive,
  StarterArchiveCompatibilityError,
  validateStarterArchiveForOpen,
} from "./archive-startup";
import { ArchiveClosedScreen } from "./ArchiveClosedScreen";
import { BadgeRail } from "./BadgeRail";
import { DiscoveryView } from "./DiscoveryView";
import { ReplayActivationButton } from "./ReplayActivationButton";
import { RestoreDialog } from "./RestoreDialog";
import { SayingComposer } from "./SayingComposer";
import { SayingDisclosureBoundary } from "./SayingDisclosureBoundary";
import { TimelineView } from "./TimelineView";
import {
  createStarterArchiveState,
  createStarterQuotationRequests,
  STARTER_OWNER_ID,
  STARTER_RECORD_IDS,
} from "./archive-state";
import { downloadBytes, formatDate } from "./browser-utilities";
import { CheckIcon } from "./icons";
import { MemoryActivationForm } from "./MemoryActivationForm";
import { requiresArchiveRecovery } from "./restore-compatibility";
import {
  archiveRecoveryNotice,
  ArchiveSafetyHandoffRefreshError,
  ArchiveSafetyReclassificationError,
  inspectArchiveBackupFile,
  nextArchiveRestoreAction,
  preparePendingSafetyHandoff,
  recoverPendingArchive,
  restorePendingArchive,
  unrepairableIncompatibleRecoveryMessage,
  type ArchiveSafetyHandoff,
  type PendingArchiveRestore,
} from "./restore-flow";
import { sourceUrlsForResolvedVisuals, useResolvedVisuals } from "./use-resolved-visuals";
import { stateAfterStaleArchiveMutation, useSayingWorkflow } from "./use-saying-workflow";
const repository = new IndexedDbArchiveRepository({
  trustedQuotationRequests: createStarterQuotationRequests(),
});
const archive = new ArchiveApplication(repository);
const forceFallback = new URLSearchParams(window.location.search).has("fallback");
const starterState = createStarterArchiveState();

export function App() {
  const [state, setState] = useState<ArchiveState | null>(null);
  const [activeSection, setActiveSection] = useState<ArchiveSection>("collection");
  const [selectedRecordId, setSelectedRecordId] = useState(STARTER_RECORD_IDS[0]);
  const [drafts, setDrafts] = useState<Record<string, ActivationDraft>>({});
  const [activating, setActivating] = useState(false);
  const [ceremonyId, setCeremonyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<ArchiveNoticeState | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingArchiveRestore | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const ceremonyReturnFocus = useRef<HTMLButtonElement>(null);
  const sayingDisclosureReturnFocus = useRef<HTMLDivElement>(null);
  const starterAssets = useRef(new Map<string, ArchiveSourceAssetInput>());
  const recoveryMode = useRef<ArchiveRecoveryMode>("repair-corruption");
  const safetyHandoff = useRef<ArchiveSafetyHandoff>("full-backup");
  const stateRescueReason = useRef<ArchiveRecoveryReasonCode | null>(null);
  const { visuals: resolvedVisuals, error: resolvedVisualError } = useResolvedVisuals(archive, state);
  const visibleNotice =
    notice ?? (resolvedVisualError ? { kind: "error" as const, text: resolvedVisualError } : null);
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        recoveryMode.current = "repair-corruption";
        safetyHandoff.current = "full-backup";
        stateRescueReason.current = null;
        const loaded = await initializeStarterArchive(archive, starterState, (assets) => {
          starterAssets.current = new Map(assets.map((asset) => [asset.hash, asset]));
        });
        if (active) setState(loaded);
      } catch (error) {
        if (!active) return;
        if (error instanceof StarterArchiveCompatibilityError) {
          recoveryMode.current = "replace-incompatible-readable-state";
          safetyHandoff.current = error.requiresStateRescue ? "state-rescue" : "full-backup";
          stateRescueReason.current = error.stateRescueReason;
        }
        setInitializationFailed(true);
        setNotice({ kind: "error", text: error instanceof Error ? error.message : String(error) });
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, []);

  const selectedFixture =
    starterBadges.find((badge) => `starter:${badge.definitionId}` === selectedRecordId) ?? starterBadges[0];
  const selectedRecord = state?.records.find((record) => record.recordId === selectedRecordId);
  const draft = drafts[selectedRecordId] ?? defaultActivationDraft();
  const saying = useSayingWorkflow({
    archive,
    selectedRecordId,
    selectedRecord,
    onArchiveState: setState,
    onError: (text) => setNotice({ kind: "error", text }),
  });
  const earnedCount = state?.records.filter((record) => record.lifecycle === "earned").length ?? 0;
  const selectedVisual = selectedArchiveVisual(selectedRecord, selectedFixture.sourceUrl, resolvedVisuals);
  const closeCeremony = useCallback(() => setCeremonyId(null), []);
  const closeRestore = useCallback(() => setPendingRestore(null), []);

  function updateDraft(patch: Partial<ActivationDraft>) {
    setDrafts((current) => ({ ...current, [selectedRecordId]: { ...draft, ...patch } }));
  }

  function selectBadge(recordId: string) {
    void saying.observe({ type: "badge-selected", recordId });
    setSelectedRecordId(recordId);
    setActiveSection("collection");
    setNotice(null);
  }

  function openDiscoveredBadge(recordId: string) {
    focusCollectionThen(() => selectBadge(recordId));
  }

  function replayCeremony(recordId: string) {
    void saying.observe({ type: "ceremony-replayed", recordId });
    setCeremonyId(recordId);
  }

  async function activate(event: FormEvent) {
    event.preventDefault();
    if (!selectedRecord) return;
    await saying.observe({ type: "badge-activated", recordId: selectedRecord.recordId });
    setActivating(true);
    setNotice(null);
    try {
      if (!saying.acceptedQuotation) {
        throw new Error(
          `The selected quote for ${selectedRecord.title} has no verified historical source; regenerate it before activation. No Archive data was changed.`,
        );
      }
      const visualPin = toExactVisualPin(selectedRecord.publishedVisual);
      const sourceAsset = starterAssets.current.get(visualPin.sourceAssetHash);
      if (!sourceAsset) {
        throw new Error(
          `Archive source ${visualPin.sourceAssetHash} is not loaded; reload the app before activating this badge.`,
        );
      }
      const result = await archive.activate(
        activationInputFor(selectedRecord, draft, visualPin),
        sourceAsset,
        {
          kind: "quotation",
          saying: saying.acceptedQuotation.text,
          quotation: saying.acceptedQuotation,
        },
        selectedRecord.quotationRevision,
      );
      setState(result.state);
      setCeremonyId(selectedRecord.recordId);
    } catch (error) {
      let message = error instanceof Error ? error.message : String(error);
      try {
        const refreshedState = await stateAfterStaleArchiveMutation(archive, error);
        if (refreshedState) setState(refreshedState);
      } catch (refreshError) {
        message = `${message} Badge also could not reload the newer Archive state: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`;
      }
      setNotice({ kind: "error", text: message });
    } finally {
      setActivating(false);
    }
  }

  async function exportBackup() {
    try {
      downloadBytes(
        await archive.exportBackup(),
        "my-badge-archive.badgearchive",
        "application/octet-stream",
      );
      setNotice({
        kind: "info",
        text: "A self-contained Archive backup was offered for download. Keep this personal file outside Git.",
      });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : String(error) });
    }
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPendingRestore(
        await inspectArchiveBackupFile(
          file,
          starterState,
          requiresArchiveRecovery(initializationFailed, resolvedVisualError) ? recoveryMode.current : null,
          safetyHandoff.current,
          stateRescueReason.current,
        ),
      );
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : String(error) });
    }
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    setRestoring(true);
    setNotice(null);
    try {
      const action = nextArchiveRestoreAction(pendingRestore);
      if (action === "recover") {
        await saying.observe({ type: "archive-restored" });
        const recovered = await recoverPendingArchive(
          archive,
          pendingRestore,
          STARTER_OWNER_ID,
          [...starterAssets.current.values()],
          starterState,
        );
        await validateStarterArchiveForOpen(archive, starterState, recovered.state, true);
        const initialized = await initializeReviewedSayingDefaults(archive, starterState, recovered.state);
        setState(initialized);
        setInitializationFailed(false);
        recoveryMode.current = "repair-corruption";
        safetyHandoff.current = "full-backup";
        stateRescueReason.current = null;
        setNotice({
          kind: "info",
          text: archiveRecoveryNotice(recovered, pendingRestore.recoveryMode),
        });
      } else if (action === "offer-safety-backup") {
        const prepared = await preparePendingSafetyHandoff(archive, pendingRestore, starterState);
        downloadBytes(prepared.bytes, prepared.fileName, prepared.mimeType);
        setPendingRestore(prepared.restore);
        setNotice({ kind: "info", text: prepared.notice });
        return;
      } else {
        await saying.observe({ type: "archive-restored" });
        const restored = await restorePendingArchive(archive, pendingRestore, starterState);
        setState(restored);
        setNotice({
          kind: "info",
          text: `Restored ${restored.records.length} records from ${pendingRestore.fileName} after you confirmed the safety backup was saved.`,
        });
      }
      setPendingRestore(null);
    } catch (error) {
      if (error instanceof ArchiveSafetyHandoffRefreshError) {
        downloadBytes(error.preparation.bytes, error.preparation.fileName, error.preparation.mimeType);
        setPendingRestore(error.preparation.restore);
        setNotice({ kind: "info", text: error.preparation.notice });
        return;
      }
      if (error instanceof ArchiveSafetyReclassificationError) {
        recoveryMode.current = "repair-corruption";
        safetyHandoff.current = "full-backup";
        stateRescueReason.current = null;
        setPendingRestore(error.restore);
        setNotice({ kind: "info", text: error.message });
        return;
      }
      let visibleError = error;
      if (error instanceof StarterArchiveCompatibilityError) {
        recoveryMode.current = "replace-incompatible-readable-state";
        safetyHandoff.current = error.requiresStateRescue ? "state-rescue" : "full-backup";
        stateRescueReason.current = error.stateRescueReason;
      } else {
        const message = await unrepairableIncompatibleRecoveryMessage(error, archive, starterState);
        if (message) {
          recoveryMode.current = "replace-incompatible-readable-state";
          safetyHandoff.current = "state-rescue";
          stateRescueReason.current = "source-art-unavailable";
          visibleError = new Error(message, { cause: error });
        }
      }
      setPendingRestore(null);
      setNotice({
        kind: "error",
        text: visibleError instanceof Error ? visibleError.message : String(visibleError),
      });
    } finally {
      setRestoring(false);
    }
  }

  if (!state || !selectedRecord) {
    return (
      <ArchiveClosedScreen
        notice={visibleNotice}
        pendingRestore={pendingRestore}
        restoring={restoring}
        onRestoreChange={restoreBackup}
        onCancelRestore={closeRestore}
        onConfirmRestore={() => void confirmRestore()}
      />
    );
  }

  const ceremonyRecord = ceremonyId
    ? state.records.find((record) => record.recordId === ceremonyId)
    : undefined;
  const ceremonyVisual = ceremonyRecord ? resolvedVisuals[ceremonyRecord.recordId] : undefined;
  const resolvedSourceUrls = sourceUrlsForResolvedVisuals(resolvedVisuals);

  return (
    <SayingDisclosureBoundary
      state={saying.disclosure}
      returnFocus={sayingDisclosureReturnFocus}
      onClose={saying.closeDisclosure}
      onApprove={saying.approveDisclosure}
      onRetry={saying.retryDisclosure}
    >
      <ArchiveHeader
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onBackup={() => void exportBackup()}
        onRestore={restoreBackup}
      />

      {activeSection === "timeline" ? (
        <TimelineView
          state={state}
          sourceUrls={resolvedSourceUrls}
          forceFallback={forceFallback}
          onOpenMemory={selectBadge}
          onShowCollection={() => setActiveSection("collection")}
        />
      ) : activeSection === "discover" ? (
        <DiscoveryView onOpenAvailableBadge={openDiscoveredBadge} />
      ) : (
        <main className="archive-main">
          <section className="artifact-pane" aria-label="Badge collection">
            <div className="collection-heading">
              <div>
                <p className="eyebrow">{starterCollection.eyebrow}</p>
                <h1>{starterCollection.title}</h1>
              </div>
              <div className="progress-copy">
                <strong>
                  {earnedCount} / {state.records.length}
                </strong>
                <span>memories sealed</span>
              </div>
            </div>

            <div className={`artifact-stage${forceFallback ? " fallback-stage" : ""}`}>
              <span className={`artifact-status ${selectedRecord.lifecycle === "earned" ? "earned" : ""}`}>
                {selectedRecord.lifecycle === "earned" ? <CheckIcon /> : null}
                {selectedRecord.lifecycle}
              </span>
              {selectedVisual ? (
                <BadgeViewer
                  sourceUrl={selectedVisual.sourceUrl}
                  recipe={selectedVisual.pin.renderRecipe}
                  accessibleDescription={selectedVisual.pin.accessibleDescription}
                  readOnly
                  forceFallback={forceFallback}
                />
              ) : (
                <p className="visual-loading" role="status">
                  Resolving the sealed visual…
                </p>
              )}
            </div>

            <BadgeRail
              state={state}
              selectedRecordId={selectedRecordId}
              earnedSourceUrls={resolvedSourceUrls}
              onSelect={selectBadge}
            />
          </section>

          <section className="story-pane" aria-label={`${selectedRecord.title} memory details`}>
            <div className="story-content">
              <div className="pack-line">
                <span>
                  {(
                    selectedRecord.collectionRefs[0]?.collectionId ?? selectedFixture.collectionId
                  ).replaceAll("-", " ")}
                </span>
                <span>Published artifact · v1</span>
              </div>
              <h2 className="story-title">{selectedRecord.title}</h2>
              <p className="criterion">
                <strong>{selectedRecord.criterion}.</strong> {selectedRecord.description}
              </p>

              <SayingComposer
                lifecycle={selectedRecord.lifecycle}
                acceptedSaying={selectedRecord.acceptedSaying}
                acceptedQuotation={saying.acceptedQuotation}
                proposal={saying.proposal}
                saving={saying.saving}
                generationBlocked={saying.disclosure.phase !== "idle"}
                providerNote={saying.providerNote}
                successAnnouncement={saying.successAnnouncement}
                focusTargetRef={sayingDisclosureReturnFocus}
                onGenerate={saying.request}
              />

              {selectedRecord.lifecycle === "earned" && selectedRecord.activation ? (
                <div className="earned-memory">
                  <h2>This memory is sealed.</h2>
                  <div className="memory-meta">
                    <div>
                      <span>Happened</span>
                      <strong>
                        {formatDate(selectedRecord.activation.occurredStart)}
                        {selectedRecord.activation.occurredEnd !== selectedRecord.activation.occurredStart
                          ? ` – ${formatDate(selectedRecord.activation.occurredEnd)}`
                          : ""}
                      </strong>
                    </div>
                    <div>
                      <span>Visibility</span>
                      <strong>
                        {selectedRecord.visibility === "inherit"
                          ? "Archive default"
                          : selectedRecord.visibility}
                      </strong>
                    </div>
                  </div>
                  {selectedRecord.note ? <p className="memory-note">{selectedRecord.note}</p> : null}
                  <ReplayActivationButton
                    buttonRef={ceremonyReturnFocus}
                    onReplay={() => replayCeremony(selectedRecord.recordId)}
                  />
                </div>
              ) : (
                <MemoryActivationForm
                  draft={draft}
                  acceptedSaying={selectedRecord.acceptedSaying}
                  sourceChecked={saying.acceptedQuotation !== null}
                  activating={activating}
                  saving={saying.saving}
                  buttonRef={ceremonyReturnFocus}
                  onDraftChange={updateDraft}
                  onSubmit={activate}
                />
              )}
            </div>
          </section>
        </main>
      )}

      {ceremonyRecord && ceremonyVisual ? (
        <ActivationCeremony
          title={ceremonyRecord.title}
          saying={ceremonyRecord.acceptedSaying ?? ""}
          sourceUrl={ceremonyVisual.sourceUrl}
          recipe={ceremonyVisual.pin.renderRecipe}
          accessibleDescription={ceremonyVisual.pin.accessibleDescription}
          forceFallback={forceFallback}
          returnFocus={ceremonyReturnFocus}
          onClose={closeCeremony}
        />
      ) : null}

      {pendingRestore ? (
        <RestoreDialog
          restore={pendingRestore}
          currentEarnedCount={earnedCount}
          busy={restoring}
          onCancel={closeRestore}
          onConfirm={() => void confirmRestore()}
        />
      ) : null}

      <ArchiveNotice notice={visibleNotice} onDismiss={() => setNotice(null)} />
    </SayingDisclosureBoundary>
  );
}
