import { z } from "zod";

import {
  SAYING_ALLOWED_QUOTATION_COUNT_LIMIT,
  SAYING_CRITERION_GRAPHEME_LIMIT,
  SAYING_OUTPUT_CODE_POINT_LIMIT,
  SAYING_OUTPUT_GRAPHEME_LIMIT,
  SAYING_OUTPUT_UTF8_LIMIT,
  SAYING_PROMPT_VERSION,
  SAYING_QUOTATION_CONTRACT_VERSION,
  SAYING_QUOTATION_ID_LENGTH_LIMIT,
  SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT,
  SAYING_QUOTATION_PERSON_GRAPHEME_LIMIT,
  SAYING_QUOTATION_PERSON_WIKIPEDIA_URL_LENGTH_LIMIT,
  SAYING_QUOTATION_PERSON_UTF8_LIMIT,
  SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT,
  SAYING_QUOTATION_SOURCE_TITLE_GRAPHEME_LIMIT,
  SAYING_QUOTATION_SOURCE_TITLE_UTF8_LIMIT,
  SAYING_QUOTATION_SOURCE_URL_LENGTH_LIMIT,
  SAYING_RESPONSE_UTF8_LIMIT,
  SAYING_SYSTEM_PROMPT_V3,
  SAYING_THEME_CUE_COUNT_LIMIT,
  SAYING_THEME_CUE_GRAPHEME_LIMIT,
  SAYING_TITLE_GRAPHEME_LIMIT,
  SAYING_USER_DIRECTION_GRAPHEME_LIMIT,
  SAYING_USER_MESSAGE_UTF8_LIMIT,
  SAYING_VARIATION_GRAPHEME_LIMIT,
  SAYING_VOICE_GRAPHEME_LIMIT,
  buildCanonicalSayingUserMessage,
  sayingRequestSchema,
  sayingResponseSchema,
  type SayingRequest,
} from "@badge/saying-contract";

export const SAYING_DISCLOSURE_PATH = "/api/archive/sayings/disclosure" as const;
export const SAYING_GENERATION_PATH = "/api/archive/sayings" as const;
export const SAYING_DISCLOSURE_HEADER = "X-Badge-Saying-Disclosure" as const;
export const SAYING_PROVIDER_ID = "claude-code" as const;
export const SAYING_PROVIDER_LABEL = "Claude Code" as const;
export const SAYING_PROVIDER_DESTINATION = "Anthropic through your local Claude Code subscription" as const;
export const SAYING_MODEL_ID = "claude-sonnet-4-6" as const;
export const SAYING_JSON_MEDIA_TYPE = "application/json" as const;
export const SAYING_REQUIRED_FETCH_SITE = "same-origin" as const;
export const SAYING_HTTP_SUCCESS_STATUS = 200 as const;
export const SAYING_DISCLOSURE_FINGERPRINT =
  "sha256:f714d85f810bcb726065ca522080afc6f8e00191a683222e736784789a9366e8" as const;
export const SAYING_ROUTE_BODY_LIMIT_BYTES = 16 * 1_024;
export const SAYING_ROUTE_RESPONSE_LIMIT_BYTES = 16 * 1_024;
export const SAYING_PROVIDER_STDOUT_LIMIT_BYTES = 64 * 1_024;
export const SAYING_PROVIDER_STDERR_LIMIT_BYTES = 32 * 1_024;
export const SAYING_PROVIDER_TIMEOUT_MS = 60_000;

export type SayingRuntimeMode = "fixture" | "live";

export function sayingModeForViteMode(mode: string): SayingRuntimeMode {
  return mode === "fixture" || mode === "test" ? "fixture" : "live";
}

function freezeRecursively<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeRecursively(child);
    Object.freeze(value);
  }
  return value;
}

