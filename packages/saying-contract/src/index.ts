import { z } from "zod";

import { quotationRecordsMatch } from "./quotation-comparison.ts";
import {
  countGraphemes,
  hasBidiControl,
  hasControlCharacter,
  hasForbiddenOutputControl,
  hasVisibleContent,
  normalizePromptText,
  utf8ByteLength,
} from "./text-safety.ts";

export { SAYING_SYSTEM_PROMPT_V3 } from "./prompt.ts";

export const SAYING_PROMPT_VERSION = "v3" as const;
export const SAYING_TITLE_GRAPHEME_LIMIT = 200;
export const SAYING_CRITERION_GRAPHEME_LIMIT = 1_000;
export const SAYING_THEME_CUE_COUNT_LIMIT = 6;
export const SAYING_THEME_CUE_GRAPHEME_LIMIT = 80;
export const SAYING_VOICE_GRAPHEME_LIMIT = 120;
export const SAYING_VARIATION_GRAPHEME_LIMIT = 120;
export const SAYING_USER_DIRECTION_GRAPHEME_LIMIT = 240;
export const SAYING_ALLOWED_QUOTATION_COUNT_LIMIT = 6;
export const SAYING_QUOTATION_CONTRACT_VERSION = "v2" as const;
export const SAYING_QUOTATION_ID_LENGTH_LIMIT = 128;
export const SAYING_QUOTATION_PERSON_GRAPHEME_LIMIT = 64;
export const SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT = 128;
export const SAYING_QUOTATION_PERSON_UTF8_LIMIT = 512;
export const SAYING_QUOTATION_SOURCE_TITLE_GRAPHEME_LIMIT = 100;
export const SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT = 256;
export const SAYING_QUOTATION_SOURCE_TITLE_UTF8_LIMIT = 1_024;
export const SAYING_QUOTATION_SOURCE_URL_LENGTH_LIMIT = 512;
export const SAYING_OUTPUT_GRAPHEME_LIMIT = 600;
export const SAYING_OUTPUT_CODE_POINT_LIMIT = 2_048;
export const SAYING_OUTPUT_UTF8_LIMIT = 7_680;
export const SAYING_USER_MESSAGE_UTF8_LIMIT = 12 * 1_024;
export const SAYING_RESPONSE_UTF8_LIMIT = 8 * 1_024;

const promptFieldRawCodeUnitLimit = SAYING_USER_MESSAGE_UTF8_LIMIT;
const outputRawCodeUnitLimit = SAYING_OUTPUT_CODE_POINT_LIMIT * 2;

interface PromptTextComplexityLimits {
  readonly codePoints: number;
  readonly utf8Bytes: number;
}

function boundedPromptText(
  label: string,
  graphemeLimit: number,
  complexityLimits?: PromptTextComplexityLimits,
) {
  return z
    .string()
    .superRefine((value, context) => {
      if (value.length > promptFieldRawCodeUnitLimit) {
        context.addIssue({
          code: "custom",
          message: `${label} is too large to inspect safely; shorten it before selecting a quotation.`,
        });
        return;
      }
      if (hasControlCharacter(value)) {
        context.addIssue({
          code: "custom",
          message: `${label} contains a C0 or C1 control character; remove tabs, line breaks, and other controls.`,
        });
        return;
      }
      if (hasBidiControl(value)) {
        context.addIssue({
          code: "custom",
          message: `${label} contains a bidirectional text control; remove it before selecting a quotation.`,
        });
        return;
      }

      const normalized = normalizePromptText(value);
      if (complexityLimits) {
        const codePointCount = Array.from(normalized).length;
        if (codePointCount > complexityLimits.codePoints) {
          context.addIssue({
            code: "custom",
            message: `${label} has ${codePointCount} Unicode code points; use at most ${complexityLimits.codePoints}.`,
          });
          return;
        }
        const byteLength = utf8ByteLength(normalized);
        if (byteLength > complexityLimits.utf8Bytes) {
          context.addIssue({
            code: "custom",
            message: `${label} is ${byteLength} UTF-8 bytes; use at most ${complexityLimits.utf8Bytes}.`,
          });
          return;
        }
      }
      const graphemeCount = countGraphemes(normalized);
      if (graphemeCount === 0 || !hasVisibleContent(normalized)) {
        context.addIssue({ code: "custom", message: `${label} is empty; provide visible text.` });
      } else if (graphemeCount > graphemeLimit) {
        context.addIssue({
          code: "custom",
          message: `${label} has ${graphemeCount} graphemes; use at most ${graphemeLimit}.`,
        });
      }
    })
    .transform(normalizePromptText);
}

