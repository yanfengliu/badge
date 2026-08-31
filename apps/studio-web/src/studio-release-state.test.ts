import { describe, expect, it } from "vitest";

import type { PublishedRelease } from "./studio-candidates.js";
import { beginReplacementEdition, freezeRelease, initialStudioReleaseState } from "./studio-release-state.js";

function release(version: string): PublishedRelease {
  return {
    packId: "studio.visited-yosemite",
    version,
    digest: `digest-${version}`,
    bytes: new Uint8Array([1, 2, 3]),
    themeBytes: new Uint8Array([4, 5, 6]),
  };
}

describe("Studio release state", () => {
  it("starts unpublished without a frozen release", () => {
    expect(initialStudioReleaseState).toEqual({
      phase: "unpublished",
      currentRelease: null,
      priorReleases: [],
    });
  });

  it("begins a replacement edition only from a frozen release", () => {
    const currentRelease = release("0.1.0-studio.1");
    const frozen = freezeRelease(initialStudioReleaseState, currentRelease);

    expect(beginReplacementEdition(initialStudioReleaseState)).toBe(initialStudioReleaseState);

    const revising = beginReplacementEdition(frozen);
    expect(revising).toEqual({ phase: "revising", currentRelease, priorReleases: [] });
    expect(revising.currentRelease).toBe(currentRelease);
    expect(revising.currentRelease?.bytes).toBe(currentRelease.bytes);
    expect(revising.currentRelease?.themeBytes).toBe(currentRelease.themeBytes);
    expect(beginReplacementEdition(revising)).toBe(revising);
    expect(frozen).toEqual({ phase: "frozen", currentRelease, priorReleases: [] });
  });

  it("freezes a newly published edition while retaining every previous release", () => {
    const previousRelease = release("0.1.0-studio.1");
    const revising = beginReplacementEdition(freezeRelease(initialStudioReleaseState, previousRelease));
    const replacementRelease = release("0.1.0-studio.2");

    expect(revising.phase).toBe("revising");

    const frozenReplacement = freezeRelease(revising, replacementRelease);
    expect(frozenReplacement).toEqual({
      phase: "frozen",
      currentRelease: replacementRelease,
      priorReleases: [previousRelease],
    });
    expect(frozenReplacement.currentRelease).toBe(replacementRelease);
    expect(frozenReplacement.currentRelease).not.toBe(previousRelease);
    expect(frozenReplacement.priorReleases[0]).toBe(previousRelease);
    expect(frozenReplacement.priorReleases[0]?.bytes).toBe(previousRelease.bytes);
    expect(frozenReplacement.priorReleases[0]?.themeBytes).toBe(previousRelease.themeBytes);
  });

  it("does not duplicate history when deterministic publication returns the current release", () => {
    const currentRelease = release("0.1.0-studio.1");
    const revising = beginReplacementEdition(freezeRelease(initialStudioReleaseState, currentRelease));
    const equivalentRelease = { ...currentRelease };

    expect(freezeRelease(revising, equivalentRelease)).toEqual({
      phase: "frozen",
      currentRelease: equivalentRelease,
      priorReleases: [],
    });
  });

  it("moves a republished prior release back to current without duplicate history", () => {
    const firstRelease = release("0.1.0-studio.1");
    const secondRelease = release("0.1.0-studio.2");
    const firstFrozen = freezeRelease(initialStudioReleaseState, firstRelease);
    const secondFrozen = freezeRelease(beginReplacementEdition(firstFrozen), secondRelease);
    const firstRepublished = { ...firstRelease };

    const returnedToFirst = freezeRelease(beginReplacementEdition(secondFrozen), firstRepublished);

    expect(returnedToFirst.currentRelease).toBe(firstRepublished);
    expect(returnedToFirst.priorReleases).toEqual([secondRelease]);
    expect(returnedToFirst.priorReleases).not.toContain(firstRelease);
  });
});
