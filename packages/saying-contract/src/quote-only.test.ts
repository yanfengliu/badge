import { describe, expect, it } from "vitest";

import { parseSayingModelResponseMessage, resolveSayingModelResponse, sayingRequestSchema } from "./index";

const quotation = {
  id: "john-muir-yosemite-temple-1868",
  text: "It is by far the grandest of all the special temples of Nature I was ever permitted to enter.",
  person: "John Muir",
  sourceTitle: "Letters to a Friend, July 26, 1868",
  sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
} as const;

describe("quote-only saying contract", () => {
  it("requires at least one source-checked historical quotation", () => {
    expect(
      sayingRequestSchema.safeParse({
        title: "Yosemite",
        criterion: "Visit Yosemite National Park",
      }).success,
    ).toBe(false);
  });

  it("rejects model-written prose and accepts only a supplied quotation ID", () => {
    expect(() =>
      parseSayingModelResponseMessage(
        '{"kind":"original","saying":"Worth every switchback.","quotationId":null}',
      ),
    ).toThrow();

    expect(
      resolveSayingModelResponse(
        { quotationId: quotation.id },
        {
          title: "Yosemite",
          criterion: "Visit Yosemite National Park",
          allowedQuotations: [quotation],
        },
      ),
    ).toEqual({ kind: "quotation", saying: quotation.text, quotation });
  });
});
