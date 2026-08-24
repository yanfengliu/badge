import type { FormEvent, RefObject } from "react";
import type { Visibility } from "@badge/archive-domain";

import type { ActivationDraft } from "./app-types";
import { SayingActivationControl } from "./SayingComposer";

interface MemoryActivationFormProps {
  readonly draft: ActivationDraft;
  readonly acceptedSaying: string | null;
  readonly sourceChecked: boolean;
  readonly activating: boolean;
  readonly saving: boolean;
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
  readonly onDraftChange: (patch: Partial<ActivationDraft>) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export function MemoryActivationForm({
  draft,
  acceptedSaying,
  sourceChecked,
  activating,
  saving,
  buttonRef,
  onDraftChange,
  onSubmit,
}: MemoryActivationFormProps) {
  return (
    <form className="memory-form" onSubmit={onSubmit}>
      <div className="date-grid">
        <label className="field">
          <span className="field-label">From</span>
          <input
            type="date"
            required
            value={draft.occurredStart}
            onChange={(event) => onDraftChange({ occurredStart: event.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-label">To · optional</span>
          <input
            type="date"
            min={draft.occurredStart || undefined}
            value={draft.occurredEnd}
            onChange={(event) => onDraftChange({ occurredEnd: event.target.value })}
          />
        </label>
      </div>
      <label className="field">
        <span className="field-label">A note to future you · optional</span>
        <textarea
          value={draft.note}
          placeholder="What made this one stay with you?"
          onChange={(event) => onDraftChange({ note: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">Visibility</span>
        <select
          value={draft.visibility}
          onChange={(event) => onDraftChange({ visibility: event.target.value as Visibility })}
        >
          <option value="inherit">Use archive default</option>
          <option value="private">Private</option>
          <option value="public">Public when sharing exists</option>
        </select>
        <p className="field-hint">This app stays local. The choice is remembered for future sharing.</p>
      </label>
      <SayingActivationControl
        buttonRef={buttonRef}
        acceptedSaying={acceptedSaying}
        sourceChecked={sourceChecked}
        activating={activating}
        saving={saving}
      />
    </form>
  );
}
