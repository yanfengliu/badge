import { describe, expect, it } from "vitest";

import { commonAchievementIdeas } from "./common-achievements.js";
import {
  buildCommonAchievementProject,
  findCommonAchievementCandidate,
} from "./common-achievement-campaign.js";
import { compileCandidatePrompt } from "./prompt-recipe.js";

describe("the common-achievement ideabank", () => {
  it("offers a broad, non-competitive starting set", () => {
    expect(commonAchievementIdeas).toHaveLength(57);
    expect(new Set(commonAchievementIdeas.map((idea) => idea.id)).size).toBe(commonAchievementIdeas.length);
    expect(new Set(commonAchievementIdeas.map((idea) => idea.category)).size).toBeGreaterThanOrEqual(7);
    expect(commonAchievementIdeas.map((idea) => idea.title)).toEqual(
      expect.arrayContaining([
        "Saw the northern lights",
        "Finished a marathon",
        "Published a book",
        "Learned to swim",
        "Hosted a family reunion",
        "Shipped an app",
      ]),
    );
  });

  it("contains authoring cues but no personal state or unresolved runtime visual", () => {
    for (const idea of commonAchievementIdeas) {
      expect(idea.criterion.length).toBeGreaterThan(8);
      expect(idea.themeCues.length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(idea)).not.toEqual(
        expect.arrayContaining([
          "ownerId",
          "note",
          "visibility",
          "activatedAt",
          "packDigest",
          "sourceAssetHash",
        ]),
      );
    }
  });

  it("resolves and compiles three distinct deterministic directions for every idea", () => {
    const compiledKeys = new Set<string>();
    for (const idea of commonAchievementIdeas) {
      const first = buildCommonAchievementProject(idea);
      const second = buildCommonAchievementProject(idea);
      expect(first).toEqual(second);
      expect(new Set(first.candidates.map((candidate) => candidate.role)).size).toBe(3);
      expect(new Set(first.candidates.map((candidate) => candidate.styleId)).size).toBe(3);
      expect(new Set(first.candidates.map((candidate) => candidate.candidateKey)).size).toBe(3);
      for (const candidate of first.candidates) {
        expect(findCommonAchievementCandidate(first, candidate.role)).toBe(candidate);
        const compiled = compileCandidatePrompt(first.brief, candidate);
        expect(compiled.candidateKey).toBe(candidate.candidateKey);
        expect(compiled.prompt).toContain(idea.title);
        expect(compiled.prompt).toContain(idea.criterion);
        compiledKeys.add(compiled.candidateKey);
      }
    }
    expect(compiledKeys.size).toBe(commonAchievementIdeas.length * 3);
  });
});