export const SAYING_OUTBOUND_FIELDS = freezeRecursively([
  "title",
  "criterion",
  "direction",
  "allowedQuotations",
] as const);
export const SAYING_REQUIRED_FIELDS = freezeRecursively(["title", "criterion", "allowedQuotations"] as const);
export const SAYING_OPTIONAL_FIELDS = freezeRecursively(["direction"] as const);
export const SAYING_DIRECTION_FIELDS = freezeRecursively([
  "themeCues",
  "voice",
  "variation",
  "userDirection",
] as const);
export const SAYING_ALLOWED_QUOTATION_FIELDS = freezeRecursively([
  "id",
  "text",
  "person",
  "personWikipediaUrl",
  "sourceTitle",
  "sourceUrl",
] as const);
export const SAYING_EXCLUDED_FIELDS = freezeRecursively([
  "recordId",
  "definitionRef",
  "collectionRefs",
  "description",
  "lifecycle",
  "publishedVisual",
  "acceptedSaying",
  "quotationRevision",
  "note",
  "visibility",
  "activation",
  "requestId",
  "signal",
] as const);

export const SAYING_DISCLOSURE_SCOPE = freezeRecursively({
  requiredFields: SAYING_REQUIRED_FIELDS,
  optionalFields: SAYING_OPTIONAL_FIELDS,
  directionFields: SAYING_DIRECTION_FIELDS,
  allowedQuotationFields: SAYING_ALLOWED_QUOTATION_FIELDS,
  quotationContractVersion: SAYING_QUOTATION_CONTRACT_VERSION,
  excludedFields: SAYING_EXCLUDED_FIELDS,
  normalization:
    "Reject control characters and bidirectional controls; then NFC-normalize, trim, and collapse whitespace to one logical paragraph" as const,
  limits: {
    titleGraphemes: SAYING_TITLE_GRAPHEME_LIMIT,
    criterionGraphemes: SAYING_CRITERION_GRAPHEME_LIMIT,
    themeCueCount: SAYING_THEME_CUE_COUNT_LIMIT,
    themeCueGraphemes: SAYING_THEME_CUE_GRAPHEME_LIMIT,
    voiceGraphemes: SAYING_VOICE_GRAPHEME_LIMIT,
    variationGraphemes: SAYING_VARIATION_GRAPHEME_LIMIT,
    userDirectionGraphemes: SAYING_USER_DIRECTION_GRAPHEME_LIMIT,
    allowedQuotationCount: SAYING_ALLOWED_QUOTATION_COUNT_LIMIT,
    quotationIdCharacters: SAYING_QUOTATION_ID_LENGTH_LIMIT,
    outputGraphemes: SAYING_OUTPUT_GRAPHEME_LIMIT,
    outputCodePoints: SAYING_OUTPUT_CODE_POINT_LIMIT,
    outputUtf8Bytes: SAYING_OUTPUT_UTF8_LIMIT,
    quotationPersonGraphemes: SAYING_QUOTATION_PERSON_GRAPHEME_LIMIT,
    quotationPersonCodePoints: SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT,
    quotationPersonUtf8Bytes: SAYING_QUOTATION_PERSON_UTF8_LIMIT,
    quotationPersonWikipediaUrlCharacters: SAYING_QUOTATION_PERSON_WIKIPEDIA_URL_LENGTH_LIMIT,
    quotationSourceTitleGraphemes: SAYING_QUOTATION_SOURCE_TITLE_GRAPHEME_LIMIT,
    quotationSourceTitleCodePoints: SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT,
    quotationSourceTitleUtf8Bytes: SAYING_QUOTATION_SOURCE_TITLE_UTF8_LIMIT,
    quotationSourceUrlCharacters: SAYING_QUOTATION_SOURCE_URL_LENGTH_LIMIT,
    canonicalUtf8Bytes: SAYING_USER_MESSAGE_UTF8_LIMIT,
    responseUtf8Bytes: SAYING_RESPONSE_UTF8_LIMIT,
  },
  output: "One exact ID from the supplied source-checked quotation list" as const,
});

export function sayingDisclosureFingerprintMaterial(): string {
  return JSON.stringify({
    provider: SAYING_PROVIDER_ID,
    destination: SAYING_PROVIDER_DESTINATION,
    model: SAYING_MODEL_ID,
    promptVersion: SAYING_PROMPT_VERSION,
    scope: SAYING_DISCLOSURE_SCOPE,
    systemPrompt: SAYING_SYSTEM_PROMPT_V3,
  });
}

