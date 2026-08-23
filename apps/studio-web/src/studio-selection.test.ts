import { describe, expect, it } from "vitest";

import { candidateKey, initialCandidates } from "./studio-candidates.js";
import { candidateCapabilities, resolveCandidateSelection } from "./studio-selection.js";

describe("Studio explicit candidate selection", () => {
  it("suppresses draft autosave, processing, and publishing after an ambiguous restore", () => {
    const selected = resolveCandidateSelection(initialCandidates, null);

    expect(selected).toBeNull();
    expect(candidateCapabilities(selected)).toEqual({
      autosave: false,
      process: false,
      publish: false,
    });
  });

  it("enables candidate actions only after an explicit choice", () => {
    const selected = resolveCandidateSelection(initialCandidates, candidateKey(initialCandidates[0]));

    expect(selected).toBe(initialCandidates[0]);
    expect(candidateCapabilities(selected)).toEqual({
      autosave: true,
      process: true,
      publish: true,
    });
  });
});
