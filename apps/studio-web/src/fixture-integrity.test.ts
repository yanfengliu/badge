import { describe, expect, it } from "vitest";

import { assertStudioFixtureIntegrity } from "./fixture-integrity.js";

const candidate = {
  id: "candidate-literal",
  label: "Valley witness",
  direction: "Literal landscape",
  sourceUrl: "/fixture.webp",
  sourceAssetHash: "a".repeat(64),
};

const asset = {
  blob: new Blob([Uint8Array.of(1)], { type: "image/webp" }),
  bytes: Uint8Array.of(1),
  hash: "a".repeat(64),
  mimeType: "image/webp" as const,
  width: 1,
  height: 1,
};

describe("Studio fixture integrity", () => {
  it("accepts exact fetched bytes and rejects drift before fixture persistence", () => {
    expect(() => assertStudioFixtureIntegrity(candidate, asset)).not.toThrow();
    expect(() => assertStudioFixtureIntegrity(candidate, { ...asset, hash: "b".repeat(64) })).toThrow(
      /candidate-literal.*not pinned.*no fixture assets or draft were written/i,
    );
  });
});
