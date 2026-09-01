import { describe, expect, it } from "vitest";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import type { SayingRequest } from "@badge/saying-contract";

import { createFixtureSayingProvider } from "./saying-proposals";

const yosemite = starterBadges[0]!;
const promptInput = {
  title: yosemite.title,
  criterion: yosemite.criterion,
} as const;

describe("fixture saying provider", () => {
  it("returns only source-checked quotations supplied by the current request", async () => {
    const allowedQuotations = [...yosemite.historicalQuotations];
    const provider = createFixtureSayingProvider([promptInput], () => "2026-08-23T12:00:00.000Z");
    const signal = new AbortController().signal;

    const first = await provider.propose({
      requestId: 1,
      promptInput: { ...promptInput, allowedQuotations },
      signal,
    });
    const second = await provider.propose({
      requestId: 2,
      promptInput: { ...promptInput, allowedQuotations },
      signal,
    });

    expect(first.response).toEqual({
      kind: "quotation",
      saying: allowedQuotations[0]!.text,
      quotation: allowedQuotations[0],
    });
    expect(second.response).toEqual({
      kind: "quotation",
      saying: allowedQuotations[1]!.text,
      quotation: allowedQuotations[1],
    });
    expect(first.provenance).toMatchObject({
      provider: "fixture-local-preview",
      model: "curated-fixture-v1",
    });
  });

  it("cannot return a fixture quotation omitted from the request shortlist", async () => {
    const allowedQuotation = yosemite.historicalQuotations[1]!;
    const provider = createFixtureSayingProvider([yosemite]);

    await expect(
      provider.propose({
        requestId: 1,
        promptInput: { ...promptInput, allowedQuotations: [allowedQuotation] },
        signal: new AbortController().signal,
      }),
    ).resolves.toMatchObject({
      response: { kind: "quotation", saying: allowedQuotation.text, quotation: allowedQuotation },
    });
  });

  it("refuses to synthesize prose when no quotation is supplied", async () => {
    const provider = createFixtureSayingProvider([yosemite]);

    await expect(
      provider.propose({
        requestId: 1,
        promptInput: promptInput as unknown as SayingRequest,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(/allowedQuotations/u);
  });
});
