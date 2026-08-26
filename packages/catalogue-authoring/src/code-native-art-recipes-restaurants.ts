import { defineCodeNativeArtRecipe, type CodeNativeArtRecipe } from "./code-native-art-recipe-types";
import { renderRestaurantMotifConstruction } from "./code-native-restaurant-motif-construction";
import { sanFranciscoMichelinRestaurantSeeds } from "./michelin-restaurants-bay-area";
import { washingtonDcMichelinRestaurantSeeds } from "./michelin-restaurants-dc";
import { newYorkCityMichelinRestaurantSeeds } from "./michelin-restaurants-nyc";
import type { MichelinRestaurantResearchSeed } from "./michelin-restaurant-seed";
import { sanFranciscoRestaurantArtProfiles } from "./restaurant-art-profiles-bay-area";
import { washingtonDcRestaurantArtProfiles } from "./restaurant-art-profiles-dc";
import { newYorkCityRestaurantArtProfiles } from "./restaurant-art-profiles-nyc";
import type {
  RestaurantArtProfile,
  RestaurantGeometryMotif,
  RestaurantStyleSignature,
} from "./restaurant-art-profile";

export const RESTAURANT_STYLE_SIGNATURE_BY_STYLE_ID = {
  "pixel-cluster-landscape": "pixel-step",
  "thread-painted-embroidery": "fiber-applique",
  "plein-air-broken-color": "painted-mass",
  "relief-blockprint": "relief-cut",
  "stained-glass-field": "lead-cell",
  "monoprint-ink-wash": "ink-contour",
  "contour-atlas-ink": "map-contour",
  "mineral-line-engraving": "relief-cut",
  "aquatint-atmosphere": "painted-mass",
  "risograph-overprint": "screenprint-overlap",
  "matte-gouache-editorial": "painted-mass",
  "woven-tapestry-field": "woven-band",
  "cut-paper-strata": "paper-layer",
  "cyanotype-field-study": "ink-contour",
  "watercolor-naturalist-study": "painted-mass",
  "charcoal-pastel-weather": "relief-cut",
  "screenprint-night": "screenprint-overlap",
  "mosaic-tesserae-field": "mosaic-cell",
  "fresco-mineral-pigment": "painted-mass",
  "prismatic-geometric-symbolism": "geometric-facet",
  "ceramic-underglaze": "ceramic-roundel",
  "wood-marquetry-landscape": "marquetry-strata",
  "scratchboard-nocturne": "relief-cut",
  "luminous-ligne-claire": "ink-contour",
} as const satisfies Readonly<Record<string, RestaurantStyleSignature>>;

const seeds: readonly MichelinRestaurantResearchSeed[] = [
  ...sanFranciscoMichelinRestaurantSeeds,
  ...newYorkCityMichelinRestaurantSeeds,
  ...washingtonDcMichelinRestaurantSeeds,
];
const profiles: readonly RestaurantArtProfile[] = [
  ...sanFranciscoRestaurantArtProfiles,
  ...newYorkCityRestaurantArtProfiles,
  ...washingtonDcRestaurantArtProfiles,
];

validateProfiles(seeds, profiles);
const profileBySlug = new Map(profiles.map((profile) => [profile.slug, profile]));

export const codeNativeRestaurantRecipes: readonly CodeNativeArtRecipe[] = seeds.map((seed) =>
  buildRestaurantRecipe(seed, profileBySlug.get(seed.slug)!),
);

function buildRestaurantRecipe(
  seed: MichelinRestaurantResearchSeed,
  profile: RestaurantArtProfile,
): CodeNativeArtRecipe {
  const orderedMotifs = profile.layerOrder
    ? profile.layerOrder.map((motifIndex) => profile.motifs[motifIndex]!)
    : profile.motifs;
  const motifCommands = orderedMotifs.flatMap((motif) =>
    renderRestaurantMotifConstruction(profile.styleSignature, motif, profile.palette.length),
  );
  return defineCodeNativeArtRecipe({
    catalogueDirectory: "michelin-dining",
    slug: seed.slug,
    primaryStyleId: seed.candidateStyles[0],
    manufacturingLanguage: manufacturingLanguage(profile.styleSignature),
    styleComparison: `The factual restaurant forms use a visible ${profile.styleSignature} construction through ${seed.candidateStyles[0]}, not a metadata-only style label.`,
    forms: [
      profile.motifs[0].label,
      profile.motifs[1].label,
      profile.motifs[2].label,
      ...profile.motifs.slice(3).map(({ label }) => label),
    ],
    relationship: profile.relationship,
    palette: profile.palette,
    backgroundColor: 0,
    commands: motifCommands,
    minimumFeaturePixels: 48,
    minimumNegativeGapPixels: 32,
    edgeStrategy: profile.edgeStrategy,
    sourceSpecificExclusions: [
      "No Michelin star pictogram, Guide branding, restaurant logo, name, signage, menu, or typography.",
      "No photographic copying of the cited interior, dish, or cultural source.",
      "No dense inventory of ingredients, garnish, tableware, windows, tiles, stitches, or other repeated microdetail beyond the named broad source forms.",
      "No generic geographic, national, skyline, moon, or mountain shorthand unless the factual cue explicitly calls for it.",
    ],
  });
}

function manufacturingLanguage(signature: RestaurantStyleSignature): string {
  return {
    "ceramic-roundel": "ceramic underglaze roundel",
    "fiber-applique": "broad fiber appliqué",
    "geometric-facet": "prismatic geometric inlay",
    "ink-contour": "bold enamel contour",
    "lead-cell": "stained-glass lead cells",
    "map-contour": "broad atlas contours",
    "marquetry-strata": "wood marquetry strata",
    "mosaic-cell": "large mosaic tesserae",
    "painted-mass": "matte painted masses",
    "paper-layer": "cut-paper layers",
    "pixel-step": "large stepped pixel clusters",
    "relief-cut": "relief-cut silhouettes",
    "screenprint-overlap": "screenprint overlaps",
    "woven-band": "woven tapestry bands",
  }[signature];
}

