import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArchiveApplication,
  IndexedDbArchiveRepository,
  type ArchiveRecoveryMode,
  type ArchiveRecoveryReasonCode,
  type ArchiveSourceAssetInput,
} from "@badge/archive-application";
import { toExactVisualPin, type ArchiveState } from "@badge/archive-domain";

import { ActivationCeremony } from "./ActivationCeremony";
import { BadgePreparationView } from "./BadgePreparationView";
import {
  activationInputFor,
  defaultActivationDraft,
  selectedArchiveVisual,
  type ActivationDraft,
} from "./app-types";
import { ArchiveHeader, type ArchiveSection } from "./ArchiveHeader";
import { focusPreparedBadgeTrigger } from "./archive-section-focus";
import { archiveSectionFromHash, writeArchiveSectionHash } from "./archive-section-location";
import { ArchiveNotice, type ArchiveNoticeState } from "./ArchiveNotice";
import {
  initializeCatalogueExpansion,
  initializeReviewedSayingDefaults,
  initializeStarterArchive,
  StarterArchiveCompatibilityError,
  validateStarterArchiveForOpen,
} from "./archive-startup";
import { ArchiveClosedScreen } from "./ArchiveClosedScreen";
import {
  fetchCatalogueSourceAsset,
  isCatalogueSourceHash,
  loadCatalogueRepairAssets,
} from "./catalogue-source-assets";
import { CollectionView } from "./CollectionView";
import { replaySetLinks, type CollectedArchiveRecord, type ReplaySetLink } from "./collection-view-model";
import { DiscoveryView } from "./DiscoveryView";
import { acceptedFixtureQuotation } from "./fixture-quotations";
import { MemoryReplayDialog } from "./MemoryReplayDialog";
import { publishedFixtureForRecordId } from "./published-fixtures";
import { RestoreDialog } from "./RestoreDialog";
import { SayingDisclosureBoundary } from "./SayingDisclosureBoundary";
import { TimelineView } from "./TimelineView";
import {
  createStarterArchiveState,
  createStarterQuotationRequests,
  STARTER_OWNER_ID,
  STARTER_RECORD_IDS,
} from "./archive-state";
import { downloadBytes } from "./browser-utilities";
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
import { useArchiveSectionLocation } from "./use-archive-section-location";
import { stateAfterStaleArchiveMutation, useSayingWorkflow } from "./use-saying-workflow";
import { useDiscoveryViewState } from "./use-discovery-view-state";
const repository = new IndexedDbArchiveRepository({
  trustedQuotationRequests: createStarterQuotationRequests(),
});
const archive = new ArchiveApplication(repository);
const forceFallback = new URLSearchParams(window.location.search).has("fallback");
const starterState = createStarterArchiveState();

