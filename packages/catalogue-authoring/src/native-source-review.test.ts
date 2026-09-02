// A contact sheet proves collection coverage, not source conformance.
//
// A labelled 63-image contact sheet of these same parks looked broad and cohesive
// while concealing inset work boundaries, the wrong waterfall geometry, an
// oak-like crown on General Sherman, geyser-like Hot Springs water, fantasy
// Mammoth Cave forms, and incorrect Guadalupe Mountains and Katmai silhouettes.
// Ten sources were rejected and regenerated. Every aggregate view — contact
// sheet, grid, montage, proof sheet — answers "did we make one of each", never
// "is each one right", and it answers the first question just as confidently
// when the second answer is no.
//
// So: inspect every promoted generated source at its native resolution, against
// factual cues, explicit exclusions, and all four edges. This gate is what makes
// that non-optional. It does not judge the art; it makes it impossible to
// promote bytes nobody has looked at, because a review is recorded against the
// digest of the exact bytes reviewed. Regenerate a source and its review record
// no longer matches, and this test names the park until someone looks again.
//
// The named `us-national-parks.test.ts` does NOT cover this: it verifies all 63
// source and thumbnail hashes and dimensions, so it proves the recorded bytes are
// the bytes on disk — and stays green for a wrong image whose hash was recorded
// correctly.
//
// Reach of this gate (state the bound rather than let it be discovered):
//   * It covers the national-parks catalogue only. The other five catalogues
//     (us-states, books-read, life-milestones, michelin-dining, video-games)
//     carry no native-resolution review record yet.
//   * It gates that a review of the shipped bytes happened at native size, not
//     that the reviewer was right.
import { describe, expect, it } from "vitest";

import {
  REQUIRED_NATIVE_SOURCE_REVIEW_CHECKS,
  nationalParkNativeSourceReview,
} from "./native-source-reviews.js";
import { usNationalParks } from "./us-national-parks.js";

const round = nationalParkNativeSourceReview;
const reviewBySlug = new Map(round.reviews.map((review) => [review.slug, review]));

describe("promoted national-park sources carry a native-resolution review", () => {
  it("reviews the exact bytes that ship, so regenerating a source strands its review", () => {
    for (const park of usNationalParks) {
      const review = reviewBySlug.get(park.slug);
      expect(
        review,
        `${park.slug} is promoted with no native-resolution review record — a contact sheet does not count`,
      ).toBeDefined();
      expect(
        review?.reviewedSha256,
        `${park.slug} ships bytes that no native-resolution review covers: reviewed ${review?.reviewedSha256}, promoted ${park.selectedSource.sha256}`,
      ).toBe(park.selectedSource.sha256);
    }
  });

  it("was conducted at the source's native pixel size, not at thumbnail or proof-sheet scale", () => {
    // 128px list derivatives and 48px proof sheets are the scales that hid the
    // original ten defects; a review recorded at either must not satisfy this.
    const nativeWidths = new Set(usNationalParks.map((park) => park.selectedSource.width));
    expect(nativeWidths.size).toBe(1);
    expect(
      round.reviewedPixels,
      `sources are ${[...nativeWidths][0]}px but the review was recorded at ${round.reviewedPixels}px`,
    ).toBe([...nativeWidths][0]);
    expect(round.reviewedPixels).toBeGreaterThan(usNationalParks[0].selectedSource.thumbnail.width);
  });

  it("checked all four edges, the factual cues, and the explicit exclusions", () => {
    for (const required of REQUIRED_NATIVE_SOURCE_REVIEW_CHECKS) {
      expect(round.checks, `the review round did not check ${required}`).toContain(required);
    }
    expect(round.catalogue).toBe("national-parks");
    expect(round.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(round.reviewer.length).toBeGreaterThan(0);
  });

  it("holds no review for a source that is not promoted, and none twice", () => {
    const promoted = new Set(usNationalParks.map((park) => park.slug));
    for (const review of round.reviews) {
      expect(promoted.has(review.slug), `${review.slug} has a review but is not a promoted park`).toBe(true);
    }
    expect(new Set(round.reviews.map((review) => review.slug)).size).toBe(round.reviews.length);
    expect(round.reviews).toHaveLength(usNationalParks.length);
    expect(round.reviews).toHaveLength(63);
  });

  it("records a digest per review that is a real sha256 and unique to that source", () => {
    for (const review of round.reviews) {
      expect(review.reviewedSha256, review.slug).toMatch(/^[0-9a-f]{64}$/u);
    }
    // Two parks sharing a digest would mean one was reviewed as a copy of the other.
    expect(new Set(round.reviews.map((review) => review.reviewedSha256)).size).toBe(round.reviews.length);
  });
});
