import { findArtStyle } from "./art-styles";
import { compileCandidatePrompt, PROMPT_RECIPE_REF } from "./prompt-recipe";
import type { CompiledCandidatePrompt } from "./prompt-recipe";
import type { ArtStyleDefinition, BadgeArtBrief, CandidatePlan } from "./types";

export const MANUFACTURABLE_PROMPT_RECIPE_REF = {
  id: "badge-source-art",
  revision: 2,
} as const;

export const CURRENT_PROMPT_RECIPE_REF = MANUFACTURABLE_PROMPT_RECIPE_REF;

export const SMALL_BADGE_MANUFACTURING_PROFILE_REF = {
  id: "small-badge-face",
  revision: 1,
} as const;

export const SMALL_BADGE_MANUFACTURING_LIMITS = Object.freeze({
  referenceWidthMillimeters: 32,
  primaryForms: Object.freeze({ minimum: 3, maximum: 5 }),
  supportingAccentsMaximum: 3,
  colorFamiliesMaximum: 6,
  minimumRecognitionFeatureMillimeters: 1,
  minimumRecognitionFeaturePercentOfWidth: 3.125,
  minimumNegativeGapMillimeters: 0.8,
  minimumNegativeGapPercentOfWidth: 2.5,
  thumbnailProofPixels: 48,
} as const);

type ArtStyleFamily = ArtStyleDefinition["family"];

export interface ManufacturingTreatmentDefinition {
  id: string;
  revision: 1;
  label: string;
  minimumProcessLineMillimeters: number;
  directive: string;
}

export const manufacturingTreatmentByFamily: Readonly<
  Record<ArtStyleFamily, ManufacturingTreatmentDefinition>
> = Object.freeze({
  paint: {
    id: "enamel-color-blocking",
    revision: 1,
    label: "kiln-enamel color blocking",
    minimumProcessLineMillimeters: 0.4,
    directive:
      "Translate painterly qualities into broad kiln-enamel color-blocking face artwork with deliberate value steps instead of brush-sized marks.",
  },
  print: {
    id: "spot-color-relief-print",
    revision: 1,
    label: "spot-color relief print",
    minimumProcessLineMillimeters: 0.3,
    directive:
      "Translate the style into screenprinted or relief-cut spot-color face artwork with broad carved marks and clean ink separations.",
  },
  ink: {
    id: "etched-line-and-fill",
    revision: 1,
    label: "etched line and fill",
    minimumProcessLineMillimeters: 0.3,
    directive:
      "Translate ink qualities into broad etched or screenprinted line-and-fill face artwork; replace hairlines, stipple, and dry-brush grain with a few durable marks.",
  },
  pixel: {
    id: "stepped-woven-blocks",
    revision: 1,
    label: "stepped woven blocks",
    minimumProcessLineMillimeters: 0.8,
    directive:
      "Translate pixel qualities into large stepped jacquard-like color blocks with no single-pixel noise or fine dithering.",
  },
  fiber: {
    id: "embroidered-woven-fields",
    revision: 1,
    label: "embroidered or woven fields",
    minimumProcessLineMillimeters: 1.25,
    directive:
      "Translate the style into embroidery or woven-thread face artwork using broad satin-stitch bands, couched paths, and solid woven fields rather than individual tiny stitches.",
  },
  paper: {
    id: "die-cut-layered-inlay",
    revision: 1,
    label: "die-cut layered inlay",
    minimumProcessLineMillimeters: 0.8,
    directive:
      "Translate paper qualities into die-cut layered-inlay face artwork with a few bold nested silhouettes and production-sized bridges.",
  },
  cartographic: {
    id: "etched-contour-inlay",
    revision: 1,
    label: "etched contour inlay",
    minimumProcessLineMillimeters: 0.35,
    directive:
      "Translate cartographic qualities into broad etched-contour and color-inlay face artwork with sparse routes and widely separated contour bands.",
  },
  mosaic: {
    id: "stained-glass-cloisonne-cells",
    revision: 1,
    label: "stained-glass cloisonné cells",
    minimumProcessLineMillimeters: 0.35,
    directive:
      "Translate the style into stained-glass or cloisonné cell artwork with large color fields and sturdy internal joins, never a field of tiny tesserae.",
  },
  geometric: {
    id: "hard-enamel-cells",
    revision: 1,
    label: "hard-enamel cells",
    minimumProcessLineMillimeters: 0.35,
    directive:
      "Translate geometric qualities into hard-enamel cell artwork with a small number of interlocking planes and substantial separators.",
  },
  ceramic: {
    id: "underglaze-color-fields",
    revision: 1,
    label: "underglaze color fields",
    minimumProcessLineMillimeters: 0.5,
    directive:
      "Translate the style into underglaze color-field face artwork with broad fired-color shapes and controlled edge variation instead of glaze speckle.",
  },
  wood: {
    id: "marquetry-fitted-inlay",
    revision: 1,
    label: "marquetry fitted inlay",
    minimumProcessLineMillimeters: 0.8,
    directive:
      "Translate the style into wood marquetry or fitted-inlay face artwork with a few continuous grain fields and no splinter-thin pieces.",
  },
});

export interface CompiledManufacturableCandidatePrompt extends Omit<CompiledCandidatePrompt, "recipe"> {
  recipe: typeof MANUFACTURABLE_PROMPT_RECIPE_REF;
  manufacturing: {
    profile: typeof SMALL_BADGE_MANUFACTURING_PROFILE_REF;
    treatment: {
      id: string;
      revision: 1;
      family: ArtStyleFamily;
      minimumProcessLineMillimeters: number;
    };
    limits: typeof SMALL_BADGE_MANUFACTURING_LIMITS;
  };
}

