import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { artStyleLibrary } from "./art-styles.js";
import { nationalParkCampaign } from "./national-parks-campaign.js";
import { compileCandidatePrompt, PROMPT_RECIPE_REF } from "./prompt-recipe.js";

function thrownMessage(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  throw new Error("Expected the prompt compiler to reject invalid curated text.");
}

describe("the Studio source-art prompt recipe", () => {
  it("compiles deterministic, bounded, candidate-specific prompts for every park", () => {
    const allPrompts = new Set<string>();
    for (const project of nationalParkCampaign) {
      for (const candidate of project.candidates) {
        const first = compileCandidatePrompt(project.brief, candidate);
        const second = compileCandidatePrompt(project.brief, candidate);
        expect(first).toEqual(second);
        expect(first.recipe).toEqual(PROMPT_RECIPE_REF);
        expect(new TextEncoder().encode(first.prompt).byteLength).toBeLessThanOrEqual(16 * 1024);
        expect(first.prompt).toContain("square, edge-to-edge source illustration");
        expect(first.prompt).toMatch(/no words, letters, numerals/iu);
        expect(first.prompt).toMatch(/no finished badge, patch, coin, medallion, rim, border/iu);
        expect(first.prompt).toMatch(/constructed separately/iu);
        allPrompts.add(first.prompt);
      }
    }
    expect(allPrompts.size).toBe(63 * 3);
  });

  it("lets every registered style be chosen without mutating achievement meaning", () => {
    const project = nationalParkCampaign[0];
    const baseCandidate = project.candidates[0];
    for (const style of artStyleLibrary) {
      const compiled = compileCandidatePrompt(project.brief, {
        ...baseCandidate,
        styleId: style.id,
      });
      expect(compiled.style).toEqual({ id: style.id, revision: style.revision });
      expect(compiled.prompt).toContain(project.brief.title);
      expect(compiled.prompt).toContain(project.brief.criterion);
    }
  });

  it("rejects unresolved styles with an actionable error", () => {
    const project = nationalParkCampaign[0];
    expect(() =>
      compileCandidatePrompt(project.brief, {
        ...project.candidates[0],
        styleId: "missing-style",
      }),
    ).toThrow(/missing-style.*style library.*choose a registered style/iu);
  });

  it("reports blank curated text with the candidate key, exact field, and remediation", () => {
    const project = nationalParkCampaign[0];
    const message = thrownMessage(() =>
      compileCandidatePrompt({ ...project.brief, title: "\u2003" }, project.candidates[0]),
    );
    expect(message).toContain(`CandidateKey ${JSON.stringify(project.candidates[0].candidateKey)}`);
    expect(message).toContain("field brief.title is blank");
    expect(message).toContain("provide visible curated text before compiling");
  });

  it.each([
    ["control", "Acadia\u0000reference"],
    ["format", "Acadia\u2066reference"],
  ])("rejects forbidden Unicode %s characters before whitespace normalization", (_, value) => {
    const project = nationalParkCampaign[0];
    const message = thrownMessage(() =>
      compileCandidatePrompt({ ...project.brief, criterion: value }, project.candidates[0]),
    );
    expect(message).toContain(`CandidateKey ${JSON.stringify(project.candidates[0].candidateKey)}`);
    expect(message).toContain(
      "field brief.criterion contains a forbidden Unicode control or format character",
    );
    expect(message).toContain(
      "remove controls, line breaks, tabs, bidirectional marks, and zero-width formatting",
    );
  });

  it("rejects non-NFC source text instead of silently normalizing it", () => {
    const project = nationalParkCampaign[0];
    const message = thrownMessage(() =>
      compileCandidatePrompt(
        { ...project.brief, description: "Cafe\u0301 on the coast" },
        project.candidates[0],
      ),
    );
    expect(message).toContain(`CandidateKey ${JSON.stringify(project.candidates[0].candidateKey)}`);
    expect(message).toContain("field brief.description is not Unicode NFC");
    expect(message).toContain('normalize the source value with value.normalize("NFC")');
  });

  it("validates every style prompt directive and reports its exact index", () => {
    const project = nationalParkCampaign[0];
    const baseCandidate = project.candidates[0];
    for (const style of artStyleLibrary) {
      const directives = style.promptDirectives as unknown as string[];
      for (const [index, original] of [...directives].entries()) {
        try {
          directives[index] = "Layer color\u0000with care.";
          const message = thrownMessage(() =>
            compileCandidatePrompt(project.brief, { ...baseCandidate, styleId: style.id }),
          );
          expect(message).toContain(`CandidateKey ${JSON.stringify(baseCandidate.candidateKey)}`);
          expect(message).toContain(
            `field style.promptDirectives[${index}] contains a forbidden Unicode control or format character`,
          );
          expect(message).toContain("remove controls");
        } finally {
          directives[index] = original;
        }
      }
    }
  });

  it("identifies indexed brief and composition text at the failing source field", () => {
    const project = nationalParkCampaign[0];
    const candidate = project.candidates[0];
    const message = thrownMessage(() =>
      compileCandidatePrompt(
        {
          ...project.brief,
          themeCues: [project.brief.themeCues[0], "bad\u0000cue", project.brief.themeCues[2]],
        },
        candidate,
      ),
    );
    expect(message).toContain("field brief.themeCues[1]");

    const compositionMessage = thrownMessage(() =>
      compileCandidatePrompt(project.brief, {
        ...candidate,
        composition: {
          ...candidate.composition,
          supportingElements: ["valid support", "bad\u2066support"],
        },
      }),
    );
    expect(compositionMessage).toContain("field candidate.composition.supportingElements[1]");
  });

  it("keeps park-specific truth guards in the exact selected prompts", () => {
    const expectedGuards = [
      ["us-national-parks/sequoia", "Half Dome or Yosemite Falls"],
      ["us-national-parks/sequoia", "oak-like or lollipop crown"],
      ["us-national-parks/wind-cave", "freestanding crystal blocks"],
      ["us-national-parks/hot-springs", "open-air natural bathing pool"],
      ["us-national-parks/mammoth-cave", "daylight cave opening"],
      ["us-national-parks/cuyahoga-valley", "smokestacks directly behind Brandywine Falls"],
      ["us-national-parks/cuyahoga-valley", "low dam or weir"],
      ["us-national-parks/cuyahoga-valley", "tall sixty-foot bridal-veil cascade"],
      ["us-national-parks/big-bend", "inset paper margin or rough rectangular print border"],
      ["us-national-parks/hawaii-volcanoes", "inset paper margin or rough rectangular paint border"],
      ["us-national-parks/pinnacles", "inset paper margin or rough rectangular paint border"],
      ["us-national-parks/guadalupe-mountains", "isolated flat-topped butte or mesa"],
      ["us-national-parks/hot-springs", "river, visible creek, or open water beside Bathhouse Row"],
      ["us-national-parks/katmai", "tall multi-tier waterfall or mountain cascade"],
    ] as const;
    for (const [badgeKey, guard] of expectedGuards) {
      const project = nationalParkCampaign.find((entry) => entry.brief.badgeKey === badgeKey);
      if (!project) throw new Error(`Missing guarded national-park project ${badgeKey}.`);
      expect(compileCandidatePrompt(project.brief, project.candidates[0]).prompt).toContain(guard);
    }
  });

  it("keeps badge-source-art revision 1 byte-stable", () => {
    const project = nationalParkCampaign[0];
    const prompt = compileCandidatePrompt(project.brief, project.candidates[0]).prompt;
    expect(createHash("sha256").update(prompt, "utf8").digest("hex")).toBe(
      "affa38b656f2ea1a9c95fdaa2b0b68b4474945fea8c438c1126dff59f0d6c0a7",
    );
  });
});
