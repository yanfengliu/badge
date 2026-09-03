import { z } from "zod";

import {
  adjustedSourceSchema,
  adjustsAppearanceOrSource,
  appearanceAdjustmentSchema,
  badgeTagKey,
  badgeTagSchema,
  isEmptyBadgeAdjustment,
  MAX_BADGE_TAGS,
  sameAdjustedSource,
  sameAppearanceAdjustment,
  type BadgeAdjustment,
} from "./adjustment.js";
import { effectiveVisual } from "./effective.js";
import { collectionRefKey, collectionRefSchema, type CollectionRef } from "./refs.js";
import {
  archiveStateSchema,
  calendarDateSchema,
  exactVisualPinSchema,
  visibilitySchema,
  visualPinsEqual,
  type ActivationRecord,
  type ArchiveLifecycle,
  type ArchiveRecord,
  type ArchiveState,
} from "./model.js";
import { sayingSizeMetricLabel, validateSaying, type SayingValidationResult } from "./saying.js";

export type ArchiveDomainErrorCode =
  | "ALREADY_EARNED"
  | "INVALID_ADJUSTMENT"
  | "INVALID_ACTIVATION"
  | "INVALID_LIFECYCLE"
  | "INVALID_SAYING"
  | "RECORD_NOT_FOUND"
  | "VISUAL_PIN_MISMATCH";

export class ArchiveDomainError extends Error {
  constructor(
    readonly code: ArchiveDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ArchiveDomainError";
  }
}

export const activationInputSchema = z
  .object({
    recordId: z.string().min(1),
    occurredStart: calendarDateSchema,
    occurredEnd: calendarDateSchema,
    note: z.string().max(10_000).nullable(),
    visibility: visibilitySchema,
    visualPin: exactVisualPinSchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (input.occurredStart > input.occurredEnd) {
      context.addIssue({
        code: "custom",
        path: ["occurredEnd"],
        message: "occurredEnd must be on or after occurredStart.",
      });
    }
  });
export type ActivationInput = z.infer<typeof activationInputSchema>;

export interface ActivationResult {
  state: ArchiveState;
  record: ArchiveRecord;
  activation: ActivationRecord;
}

function requireRecord(state: ArchiveState, recordId: string): ArchiveRecord {
  const record = state.records.find((candidate) => candidate.recordId === recordId);
  if (!record) {
    throw new ArchiveDomainError(
      "RECORD_NOT_FOUND",
      `Archive record ${recordId} was not found; reload the collection and try again.`,
    );
  }
  return record;
}

function replaceRecord(state: ArchiveState, replacement: ArchiveRecord): ArchiveState {
  return archiveStateSchema.parse({
    ...state,
    records: state.records.map((record) => (record.recordId === replacement.recordId ? replacement : record)),
  });
}

function invalidSayingMessage(title: string, saying: Exclude<SayingValidationResult, { ok: true }>): string {
  if (saying.code === "EMPTY") {
    return `Quote for ${title} is empty; regenerate it or reload the badge to restore its source-checked default.`;
  }
  if (saying.code === "TOO_LARGE_TO_INSPECT") {
    return `Quote for ${title} is ${saying.count} ${sayingSizeMetricLabel(saying.metric)}; use at most ${saying.limit} so it can be inspected safely.`;
  }
  return `Quote for ${title} has ${saying.graphemeCount} graphemes; use at most ${saying.limit}.`;
}

export function activateAchievement(
  untrustedState: ArchiveState,
  untrustedInput: ActivationInput,
  now: string,
): ActivationResult {
  const state = archiveStateSchema.parse(untrustedState);
  const parsedInput = activationInputSchema.safeParse(untrustedInput);
  if (!parsedInput.success) {
    throw new ArchiveDomainError(
      "INVALID_ACTIVATION",
      `Activation input for ${untrustedInput.recordId} is invalid: ${parsedInput.error.issues[0]?.message ?? "check the supplied fields"}.`,
    );
  }
  const input = parsedInput.data;
  const record = requireRecord(state, input.recordId);

  if (record.lifecycle === "earned" || record.activation) {
    throw new ArchiveDomainError(
      "ALREADY_EARNED",
      `${record.title} is already activated; replay the ceremony instead of recording it again.`,
    );
  }

  if (record.lifecycle === "archived") {
    throw new ArchiveDomainError(
      "INVALID_LIFECYCLE",
      `${record.title} is archived; return it to the collection before activation.`,
    );
  }

  if (!visualPinsEqual(effectiveVisual(record), input.visualPin)) {
    throw new ArchiveDomainError(
      "VISUAL_PIN_MISMATCH",
      `${record.title} changed since activation was opened; reopen it to use the admitted visual.`,
    );
  }

  const saying = validateSaying(record.acceptedSaying ?? "");
  if (!saying.ok) {
    throw new ArchiveDomainError("INVALID_SAYING", invalidSayingMessage(record.title, saying));
  }

  const activation: ActivationRecord = {
    occurredStart: input.occurredStart,
    occurredEnd: input.occurredEnd,
    recordedAt: now,
    activatedAt: now,
    visualPin: input.visualPin,
  };
  const replacement: ArchiveRecord = {
    ...record,
    // Activation folds the owner's adjustment into the record's own published visual so the
    // sealed pin and the record agree byte for byte. The overlay stays as the honest note of
    // which fields the owner chose; re-applying it to the folded visual is idempotent.
    publishedVisual: input.visualPin,
    lifecycle: "earned",
    acceptedSaying: saying.value,
    note: input.note,
    visibility: input.visibility,
    activation,
  };
  const nextState = replaceRecord(state, replacement);

  return {
    state: nextState,
    record: nextState.records.find((candidate) => candidate.recordId === record.recordId)!,
    activation,
  };
}