export interface PromptRecipeReference {
  id: string;
  revision: number;
}

export function compileCandidatePromptForRecipe(
  recipe: Readonly<PromptRecipeReference>,
  brief: Readonly<BadgeArtBrief>,
  candidate: Readonly<CandidatePlan>,
): CompiledCandidatePrompt | CompiledManufacturableCandidatePrompt {
  if (recipe.id !== PROMPT_RECIPE_REF.id) {
    throw new Error(
      `Cannot compile ${recipe.id}@${recipe.revision}; the supported recipe is badge-source-art at revision 1 or 2.`,
    );
  }
  if (recipe.revision === PROMPT_RECIPE_REF.revision) {
    return compileCandidatePrompt(brief, candidate);
  }
  if (recipe.revision === MANUFACTURABLE_PROMPT_RECIPE_REF.revision) {
    return compileManufacturableCandidatePrompt(brief, candidate);
  }
  throw new Error(
    `Cannot compile badge-source-art@${recipe.revision}; supported revisions are 1 and 2 so recorded prompt provenance remains reproducible.`,
  );
}

export function compileManufacturableCandidatePrompt(
  brief: Readonly<BadgeArtBrief>,
  candidate: Readonly<CandidatePlan>,
): CompiledManufacturableCandidatePrompt {
  const legacy = compileCandidatePrompt(brief, candidate);
  const style = findArtStyle(legacy.style.id);
  if (!style) {
    throw new Error(
      `CandidateKey ${JSON.stringify(legacy.candidateKey)} resolved style ${JSON.stringify(legacy.style.id)} during badge-source-art@1 validation but not during badge-source-art@2 manufacturing treatment; restore the registered immutable style before compiling.`,
    );
  }
  const treatment = manufacturingTreatmentByFamily[style.family];
  const limits = SMALL_BADGE_MANUFACTURING_LIMITS;
  const prompt = [
    legacy.prompt,
    "",
    "SMALL-BADGE MANUFACTURING CONTRACT — badge-source-art@2:",
    "These later constraints are mandatory. If a v1 style directive suggests finer texture, this miniature contract wins.",
    `Evaluate the flat face artwork at a ${limits.referenceWidthMillimeters} mm physical width and at ${limits.thumbnailProofPixels} × ${limits.thumbnailProofPixels} pixels before accepting it.`,
    `Build the image from ${limits.primaryForms.minimum} to ${limits.primaryForms.maximum} primary forms and no more than ${limits.supportingAccentsMaximum} supporting accents; merge repeated scenery into continuous masses.`,
    `Use no more than ${limits.colorFamiliesMaximum} visually distinct color families including the ground; use value steps within those families instead of adding colors for incidental detail.`,
    `Every recognition-critical form or mark must be at least ${limits.minimumRecognitionFeatureMillimeters} mm (${limits.minimumRecognitionFeaturePercentOfWidth}% of width) across at the reference size.`,
    `Every negative gap or separation needed for recognition must be at least ${limits.minimumNegativeGapMillimeters} mm (${limits.minimumNegativeGapPercentOfWidth}% of width) across at the reference size.`,
    "Merge, enlarge, or omit anything that would disappear at the proof size; preserve recognition through silhouette, color mass, and one clear focal relationship.",
    "",
    `PRODUCTION-COMPATIBLE FACE LANGUAGE — ${treatment.label} (${treatment.id}@${treatment.revision}):`,
    treatment.directive,
    `A process construction line that is not itself recognition-critical must still be at least ${treatment.minimumProcessLineMillimeters} mm (${(treatment.minimumProcessLineMillimeters / limits.referenceWidthMillimeters) * 100}% of face width); larger is preferred.`,
    "This is a flat visual language for the face artwork, not a photographed material sample, construction drawing, or finished object.",
    "",
    "MINIATURE EXCLUSIONS:",
    "No microdetail, hairlines, dense hatching, stipple fields, tiny knots, individual threads, scattered specks, minute tesserae, dense foliage, tiny figures, or background objects that need magnification.",
    "No words, letters, numerals, captions, labels, signs, signatures, logos, seals, or typography.",
    "Do not depict a finished badge, patch, pin, coin, medallion, rim, border, bevel, backing, clasp, thickness, cast shadow, pedestal, mockup, or presentation background.",
    "Badge shape, crop, edge construction, physical material, relief, depth, reverse face, and movable inspection lighting remain renderer-owned structured appearance.",
  ].join("\n");
  const byteLength = new TextEncoder().encode(prompt).byteLength;
  if (byteLength > 16 * 1024) {
    throw new Error(
      `Compiled badge-source-art@2 prompt for candidateKey ${JSON.stringify(legacy.candidateKey)} is ${byteLength} UTF-8 bytes; reduce its curated cues to satisfy the 16384-byte Studio limit without removing the manufacturing contract.`,
    );
  }
  return {
    ...legacy,
    recipe: MANUFACTURABLE_PROMPT_RECIPE_REF,
    manufacturing: {
      profile: SMALL_BADGE_MANUFACTURING_PROFILE_REF,
      treatment: {
        id: treatment.id,
        revision: treatment.revision,
        family: style.family,
        minimumProcessLineMillimeters: treatment.minimumProcessLineMillimeters,
      },
      limits,
    },
    prompt,
  };
}
