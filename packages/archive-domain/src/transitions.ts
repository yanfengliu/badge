import { z } from "zod";

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
    saying: z.string(),
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
    return `Saying for ${title} is empty; write or accept a badge saying.`;
  }
  if (saying.code === "TOO_LARGE_TO_INSPECT") {
    return `Saying for ${title} is ${saying.count} ${sayingSizeMetricLabel(saying.metric)}; use at most ${saying.limit} so it can be inspected safely.`;
  }
  return `Saying for ${title} has ${saying.graphemeCount} graphemes; use at most ${saying.limit}.`;
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

  if (!visualPinsEqual(record.publishedVisual, input.visualPin)) {
    throw new ArchiveDomainError(
      "VISUAL_PIN_MISMATCH",
      `${record.title} changed since activation was opened; reopen it to use the admitted visual.`,
    );
  }

  const saying = validateSaying(input.saying);
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
): ArchiveState {
  const state = archiveStateSchema.parse(untrustedState);
  const record = requireRecord(state, recordId);
  const saying = validateSaying(input);
  if (!saying.ok) {
    throw new ArchiveDomainError("INVALID_SAYING", invalidSayingMessage(record.title, saying));
  }
  return replaceRecord(state, { ...record, acceptedSaying: saying.value });
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
