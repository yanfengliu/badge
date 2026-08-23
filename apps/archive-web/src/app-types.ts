import {
  validateSaying,
  type ActivationInput,
  type ArchiveRecord,
  type ExactVisualPin,
  type Visibility,
} from "@badge/archive-domain";

interface ArchiveVisualDisplay {
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
  readonly editing: boolean;
  readonly saving: boolean;
  readonly hasUnsavedDraft: boolean;
}

export function defaultActivationDraft(): ActivationDraft {
  return {
    occurredStart: "",
    occurredEnd: "",
    note: "",
    visibility: "inherit",
  };
}

export function sayingValidationMessage(title: string, value: string): string | null {
  const validation = validateSaying(value);
  if (validation.ok) return null;
  return validation.code === "EMPTY"
    ? `Saying for ${title} is empty; write or accept a one-line saying.`
    : `Saying for ${title} has ${validation.graphemeCount} graphemes; use at most ${validation.limit}.`;
}

export function canActivateWithSaying(acceptedSaying: string | null, saying: SayingActivationState): boolean {
  return Boolean(acceptedSaying) && !saying.editing && !saying.saving && !saying.hasUnsavedDraft;
}

export function selectedArchiveVisual(
  record: ArchiveRecord | undefined,
  fixtureSourceUrl: string,
  earnedVisuals: Readonly<Record<string, ArchiveVisualDisplay>>,
): ArchiveVisualDisplay | undefined {
  if (!record) return undefined;
  return record.lifecycle === "earned"
    ? earnedVisuals[record.recordId]
    : { sourceUrl: fixtureSourceUrl, pin: record.publishedVisual };
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
    saying: record.acceptedSaying ?? "",
    visualPin,
  };
}
