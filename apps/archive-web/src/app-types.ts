import type { ActivationInput, ArchiveRecord, ExactVisualPin, Visibility } from "@badge/archive-domain";

interface ArchiveVisualDisplay {
  readonly sourceUrl: string;
  readonly pin: ArchiveRecord["publishedVisual"];
}

export interface ActivationDraft {
  readonly occurredStart: string;
  readonly occurredEnd: string;
  readonly note: string;
  readonly visibility: Visibility;
  readonly saying: string;
}

export function defaultActivationDraft(saying: string): ActivationDraft {
  return {
    occurredStart: "",
    occurredEnd: "",
    note: "",
    visibility: "inherit",
    saying,
  };
}

export function selectedSayingProposal(suggestions: readonly string[], index: number): string {
  const selected = suggestions[index % suggestions.length];
  if (selected === undefined) throw new Error("Badge saying proposals are empty; publish at least one line.");
  return selected;
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
    saying: draft.saying,
    visualPin,
  };
}
