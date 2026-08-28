import { polygon } from "./code-native-art-recipe-builders";
import { defineCodeNativeArtRecipe } from "./code-native-art-recipe-types";
import {
  landscapeManufacturingLanguageForStyle,
  styleSignatureForArtStyle,
} from "./code-native-construction-language";
import type {
  CodeNativeArtCommand,
  CodeNativeArtRecipe,
  CodeNativeCatalogueDirectory,
} from "./code-native-art-recipe-types";
import { renderRestaurantMotifConstruction } from "./code-native-restaurant-motif-construction";
import type {
  RestaurantGeometryMotif,
  RestaurantMotifKind,
  RestaurantStyleSignature,
} from "./restaurant-art-profile";

export type LandscapeCatalogueDirectory = "national-parks" | "us-states";

export type LandscapeSemanticMotifKind =
  "alligator" | "bat" | "bear" | "bison" | "caribou" | "elk" | "hexagon" | "moose" | "person";

export type LandscapeMotif = Omit<RestaurantGeometryMotif, "kind"> & {
  readonly kind: RestaurantMotifKind | LandscapeSemanticMotifKind;
};

export interface LandscapeSourceRecord {
  readonly slug: string;
  readonly candidateStyles: readonly [string, string, string];
  readonly artBrief: {
    readonly themeCues: readonly [string, string, string];
    readonly requiredMotifs: readonly [string, ...string[]];
    readonly excludedMotifs: readonly string[];
  };
}

export interface LandscapeArtProfile {
  readonly schemaVersion: 1;
  readonly slug: string;
  readonly sourceCue: string;
  readonly primaryStyleId: string;
  readonly palette: readonly [
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    ...{ readonly name: string; readonly hex: `#${string}` }[],
  ];
  readonly motifs: readonly [LandscapeMotif, LandscapeMotif, LandscapeMotif];
  readonly accent?: LandscapeMotif;
  readonly relationship: string;
  readonly edgeStrategy: string;
}

export type LandscapeArtProfileInput = Omit<LandscapeArtProfile, "schemaVersion">;

export function defineLandscapeArtProfile(input: LandscapeArtProfileInput): LandscapeArtProfile {
  return { schemaVersion: 1, ...input };
}

export function buildLandscapeRecipe(
  catalogueDirectory: LandscapeCatalogueDirectory,
  record: LandscapeSourceRecord,
  profile: LandscapeArtProfile,
): CodeNativeArtRecipe {
  validateLandscapeProfile(record, profile);
  const signature = styleSignature(profile.primaryStyleId);
  const commands = [...profile.motifs, ...(profile.accent ? [profile.accent] : [])].flatMap((motif) =>
    renderLandscapeMotifConstruction(
      profile.primaryStyleId === "luminous-ligne-claire" ? "ink-contour" : signature,
      motif,
      profile.palette.length,
    ),
  );
  if (commands.length < 4 || commands.length > 12) {
    throw new Error(
      `Landscape profile ${profile.slug} rendered ${commands.length} commands; use four to twelve broad construction commands.`,
    );
  }
  return defineCodeNativeArtRecipe({
    catalogueDirectory: catalogueDirectory as CodeNativeCatalogueDirectory,
    slug: profile.slug,
    primaryStyleId: profile.primaryStyleId,
    manufacturingLanguage: landscapeManufacturingLanguageForStyle(profile.primaryStyleId),
    styleComparison:
      profile.primaryStyleId === "luminous-ligne-claire"
        ? "The subject-specific forms use luminous-ligne-claire through broad dark contours, restrained luminous fills, and an intentionally open field rather than a metadata-only style label."
        : `The source-locked landscape forms use a visible ${signature} construction through ${profile.primaryStyleId}, not a metadata-only style label.`,
    forms: [profile.motifs[0].label, profile.motifs[1].label, profile.motifs[2].label],
    relationship: profile.relationship,
    palette: profile.palette,
    backgroundColor: 0,
    commands,
    minimumFeaturePixels: 48,
    minimumNegativeGapPixels: 32,
    edgeStrategy: profile.edgeStrategy,
    sourceSpecificExclusions: [
      ...record.artBrief.excludedMotifs.map((motif) => `No ${motif}.`),
      "No typography, park insignia, map labels, souvenir emblems, tiny scenic inventory, or repeated microdetail.",
      "No generic landmark substitution: preserve the three exact source-cue labels and their explicit spatial relationship.",
    ],
  });
}

