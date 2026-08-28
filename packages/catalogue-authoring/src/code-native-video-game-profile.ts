import { defineCodeNativeArtRecipe, type CodeNativeArtRecipe } from "./code-native-art-recipe-types";
import {
  manufacturingLanguageForSignature,
  styleSignatureForArtStyle,
} from "./code-native-construction-language";
import { renderRestaurantMotifConstruction } from "./code-native-restaurant-motif-construction";
import type {
  RestaurantGeometryMotif,
  RestaurantMotifKind,
  RestaurantStyleSignature,
} from "./restaurant-art-profile";
import type { CatalogueStudyRecord } from "./types";

export type VideoGameLayoutId =
  | "ascent"
  | "cleft"
  | "diagonal"
  | "exchange"
  | "fork"
  | "horizon"
  | "orbit"
  | "radial"
  | "terraced"
  | "threshold";

export interface VideoGameArtProfileSpec {
  readonly slug: string;
  readonly layoutId: VideoGameLayoutId;
  readonly paletteId: number;
  readonly motifKinds: readonly [RestaurantMotifKind, RestaurantMotifKind, RestaurantMotifKind];
  readonly variant: number;
}

export interface CodeNativeVideoGameArtProfile extends VideoGameArtProfileSpec {
  readonly schemaVersion: 1;
  readonly signatureKey: string;
}

export interface VideoGameSourceRecord extends CatalogueStudyRecord {
  readonly gameTitle: string;
}

type Palette = CodeNativeArtRecipe["palette"];

const PALETTES: readonly Palette[] = [
  palette("deep ink", "#17243B", "pulse cyan", "#59C3C3", "ember coral", "#E66A58", "warm cream", "#F3E5C8"),
  palette(
    "plum night",
    "#342445",
    "citrus gold",
    "#E7B84B",
    "lake teal",
    "#39888B",
    "paper white",
    "#EEE7D7",
  ),
  palette("burnt clay", "#5A302D", "cobalt", "#315B8A", "aged brass", "#C49A4A", "bone", "#E9DDC6"),
  palette("forest ink", "#1F3732", "jade", "#4D9275", "ochre", "#D39A3E", "cool mist", "#DCE6DF"),
  palette(
    "midnight violet",
    "#241D3D",
    "electric mint",
    "#65D3B5",
    "apricot",
    "#E88A64",
    "pale lilac",
    "#D8CCEA",
  ),
  palette("charcoal", "#282B31", "rust", "#B85D3E", "denim", "#4D7497", "sand", "#DFC99D"),
  palette("deep navy", "#162C46", "clear sky", "#4D9BC2", "vermilion", "#D55242", "pale gold", "#E6C96B"),
  palette("earth umber", "#46352F", "moss", "#6D8750", "dust rose", "#C77A74", "parchment", "#E7D8B8"),
  palette("aubergine", "#3B2648", "lapis", "#365F9B", "turquoise", "#47A9A0", "peach", "#E6A176"),
  palette("soft soot", "#30383D", "silver", "#AEB8B7", "copper", "#B76E48", "ice", "#D7E7E4"),
  palette("deep teal", "#173D43", "celadon", "#88B49A", "marigold", "#E0A532", "oxblood", "#873F45"),
  palette("burgundy", "#4C2835", "slate", "#58717B", "lichen", "#7D985D", "ivory", "#E9E0C8"),
] as const;

const LAYOUTS: Readonly<Record<VideoGameLayoutId, readonly Placement[]>> = {
  ascent: [
    placement(0.5, 0.72, 0.76, 0.28),
    placement(0.42, 0.48, 0.22, 0.64),
    placement(0.66, 0.22, 0.27, 0.27),
  ],
  cleft: [
    placement(0.28, 0.52, 0.42, 0.72),
    placement(0.72, 0.49, 0.4, 0.66),
    placement(0.5, 0.5, 0.23, 0.58),
  ],
  diagonal: [
    placement(0.28, 0.68, 0.38, 0.36),
    placement(0.5, 0.49, 0.48, 0.28),
    placement(0.72, 0.28, 0.34, 0.34),
  ],
  exchange: [
    placement(0.23, 0.48, 0.32, 0.36),
    placement(0.77, 0.48, 0.32, 0.36),
    placement(0.5, 0.52, 0.64, 0.22),
  ],
  fork: [placement(0.5, 0.72, 0.64, 0.26), placement(0.3, 0.42, 0.34, 0.48), placement(0.7, 0.4, 0.34, 0.48)],
  horizon: [
    placement(0.5, 0.7, 0.84, 0.32),
    placement(0.5, 0.48, 0.64, 0.26),
    placement(0.5, 0.24, 0.42, 0.24),
  ],
  orbit: [
    placement(0.5, 0.5, 0.36, 0.36),
    placement(0.28, 0.28, 0.32, 0.25),
    placement(0.72, 0.71, 0.32, 0.25),
  ],
  radial: [
    placement(0.5, 0.48, 0.42, 0.42),
    placement(0.25, 0.52, 0.28, 0.45),
    placement(0.75, 0.46, 0.28, 0.45),
  ],
  terraced: [
    placement(0.5, 0.72, 0.72, 0.3),
    placement(0.38, 0.5, 0.52, 0.26),
    placement(0.61, 0.27, 0.34, 0.23),
  ],
  threshold: [
    placement(0.5, 0.38, 0.62, 0.5),
    placement(0.5, 0.7, 0.56, 0.3),
    placement(0.5, 0.48, 0.28, 0.46),
  ],
};

