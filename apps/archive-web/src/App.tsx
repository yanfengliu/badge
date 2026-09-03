import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { ArchiveRecoveryMode, ArchiveRecoveryReasonCode } from "@badge/archive-application";
import {
  effectiveVisual,
  ownerSuppliedSourceHash,
  toExactVisualPin,
  type ArchiveState,
} from "@badge/archive-domain";

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
  StarterArchiveCompatibilityError,
  validateStarterArchiveForOpen,
} from "./archive-startup";
import { ArchiveClosedScreen } from "./ArchiveClosedScreen";
import { recoverArchiveWithSourceRepair } from "./archive-recovery-assets";
import { fetchCatalogueSourceAsset, isCatalogueSourceHash } from "./catalogue-source-assets";
import { CollectionView } from "./CollectionView";
import { replaySetLinks, type CollectedArchiveRecord, type ReplaySetLink } from "./collection-view-model";
import { preparationDiscoveryPager, replayDiscoveryPager, type DiscoveryPagerStep } from "./discovery-pager";
import { discoveryBadges } from "@badge/catalogue-fixtures/discovery";

import { applyDiscoveryAdjustments, discoveryAdjustmentsFor } from "./discovery-adjustments";
import { DISCOVERY_PAGE_SIZE, DiscoveryView } from "./DiscoveryView";
import { acceptedFixtureQuotation } from "./fixture-quotations";
import { MemoryReplayDialog } from "./MemoryReplayDialog";
import { publishedFixtureForRecordId } from "./published-fixtures";
import { RestoreDialog } from "./RestoreDialog";
import { SayingDisclosureBoundary } from "./SayingDisclosureBoundary";
import { TimelineView } from "./TimelineView";
import { STARTER_OWNER_ID, STARTER_RECORD_IDS } from "./archive-state";
import { downloadBytes } from "./browser-utilities";
import { requiresArchiveRecovery } from "./restore-compatibility";
import {
  archiveRecoveryNotice,
  ArchiveSafetyHandoffRefreshError,
  ArchiveSafetyReclassificationError,
  inspectArchiveBackupFile,
  nextArchiveRestoreAction,
  preparePendingSafetyHandoff,
  restorePendingArchive,
  unrepairableIncompatibleRecoveryMessage,
  type ArchiveSafetyHandoff,
  type PendingArchiveRestore,
} from "./restore-flow";
import {
  archive,
  openArchive,
  observeArchiveStateChanges,
  replaceOpenedArchiveState,
  starterSourceAssets,
  starterState,
} from "./archive-instance";
import { sourceUrlsForResolvedVisuals, useResolvedVisuals } from "./use-resolved-visuals";
import { useArchiveSectionLocation } from "./use-archive-section-location";
import { useDiscoveryPagerKeys } from "./use-discovery-pager-keys";
import { stateAfterStaleArchiveMutation, useSayingWorkflow } from "./use-saying-workflow";
import { useDiscoveryViewState, type DiscoveryReturnSection } from "./use-discovery-view-state";
const forceFallback = new URLSearchParams(window.location.search).has("fallback");