export function motif(
  label: string,
  kind: LandscapeMotif["kind"],
  colorIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
): LandscapeMotif {
  return { label, kind, count: 1, colorIndex, x, y, width, height };
}

export function palette(
  ground: readonly [string, `#${string}`],
  first: readonly [string, `#${string}`],
  second: readonly [string, `#${string}`],
  third: readonly [string, `#${string}`],
  fourth?: readonly [string, `#${string}`],
): LandscapeArtProfile["palette"] {
  const colors = [ground, first, second, third, ...(fourth ? [fourth] : [])].map(([name, hex]) => ({
    name,
    hex,
  }));
  return colors as unknown as LandscapeArtProfile["palette"];
}

function renderLandscapeMotifConstruction(
  signature: RestaurantStyleSignature,
  item: LandscapeMotif,
  paletteLength: number,
): readonly CodeNativeArtCommand[] {
  if (isRestaurantMotif(item)) {
    return renderRestaurantMotifConstruction(signature, item, paletteLength);
  }
  const semanticItem = item as LandscapeMotif & { readonly kind: LandscapeSemanticMotifKind };
  const treatment = semanticTreatment(signature);
  return [
    renderSemanticShape(
      semanticItem,
      constructionColorIndex(item.colorIndex, paletteLength),
      treatment.backScale,
      treatment.backOffsetX,
      treatment.backOffsetY,
    ),
    renderSemanticShape(
      semanticItem,
      item.colorIndex,
      treatment.frontScale,
      treatment.frontOffsetX,
      treatment.frontOffsetY,
    ),
  ];
}

function isRestaurantMotif(item: LandscapeMotif): item is RestaurantGeometryMotif {
  return !["alligator", "bat", "bear", "bison", "caribou", "elk", "hexagon", "moose", "person"].includes(
    item.kind,
  );
}

interface SemanticTreatment {
  readonly backScale: number;
  readonly frontScale: number;
  readonly backOffsetX: number;
  readonly backOffsetY: number;
  readonly frontOffsetX: number;
  readonly frontOffsetY: number;
}

function semanticTreatment(signature: RestaurantStyleSignature): SemanticTreatment {
  switch (signature) {
    case "ink-contour":
    case "map-contour":
    case "lead-cell":
    case "ceramic-roundel":
      return {
        backScale: 1.12,
        frontScale: 0.82,
        backOffsetX: 0,
        backOffsetY: 0,
        frontOffsetX: 0,
        frontOffsetY: 0,
      };
    case "painted-mass":
    case "fiber-applique":
    case "paper-layer":
    case "relief-cut":
      return {
        backScale: 1,
        frontScale: 0.94,
        backOffsetX: -0.04,
        backOffsetY: 0.05,
        frontOffsetX: 0.025,
        frontOffsetY: -0.02,
      };
    case "screenprint-overlap":
    case "woven-band":
      return {
        backScale: 1,
        frontScale: 1,
        backOffsetX: 0.07,
        backOffsetY: 0,
        frontOffsetX: -0.035,
        frontOffsetY: 0,
      };
    case "geometric-facet":
    case "marquetry-strata":
    case "mosaic-cell":
    case "pixel-step":
      return {
        backScale: 1,
        frontScale: 0.72,
        backOffsetX: 0,
        backOffsetY: 0,
        frontOffsetX: 0.12,
        frontOffsetY: -0.08,
      };
  }
}

