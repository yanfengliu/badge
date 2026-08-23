import { describe, expect, it } from "vitest";

import { createFixtureSayingProvider } from "./saying-proposals";

const promptInput = {
  title: "Yosemite",
  criterion: "Visit Yosemite National Park",
} as const;

describe("fixture saying provider", () => {
  it("rotates curated local previews only when propose is explicitly called", async () => {
    const provider = createFixtureSayingProvider(
      [{ ...promptInput, sayingSuggestions: ["First local line.", "Second local line."] }],
      () => "2026-08-23T12:00:00.000Z",
    );
    const signal = new AbortController().signal;

    const first = await provider.propose({ requestId: 1, promptInput, signal });
    const second = await provider.propose({ requestId: 2, promptInput, signal });

    expect(first.response.saying).toBe("First local line.");
    expect(second.response.saying).toBe("Second local line.");
    expect(first.provenance).toMatchObject({
      provider: "fixture-local-preview",
      model: "curated-fixture-v1",
    });
  });
});
