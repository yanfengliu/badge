import { findArtStyle } from "./art-styles";
import { manufacturingTreatmentByFamily } from "./manufacturable-prompt-recipe";
import type { CatalogueStudyRecord, PlannedCatalogueStudyProject } from "./types";

export const SOURCE_CORRECTION_RECIPE_REF = {
  id: "small-badge-source-correction",
  revision: 1,
} as const;

export const canonicalOnlyStudySlugs = Object.freeze([
  "code",
  "dune",
  "educated",
  "guns-germs-and-steel",
  "masters-degree",
  "nicomachean-ethics",
  "pride-and-prejudice",
  "the-design-of-everyday-things",
  "the-left-hand-of-darkness",
  "the-remains-of-the-day",
  "the-sixth-extinction",
  "the-warmth-of-other-suns",
  "thinking-fast-and-slow",
] as const);

const canonicalOnlySlugSet = new Set<string>(canonicalOnlyStudySlugs);

export function requiresSourceCorrection(slug: string): boolean {
  return !canonicalOnlySlugSet.has(slug);
}

export function compileSourceCorrectionPrompt(
  record: CatalogueStudyRecord,
  project: PlannedCatalogueStudyProject,
): string {
  if (record.definitionId !== project.definitionId) {
    throw new Error(
      `Source correction cannot combine record ${record.definitionId} with project ${project.definitionId}; use the matching authoring campaign entry.`,
    );
  }
  const primary = project.candidates.find(
    (candidate) => candidate.candidateKey === project.primaryCandidateKey,
  );
  if (!primary) {
    throw new Error(
      `Source correction found no primary candidate ${project.primaryCandidateKey} for ${record.title}; repair the authoring campaign first.`,
    );
  }
  const style = findArtStyle(primary.styleId);
  if (!style) {
    throw new Error(
      `Source correction found unknown style ${primary.styleId} for ${record.title}; register the immutable style revision first.`,
    );
  }
  const treatment = manufacturingTreatmentByFamily[style.family];
  const requiredForms = record.artBrief.requiredMotifs.map((motif) => `- ${motif}`).join("\n");
  const explicitExclusions = record.artBrief.excludedMotifs.map((motif) => `- ${motif}`).join("\n");
  return [
    "Edit the referenced image into a newly rendered, miniature-manufacturable source master.",
    "Do not preserve noncompliant detail from the reference. Preserve the achievement meaning, but rebuild the composition from broad flat shapes.",
    "",
    `ACHIEVEMENT: ${record.title}`,
    `MEANING: ${record.artBrief.description}`,
    "",
    "REQUIRED PRIMARY FORMS — depict each exactly once as one broad silhouette or continuous mass:",
    requiredForms,
    "Remove every object, mark, texture, scenic fragment, repeated motif, or subdivision not needed to recognize those required forms.",
    "",
    `FACE LANGUAGE: ${treatment.label}.`,
    treatment.directive,
    "Render that language only through perfectly uniform, flat color fields with clean antialiased edges.",
    "The later 3D renderer owns all physical material response. Remove simulated grain, paper fibers, brush texture, individual stitches, wood grain, stone texture, glass texture, enamel relief, metal shine, shadows, highlights, bevels, depth shading, and gradients used as detail.",
    "",
    "MINIATURE CONSTRUCTION:",
    "Design for a 32 mm face and prove recognition at exactly 48 by 48 pixels.",
    "Use only 3 to 5 dominant forms, no more than 3 supporting accents, and no more than 6 color families.",
    "Merge any skyline, forest, crowd, architecture, water, cloud, terrain, circuit, cell, or repeated object into one continuous mass without internal miniatures.",
    "Every recognition-critical form must be at least 3.125 percent of the image width; every essential gap at least 2.5 percent.",
    "No hatching, contour fields, tesserae, repeated cells, scattered dots, stars, pebbles, rubble, windows, columns, cables, foliage details, feathers, tableware, glyphs, or other small marks.",
    "",
    "EXPLICIT SUBJECT EXCLUSIONS:",
    explicitExclusions,
    "",
    "OUTPUT:",
    "Square, full-bleed flat face artwork continuing to all four edges. No inset margin, frame, border, presentation background, badge silhouette, rim, pin, patch, coin, bevel, thickness, clasp, cast shadow, mockup, words, letters, numerals, signature, seal, or logo.",
    "Output only the corrected flat artwork.",
  ].join("\n");
}