function renderSemanticShape(
  item: LandscapeMotif & { readonly kind: LandscapeSemanticMotifKind },
  colorIndex: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): CodeNativeArtCommand {
  const width = item.width * 896 * scale;
  const height = item.height * 896 * scale;
  const left = item.x * 896 - width / 2 + item.width * 896 * offsetX;
  const top = item.y * 896 - height / 2 + item.height * 896 * offsetY;
  return polygon(
    colorIndex,
    ...semanticShapePoints(item.kind).flatMap(([x, y]) => [left + x * width, top + y * height]),
  );
}

function semanticShapePoints(kind: LandscapeSemanticMotifKind): readonly (readonly [number, number])[] {
  switch (kind) {
    case "alligator":
      return [
        [0, 0.55],
        [0.18, 0.42],
        [0.52, 0.38],
        [0.72, 0.25],
        [0.95, 0.3],
        [1, 0.43],
        [0.88, 0.52],
        [1, 0.64],
        [0.72, 0.7],
        [0.52, 0.62],
        [0.18, 0.64],
      ];
    case "bat":
      return [
        [0, 0.54],
        [0.18, 0.16],
        [0.36, 0.38],
        [0.5, 0.08],
        [0.64, 0.38],
        [0.82, 0.16],
        [1, 0.54],
        [0.76, 0.48],
        [0.68, 0.9],
        [0.5, 0.65],
        [0.32, 0.9],
        [0.24, 0.48],
      ];
    case "bear":
      return [
        [0, 0.44],
        [0.12, 0.25],
        [0.18, 0.08],
        [0.28, 0.2],
        [0.58, 0.18],
        [0.72, 0.28],
        [0.82, 0.2],
        [0.91, 0.27],
        [1, 0.44],
        [0.88, 0.58],
        [0.86, 1],
        [0.7, 1],
        [0.66, 0.62],
        [0.34, 0.64],
        [0.3, 1],
        [0.13, 1],
        [0.15, 0.62],
        [0, 0.56],
      ];
    case "bison":
      return [
        [0, 0.42],
        [0.12, 0.18],
        [0.3, 0.05],
        [0.48, 0.16],
        [0.67, 0.25],
        [0.82, 0.22],
        [0.9, 0.34],
        [1, 0.4],
        [0.92, 0.56],
        [0.84, 0.58],
        [0.82, 1],
        [0.68, 1],
        [0.66, 0.62],
        [0.34, 0.62],
        [0.31, 1],
        [0.14, 1],
        [0.16, 0.58],
        [0.03, 0.58],
      ];
    case "caribou":
    case "elk":
      return [
        [0, 0.5],
        [0.14, 0.36],
        [0.52, 0.34],
        [0.68, 0.42],
        [0.74, 0.22],
        [0.83, 0.16],
        [0.78, 0.06],
        [0.86, 0.13],
        [0.92, 0.02],
        [0.9, 0.17],
        [1, 0.2],
        [0.94, 0.31],
        [0.82, 0.35],
        [0.74, 0.5],
        [0.68, 0.54],
        [0.66, 1],
        [0.53, 1],
        [0.53, 0.58],
        [0.25, 0.58],
        [0.22, 1],
        [0.09, 1],
        [0.12, 0.6],
        [0, 0.58],
      ];
    case "hexagon":
      return [
        [0.24, 0],
        [0.76, 0],
        [1, 0.5],
        [0.76, 1],
        [0.24, 1],
        [0, 0.5],
      ];
    case "moose":
      return [
        [0, 0.5],
        [0.14, 0.36],
        [0.52, 0.35],
        [0.68, 0.44],
        [0.73, 0.2],
        [0.82, 0.18],
        [0.76, 0.07],
        [0.84, 0.11],
        [0.88, 0.01],
        [0.92, 0.12],
        [1, 0.06],
        [0.96, 0.22],
        [1, 0.27],
        [0.9, 0.33],
        [0.78, 0.35],
        [0.72, 0.51],
        [0.65, 0.56],
        [0.63, 1],
        [0.5, 1],
        [0.5, 0.59],
        [0.25, 0.59],
        [0.22, 1],
        [0.08, 1],
        [0.12, 0.6],
        [0, 0.58],
      ];
    case "person":
      return [
        [0.38, 0.18],
        [0.4, 0.04],
        [0.6, 0.04],
        [0.62, 0.18],
        [0.7, 0.26],
        [0.66, 0.55],
        [0.62, 0.55],
        [0.7, 1],
        [0.55, 1],
        [0.5, 0.68],
        [0.45, 1],
        [0.3, 1],
        [0.38, 0.55],
        [0.32, 0.55],
        [0.3, 0.26],
      ];
  }
}