const sayingDisclosureScopeSchema = z
  .object({
    requiredFields: z.tuple([z.literal("title"), z.literal("criterion"), z.literal("allowedQuotations")]),
    optionalFields: z.tuple([z.literal("direction")]),
    directionFields: z.tuple([
      z.literal("themeCues"),
      z.literal("voice"),
      z.literal("variation"),
      z.literal("userDirection"),
    ]),
    allowedQuotationFields: z.tuple([
      z.literal("id"),
      z.literal("text"),
      z.literal("person"),
      z.literal("personWikipediaUrl"),
      z.literal("sourceTitle"),
      z.literal("sourceUrl"),
    ]),
    quotationContractVersion: z.literal(SAYING_QUOTATION_CONTRACT_VERSION),
    excludedFields: z.tuple([
      z.literal("recordId"),
      z.literal("definitionRef"),
      z.literal("collectionRefs"),
      z.literal("description"),
      z.literal("lifecycle"),
      z.literal("publishedVisual"),
      z.literal("acceptedSaying"),
      z.literal("quotationRevision"),
      z.literal("note"),
      z.literal("visibility"),
      z.literal("activation"),
      z.literal("requestId"),
      z.literal("signal"),
    ]),
    normalization: z.literal(
      "Reject control characters and bidirectional controls; then NFC-normalize, trim, and collapse whitespace to one logical paragraph",
    ),
    limits: z
      .object({
        titleGraphemes: z.literal(SAYING_TITLE_GRAPHEME_LIMIT),
        criterionGraphemes: z.literal(SAYING_CRITERION_GRAPHEME_LIMIT),
        themeCueCount: z.literal(SAYING_THEME_CUE_COUNT_LIMIT),
        themeCueGraphemes: z.literal(SAYING_THEME_CUE_GRAPHEME_LIMIT),
        voiceGraphemes: z.literal(SAYING_VOICE_GRAPHEME_LIMIT),
        variationGraphemes: z.literal(SAYING_VARIATION_GRAPHEME_LIMIT),
        userDirectionGraphemes: z.literal(SAYING_USER_DIRECTION_GRAPHEME_LIMIT),
        allowedQuotationCount: z.literal(SAYING_ALLOWED_QUOTATION_COUNT_LIMIT),
        quotationIdCharacters: z.literal(SAYING_QUOTATION_ID_LENGTH_LIMIT),
        outputGraphemes: z.literal(SAYING_OUTPUT_GRAPHEME_LIMIT),
        outputCodePoints: z.literal(SAYING_OUTPUT_CODE_POINT_LIMIT),
        outputUtf8Bytes: z.literal(SAYING_OUTPUT_UTF8_LIMIT),
        quotationPersonGraphemes: z.literal(SAYING_QUOTATION_PERSON_GRAPHEME_LIMIT),
        quotationPersonCodePoints: z.literal(SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT),
        quotationPersonUtf8Bytes: z.literal(SAYING_QUOTATION_PERSON_UTF8_LIMIT),
        quotationPersonWikipediaUrlCharacters: z.literal(SAYING_QUOTATION_PERSON_WIKIPEDIA_URL_LENGTH_LIMIT),
        quotationSourceTitleGraphemes: z.literal(SAYING_QUOTATION_SOURCE_TITLE_GRAPHEME_LIMIT),
        quotationSourceTitleCodePoints: z.literal(SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT),
        quotationSourceTitleUtf8Bytes: z.literal(SAYING_QUOTATION_SOURCE_TITLE_UTF8_LIMIT),
        quotationSourceUrlCharacters: z.literal(SAYING_QUOTATION_SOURCE_URL_LENGTH_LIMIT),
        canonicalUtf8Bytes: z.literal(SAYING_USER_MESSAGE_UTF8_LIMIT),
        responseUtf8Bytes: z.literal(SAYING_RESPONSE_UTF8_LIMIT),
      })
      .strict(),
    output: z.literal("One exact ID from the supplied source-checked quotation list"),
  })
  .strict();