function validateProfiles(
  expectedSeeds: readonly MichelinRestaurantResearchSeed[],
  actualProfiles: readonly RestaurantArtProfile[],
): void {
  if (expectedSeeds.length !== 132 || actualProfiles.length !== expectedSeeds.length) {
    throw new Error(
      `Named restaurant art requires 132 seeds and 132 explicit profiles; found ${expectedSeeds.length} and ${actualProfiles.length}.`,
    );
  }
  const profilesBySlug = new Map(actualProfiles.map((profile) => [profile.slug, profile]));
  if (profilesBySlug.size !== actualProfiles.length) {
    throw new Error(
      "Named restaurant art repeats a profile slug; keep one explicit geometry profile per restaurant.",
    );
  }
  for (const seed of expectedSeeds) {
    const profile = profilesBySlug.get(seed.slug);
    if (!profile) throw new Error(`Named restaurant art lacks an explicit profile for ${seed.slug}.`);
    if (profile.sourceCue !== seed.evidenceCue) {
      throw new Error(
        `Named restaurant art profile ${seed.slug} no longer matches its researched source cue.`,
      );
    }
    const expectedSignature =
      RESTAURANT_STYLE_SIGNATURE_BY_STYLE_ID[
        seed.candidateStyles[0] as keyof typeof RESTAURANT_STYLE_SIGNATURE_BY_STYLE_ID
      ];
    if (!expectedSignature || profile.styleSignature !== expectedSignature) {
      throw new Error(
        `Named restaurant art profile ${seed.slug} must visibly implement primary style ${seed.candidateStyles[0]}.`,
      );
    }
    if (profile.motifs.map(({ label }) => label).join("\u0000") !== seed.primaryForms.join("\u0000")) {
      throw new Error(
        `Named restaurant art profile ${seed.slug} must explicitly place every researched primary form in source order.`,
      );
    }
    validateLayerOrder(seed.slug, profile);
    validatePalette(seed.slug, profile);
    profile.motifs.forEach((motif) => validateMotif(seed, profile, motif));
  }
}

function validateLayerOrder(slug: string, profile: RestaurantArtProfile): void {
  if (!profile.layerOrder) return;
  const uniqueIndices = new Set(profile.layerOrder);
  const hasInvalidIndex = profile.layerOrder.some(
    (motifIndex) => !Number.isInteger(motifIndex) || motifIndex < 0 || motifIndex >= profile.motifs.length,
  );
  if (
    profile.layerOrder.length !== profile.motifs.length ||
    uniqueIndices.size !== profile.motifs.length ||
    hasInvalidIndex
  ) {
    throw new Error(
      `Named restaurant art profile ${slug} layerOrder must contain every motif index exactly once.`,
    );
  }
}

function validatePalette(slug: string, profile: RestaurantArtProfile): void {
  if (profile.palette.length < 4 || profile.palette.length > 6) {
    throw new Error(`Named restaurant art profile ${slug} must use four to six explicit colors.`);
  }
  const hexes = profile.palette.map(({ hex }) => hex.toUpperCase());
  if (hexes.some((hex) => !/^#[0-9A-F]{6}$/u.test(hex)) || new Set(hexes).size !== hexes.length) {
    throw new Error(`Named restaurant art profile ${slug} must use unique explicit six-digit hex colors.`);
  }
}

function validateMotif(
  seed: MichelinRestaurantResearchSeed,
  profile: RestaurantArtProfile,
  motif: RestaurantGeometryMotif,
): void {
  const wordCount = /\bthree\b/iu.test(motif.label) ? 3 : /\btwo\b/iu.test(motif.label) ? 2 : 1;
  if (motif.count !== wordCount) {
    throw new Error(
      `Named restaurant art profile ${seed.slug} must render the explicit count in ${JSON.stringify(motif.label)}.`,
    );
  }
  if (motif.colorIndex < 1 || motif.colorIndex >= profile.palette.length) {
    throw new Error(
      `Named restaurant art profile ${seed.slug} motif ${JSON.stringify(motif.label)} references a missing palette color.`,
    );
  }
  const repeatedHalfX = ((motif.count - 1) * Math.abs(motif.spreadX ?? 0)) / 2;
  const repeatedHalfY = ((motif.count - 1) * Math.abs(motif.spreadY ?? 0)) / 2;
  if (
    motif.width < 0.08 ||
    motif.height < 0.08 ||
    motif.x - repeatedHalfX - motif.width / 2 < 0.03 ||
    motif.x + repeatedHalfX + motif.width / 2 > 0.97 ||
    motif.y - repeatedHalfY - motif.height / 2 < 0.03 ||
    motif.y + repeatedHalfY + motif.height / 2 > 0.97
  ) {
    throw new Error(
      `Named restaurant art profile ${seed.slug} motif ${JSON.stringify(motif.label)} is too small or escapes the badge face.`,
    );
  }
  const unsupported = motif.label.match(
    /\b(moon|mountain|flag|national|country outline|country silhouette|geography)\b/iu,
  )?.[0];
  if (
    unsupported &&
    !seed.evidenceCue.toLocaleLowerCase("en-US").includes(unsupported.toLocaleLowerCase("en-US"))
  ) {
    throw new Error(
      `Named restaurant art profile ${seed.slug} introduces unsupported shorthand ${JSON.stringify(unsupported)}.`,
    );
  }
}