function constructionColorIndex(colorIndex: number, paletteLength: number): number {
  return colorIndex === 1 && paletteLength > 2 ? 2 : 1;
}

function validateLandscapeProfile(record: LandscapeSourceRecord, profile: LandscapeArtProfile): void {
  if (profile.slug !== record.slug) {
    throw new Error(`Landscape profile ${profile.slug} must match source record ${record.slug}.`);
  }
  if (profile.sourceCue !== record.artBrief.requiredMotifs[0]) {
    throw new Error(
      `Landscape profile ${profile.slug} must preserve its exact required source cue instead of classifying prose into a stock scene.`,
    );
  }
  if (profile.primaryStyleId !== record.candidateStyles[0]) {
    throw new Error(
      `Landscape profile ${profile.slug} must preserve selected primary style ${record.candidateStyles[0]}.`,
    );
  }
  const expectedLabels = record.artBrief.themeCues;
  if (profile.motifs.some((item, index) => item.label !== expectedLabels[index])) {
    throw new Error(
      `Landscape profile ${profile.slug} must explicitly bind all three source theme cues in source order.`,
    );
  }
  if (profile.palette.length < 4 || profile.palette.length > 5) {
    throw new Error(`Landscape profile ${profile.slug} must use four or five explicit colors.`);
  }
  const hexes = profile.palette.map(({ hex }) => hex.toUpperCase());
  if (hexes.some((hex) => !/^#[0-9A-F]{6}$/u.test(hex)) || new Set(hexes).size !== hexes.length) {
    throw new Error(`Landscape profile ${profile.slug} must use unique six-digit hex colors.`);
  }
  for (const item of [...profile.motifs, ...(profile.accent ? [profile.accent] : [])]) {
    validateMotif(profile, item);
  }
  if (profile.primaryStyleId === "luminous-ligne-claire" && !profile.accent) {
    throw new Error(
      `Luminous landscape profile ${profile.slug} needs one broad journey accent to make the open clear-line composition visible in pixels.`,
    );
  }
}

function validateMotif(profile: LandscapeArtProfile, item: LandscapeMotif): void {
  if (item.count !== 1) {
    throw new Error(`Landscape profile ${profile.slug} motif ${JSON.stringify(item.label)} must occur once.`);
  }
  if (item.colorIndex < 1 || item.colorIndex >= profile.palette.length) {
    throw new Error(
      `Landscape profile ${profile.slug} motif ${JSON.stringify(item.label)} references a missing palette color.`,
    );
  }
  if (
    item.width < 0.12 ||
    item.height < 0.12 ||
    item.x - item.width / 2 < 0.02 ||
    item.x + item.width / 2 > 0.98 ||
    item.y - item.height / 2 < 0.02 ||
    item.y + item.height / 2 > 0.98
  ) {
    throw new Error(
      `Landscape profile ${profile.slug} motif ${JSON.stringify(item.label)} is too small or escapes the face.`,
    );
  }
}

function styleSignature(styleId: string): RestaurantStyleSignature {
  return styleSignatureForArtStyle(styleId);
}