export function App({ onShowStudio }: { readonly onShowStudio: () => void }) {
  const [state, setState] = useState<ArchiveState | null>(null);
  const [activeSection, setActiveSection] = useState<ArchiveSection>(() =>
    archiveSectionFromHash(window.location.hash),
  );
  const [selectedRecordId, setSelectedRecordId] = useState(STARTER_RECORD_IDS[0]);
  const [preparingRecordId, setPreparingRecordId] = useState<string | null>(null);
  const [replayRecordId, setReplayRecordId] = useState<string | null>(null);
  const discovery = useDiscoveryViewState();
  const [drafts, setDrafts] = useState<Record<string, ActivationDraft>>({});
  const [activating, setActivating] = useState(false);
  const [ceremonyRecordId, setCeremonyRecordId] = useState<string | null>(null);
  const [notice, setNotice] = useState<ArchiveNoticeState | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingArchiveRestore | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const ceremonyReturnFocus = useRef<HTMLButtonElement>(null);
  const preparationHeading = useRef<HTMLHeadingElement>(null);
  const preparationReturnFocus = useRef<HTMLButtonElement | null>(null);
  const replayReturnFocus = useRef<HTMLButtonElement>(null);
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
  useArchiveSectionLocation((section) => {
    setPreparingRecordId(null);
    setReplayRecordId(null);
    if (section === "discover") discovery.resetPage();
    setActiveSection(section);
  });
  const selectedFixture = publishedFixtureForRecordId(selectedRecordId);
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
  const selectedVisual = selectedArchiveVisual(
    selectedRecord,
    selectedFixture?.sourceUrl ?? null,
    resolvedVisuals,
  );
  const closeCeremony = useCallback(() => setCeremonyRecordId(null), []);
  const closeReplay = useCallback(() => setReplayRecordId(null), []);
  const closeRestore = useCallback(() => setPendingRestore(null), []);
  function updateDraft(patch: Partial<ActivationDraft>) {
    setDrafts((current) => ({ ...current, [selectedRecordId]: { ...draft, ...patch } }));
  }

  function prepareBadge(recordId: string, trigger: HTMLButtonElement) {
    if (!state?.records.some((record) => record.recordId === recordId)) {
      setNotice({
        kind: "error",
        text: "This badge is not in the open Archive yet; reload Badge so the newest catalogue records finish installing, then try again.",
      });
      return;
    }
    void saying.observe({ type: "badge-selected", recordId });
    preparationReturnFocus.current = trigger;
    setSelectedRecordId(recordId);
    setPreparingRecordId(recordId);
    setActiveSection("discover");
    writeArchiveSectionHash("discover");
    setNotice(null);
    requestAnimationFrame(() => preparationHeading.current?.focus());
  }

  function closePreparation() {
    const returnFocus = preparationReturnFocus.current;
    setPreparingRecordId(null);
    requestAnimationFrame(() => focusPreparedBadgeTrigger(returnFocus));
  }

  function onSectionChange(section: ArchiveSection) {
    setPreparingRecordId(null);
    if (section === "discover") discovery.enterDiscover();
    setActiveSection(section);
    writeArchiveSectionHash(section);
    setNotice(null);
  }

  function replayMemory(recordId: string, trigger?: HTMLButtonElement) {
    const record = state?.records.find((candidate) => candidate.recordId === recordId);
    if (!record || record.lifecycle !== "earned" || !record.activation) return;
    if (!resolvedVisuals[recordId]) {
      setNotice({
        kind: "error",
        text: `The collected visual for ${record.title} is still resolving; try again.`,
      });
      return;
    }
    replayReturnFocus.current =
      trigger ?? (document.activeElement instanceof HTMLButtonElement ? document.activeElement : null);
    void saying.observe({ type: "ceremony-replayed", recordId });
    setReplayRecordId(recordId);
  }

  function browseSet(setId: string | null) {
    setReplayRecordId(null);
    setPreparingRecordId(null);
    discovery.browseSet(setId);
    setActiveSection("discover");
    writeArchiveSectionHash("discover");
    requestAnimationFrame(() => document.getElementById("discovery-set-heading")?.focus());
  }

  function browseReplaySet(set: ReplaySetLink) {
    replayReturnFocus.current = null;
    browseSet(set.setId);
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
      const sourceAsset =
        starterAssets.current.get(visualPin.sourceAssetHash) ??
        (isCatalogueSourceHash(visualPin.sourceAssetHash)
          ? await fetchCatalogueSourceAsset(visualPin.sourceAssetHash)
          : undefined);
      if (!sourceAsset) {
        throw new Error(
          `The published source art for ${selectedRecord.title} (${visualPin.sourceAssetHash}) is not in this build; reload Badge so the newest catalogue finishes installing, then reopen the badge from Discover.`,
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
      setPreparingRecordId(null);
      setActiveSection("collection");
      writeArchiveSectionHash("collection");
      setCeremonyRecordId(selectedRecord.recordId);
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

  async function onBackup() {
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

  async function onRestore(event: ChangeEvent<HTMLInputElement>) {
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
        const storedState = state ?? (await archive.state().catch(() => null));
        const recovered = await recoverPendingArchive(
          archive,
          pendingRestore,
          STARTER_OWNER_ID,
          [
            ...starterAssets.current.values(),
            ...(await loadCatalogueRepairAssets([
              pendingRestore.incomingState,
              ...(storedState ? [storedState] : []),
            ])),
          ],
          starterState,
        );
        const reconciled = await initializeCatalogueExpansion(archive, starterState, recovered.state);
        await validateStarterArchiveForOpen(archive, starterState, reconciled, true);
        const initialized = await initializeReviewedSayingDefaults(archive, starterState, reconciled);
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

  const headerProps = { activeSection, onSectionChange, onShowStudio, onBackup, onRestore };
  const header = <ArchiveHeader {...headerProps} />;

  if (!state || !selectedRecord) {
    return (
      <>
        {header}
        <ArchiveClosedScreen
          notice={visibleNotice}
          pendingRestore={pendingRestore}
          restoring={restoring}
          onRestoreChange={onRestore}
          onCancelRestore={closeRestore}
          onConfirmRestore={() => void confirmRestore()}
        />
      </>
    );
  }

  const ceremonyRecord = state.records.find((record) => record.recordId === ceremonyRecordId);
  const ceremonyVisual = ceremonyRecord ? resolvedVisuals[ceremonyRecord.recordId] : undefined;
  const resolvedSourceUrls = sourceUrlsForResolvedVisuals(resolvedVisuals);
  const collectedRecordIds = new Set(
    state.records.filter((record) => record.lifecycle === "earned").map((record) => record.recordId),
  );
  const replayCandidate = state.records.find((record) => record.recordId === replayRecordId);
  const replayRecord =
    replayCandidate?.lifecycle === "earned" && replayCandidate.activation
      ? (replayCandidate as CollectedArchiveRecord)
      : null;
  const replayVisual = replayRecord ? resolvedVisuals[replayRecord.recordId] : undefined;
  const replayFixture = replayRecord ? publishedFixtureForRecordId(replayRecord.recordId) : undefined;

  return (
    <SayingDisclosureBoundary
      state={saying.disclosure}
      returnFocus={sayingDisclosureReturnFocus}
      onClose={saying.closeDisclosure}
      onApprove={saying.approveDisclosure}
      onRetry={saying.retryDisclosure}
    >
      {header}

      {activeSection === "timeline" ? (
        <TimelineView
          state={state}
          sourceUrls={resolvedSourceUrls}
          forceFallback={forceFallback}
          onOpenMemory={(recordId) => replayMemory(recordId)}
          onShowDiscover={() => onSectionChange("discover")}
        />
      ) : activeSection === "discover" && preparingRecordId ? (
        <BadgePreparationView
          record={selectedRecord}
          referenceUrl={selectedFixture?.referenceUrl}
          visual={selectedVisual ?? null}
          draft={draft}
          saying={saying}
          activating={activating}
          forceFallback={forceFallback}
          actionButtonRef={ceremonyReturnFocus}
          headingRef={preparationHeading}
          sayingFocusRef={sayingDisclosureReturnFocus}
          onBack={closePreparation}
          onDraftChange={updateDraft}
          onActivate={activate}
          onReplay={() => replayMemory(selectedRecord.recordId, ceremonyReturnFocus.current ?? undefined)}
        />
      ) : activeSection === "discover" ? (
        <DiscoveryView
          collectedRecordIds={collectedRecordIds}
          resolvedSourceUrls={resolvedSourceUrls}
          {...discovery.viewProps}
          onOpenAvailableBadge={prepareBadge}
          onOpenCollectedBadge={replayMemory}
        />
      ) : (
        <CollectionView
          state={state}
          sourceUrls={resolvedSourceUrls}
          onReplay={replayMemory}
          onBrowseSet={(setId) => browseSet(setId)}
          onShowDiscover={() => onSectionChange("discover")}
        />
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

      {replayRecord && replayVisual ? (
        <MemoryReplayDialog
          record={replayRecord}
          sourceUrl={replayVisual.sourceUrl}
          quotation={acceptedFixtureQuotation(replayFixture, replayRecord.acceptedSaying)}
          sets={replaySetLinks(replayRecord)}
          forceFallback={forceFallback}
          returnFocus={replayReturnFocus}
          onBrowseSet={browseReplaySet}
          onClose={closeReplay}
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
