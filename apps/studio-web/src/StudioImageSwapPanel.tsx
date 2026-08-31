import type { ChangeEventHandler, RefObject } from "react";

import type { StudioOperation } from "./studio-operation.js";
import type { StudioReleaseState } from "./studio-release-state.js";

interface StudioImageSwapPanelProps {
  readonly busy: StudioOperation | null;
  readonly canProcess: boolean;
  readonly editingDisabled: boolean;
  readonly onReprocess: () => void;
  readonly onUpload: ChangeEventHandler<HTMLInputElement>;
  readonly releasePhase: StudioReleaseState["phase"];
  readonly uploadDisabled: boolean;
  readonly uploadInput: RefObject<HTMLInputElement | null>;
}

export function StudioImageSwapPanel({
  busy,
  canProcess,
  editingDisabled,
  onReprocess,
  onUpload,
  releasePhase,
  uploadDisabled,
  uploadInput,
}: StudioImageSwapPanelProps) {
  return (
    <section className="image-swap-panel" aria-labelledby="image-swap-title">
      <div className="image-swap-panel__copy">
        <strong id="image-swap-title">
          {releasePhase === "revising" ? "Replacement edition in progress" : "Use your own image"}
        </strong>
        <span>
          Available before or after activation. A later swap starts a new edition; applying it to Archive is a
          separate step, and it never rewrites the sealed activation, date, note, quotation, or original
          visual.
        </span>
        <small>PNG, JPEG, or WebP · up to 16 MB · original preserved unchanged</small>
      </div>
      <div className="source-actions">
        <button
          type="button"
          className="button secondary"
          onClick={() => uploadInput.current?.click()}
          disabled={uploadDisabled}
        >
          {busy === "uploading" ? "Uploading…" : "Swap in my image"}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={onReprocess}
          disabled={!canProcess || editingDisabled}
        >
          {busy === "processing" ? "Processing…" : "Process selected again"}
        </button>
        <input
          ref={uploadInput}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploadDisabled}
          onChange={onUpload}
        />
      </div>
    </section>
  );
}
