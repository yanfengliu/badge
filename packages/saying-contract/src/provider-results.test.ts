import { describe, expect, it } from "vitest";

import {
  SAYING_PROMPT_VERSION,
  resolveSayingModelResponse,
  sayingProviderProvenanceSchema,
  sayingProviderResultSchema,
  validateSayingProviderResultForRequest,
} from "./index";

const historicalQuotation = {
  id: "muir-yosemite-temple",
  text: "It is by far the grandest of all the special temples of Nature I was ever permitted to enter.",
  person: "John Muir",
  sourceTitle: "Letters to a Friend, July 26, 1868",
  sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
};

const yosemiteRequest = {
  title: "Yosemite",
  criterion: "Visit Yosemite National Park",
  allowedQuotations: [historicalQuotation],
};

const provenance = {
  provider: "fixture-provider",
  model: "deterministic-v1",
  promptVersion: SAYING_PROMPT_VERSION,
  generatedAt: "2026-08-23T12:00:00.000Z",
} as const;

describe("provider results bound to their saying request", () => {
  it("binds every hydrated quotation field to the exact originating shortlist", () => {
    const approvedQuotation = {
      response: {
        kind: "quotation" as const,
        saying: historicalQuotation.text,
        quotation: historicalQuotation,
      },
      provenance,
    };

    expect(validateSayingProviderResultForRequest(approvedQuotation, yosemiteRequest)).toEqual(
      approvedQuotation,
    );
    expect(() =>
      validateSayingProviderResultForRequest(
        {
          ...approvedQuotation,
          response: {
            kind: "quotation",
            saying: "History was conveniently invented here.",
            quotation: {
              id: "fabricated-history",
              text: "History was conveniently invented here.",
              person: "Imaginary Person",
              sourceTitle: "Imaginary Source",
              sourceUrl: "https://example.com/invented",
            },
          },
        },
        yosemiteRequest,
      ),
    ).toThrow(/not one of the supplied quotations/u);
    expect(() =>
      validateSayingProviderResultForRequest(
        {
          ...approvedQuotation,
          response: {
            ...approvedQuotation.response,
            quotation: {
              ...approvedQuotation.response.quotation,
              sourceTitle: "Altered after selection",
            },
          },
        },
        yosemiteRequest,
      ),
    ).toThrow(/does not exactly match the supplied quotation/u);
  });

  it("rejects quotation wrapping, attribution prefixes, and lightly altered supplied quotes in freeform output", () => {
    expect(() =>
      resolveSayingModelResponse(
        {
          kind: "original",
          saying: `“${historicalQuotation.text}” — John Muir`,
          quotationId: null,
        },
        yosemiteRequest,
      ),
    ).toThrow(/quotation-style text or attribution/u);

    expect(() =>
      resolveSayingModelResponse(
        {
          kind: "original",
          saying: `A familiar thought: ${historicalQuotation.text}`,
          quotationId: null,
        },
        yosemiteRequest,
      ),
    ).toThrow(/too closely matches a supplied historical quotation/u);

    for (const attributedSuggestion of [
      "According to John Muir, granite keeps the long view.",
      "As John Muir said, granite keeps the long view.",
      "John Muir: Granite keeps the long view.",
      "Worth every switchback. — John Muir",
      "Worth every switchback. — John Muir.",
      "Worth every switchback. — John Muir (Steep Trails)",
      "Granite keeps the long view. According to John Muir, wonder waits around the bend.",
      "One ridge became another. As John Muir said, the trail remembers.",
      "The valley kept its distance. John Muir: Wonder waits below.",
      "I kept walking. John Muir wrote that the granite remembers.",
      "The valley, according to John Muir, keeps the long view.",
      "I learned, as John Muir said, that wonder waits around the bend.",
      "The words John Muir wrote still echo across the granite.",
      "One sign read John Muir: Wonder waits below.",
    ]) {
      expect(() =>
        resolveSayingModelResponse(
          { kind: "original", saying: attributedSuggestion, quotationId: null },
          yosemiteRequest,
        ),
      ).toThrow(/attributes text to a supplied historical person/u);
    }

    expect(() =>
      resolveSayingModelResponse(
        {
          kind: "original",
          saying:
            "It is by far the greatest of all the special temples of Nature I was ever permitted to enter.",
          quotationId: null,
        },
        yosemiteRequest,
      ),
    ).toThrow(/too closely matches a supplied historical quotation/u);
  });
});

describe("provider result provenance", () => {
  it("keeps provider and model identity bounded while omitting credentials and raw output", () => {
    expect(sayingProviderProvenanceSchema.parse(provenance)).toEqual(provenance);
    expect(
      sayingProviderResultSchema.parse({
        response: { kind: "original", saying: "Worth every switchback." },
        provenance,
      }),
    ).toEqual({ response: { kind: "original", saying: "Worth every switchback." }, provenance });

    expect(() => sayingProviderProvenanceSchema.parse({ ...provenance, model: "Model With Spaces" })).toThrow(
      /lowercase stable identifier/u,
    );
    expect(() => sayingProviderProvenanceSchema.parse({ ...provenance, model: "x".repeat(129) })).toThrow();
    expect(
      sayingProviderProvenanceSchema.parse({ ...provenance, model: "hf/meta-llama/llama-3.2:latest" }),
    ).toMatchObject({ model: "hf/meta-llama/llama-3.2:latest" });

    for (const field of ["apiKey", "credential", "rawResponse"]) {
      expect(() => sayingProviderProvenanceSchema.parse({ ...provenance, [field]: "forbidden" })).toThrow();
    }
  });
});
