import { z } from "zod";

export const SAYING_GRAPHEME_LIMIT = 800;
export const SAYING_CODE_POINT_LIMIT = 3_072;
export const SAYING_UTF8_LIMIT = 10_240;
export const SAYING_RAW_UTF16_CODE_UNIT_LIMIT = SAYING_CODE_POINT_LIMIT * 2;

const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export type SayingSizeMetric = "UTF16_CODE_UNITS" | "UNICODE_CODE_POINTS" | "UTF8_BYTES";

export type SayingValidationResult =
  | { ok: true; value: string; graphemeCount: number }
  | {
      ok: false;
      code: "TOO_LARGE_TO_INSPECT";
      value: string;
      graphemeCount: null;
      metric: SayingSizeMetric;
      count: number;
      limit: number;
    }
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

export function sayingSizeMetricLabel(metric: SayingSizeMetric): string {
  switch (metric) {
    case "UTF16_CODE_UNITS":
      return "UTF-16 code units";
    case "UNICODE_CODE_POINTS":
      return "Unicode code points";
    case "UTF8_BYTES":
      return "UTF-8 bytes";
  }
}

function tooLargeToInspect(
  value: string,
  metric: SayingSizeMetric,
  count: number,
  limit: number,
): SayingValidationResult {
  return {
    ok: false,
    code: "TOO_LARGE_TO_INSPECT",
    value,
    graphemeCount: null,
    metric,
    count,
    limit,
  };
}

export function validateSaying(value: string): SayingValidationResult {
  if (value.length > SAYING_RAW_UTF16_CODE_UNIT_LIMIT) {
    return tooLargeToInspect(value, "UTF16_CODE_UNITS", value.length, SAYING_RAW_UTF16_CODE_UNIT_LIMIT);
  }

  const codePointCount = Array.from(value).length;
  if (codePointCount > SAYING_CODE_POINT_LIMIT) {
    return tooLargeToInspect(value, "UNICODE_CODE_POINTS", codePointCount, SAYING_CODE_POINT_LIMIT);
  }

  const utf8ByteLength = new TextEncoder().encode(value).byteLength;
  if (utf8ByteLength > SAYING_UTF8_LIMIT) {
    return tooLargeToInspect(value, "UTF8_BYTES", utf8ByteLength, SAYING_UTF8_LIMIT);
  }

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
          : validation.code === "TOO_LARGE_TO_INSPECT"
            ? `Saying is too large to inspect safely: ${validation.count} ${sayingSizeMetricLabel(validation.metric)} exceeds ${validation.limit}.`
            : `Saying must contain at most ${SAYING_GRAPHEME_LIMIT} grapheme clusters.`,
    });
    return;
  }

  if (validation.value !== value) {
    context.addIssue({
      code: "custom",
      message: "Persisted saying must already be normalized to one logical paragraph.",
    });
  }
});
