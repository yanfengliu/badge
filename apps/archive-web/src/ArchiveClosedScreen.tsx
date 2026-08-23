import { useRef, type ChangeEvent } from "react";

import { RestoreDialog } from "./RestoreDialog";
import type { PendingArchiveRestore } from "./restore-flow";

interface ArchiveClosedScreenProps {
  readonly notice: { readonly kind: "info" | "error"; readonly text: string } | null;
  readonly pendingRestore: PendingArchiveRestore | null;
  readonly restoring: boolean;
  readonly onRestoreChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onCancelRestore: () => void;
  readonly onConfirmRestore: () => void;
}

export function ArchiveClosedScreen({
  notice,
  pendingRestore,
  restoring,
  onRestoreChange,
  onCancelRestore,
  onConfirmRestore,
}: ArchiveClosedScreenProps) {
  const restoreInput = useRef<HTMLInputElement>(null);

  return (
    <>
      <main className="loading-screen">
        {notice?.kind === "error" ? (
          <div role="alert">
            <strong>Archive stayed closed.</strong>
            <span>{notice.text}</span>
            <button className="secondary-button" type="button" onClick={() => restoreInput.current?.click()}>
              Choose backup to recover
            </button>
            <input
              ref={restoreInput}
              className="visually-hidden"
              type="file"
              accept=".badgearchive,application/octet-stream,application/json"
              tabIndex={-1}
              aria-hidden="true"
              onChange={onRestoreChange}
            />
          </div>
        ) : (
          "Opening your private archive…"
        )}
      </main>
      {pendingRestore ? (
        <RestoreDialog
          restore={pendingRestore}
          currentEarnedCount={null}
          busy={restoring}
          onCancel={onCancelRestore}
          onConfirm={onConfirmRestore}
        />
      ) : null}
    </>
  );
}
