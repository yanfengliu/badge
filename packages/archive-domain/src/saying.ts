import { z } from "zod";

export const SAYING_GRAPHEME_LIMIT = 120;

const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export type SayingValidationResult =
  | { ok: true; value: string; graphemeCount: number }
  | {
      ok: false;
      code: "EMPTY" | "TOO_LONG";
      value: string;
      graphemeCount: number;
      limit: typeof SAYING_GRAPHEME_LIMIT;
    };

export function normalizeSaying(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function countSayingGraphemes(value: string): number {
  return Array.from(graphemeSegmenter.segment(value)).length;
}

export function validateSaying(value: string): SayingValidationResult {
  const normalized = normalizeSaying(value);
  const graphemeCount = countSayingGraphemes(normalized);

  if (graphemeCount === 0) {
    return {
      ok: false,
      code: "EMPTY",
      value: normalized,
      graphemeCount,
      limit: SAYING_GRAPHEME_LIMIT,
    };
  }

  if (graphemeCount > SAYING_GRAPHEME_LIMIT) {
    return {
      ok: false,
      code: "TOO_LONG",
      value: normalized,
      graphemeCount,
      limit: SAYING_GRAPHEME_LIMIT,
    };
  }

  return { ok: true, value: normalized, graphemeCount };
}

export const acceptedSayingSchema = z.string().superRefine((value, context) => {
  const validation = validateSaying(value);
  if (!validation.ok) {
    context.addIssue({
      code: "custom",
      message:
        validation.code === "EMPTY"
          ? "Saying must contain at least one grapheme."
          : `Saying must contain at most ${SAYING_GRAPHEME_LIMIT} grapheme clusters.`,
    });
    return;
  }

  if (validation.value !== value) {
    context.addIssue({
      code: "custom",
      message: "Persisted saying must already be normalized to one logical line.",
    });
  }
});