function boundedOutputText(label: string) {
  return z
    .string()
    .superRefine((value, context) => {
      if (value.length > outputRawCodeUnitLimit) {
        context.addIssue({
          code: "custom",
          message: `${label} is too large to inspect safely; use at most ${SAYING_OUTPUT_CODE_POINT_LIMIT} Unicode code points.`,
        });
        return;
      }
      if (hasForbiddenOutputControl(value)) {
        context.addIssue({
          code: "custom",
          message: `${label} contains a non-whitespace control character; remove it.`,
        });
        return;
      }
      if (hasBidiControl(value)) {
        context.addIssue({
          code: "custom",
          message: `${label} contains a bidirectional text control; remove it.`,
        });
        return;
      }

      const normalized = normalizePromptText(value);
      const graphemeCount = countGraphemes(normalized);
      const codePointCount = Array.from(normalized).length;
      const byteLength = utf8ByteLength(normalized);
      if (graphemeCount === 0 || !hasVisibleContent(normalized)) {
        context.addIssue({ code: "custom", message: `${label} is empty; return visible text.` });
      } else if (graphemeCount > SAYING_OUTPUT_GRAPHEME_LIMIT) {
        context.addIssue({
          code: "custom",
          message: `${label} has ${graphemeCount} graphemes; use at most ${SAYING_OUTPUT_GRAPHEME_LIMIT}.`,
        });
      } else if (codePointCount > SAYING_OUTPUT_CODE_POINT_LIMIT) {
        context.addIssue({
          code: "custom",
          message: `${label} has ${codePointCount} Unicode code points; use at most ${SAYING_OUTPUT_CODE_POINT_LIMIT}.`,
        });
      } else if (byteLength > SAYING_OUTPUT_UTF8_LIMIT) {
        context.addIssue({
          code: "custom",
          message: `${label} is ${byteLength} UTF-8 bytes; use at most ${SAYING_OUTPUT_UTF8_LIMIT}.`,
        });
      }
    })
    .transform(normalizePromptText);
}

const themeCueSchema = boundedPromptText("Theme cue", SAYING_THEME_CUE_GRAPHEME_LIMIT);
const voiceSchema = boundedPromptText("Voice", SAYING_VOICE_GRAPHEME_LIMIT);
const variationSchema = boundedPromptText("Variation", SAYING_VARIATION_GRAPHEME_LIMIT);
const userDirectionSchema = boundedPromptText("User direction", SAYING_USER_DIRECTION_GRAPHEME_LIMIT);

export const sayingDirectionSchema = z
  .object({
    themeCues: z.array(themeCueSchema).min(1).max(SAYING_THEME_CUE_COUNT_LIMIT).optional(),
    voice: voiceSchema.optional(),
    variation: variationSchema.optional(),
    userDirection: userDirectionSchema.optional(),
  })
  .strict()
  .superRefine((direction, context) => {
    if (
      direction.themeCues === undefined &&
      direction.voice === undefined &&
      direction.variation === undefined &&
      direction.userDirection === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Quotation direction is empty; omit it or provide at least one direction field.",
      });
    }
  });
export type SayingDirection = z.infer<typeof sayingDirectionSchema>;

const quotationIdentifierSchema = z
  .string()
  .min(1)
  .max(SAYING_QUOTATION_ID_LENGTH_LIMIT)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/u, "Quotation ID must be stable lowercase ASCII.");