export const sayingDisclosureSchema = z
  .object({
    provider: z.literal(SAYING_PROVIDER_ID),
    providerLabel: z.literal(SAYING_PROVIDER_LABEL),
    destination: z.literal(SAYING_PROVIDER_DESTINATION),
    model: z.literal(SAYING_MODEL_ID),
    promptVersion: z.literal(SAYING_PROMPT_VERSION),
    systemPrompt: z.literal(SAYING_SYSTEM_PROMPT_V3),
    outboundFields: z.tuple([
      z.literal(SAYING_OUTBOUND_FIELDS[0]),
      z.literal(SAYING_OUTBOUND_FIELDS[1]),
      z.literal(SAYING_OUTBOUND_FIELDS[2]),
      z.literal(SAYING_OUTBOUND_FIELDS[3]),
    ]),
    scope: sayingDisclosureScopeSchema,
    fingerprint: z.literal(SAYING_DISCLOSURE_FINGERPRINT),
  })
  .strict();
export type SayingDisclosure = z.infer<typeof sayingDisclosureSchema>;

export const SAYING_DISCLOSURE = freezeRecursively(
  sayingDisclosureSchema.parse({
    provider: SAYING_PROVIDER_ID,
    providerLabel: SAYING_PROVIDER_LABEL,
    destination: SAYING_PROVIDER_DESTINATION,
    model: SAYING_MODEL_ID,
    promptVersion: SAYING_PROMPT_VERSION,
    systemPrompt: SAYING_SYSTEM_PROMPT_V3,
    outboundFields: SAYING_OUTBOUND_FIELDS,
    scope: SAYING_DISCLOSURE_SCOPE,
    fingerprint: SAYING_DISCLOSURE_FINGERPRINT,
  }),
);

export const sayingLiveErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "REQUEST_REJECTED",
  "METHOD_NOT_ALLOWED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "DISCLOSURE_REQUIRED",
  "PROVIDER_BUSY",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_FAILED",
]);
export type SayingLiveErrorCode = z.infer<typeof sayingLiveErrorCodeSchema>;

export const sayingLiveErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: sayingLiveErrorCodeSchema,
        message: z.string().min(1).max(320),
      })
      .strict(),
  })
  .strict();
export type SayingLiveErrorResponse = z.infer<typeof sayingLiveErrorResponseSchema>;

export const SAYING_HTTP_STATUS_BY_ERROR = freezeRecursively({
  BAD_REQUEST: 400,
  REQUEST_REJECTED: 403,
  METHOD_NOT_ALLOWED: 405,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  DISCLOSURE_REQUIRED: 428,
  PROVIDER_BUSY: 429,
  PROVIDER_FAILED: 502,
  PROVIDER_UNAVAILABLE: 503,
  PROVIDER_TIMEOUT: 504,
} satisfies Record<SayingLiveErrorCode, number>);

export const sayingLiveRequestSchema = sayingRequestSchema;
export const sayingLiveSuccessSchema = z
  .object({
    response: sayingResponseSchema,
    provenance: z
      .object({
        provider: z.literal(SAYING_PROVIDER_ID),
        model: z.literal(SAYING_MODEL_ID),
        promptVersion: z.literal(SAYING_PROMPT_VERSION),
        generatedAt: z.string().datetime({ offset: true }),
      })
      .strict(),
  })
  .strict();
export type SayingLiveRequest = SayingRequest;
export type SayingLiveSuccess = z.infer<typeof sayingLiveSuccessSchema>;

export interface SayingDisclosureReview {
  readonly disclosure: Readonly<SayingDisclosure>;
  readonly outbound: SayingRequest;
  readonly canonicalUserMessage: string;
}

export function buildSayingDisclosureReview(input: unknown): SayingDisclosureReview {
  const canonicalUserMessage = buildCanonicalSayingUserMessage(input);
  const outbound = freezeRecursively(sayingRequestSchema.parse(JSON.parse(canonicalUserMessage)));
  return freezeRecursively({ disclosure: SAYING_DISCLOSURE, outbound, canonicalUserMessage });
}

export const CLAUDE_SAYING_JSON_SCHEMA = freezeRecursively({
  type: "object",
  additionalProperties: false,
  properties: {
    quotationId: { type: "string" },
  },
  required: ["quotationId"],
});