export function App({ onShowStudio }: { readonly onShowStudio: (recordId: string) => void }) {
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
  const preparationReturnRecordId = useRef<string | null>(null);
  const replayReturnFocus = useRef<HTMLButtonElement>(null);
  const sayingDisclosureReturnFocus = useRef<HTMLDivElement>(null);
  const starterAssets = useRef(starterSourceAssets);
  const recoveryMode = useRef<ArchiveRecoveryMode>("repair-corruption");
  const safetyHandoff = useRef<ArchiveSafetyHandoff>("full-backup");
  const stateRescueReason = useRef<ArchiveRecoveryReasonCode | null>(null);
  const { visuals: resolvedVisuals, error: resolvedVisualError } = useResolvedVisuals(archive, state);
  // Badge Studio saves through the module-level bridge while this surface is hidden, so the
  // Archive catches up from the announcement rather than from its own write path.
  useEffect(() => observeArchiveStateChanges(setState), []);
  const visibleNotice =
    notice ?? (resolvedVisualError ? { kind: "error" as const, text: resolvedVisualError } : null);
  useEffect(() => {
    let active = true;
    async function initialize() {
      recoveryMode.current = "repair-corruption";
      safetyHandoff.current = "full-backup";
      stateRescueReason.current = null;
      const outcome = await openArchive();
      if (!active) return;
      if (outcome.ok) {
        setState(outcome.state);
        return;
      }
      const error = outcome.error;
      if (error instanceof StarterArchiveCompatibilityError) {
        recoveryMode.current = "replace-incompatible-readable-state";
        safetyHandoff.current = error.requiresStateRescue ? "state-rescue" : "full-backup";
        stateRescueReason.current = error.stateRescueReason;
      }
      setInitializationFailed(true);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : String(error) });
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
    else discovery.clearReturn();
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
  const discoveryAdjustments = discoveryAdjustmentsFor(state);
  const adjustedDiscoveryBadges = applyDiscoveryAdjustments(discoveryBadges, discoveryAdjustments);
  const collectedRecordIds = new Set(
    (state?.records ?? []).filter((record) => record.lifecycle === "earned").map((record) => record.recordId),
  );
  const replayCandidate = state?.records.find((record) => record.recordId === replayRecordId);
  const replayRecord =
    replayCandidate?.lifecycle === "earned" && replayCandidate.activation
      ? (replayCandidate as CollectedArchiveRecord)
      : null;
  const preparationPager =
    preparingRecordId && activeSection === "discover"
      ? preparationDiscoveryPager(
          preparingRecordId,
          {
            selectedSetId: discovery.viewProps.selectedSetId,
            query: discovery.viewProps.query,
            regionId: discovery.viewProps.selectedRegionId,
          },
          adjustedDiscoveryBadges,
          discoveryAdjustments.tagsByRecordId,
        )
      : null;
  const replayPager = replayRecord
    ? replayDiscoveryPager(
        replayRecord.recordId,
        collectedRecordIds,
        activeSection === "discover" ? discovery.viewProps.selectedSetId : null,
        adjustedDiscoveryBadges,
      )
    : null;
  const modalOverPreparation =
    replayRecordId !== null ||
    ceremonyRecordId !== null ||
    pendingRestore !== null ||
    saying.disclosure.phase !== "idle";
  useDiscoveryPagerKeys(modalOverPreparation ? null : preparationPager, openPagerStep);
  const { visibleLimit, onVisibleLimitChange } = discovery.viewProps;
  useEffect(() => {
    // Keep the rendered Discover page deep enough that "Back to set" can land on the
    // badge card the pager stepped to.
    if (!preparationPager) return;
    const coveringLimit = Math.min(
      Math.ceil(preparationPager.index / DISCOVERY_PAGE_SIZE) * DISCOVERY_PAGE_SIZE,
      preparationPager.total,
    );
    if (visibleLimit < coveringLimit) onVisibleLimitChange(coveringLimit);
  }, [onVisibleLimitChange, preparationPager, visibleLimit]);
  const closeCeremony = useCallback(() => setCeremonyRecordId(null), []);
  const closeReplay = useCallback(() => setReplayRecordId(null), []);
  const closeRestore = useCallback(() => setPendingRestore(null), []);
  function updateDraft(patch: Partial<ActivationDraft>) {
    setDrafts((current) => ({ ...current, [selectedRecordId]: { ...draft, ...patch } }));
  }

  function prepareBadge(recordId: string, trigger?: HTMLButtonElement) {
    if (!state?.records.some((record) => record.recordId === recordId)) {
      setNotice({
        kind: "error",
        text: "This badge is not in the open Archive yet; reload Badge so the newest catalogue records finish installing, then try again.",
      });
      return;
    }
    void saying.observe({ type: "badge-selected", recordId });
    preparationReturnRecordId.current = recordId;
    setSelectedRecordId(recordId);
    setPreparingRecordId(recordId);
    setActiveSection("discover");
    writeArchiveSectionHash("discover");
    setNotice(null);
    if (trigger) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0 });
        preparationHeading.current?.focus({ preventScroll: true });
      });
    }
  }

  function openPagerStep(step: DiscoveryPagerStep) {
    prepareBadge(step.recordId);
  }

  function openReplayStep(step: DiscoveryPagerStep) {
    replayMemory(step.recordId);
  }

  function closePreparation() {
    const returnRecordId = preparationReturnRecordId.current;
    setPreparingRecordId(null);
    requestAnimationFrame(() => focusPreparedBadgeTrigger(returnRecordId));
  }

  function onSectionChange(section: ArchiveSection) {
    setPreparingRecordId(null);
    if (section === "discover") discovery.enterDiscover();
    else discovery.clearReturn();
    setActiveSection(section);
    writeArchiveSectionHash(section);
    setNotice(null);
  }

  function showDiscoverFrom(origin: DiscoveryReturnSection) {
    setPreparingRecordId(null);
    discovery.enterDiscover(origin);
    setActiveSection("discover");
    writeArchiveSectionHash("discover");
    setNotice(null);
  }

  function returnFromDiscover() {
    const target = discovery.returnSection;
    if (!target) return;
    onSectionChange(target);
    requestAnimationFrame(() =>
      document.getElementById(target === "collection" ? "collection-heading" : "timeline-title")?.focus(),
    );
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
    // Stepping between memories keeps the focus target of the trigger that opened the dialog.
    if (replayRecordId === null) {
      replayReturnFocus.current =
        trigger ?? (document.activeElement instanceof HTMLButtonElement ? document.activeElement : null);
    }
    void saying.observe({ type: "ceremony-replayed", recordId });
    setReplayRecordId(recordId);
  }

  function browseSet(setId: string | null) {
    setReplayRecordId(null);
    setPreparingRecordId(null);
    discovery.browseSet(setId, activeSection);
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
      // The pin is the badge as the owner adjusted it, so an activation seals what they see.
      const visualPin = toExactVisualPin(effectiveVisual(selectedRecord));
      const sourceAsset =
        ownerSuppliedSourceHash(selectedRecord) === visualPin.sourceAssetHash
          ? (await archive.visual(selectedRecord.recordId)).sourceAsset
          : (starterAssets.current.get(visualPin.sourceAssetHash) ??
            (isCatalogueSourceHash(visualPin.sourceAssetHash)
              ? await fetchCatalogueSourceAsset(visualPin.sourceAssetHash)
              : undefined));
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
      discovery.clearReturn();
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
        const recovery = await recoverArchiveWithSourceRepair(
          archive,
          pendingRestore,
          STARTER_OWNER_ID,
          starterState,
          state,
          starterAssets.current,
        );
        const recovered = recovery.recovered;
        starterAssets.current.clear();
        for (const [hash, asset] of recovery.assets) starterAssets.current.set(hash, asset);
        const reconciled = await initializeCatalogueExpansion(archive, starterState, recovered.state);
        await validateStarterArchiveForOpen(archive, starterState, reconciled, true);
        const initialized = await initializeReviewedSayingDefaults(archive, starterState, reconciled);
        setState(initialized);
        replaceOpenedArchiveState(initialized);
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
        replaceOpenedArchiveState(restored);
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

  const headerProps = { activeSection, onSectionChange, onBackup, onRestore };
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
          onShowDiscover={() => showDiscoverFrom("timeline")}
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
          pager={preparationPager}
          actionButtonRef={ceremonyReturnFocus}
          headingRef={preparationHeading}
          sayingFocusRef={sayingDisclosureReturnFocus}
          onBack={closePreparation}
          onPagerStep={openPagerStep}
          onDraftChange={updateDraft}
          onActivate={activate}
          onAdjustInStudio={() => onShowStudio(selectedRecord.recordId)}
          onReplay={() => replayMemory(selectedRecord.recordId, ceremonyReturnFocus.current ?? undefined)}
        />
      ) : activeSection === "discover" ? (
        <DiscoveryView
          badges={adjustedDiscoveryBadges}
          tagsByRecordId={discoveryAdjustments.tagsByRecordId}
          collectedRecordIds={collectedRecordIds}
          resolvedSourceUrls={resolvedSourceUrls}
          {...discovery.viewProps}
          returnSection={discovery.returnSection}
          onReturnToOrigin={returnFromDiscover}
          onOpenAvailableBadge={prepareBadge}
          onOpenCollectedBadge={replayMemory}
        />
      ) : (
        <CollectionView
          state={state}
          sourceUrls={resolvedSourceUrls}
          onReplay={replayMemory}
          onBrowseSet={(setId) => browseSet(setId)}
          onShowDiscover={() => showDiscoverFrom("collection")}
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
          pager={replayPager}
          keyboardPagingEnabled={
            ceremonyRecordId === null && pendingRestore === null && saying.disclosure.phase === "idle"
          }
          returnFocus={replayReturnFocus}
          onBrowseSet={browseReplaySet}
          onPagerStep={openReplayStep}
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
