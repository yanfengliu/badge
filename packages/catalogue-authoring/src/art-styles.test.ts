import { describe, expect, it } from "vitest";

import {
  artStyleLibrary,
  findArtStyle,
  frequentArtStylePreferences,
  recommendedFrequentArtStyleUsage,
} from "./art-styles.js";
import { nationalParkCampaign } from "./national-parks-campaign.js";

const creatorImitationPatterns = [
  /\bin\s+(?:the\s+)?(?:style|manner|aesthetic|visual language)\s+of\b/iu,
  /\b(?:imitate|mimic|emulate|channel|copy)\s+(?:the\s+)?(?:work|works|style|aesthetic|visual language|look)\s+(?:of|by)\b/iu,
  /\b(?:inspired by|reminiscent of|evocative of)\s+(?:the\s+)?(?:work|works|style|art|aesthetic|visual language)\s+(?:of|by)\b/iu,
  /\b(?:artist|creator)(?:Name)?\s*:/iu,
  /\b(?:make|render|paint|draw|illustrate|compose)\s+(?:this|it|the scene|the image)\s+(?:like|as)\s+(?:a\s+work\s+by\s+)?[\p{L}]/iu,
  /\b(?:painting|print|illustration|composition|artwork)\s+after\s+[\p{L}]/iu,
] as const;

describe("the versioned Studio art-style library", () => {
  it("starts broad and includes the owner's requested directions", () => {
    expect(artStyleLibrary).toHaveLength(24);
    expect(artStyleLibrary.map((style) => style.id)).toEqual(
      expect.arrayContaining([
        "pixel-cluster-landscape",
        "thread-painted-embroidery",
        "plein-air-broken-color",
      ]),
    );
    expect(new Set(artStyleLibrary.map((style) => `${style.id}@${style.revision}`)).size).toBe(
      artStyleLibrary.length,
    );
  });

  it("keeps styles creator-neutral and free of finished-badge construction", () => {
    for (const style of artStyleLibrary) {
      const text = JSON.stringify(style);
      for (const pattern of creatorImitationPatterns) expect(text).not.toMatch(pattern);
      expect(text).not.toMatch(/living artist|named creator|recognizable creator|signature style/iu);
      expect(text).not.toMatch(/finished badge|medallion|outer rim|cast shadow|mockup/iu);
      expect(style.summary.length).toBeGreaterThan(20);
      expect(style.promptDirectives.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("proves the creator-imitation matcher rejects representative evasive wording", () => {
    const disallowedExamples = [
      "Render this in the aesthetic of Jane Doe.",
      "Mimic the visual language of Jane Doe.",
      "Inspired by the work of Jane Doe.",
      "artistName: Jane Doe",
      "Paint the scene like Jane Doe.",
      "A landscape print after Jane Doe.",
    ];
    for (const example of disallowedExamples) {
      expect(
        creatorImitationPatterns.some((pattern) => pattern.test(example)),
        `Creator-imitation control was not recognized: ${example}`,
      ).toBe(true);
    }
  });

  it("keeps every textual value in the complete style registry visible, NFC, and control-free", () => {
    for (const style of artStyleLibrary) {
      const values = [
        ["id", style.id],
        ["label", style.label],
        ["family", style.family],
        ["summary", style.summary],
        ...style.promptDirectives.map((value, index) => [`promptDirectives[${index}]`, value]),
        ...style.tags.map((value, index) => [`tags[${index}]`, value]),
      ] as const;
      for (const [field, value] of values) {
        const path = `${style.id}.${field}`;
        expect(value, `${path} must be NFC`).toBe(value.normalize("NFC"));
        expect(value, `${path} must not contain Unicode control or format characters`).not.toMatch(
          /[\p{Cc}\p{Cf}]/u,
        );
        expect(value.trim(), `${path} must contain visible text`).not.toBe("");
      }
    }
  });

  it("makes luminous ligne claire a frequent future-campaign direction without changing old studies", () => {
    expect(frequentArtStylePreferences).toEqual([
      {
        styleId: "luminous-ligne-claire",
        minimumCampaignSize: 8,
        candidateShare: 0.25,
        primaryShare: 0.1,
      },
    ]);
    expect(findArtStyle(frequentArtStylePreferences[0].styleId)?.label).toBe("Luminous ligne claire");
    expect(recommendedFrequentArtStyleUsage("luminous-ligne-claire", 7)).toEqual({
      candidateAppearances: 0,
      primarySelections: 0,
    });
    expect(recommendedFrequentArtStyleUsage("luminous-ligne-claire", 24)).toEqual({
      candidateAppearances: 6,
      primarySelections: 2,
    });
    expect(recommendedFrequentArtStyleUsage("missing-style", 24)).toBeUndefined();
    expect(() => recommendedFrequentArtStyleUsage("luminous-ligne-claire", -1)).toThrow(
      "must be a non-negative safe integer",
    );
  });

  it("resolves every campaign style and distributes the selected studies broadly", () => {
    const primaryCounts = new Map<string, number>();
    for (const project of nationalParkCampaign) {
      expect(new Set(project.candidates.map((candidate) => candidate.role)).size).toBe(3);
      expect(new Set(project.candidates.map((candidate) => candidate.styleId)).size).toBe(3);
      for (const candidate of project.candidates) expect(findArtStyle(candidate.styleId)).toBeTruthy();
      const primary = project.candidates[0].styleId;
      primaryCounts.set(primary, (primaryCounts.get(primary) ?? 0) + 1);
    }
    expect(primaryCounts.size).toBeGreaterThanOrEqual(16);
    expect(Math.max(...primaryCounts.values())).toBeLessThanOrEqual(5);
  });
});