const httpsSourceUrlSchema = z
  .string()
  .max(SAYING_QUOTATION_SOURCE_URL_LENGTH_LIMIT)
  .url()
  .superRefine((value, context) => {
    let protocol: string;
    try {
      protocol = new URL(value).protocol;
    } catch {
      return;
    }
    if (protocol !== "https:") {
      context.addIssue({ code: "custom", message: "Quotation source URL must use HTTPS." });
    }
  });

export const historicalQuotationSchema = z
  .object({
    id: quotationIdentifierSchema,
    text: boundedOutputText("Quotation text"),
    person: boundedPromptText("Quotation person", SAYING_QUOTATION_PERSON_GRAPHEME_LIMIT, {
      codePoints: SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT,
      utf8Bytes: SAYING_QUOTATION_PERSON_UTF8_LIMIT,
    }),
    sourceTitle: boundedPromptText("Quotation source title", SAYING_QUOTATION_SOURCE_TITLE_GRAPHEME_LIMIT, {
      codePoints: SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT,
      utf8Bytes: SAYING_QUOTATION_SOURCE_TITLE_UTF8_LIMIT,
    }),
    sourceUrl: httpsSourceUrlSchema,
  })
  .strict();
export type HistoricalQuotation = z.infer<typeof historicalQuotationSchema>;

const allowedQuotationsSchema = z
  .array(historicalQuotationSchema)
  .min(1)
  .max(SAYING_ALLOWED_QUOTATION_COUNT_LIMIT)
  .superRefine((quotations, context) => {
    if (new Set(quotations.map((quotation) => quotation.id)).size !== quotations.length) {
      context.addIssue({ code: "custom", message: "Allowed quotation IDs must be unique." });
    }
  });

export const sayingRequestSchema = z
  .object({
    title: boundedPromptText("Badge title", SAYING_TITLE_GRAPHEME_LIMIT),
    criterion: boundedPromptText("Badge criterion", SAYING_CRITERION_GRAPHEME_LIMIT),
    direction: sayingDirectionSchema.optional(),
    allowedQuotations: allowedQuotationsSchema,
  })
  .strict();
export type SayingRequest = z.infer<typeof sayingRequestSchema>;

const historicalQuotationTextSchema = boundedOutputText("Historical quotation text");

export const sayingResponseSchema = z
  .object({
    kind: z.literal("quotation"),
    saying: historicalQuotationTextSchema,
    quotation: historicalQuotationSchema,
  })
  .strict()
  .superRefine((response, context) => {
    if (response.saying !== response.quotation.text) {
      context.addIssue({
        code: "custom",
        message: "Historical quotation text must match its supplied source exactly.",
      });
    }
  });
export type SayingResponse = z.infer<typeof sayingResponseSchema>;

export const sayingModelResponseSchema = z.object({ quotationId: quotationIdentifierSchema }).strict();
export type SayingModelResponse = z.infer<typeof sayingModelResponseSchema>;

const providerIdentifierSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, "must be a lowercase stable identifier");
const modelIdentifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9](?:[a-z0-9._:/-]*[a-z0-9])?$/, "must be a lowercase stable identifier");

