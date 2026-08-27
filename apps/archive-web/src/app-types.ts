import {
  type ActivationInput,
  type ArchiveRecord,
  type ExactVisualPin,
  type Visibility,
} from "@badge/archive-domain";

export interface ArchiveVisualDisplay {
  readonly sourceUrl: string;
  readonly pin: ArchiveRecord["publishedVisual"];
}

export interface ActivationDraft {
  readonly occurredStart: string;
  readonly occurredEnd: string;
  readonly note: string;
  readonly visibility: Visibility;
}

export interface SayingActivationState {
  readonly sourceChecked: boolean;
  readonly saving: boolean;
}

export function defaultActivationDraft(): ActivationDraft {
  return {
    occurredStart: "",
    occurredEnd: "",
    note: "",
    visibility: "inherit",
  };
}

export function canActivateWithSaying(saying: SayingActivationState): boolean {
  return saying.sourceChecked && !saying.saving;
}

export function selectedArchiveVisual(
  record: ArchiveRecord | undefined,
  fixtureSourceUrl: string | null,
  earnedVisuals: Readonly<Record<string, ArchiveVisualDisplay>>,
): ArchiveVisualDisplay | undefined {
  if (!record) return undefined;
  if (record.lifecycle === "earned") return earnedVisuals[record.recordId];
  return fixtureSourceUrl ? { sourceUrl: fixtureSourceUrl, pin: record.publishedVisual } : undefined;
}

export function activationInputFor(
  record: ArchiveRecord,
  draft: ActivationDraft,
  visualPin: ExactVisualPin,
): ActivationInput {
  return {
    recordId: record.recordId,
    occurredStart: draft.occurredStart,
    occurredEnd: draft.occurredEnd || draft.occurredStart,
    note: draft.note.trim() || null,
    visibility: draft.visibility,
    visualPin,
  };
}
