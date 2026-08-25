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
  personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
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
    expect(() =>
      validateSayingProviderResultForRequest(
        {
          ...approvedQuotation,
          response: {
            ...approvedQuotation.response,
            quotation: {
              ...approvedQuotation.response.quotation,
              personWikipediaUrl: "https://en.wikipedia.org/wiki/Someone_Else",
            },
          },
        },
        yosemiteRequest,
      ),
    ).toThrow(/does not exactly match the supplied quotation/u);
  });

  it("rejects model-written prose at both the model and provider-result boundaries", () => {
    expect(() =>
      resolveSayingModelResponse(
        {
          kind: "original",
          saying: "Worth every switchback.",
          quotationId: null,
        },
        yosemiteRequest,
      ),
    ).toThrow();
    expect(() =>
      sayingProviderResultSchema.parse({
        response: { kind: "original", saying: "Worth every switchback." },
        provenance,
      }),
    ).toThrow();
  });
});

describe("provider result provenance", () => {
  it("keeps provider and model identity bounded while omitting credentials and raw output", () => {
    expect(sayingProviderProvenanceSchema.parse(provenance)).toEqual(provenance);
    const response = {
      kind: "quotation" as const,
      saying: historicalQuotation.text,
      quotation: historicalQuotation,
    };
    expect(
      sayingProviderResultSchema.parse({
        response,
        provenance,
      }),
    ).toEqual({ response, provenance });

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
