import { useRef } from "react";

import { CloseIcon } from "./icons";
import { currentEarnedCountCopy, nextArchiveRestoreAction, type PendingArchiveRestore } from "./restore-flow";
import { useModalFocus } from "./use-modal-focus";

interface RestoreDialogProps {
  restore: PendingArchiveRestore;
  currentEarnedCount: number | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RestoreDialog({
  restore,
  currentEarnedCount,
  busy,
  onCancel,
  onConfirm,
}: RestoreDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useModalFocus(dialog, closeButton, onCancel, { escapeEnabled: !busy });
  const action = nextArchiveRestoreAction(restore);
  const replacingReadableState = restore.recoveryMode === "replace-incompatible-readable-state";
  const repairingCorruption = restore.recoveryMode === "repair-corruption";
  const rescueOnly = restore.safetyHandoff === "state-rescue";
  const missingSealedQuotation = restore.stateRescueReason === "earned-quotation-missing";

  return (
    <div
      ref={dialog}
      className="ceremony restore-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-title"
      tabIndex={-1}
    >
      <div className="restore-card">
        <button
          ref={closeButton}
          className="icon-button restore-close"
          type="button"
          aria-label="Cancel archive restore"
          onClick={onCancel}
          disabled={busy}
        >
          <CloseIcon />
        </button>
        <p className="eyebrow">Local archive · safety review</p>
        <h2 id="restore-title">
          {replacingReadableState
            ? "Replace the incompatible Archive?"
            : repairingCorruption
              ? "Repair from this backup?"
              : "Restore this backup?"}
        </h2>
        <p>
          <strong>{restore.fileName}</strong> was exported {new Date(restore.exportedAt).toLocaleString()} and
          contains {restore.incomingEarnedCount} earned{" "}
          {restore.incomingEarnedCount === 1 ? "memory" : "memories"}.{" "}
          {currentEarnedCountCopy(currentEarnedCount)}
        </p>
        <p>
          {replacingReadableState
            ? action === "offer-safety-backup"
              ? rescueOnly
                ? missingSealedQuotation
                  ? "The current records include an earned memory that has no sealed quotation. Later words cannot truthfully be assigned to that memory. First, download state-only rescue evidence that names the affected record IDs; it cannot restore the memory and no Archive data changes in this step."
                  : "The current records are readable, but unavailable historical art makes a self-contained backup impossible. First, download state-only rescue evidence that names the affected record IDs; it cannot restore the missing art and no Archive data changes in this step."
                : "The current state is readable but this Archive cannot present it safely. First, download a self-contained safety backup; no Archive data changes in this step."
              : rescueOnly
                ? missingSealedQuotation
                  ? "State-only rescue evidence naming the earned memory with no sealed quotation was offered. Confirm it is saved before the current state is quarantined and replaced with this compatible backup."
                  : "State-only rescue evidence naming the unavailable source-art scope was offered. Confirm it is saved before the current state is quarantined and replaced with this compatible backup."
                : "A safety backup was offered for download. Confirm it is saved before the current state is quarantined and replaced with this compatible backup."
            : repairingCorruption
              ? "Damaged local state or sealed source art will be quarantined. Readable current state is preserved; only unreadable state is replaced from this backup."
              : action === "offer-safety-backup"
                ? "First, download a safety backup of the Archive as it is now. This step does not change Archive data."
                : "A safety backup was offered for download. Make sure it is saved; the next action explicitly confirms that before restoring."}
        </p>
        <div className="restore-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} disabled={busy}>
            {busy
              ? action === "offer-safety-backup"
                ? "Preparing safety backup…"
                : action === "recover"
                  ? replacingReadableState
                    ? "Checking and replacing…"
                    : "Checking and repairing…"
                  : "Checking and restoring…"
              : action === "recover"
                ? replacingReadableState
                  ? rescueOnly
                    ? "I saved the rescue — quarantine and replace"
                    : "I saved it — quarantine and replace"
                  : "Quarantine and repair"
                : action === "offer-safety-backup"
                  ? rescueOnly
                    ? "Download state rescue"
                    : "Download safety backup"
                  : "I saved it — restore now"}
          </button>
        </div>
      </div>
    </div>
  );
}
