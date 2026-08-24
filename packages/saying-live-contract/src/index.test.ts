import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  SAYING_OUTPUT_CODE_POINT_LIMIT,
  SAYING_OUTPUT_UTF8_LIMIT,
  SAYING_PROMPT_VERSION,
  SAYING_QUOTATION_CONTRACT_VERSION,
  SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT,
  SAYING_QUOTATION_PERSON_UTF8_LIMIT,
  SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT,
  SAYING_QUOTATION_SOURCE_TITLE_UTF8_LIMIT,
  sayingProviderResultSchema,
} from "@badge/saying-contract";

import {
  CLAUDE_SAYING_JSON_SCHEMA,
  SAYING_DISCLOSURE,
  SAYING_DISCLOSURE_FINGERPRINT,
  SAYING_DISCLOSURE_HEADER,
  SAYING_DISCLOSURE_PATH,
  SAYING_GENERATION_PATH,
  SAYING_HTTP_SUCCESS_STATUS,
  SAYING_HTTP_STATUS_BY_ERROR,
  SAYING_MODEL_ID,
  SAYING_ROUTE_RESPONSE_LIMIT_BYTES,
  SAYING_ALLOWED_QUOTATION_FIELDS,
  SAYING_DIRECTION_FIELDS,
  SAYING_EXCLUDED_FIELDS,
  SAYING_OPTIONAL_FIELDS,
  SAYING_REQUIRED_FIELDS,
  buildSayingDisclosureReview,
  sayingDisclosureFingerprintMaterial,
  sayingDisclosureSchema,
  sayingLiveErrorResponseSchema,
  sayingLiveRequestSchema,
  sayingLiveSuccessSchema,
  sayingModeForViteMode,
} from "./index";

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("live saying contract", () => {
  it("pins the same-origin routes, disclosure header, and product model", () => {
    expect(SAYING_DISCLOSURE_PATH).toBe("/api/archive/sayings/disclosure");
    expect(SAYING_GENERATION_PATH).toBe("/api/archive/sayings");
    expect(SAYING_DISCLOSURE_HEADER).toBe("X-Badge-Saying-Disclosure");
    expect(SAYING_MODEL_ID).toBe("claude-sonnet-4-6");
    expect(SAYING_HTTP_SUCCESS_STATUS).toBe(200);
    expect(SAYING_ROUTE_RESPONSE_LIMIT_BYTES).toBe(16 * 1_024);
  });

  it.each([
    ["fixture", "fixture"],
    ["test", "fixture"],
    ["development", "live"],
    ["production", "live"],
    ["staging", "live"],
  ] as const)("classifies Vite mode %s as %s saying mode", (viteMode, expected) => {
    expect(sayingModeForViteMode(viteMode)).toBe(expected);
  });

  it("binds consent to provider, destination, model, prompt, and the complete nested field scope", () => {
    const material = sayingDisclosureFingerprintMaterial();
    expect(SAYING_DISCLOSURE_FINGERPRINT).toBe(`sha256:${digest(material)}`);
    expect(sayingDisclosureSchema.parse(SAYING_DISCLOSURE)).toEqual(SAYING_DISCLOSURE);
    expect(SAYING_DISCLOSURE.scope.requiredFields).toEqual(SAYING_REQUIRED_FIELDS);
    expect(SAYING_DISCLOSURE.scope.optionalFields).toEqual(SAYING_OPTIONAL_FIELDS);
    expect(SAYING_REQUIRED_FIELDS).toEqual(["title", "criterion", "allowedQuotations"]);
    expect(SAYING_OPTIONAL_FIELDS).toEqual(["direction"]);
    expect(SAYING_DISCLOSURE.scope.directionFields).toEqual(SAYING_DIRECTION_FIELDS);
    expect(SAYING_DISCLOSURE.scope.allowedQuotationFields).toEqual(SAYING_ALLOWED_QUOTATION_FIELDS);
    expect(SAYING_DISCLOSURE.scope.quotationContractVersion).toBe(SAYING_QUOTATION_CONTRACT_VERSION);
    expect(SAYING_DISCLOSURE.scope.excludedFields).toEqual(SAYING_EXCLUDED_FIELDS);
    expect(SAYING_DISCLOSURE.scope.limits).toMatchObject({
      outputCodePoints: SAYING_OUTPUT_CODE_POINT_LIMIT,
      outputUtf8Bytes: SAYING_OUTPUT_UTF8_LIMIT,
      quotationPersonCodePoints: SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT,
      quotationPersonUtf8Bytes: SAYING_QUOTATION_PERSON_UTF8_LIMIT,
      quotationSourceTitleCodePoints: SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT,
      quotationSourceTitleUtf8Bytes: SAYING_QUOTATION_SOURCE_TITLE_UTF8_LIMIT,
    });
    expect(SAYING_DISCLOSURE.scope.limits).not.toHaveProperty("originalSentenceCount");
    expect(SAYING_DISCLOSURE.scope.output).toBe(
      "One exact ID from the supplied source-checked quotation list",
    );

    const parsed = JSON.parse(material) as Record<string, unknown>;
    const variants = [
      { ...parsed, provider: "other-provider" },
      { ...parsed, destination: "another destination" },
      { ...parsed, model: "another-model" },
      { ...parsed, promptVersion: "v4" },
      { ...parsed, systemPrompt: "different prompt" },
      {
        ...parsed,
        scope: {
          ...(parsed.scope as Record<string, unknown>),
          directionFields: ["themeCues", "voice", "variation", "userDirection", "privateNote"],
        },
      },
      {
        ...parsed,
        scope: {
          ...(parsed.scope as Record<string, unknown>),
          quotationContractVersion: "v1",
        },
      },
    ];
    for (const variant of variants) {
      expect(digest(JSON.stringify(variant))).not.toBe(digest(material));
    }
  });

  it("creates detached immutable review bytes from a closed runtime-validated request", () => {
    const input = {
      title: "  Yosemite  ",
      criterion: "Visit   Yosemite National Park.",
      direction: { themeCues: [" granite walls "] },
      allowedQuotations: [
        {
          id: "muir-yosemite",
          text: "Nature gives more than one seeks.",
          person: "John Muir",
          sourceTitle: "Steep Trails",
          sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
        },
      ],
    };
    const review = buildSayingDisclosureReview(input);
    input.title = "Changed after review";
    input.direction.themeCues[0] = "changed";

    expect(review.outbound).toEqual({
      title: "Yosemite",
      criterion: "Visit Yosemite National Park.",
      direction: { themeCues: ["granite walls"] },
      allowedQuotations: [
        {
          id: "muir-yosemite",
          text: "Nature gives more than one seeks.",
          person: "John Muir",
          sourceTitle: "Steep Trails",
          sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
        },
      ],
    });
    expect(review.canonicalUserMessage).toBe(
      '{"title":"Yosemite","criterion":"Visit Yosemite National Park.","direction":{"themeCues":["granite walls"]},"allowedQuotations":[{"id":"muir-yosemite","text":"Nature gives more than one seeks.","person":"John Muir","sourceTitle":"Steep Trails","sourceUrl":"https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm"}]}',
    );
    expect(Object.isFrozen(review)).toBe(true);
    expect(Object.isFrozen(review.outbound)).toBe(true);
    expect(Object.isFrozen(review.outbound.direction?.themeCues)).toBe(true);
    expect(Object.isFrozen(review.outbound.allowedQuotations)).toBe(true);
    expect(() =>
      buildSayingDisclosureReview({
        title: "Y",
        criterion: "C",
        allowedQuotations: input.allowedQuotations,
        note: "private",
      }),
    ).toThrow();
    expect(() =>
      buildSayingDisclosureReview({
        title: "Y",
        criterion: "line one\nline two",
        allowedQuotations: input.allowedQuotations,
      }),
    ).toThrow(/control character/u);
  });

  it("deep-freezes disclosure and the closed quotation-selection Claude schema", () => {
    expect(Object.isFrozen(SAYING_DISCLOSURE)).toBe(true);
    expect(Object.isFrozen(SAYING_DISCLOSURE.scope.directionFields)).toBe(true);
    expect(Object.isFrozen(CLAUDE_SAYING_JSON_SCHEMA)).toBe(true);
    expect(Object.isFrozen(CLAUDE_SAYING_JSON_SCHEMA.properties.quotationId)).toBe(true);
    expect(CLAUDE_SAYING_JSON_SCHEMA).toEqual({
      type: "object",
      additionalProperties: false,
      properties: {
        quotationId: { type: "string" },
      },
      required: ["quotationId"],
    });
  });

  it("aliases the closed request and provider-result success protocol", () => {
    const quotation = {
      id: "muir-yosemite",
      text: "Nature gives more than one seeks.",
      person: "John Muir",
      sourceTitle: "Steep Trails",
      sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
    };
    expect(
      sayingLiveRequestSchema.parse({
        title: "Yosemite",
        criterion: "Visit Yosemite.",
        allowedQuotations: [quotation],
      }),
    ).toEqual({
      title: "Yosemite",
      criterion: "Visit Yosemite.",
      allowedQuotations: [quotation],
    });
    const success = {
      response: { kind: "quotation", saying: quotation.text, quotation },
      provenance: {
        provider: "claude-code",
        model: SAYING_MODEL_ID,
        promptVersion: SAYING_PROMPT_VERSION,
        generatedAt: "2026-08-23T22:00:00.000Z",
      },
    };
    expect(sayingLiveSuccessSchema.parse(success)).toEqual(sayingProviderResultSchema.parse(success));
    expect(() =>
      sayingLiveSuccessSchema.parse({
        ...success,
        provenance: { ...success.provenance, provider: "fixture-local-preview" },
      }),
    ).toThrow();
    expect(() =>
      sayingLiveSuccessSchema.parse({
        ...success,
        provenance: { ...success.provenance, model: "curated-fixture-v1" },
      }),
    ).toThrow();
  });

  it("keeps public route failures closed, bounded, and status-mapped", () => {
    expect(
      sayingLiveErrorResponseSchema.parse({
        error: { code: "PROVIDER_UNAVAILABLE", message: "Claude Code is not available." },
      }),
    ).toEqual({
      error: { code: "PROVIDER_UNAVAILABLE", message: "Claude Code is not available." },
    });
    expect(SAYING_HTTP_STATUS_BY_ERROR).toEqual({
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
    });
    expect(() =>
      sayingLiveErrorResponseSchema.parse({
        error: { code: "PROVIDER_UNAVAILABLE", message: "Unavailable", rawStderr: "secret" },
      }),
    ).toThrow();
  });
});