export const sayingProviderProvenanceSchema = z
  .object({
    provider: providerIdentifierSchema,
    model: modelIdentifierSchema,
    promptVersion: z.literal(SAYING_PROMPT_VERSION),
    generatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type SayingProviderProvenance = z.infer<typeof sayingProviderProvenanceSchema>;

export const sayingProviderResultSchema = z
  .object({
    response: sayingResponseSchema,
    provenance: sayingProviderProvenanceSchema,
  })
  .strict();
export type SayingProviderResult = z.infer<typeof sayingProviderResultSchema>;

export const sayingRequestIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export interface SayingProviderRequest {
  readonly requestId: number;
  readonly promptInput: SayingRequest;
  readonly signal: AbortSignal;
}

export interface SayingProvider {
  propose(request: SayingProviderRequest): Promise<SayingProviderResult>;
}

function canonicalDirection(direction: SayingDirection): Record<string, unknown> {
  return {
    ...(direction.themeCues === undefined ? {} : { themeCues: direction.themeCues }),
    ...(direction.voice === undefined ? {} : { voice: direction.voice }),
    ...(direction.variation === undefined ? {} : { variation: direction.variation }),
    ...(direction.userDirection === undefined ? {} : { userDirection: direction.userDirection }),
  };
}

export function buildCanonicalSayingUserMessage(input: unknown): string {
  const request = sayingRequestSchema.parse(input);
  const message = JSON.stringify({
    title: request.title,
    criterion: request.criterion,
    ...(request.direction === undefined ? {} : { direction: canonicalDirection(request.direction) }),
    allowedQuotations: request.allowedQuotations,
  });
  const byteLength = utf8ByteLength(message);
  if (byteLength > SAYING_USER_MESSAGE_UTF8_LIMIT) {
    throw new RangeError(
      `Canonical quotation-selection message is ${byteLength} UTF-8 bytes; shorten its achievement text or direction to use at most ${SAYING_USER_MESSAGE_UTF8_LIMIT} bytes.`,
    );
  }
  return message;
}

export function parseSayingModelResponseMessage(message: string): SayingModelResponse {
  if (message.length > SAYING_RESPONSE_UTF8_LIMIT) {
    throw new RangeError(
      `Quotation provider response is too large to inspect safely; return one JSON object of at most ${SAYING_RESPONSE_UTF8_LIMIT} UTF-8 bytes.`,
    );
  }
  const byteLength = utf8ByteLength(message);
  if (byteLength > SAYING_RESPONSE_UTF8_LIMIT) {
    throw new RangeError(
      `Quotation provider response is ${byteLength} UTF-8 bytes; return one JSON object of at most ${SAYING_RESPONSE_UTF8_LIMIT} bytes.`,
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(message);
  } catch {
    throw new SyntaxError(
      "Quotation provider response is not valid JSON; return exactly one permitted quotation-selection object.",
    );
  }
  return sayingModelResponseSchema.parse(decoded);
}

export function resolveSayingModelResponse(
  untrustedResponse: unknown,
  untrustedRequest: unknown,
): SayingResponse {
  const response = sayingModelResponseSchema.parse(untrustedResponse);
  const request = sayingRequestSchema.parse(untrustedRequest);
  const quotation = request.allowedQuotations.find((candidate) => candidate.id === response.quotationId);
  if (!quotation) {
    throw new RangeError(
      `Quotation ID ${response.quotationId} is not one of the supplied quotations for this achievement.`,
    );
  }
  return sayingResponseSchema.parse({
    kind: "quotation",
    saying: quotation.text,
    quotation,
  });
}

export function validateSayingProviderResultForRequest(
  untrustedResult: unknown,
  untrustedRequest: unknown,
): SayingProviderResult {
  const result = sayingProviderResultSchema.parse(untrustedResult);
  const resolved = validateSayingResponseForRequest(result.response, untrustedRequest);

  return sayingProviderResultSchema.parse({ ...result, response: resolved });
}

export function validateSayingResponseForRequest(
  untrustedResponse: unknown,
  untrustedRequest: unknown,
): SayingResponse {
  const response = sayingResponseSchema.parse(untrustedResponse);
  const request = sayingRequestSchema.parse(untrustedRequest);
  const resolved = resolveSayingModelResponse({ quotationId: response.quotation.id }, request);
  if (response.saying !== resolved.saying || !quotationRecordsMatch(response.quotation, resolved.quotation)) {
    throw new RangeError(
      "Historical quotation response does not exactly match the supplied quotation for this achievement.",
    );
  }

  return resolved;
}

export function formatSayingForArchive(untrustedResponse: unknown): string {
  const response = sayingResponseSchema.parse(untrustedResponse);
  return `“${response.saying}” — ${response.quotation.person}, ${response.quotation.sourceTitle}`;
}
