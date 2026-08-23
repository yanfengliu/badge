import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArchiveApplication,
  IndexedDbArchiveRepository,
  type ArchiveRecoveryMode,
  type ArchiveSourceAssetInput,
} from "@badge/archive-application";
import { toExactVisualPin, type ArchiveState, type Visibility } from "@badge/archive-domain";
import { starterBadges, starterCollection } from "@badge/catalogue-fixtures/archive";
import { BadgeViewer } from "@badge/renderer-web";

import { ActivationCeremony } from "./ActivationCeremony";
import {
  activationInputFor,
  defaultActivationDraft,
  selectedArchiveVisual,
  selectedSayingProposal,
  type ActivationDraft,
} from "./app-types";
import { ArchiveHeader } from "./ArchiveHeader";
import {
  initializeStarterArchive,
  StarterArchiveCompatibilityError,
  validateStarterArchiveForOpen,
} from "./archive-startup";
import { ArchiveClosedScreen } from "./ArchiveClosedScreen";
import { BadgeRail } from "./BadgeRail";
import { RestoreDialog } from "./RestoreDialog";
import { createStarterArchiveState, STARTER_OWNER_ID, STARTER_RECORD_IDS } from "./archive-state";
import { downloadBytes, formatDate } from "./browser-utilities";
import { ArrowIcon, CheckIcon, SparkIcon } from "./icons";
import { requiresArchiveRecovery } from "./restore-compatibility";
import {
  archiveRecoveryNotice,
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
import { useResolvedVisuals } from "./use-resolved-visuals";
const repository = new IndexedDbArchiveRepository();
const archive = new ArchiveApplication(repository);
const forceFallback = new URLSearchParams(window.location.search).has("fallback");
const starterState = createStarterArchiveState();

export function App() {
  const [state, setState] = useState<ArchiveState | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState(STARTER_RECORD_IDS[0]);
  const [drafts, setDrafts] = useState<Record<string, ActivationDraft>>({});
  const [proposalIndex, setProposalIndex] = useState<Record<string, number>>({});
  const [editingSaying, setEditingSaying] = useState(false);
  const [activating, setActivating] = useState(false);
  const [ceremonyId, setCeremonyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingArchiveRestore | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const ceremonyReturnFocus = useRef<HTMLButtonElement>(null);
  const starterAssets = useRef(new Map<string, ArchiveSourceAssetInput>());
  const recoveryMode = useRef<ArchiveRecoveryMode>("repair-corruption");
  const safetyHandoff = useRef<ArchiveSafetyHandoff>("full-backup");
  const { visuals: resolvedVisuals, error: resolvedVisualError } = useResolvedVisuals(archive, state);
  const visibleNotice =
    notice ?? (resolvedVisualError ? { kind: "error" as const, text: resolvedVisualError } : null);
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        recoveryMode.current = "repair-corruption";
        safetyHandoff.current = "full-backup";
        const loaded = await initializeStarterArchive(archive, starterState, (assets) => {
          starterAssets.current = new Map(assets.map((asset) => [asset.hash, asset]));
        });
        if (active) setState(loaded);
      } catch (error) {
        if (!active) return;
        if (error instanceof StarterArchiveCompatibilityError) {
          recoveryMode.current = "replace-incompatible-readable-state";
          safetyHandoff.current = "full-backup";
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
  const suggestion = selectedSayingProposal(
    selectedFixture.sayingSuggestions,
    proposalIndex[selectedRecordId] ?? 0,
  );
  const draft = drafts[selectedRecordId] ?? defaultActivationDraft(suggestion);
  const earnedCount = state?.records.filter((record) => record.lifecycle === "earned").length ?? 0;
  const selectedVisual = selectedArchiveVisual(selectedRecord, selectedFixture.sourceUrl, resolvedVisuals);
  const closeCeremony = useCallback(() => setCeremonyId(null), []);
  const closeRestore = useCallback(() => setPendingRestore(null), []);

  function updateDraft(patch: Partial<ActivationDraft>) {
    setDrafts((current) => ({ ...current, [selectedRecordId]: { ...draft, ...patch } }));
  }

  function selectBadge(recordId: string) {
    setSelectedRecordId(recordId);
    setEditingSaying(false);
    setNotice(null);
  }

  function proposeAnother() {
    const next = (proposalIndex[selectedRecordId] ?? 0) + 1;
    setProposalIndex((current) => ({ ...current, [selectedRecordId]: next }));
    updateDraft({
      saying: selectedFixture.sayingSuggestions[next % selectedFixture.sayingSuggestions.length],
    });
  }

  async function activate(event: FormEvent) {
    event.preventDefault();
    if (!selectedRecord) return;
    setActivating(true);
    setNotice(null);
    try {
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
      );
      setState(result.state);
      setCeremonyId(selectedRecord.recordId);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : String(error) });
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
        const recovered = await recoverPendingArchive(archive, pendingRestore, STARTER_OWNER_ID, [
          ...starterAssets.current.values(),
        ]);
        await validateStarterArchiveForOpen(archive, starterState, recovered.state, true);
        setState(recovered.state);
        setInitializationFailed(false);
        recoveryMode.current = "repair-corruption";
        safetyHandoff.current = "full-backup";
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
        const restored = await restorePendingArchive(archive, pendingRestore);
        setState(restored);
        setNotice({
          kind: "info",
          text: `Restored ${restored.records.length} records from ${pendingRestore.fileName} after you confirmed the safety backup was saved.`,
        });
      }
      setPendingRestore(null);
    } catch (error) {
      if (error instanceof ArchiveSafetyReclassificationError) {
        recoveryMode.current = "repair-corruption";
        safetyHandoff.current = "full-backup";
        setPendingRestore(error.restore);
        setNotice({ kind: "info", text: error.message });
        return;
      }
      let visibleError = error;
      if (error instanceof StarterArchiveCompatibilityError) {
        recoveryMode.current = "replace-incompatible-readable-state";
        safetyHandoff.current = "full-backup";
      } else {
        const message = await unrepairableIncompatibleRecoveryMessage(error, archive, starterState);
        if (message) {
          recoveryMode.current = "replace-incompatible-readable-state";
          safetyHandoff.current = "state-rescue";
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

  return (
    <div className="archive-shell">
      <ArchiveHeader onBackup={() => void exportBackup()} onRestore={restoreBackup} />

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
            earnedSourceUrls={Object.fromEntries(
              Object.entries(resolvedVisuals).map(([recordId, visual]) => [recordId, visual.sourceUrl]),
            )}
            onSelect={selectBadge}
          />
        </section>

        <section className="story-pane" aria-label={`${selectedRecord.title} memory details`}>
          <div className="story-content">
            <div className="pack-line">
              <span>
                {(selectedRecord.collectionRefs[0]?.collectionId ?? selectedFixture.collectionId).replaceAll(
                  "-",
                  " ",
                )}
              </span>
              <span>Published artifact · v1</span>
            </div>
            <h2 className="story-title">{selectedRecord.title}</h2>
            <p className="criterion">
              <strong>{selectedRecord.criterion}.</strong> {selectedRecord.description}
            </p>

            <div className="saying-block">
              <span className="saying-label">One-line saying</span>
              {editingSaying && selectedRecord.lifecycle !== "earned" ? (
                <label className="field">
                  <span className="visually-hidden">Write your saying</span>
                  <input
                    value={draft.saying}
                    maxLength={120}
                    onChange={(event) => updateDraft({ saying: event.target.value })}
                    autoFocus
                  />
                </label>
              ) : (
                <p className="saying-display">“{selectedRecord.acceptedSaying ?? draft.saying}”</p>
              )}
              {selectedRecord.lifecycle !== "earned" ? (
                <div className="saying-actions">
                  <button className="text-button" type="button" onClick={proposeAnother}>
                    <SparkIcon /> Propose another
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setEditingSaying((value) => !value)}
                  >
                    {editingSaying ? "Use this line" : "Write my own"}
                  </button>
                </div>
              ) : null}
            </div>

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
                <button
                  ref={ceremonyReturnFocus}
                  className="secondary-button"
                  type="button"
                  onClick={() => setCeremonyId(selectedRecord.recordId)}
                >
                  Replay activation
                </button>
              </div>
            ) : (
              <form className="memory-form" onSubmit={activate}>
                <div className="date-grid">
                  <label className="field">
                    <span className="field-label">From</span>
                    <input
                      type="date"
                      required
                      value={draft.occurredStart}
                      onChange={(event) => updateDraft({ occurredStart: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">To · optional</span>
                    <input
                      type="date"
                      min={draft.occurredStart || undefined}
                      value={draft.occurredEnd}
                      onChange={(event) => updateDraft({ occurredEnd: event.target.value })}
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">A note to future you · optional</span>
                  <textarea
                    value={draft.note}
                    placeholder="What made this one stay with you?"
                    onChange={(event) => updateDraft({ note: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Visibility</span>
                  <select
                    value={draft.visibility}
                    onChange={(event) => updateDraft({ visibility: event.target.value as Visibility })}
                  >
                    <option value="inherit">Use archive default</option>
                    <option value="private">Private</option>
                    <option value="public">Public when sharing exists</option>
                  </select>
                  <p className="field-hint">
                    This app stays local. The choice is remembered for future sharing.
                  </p>
                </label>
                <button
                  ref={ceremonyReturnFocus}
                  className="primary-button"
                  type="submit"
                  disabled={activating}
                >
                  {activating ? "Sealing memory…" : "Activate this badge"}
                  <ArrowIcon />
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

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

      {visibleNotice ? (
        <div
          className={`notice${visibleNotice.kind === "error" ? " error" : ""}`}
          role={visibleNotice.kind === "error" ? "alert" : "status"}
          onClick={() => setNotice(null)}
        >
          {visibleNotice.text}
        </div>
      ) : null}
    </div>
  );
}