interface Placement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function defineVideoGameArtProfile(spec: VideoGameArtProfileSpec): CodeNativeVideoGameArtProfile {
  if (spec.paletteId < 0 || spec.paletteId >= PALETTES.length) {
    throw new Error(`Video-game art profile ${spec.slug} references missing palette ${spec.paletteId}.`);
  }
  if (spec.variant < 0 || spec.variant > 4) {
    throw new Error(`Video-game art profile ${spec.slug} variant must stay between zero and four.`);
  }
  return {
    schemaVersion: 1,
    ...spec,
    signatureKey: JSON.stringify([spec.layoutId, spec.paletteId, spec.motifKinds, spec.variant]),
  };
}

export function buildVideoGameRecipe(
  record: VideoGameSourceRecord,
  profile: CodeNativeVideoGameArtProfile,
): CodeNativeArtRecipe {
  if (profile.slug !== record.slug) {
    throw new Error(`Video-game art profile ${profile.slug} must match source record ${record.slug}.`);
  }
  const styleSignature = styleSignatureFor(record.candidateStyles[0]);
  const basePlacements = LAYOUTS[profile.layoutId];
  const motifs = profile.motifKinds.map((kind, index) =>
    geometryMotif(
      record.artBrief.themeCues[index]!,
      kind,
      index + 1,
      vary(basePlacements[index]!, profile.variant, index),
    ),
  );
  const accent =
    record.candidateStyles[0] === "luminous-ligne-claire"
      ? geometryMotif(
          "one open journey arc",
          "ribbon",
          3,
          vary(placement(0.5, 0.52, 0.76, 0.18), profile.variant, 1),
        )
      : undefined;
  const commands = [...motifs, ...(accent ? [accent] : [])].flatMap((motif) =>
    renderRestaurantMotifConstruction(styleSignature, motif, PALETTES[profile.paletteId]!.length),
  );
  return defineCodeNativeArtRecipe({
    catalogueDirectory: "video-games",
    slug: record.slug,
    primaryStyleId: record.candidateStyles[0],
    manufacturingLanguage: manufacturingLanguageForSignature(styleSignature),
    styleComparison: `The three game-specific abstract forms use a visible ${styleSignature} construction through ${record.candidateStyles[0]}, rather than a metadata-only style label.`,
    forms: record.artBrief.themeCues,
    relationship: record.artBrief.requiredMotifs[0],
    palette: PALETTES[profile.paletteId]!,
    backgroundColor: 0,
    commands,
    minimumFeaturePixels: 56,
    minimumNegativeGapPixels: 32,
    edgeStrategy: edgeStrategy(profile.layoutId),
    sourceSpecificExclusions: [
      ...record.artBrief.excludedMotifs.map((exclusion) => `No ${exclusion}.`),
      "No official screenshot, key art, interface, HUD, logo, wordmark, franchise emblem, or trade dress.",
      "No recognizable character, creature, vehicle, signature item, level layout, or copied environmental silhouette.",
      "No typography, microtexture, repeated small inventory, badge rim, lighting, or mockup context.",
    ],
  });
}

function geometryMotif(
  label: string,
  kind: RestaurantMotifKind,
  colorIndex: number,
  item: Placement,
): RestaurantGeometryMotif {
  return { label, kind, count: 1, colorIndex, ...item };
}

function palette(
  groundName: string,
  groundHex: `#${string}`,
  firstName: string,
  firstHex: `#${string}`,
  secondName: string,
  secondHex: `#${string}`,
  thirdName: string,
  thirdHex: `#${string}`,
): Palette {
  return [
    { name: groundName, hex: groundHex },
    { name: firstName, hex: firstHex },
    { name: secondName, hex: secondHex },
    { name: thirdName, hex: thirdHex },
  ];
}

function placement(x: number, y: number, width: number, height: number): Placement {
  return { x, y, width, height };
}

function vary(item: Placement, variant: number, motifIndex: number): Placement {
  const signed = variant - 2;
  const direction = motifIndex % 2 === 0 ? 1 : -1;
  return {
    x: item.x + signed * 0.012 * direction,
    y: item.y + signed * 0.009 * (motifIndex === 2 ? -1 : 1),
    width: item.width * (1 - variant * 0.012),
    height: item.height * (1 + ((variant + motifIndex) % 3) * 0.018),
  };
}

function styleSignatureFor(styleId: string): RestaurantStyleSignature {
  return styleSignatureForArtStyle(styleId);
}

function edgeStrategy(layoutId: VideoGameLayoutId): string {
  return {
    ascent: "The lower field reaches both side edges while the ascent leaves open space at the top.",
    cleft: "The paired masses reach the left and right edges while the central cleft remains open.",
    diagonal: "The journey runs from the lower-left edge toward open upper-right space.",
    exchange: "The paired fields press toward the left and right edges around one open exchange.",
    fork: "The lower route exits the bottom edge before separating into open upper branches.",
    horizon: "The lower strata bleed through both side edges while the upper field remains open.",
    orbit: "The outer forms approach opposing side edges without enclosing the open center.",
    radial:
      "The side forces approach the left and right edges while the central field stays broad and readable.",
    terraced: "The lowest terrace bleeds through the side and bottom edges beneath open upper space.",
    threshold: "The outer plane reaches the side edges while the inner passage stays visibly open.",
  }[layoutId];
}
