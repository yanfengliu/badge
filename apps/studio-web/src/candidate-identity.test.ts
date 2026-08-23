import { describe, expect, it } from "vitest";

import {
  candidateIdentityKey,
  generatedCandidateIdentity,
  processedCandidateIdentity,
  uploadedCandidateIdentity,
} from "./candidate-identity";

const SAME_HASH = "a".repeat(64);
const OTHER_HASH = "b".repeat(64);

describe("Studio candidate identity", () => {
  it("keeps byte-identical generated and uploaded candidates distinct", () => {
    const generated = generatedCandidateIdentity(SAME_HASH, "candidate-literal");
    const uploaded = uploadedCandidateIdentity(SAME_HASH);

    expect(candidateIdentityKey(generated)).not.toBe(candidateIdentityKey(uploaded));
    expect(generated.hash).toBe(uploaded.hash);
    expect(generated.provenance).toBe("generated");
    expect(uploaded.provenance).toBe("uploaded");
  });

  it("gives repeated equivalent uploads one stable identity", () => {
    expect(candidateIdentityKey(uploadedCandidateIdentity(SAME_HASH))).toBe(
      candidateIdentityKey(uploadedCandidateIdentity(SAME_HASH)),
    );
  });

  it("deduplicates only the same treatment of the same lineage", async () => {
    const generatedParent = generatedCandidateIdentity(OTHER_HASH, "candidate-literal");
    const uploadedParent = uploadedCandidateIdentity(OTHER_HASH);
    const first = await processedCandidateIdentity(
      SAME_HASH,
      "generated",
      generatedParent,
      "warm-mineral-treatment-v1",
    );
    const repeated = await processedCandidateIdentity(
      SAME_HASH,
      "generated",
      generatedParent,
      "warm-mineral-treatment-v1",
    );
    const differentParentProvenance = await processedCandidateIdentity(
      SAME_HASH,
      "uploaded",
      uploadedParent,
      "warm-mineral-treatment-v1",
    );
    const differentTransform = await processedCandidateIdentity(
      SAME_HASH,
      "generated",
      generatedParent,
      "publication-png-v1",
    );

    expect(candidateIdentityKey(repeated)).toBe(candidateIdentityKey(first));
    expect(candidateIdentityKey(differentParentProvenance)).not.toBe(candidateIdentityKey(first));
    expect(candidateIdentityKey(differentTransform)).not.toBe(candidateIdentityKey(first));
  });

  it("keeps lineage bounded across repeated non-destructive treatments", async () => {
    let identity = uploadedCandidateIdentity(OTHER_HASH);

    for (let index = 0; index < 50; index += 1) {
      identity = await processedCandidateIdentity(
        index.toString(16).padStart(64, "0"),
        "uploaded",
        identity,
        "warm-mineral-treatment-v1",
      );
      expect(identity.lineage).toMatch(/^processed:warm-mineral-treatment-v1:[0-9a-f]{64}$/);
      expect(identity.lineage.length).toBeLessThanOrEqual(112);
    }
  });
});