export function updateAcceptedSaying(
  untrustedState: ArchiveState,
  recordId: string,
  input: string,
  quotationRevision: string,
): ArchiveState {
  const state = archiveStateSchema.parse(untrustedState);
  const record = requireRecord(state, recordId);
  if (record.lifecycle === "earned" || record.activation) {
    throw new ArchiveDomainError(
      "INVALID_LIFECYCLE",
      `${record.title} is already activated; its historical quotation is sealed with the memory.`,
    );
  }
  const saying = validateSaying(input);
  if (!saying.ok) {
    throw new ArchiveDomainError("INVALID_SAYING", invalidSayingMessage(record.title, saying));
  }
  return replaceRecord(state, {
    ...record,
    acceptedSaying: saying.value,
    quotationRevision,
  });
}

export function setRecordLifecycle(
  untrustedState: ArchiveState,
  recordId: string,
  lifecycle: ArchiveLifecycle,
): ArchiveState {
  const state = archiveStateSchema.parse(untrustedState);
  const record = requireRecord(state, recordId);

  if (record.lifecycle === "earned" || lifecycle === "earned") {
    throw new ArchiveDomainError(
      "INVALID_LIFECYCLE",
      `Earned state for ${record.title} can change only through activation.`,
    );
  }

  return replaceRecord(state, { ...record, lifecycle });
}

const EMPTY_ADJUSTED_APPEARANCE = {
  shape: null,
  material: null,
  borderColor: null,
  borderWidth: null,
} as const;

export const badgeAdjustmentInputSchema = z
  .object({
    appearance: appearanceAdjustmentSchema,
    source: adjustedSourceSchema.nullable(),
    tags: z.array(badgeTagSchema).max(MAX_BADGE_TAGS),
    collectionRefs: z.array(collectionRefSchema).min(1).nullable(),
  })
  .strict();
export type BadgeAdjustmentInput = z.infer<typeof badgeAdjustmentInputSchema>;

function duplicateTag(tags: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const tag of tags) {
    const key = badgeTagKey(tag);
    if (seen.has(key)) return tag;
    seen.add(key);
  }
  return null;
}

function sameCollectionSelection(
  left: readonly CollectionRef[] | null,
  right: readonly CollectionRef[] | null,
): boolean {
  if (left === null || right === null) return left === right;
  if (left.length !== right.length) return false;
  return left.every((ref, index) => collectionRefKey(ref) === collectionRefKey(right[index]));
}

function sameAdjustment(left: BadgeAdjustment | null, right: BadgeAdjustment | null): boolean {
  if (left === null || right === null) return left === right;
  return (
    sameAppearanceAdjustment(left.appearance, right.appearance) &&
    sameAdjustedSource(left.source, right.source) &&
    left.tags.length === right.tags.length &&
    left.tags.every((tag, index) => tag === right.tags[index]) &&
    sameCollectionSelection(left.collectionRefs, right.collectionRefs)
  );
}

/**
 * Replaces one badge's personal adjustment overlay. Tags and collection membership are ordinary
 * organization and stay editable for the life of the badge; the badge face — shape, material,
 * border, and the owner's own image — is sealed by activation and may not be re-adjusted once a
 * memory is collected.
 */
export function adjustBadge(
  untrustedState: ArchiveState,
  recordId: string,
  untrustedInput: BadgeAdjustmentInput,
  now: string,
): ArchiveState {
  const state = archiveStateSchema.parse(untrustedState);
  const record = requireRecord(state, recordId);
  const parsed = badgeAdjustmentInputSchema.safeParse(untrustedInput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ArchiveDomainError(
      "INVALID_ADJUSTMENT",
      `Adjustment for ${record.title} is invalid at ${issue?.path.join(".") || "the submitted values"}: ${issue?.message ?? "check the submitted values"}.`,
    );
  }
  const input = parsed.data;
  const repeated = duplicateTag(input.tags);
  if (repeated !== null) {
    throw new ArchiveDomainError(
      "INVALID_ADJUSTMENT",
      `Tag ${repeated} is already on ${record.title}; remove the repeat and keep one of each tag.`,
    );
  }
  if (record.activation !== null || record.lifecycle === "earned") {
    const current = record.adjustment;
    const faceChanged =
      !sameAppearanceAdjustment(input.appearance, current?.appearance ?? EMPTY_ADJUSTED_APPEARANCE) ||
      !sameAdjustedSource(input.source, current?.source ?? null);
    if (faceChanged) {
      throw new ArchiveDomainError(
        "INVALID_ADJUSTMENT",
        `${record.title} is already collected, so its badge face is sealed with that memory. Change its tags or collections instead, or adjust a badge you have not collected yet.`,
      );
    }
  }
  const proposed: BadgeAdjustment = {
    adjustedAt: now,
    appearance: input.appearance,
    source: input.source,
    tags: input.tags,
    collectionRefs: input.collectionRefs,
  };
  const next = isEmptyBadgeAdjustment(proposed) ? null : proposed;
  if (sameAdjustment(next, record.adjustment)) return state;
  return replaceRecord(state, { ...record, adjustment: next });
}

/** True when the record still shows exactly the badge face its catalogue pack shipped. */
export function isCatalogueDefaultBadge(record: ArchiveRecord): boolean {
  return !adjustsAppearanceOrSource(record.adjustment);
}
