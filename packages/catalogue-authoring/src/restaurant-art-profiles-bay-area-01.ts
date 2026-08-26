import { defineRestaurantArtProfile } from "./restaurant-art-profile";
import type { RestaurantGeometryMotif, RestaurantMotifKind } from "./restaurant-art-profile";

const ARTBOARD = 896;

export const sanFranciscoRestaurantArtProfilesPartOne = [
  defineRestaurantArtProfile({
    slug: "kiln",
    sourceCue:
      "A warmed warehouse frames Nordic-inspired curing, drying, and fermentation alongside precise modern cooking.",
    styleSignature: "marquetry-strata",
    palette: [
      { name: "warm cream ground", hex: "#F2E7D0" },
      { name: "smoke-charcoal join", hex: "#252B2B" },
      { name: "warehouse clay", hex: "#B75F42" },
      { name: "honeyed vessel", hex: "#D69B32" },
      { name: "fermentation green", hex: "#3F654D" },
    ],
    motifs: [
      motif("one tall warehouse arch", "arch", 1, 2, 448, 474, 650, 560, 0, 0),
      motif("three preservation-vessel ovals", "oval", 3, 3, 448, 512, 118, 184, 146, 0),
      motif("one curling dried ribbon", "ribbon", 1, 4, 448, 286, 500, 104, 0, 0),
      motif("one warm service block", "block", 1, 3, 672, 660, 190, 148, 0, 0),
    ],
    relationship:
      "The tall warehouse contains the repeated preserving vessels while one dried ribbon curls above service.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "birdsong",
    sourceCue:
      "Live fire anchors a high-ceilinged room, while lacquered quail arrives with grilled rolls and crisp pickles.",
    styleSignature: "lead-cell",
    palette: [
      { name: "bread-cream glass", hex: "#F1E2C6" },
      { name: "charcoal lead", hex: "#20272A" },
      { name: "live-fire ember", hex: "#D36532" },
      { name: "lacquered umber", hex: "#8D4934" },
      { name: "pickle green", hex: "#638548" },
    ],
    motifs: [
      motif("one high room arch", "arch", 1, 1, 448, 450, 690, 610, 0, 0),
      motif("one glowing hearth oval", "oval", 1, 2, 448, 652, 380, 168, 0, 0),
      motif("one lacquered quail silhouette", "leaf", 1, 3, 448, 430, 330, 174, 0, 0),
      motif("two soft bread domes", "arch", 2, 4, 448, 276, 142, 106, 190, 0),
    ],
    relationship:
      "A live-fire oval anchors the tall room; quail and two broad rolls remain distinct above it.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "nari",
    sourceCue:
      "A brick-colored bumbai curry pairs crisp eggplant with an airy folded roti in a refined Thai family-style meal.",
    styleSignature: "ceramic-roundel",
    palette: [
      { name: "bread-cream glaze", hex: "#F3E5C8" },
      { name: "ink-black contour", hex: "#242528" },
      { name: "bumbai brick", hex: "#B85337" },
      { name: "eggplant violet", hex: "#67466F" },
      { name: "leaf green", hex: "#4F754E" },
      { name: "folded-roti tan", hex: "#D7B77D" },
    ],
    motifs: [
      motif("one broad curry bowl oval", "oval", 1, 2, 448, 534, 600, 292, 0, 0),
      motif("one folded bread fan", "triangle", 1, 5, 286, 320, 252, 220, 0, 0),
      motif("one crisp eggplant crescent", "arch", 1, 3, 596, 398, 240, 174, 0, 0),
      motif("one rising aroma ribbon", "ribbon", 1, 4, 448, 228, 410, 96, 0, 0),
    ],
    relationship: "The curry bowl supports a folded roti and eggplant crescent as one aroma ribbon rises.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "kin-khao",
    sourceCue:
      "Mushroom hor mok presents fragrant curry mousse in a jar with coconut cream and crisp rice cakes.",
    styleSignature: "mosaic-cell",
    palette: [
      { name: "coconut-cream stone", hex: "#F0E3C7" },
      { name: "sumi grout", hex: "#252A2C" },
      { name: "curry saffron", hex: "#D59B31" },
      { name: "mushroom brown", hex: "#8B6047" },
      { name: "aromatic leaf", hex: "#52724B" },
      { name: "coconut-cream glaze", hex: "#D8C79F" },
    ],
    motifs: [
      motif("one tall curry-vessel oval", "oval", 1, 2, 448, 486, 320, 500, 0, 0),
      motif("one coconut-cream wave", "ribbon", 1, 5, 448, 396, 470, 106, 0, 0),
      motif("two crisp rice disks", "disk", 2, 2, 448, 690, 120, 120, 190, 0),
      motif("one mushroom dome", "arch", 1, 3, 448, 240, 250, 168, 0, 0),
    ],
    relationship: "The tall hor-mok vessel holds a cream wave and mushroom dome, with two rice cakes below.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "californios",
    sourceCue:
      "A pillowy sourdough tortilla carries crisp black cod between contrasting huitlacoche and yellow-corn cremas.",
    styleSignature: "lead-cell",
    palette: [
      { name: "tortilla-cream glass", hex: "#F2E4C7" },
      { name: "black-cod lead", hex: "#20282B" },
      { name: "yellow-corn gold", hex: "#D7A12E" },
      { name: "huitlacoche plum", hex: "#60445F" },
      { name: "agave blue", hex: "#397686" },
      { name: "tortilla tan", hex: "#D8BC83" },
    ],
    motifs: [
      motif("one soft tortilla crescent", "arch", 1, 5, 448, 538, 660, 350, 0, 0),
      motif("one crisp fish block", "block", 1, 1, 448, 470, 350, 138, 0, 0),
      motif("one dark corn wave", "ribbon", 1, 3, 448, 370, 520, 92, 0, 0),
      motif("one golden corn wave", "ribbon", 1, 2, 448, 610, 520, 92, 0, 0),
    ],
    layerOrder: [2, 1, 0, 3],
    relationship: "The tortilla crescent cradles one crisp cod block between dark and golden crema ribbons.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "state-bird-provisions",
    sourceCue:
      "Small Californian provisions travel through the lively room on rolling dim-sum-style carts and trays.",
    styleSignature: "screenprint-overlap",
    palette: [
      { name: "soft-ivory paper", hex: "#F2E6CE" },
      { name: "charcoal overprint", hex: "#25292B" },
      { name: "warm-oak cart", hex: "#A96845" },
      { name: "mustard provision", hex: "#D39C35" },
      { name: "sage service path", hex: "#607B55" },
    ],
    motifs: [
      motif("one rolling cart block", "block", 1, 2, 250, 544, 280, 210, 0, 0),
      motif("three broad provision ovals", "oval", 3, 3, 448, 388, 132, 96, 176, 0),
      motif("one long provision-tray band", "horizon", 1, 1, 448, 660, 760, 126, 0, 0),
      motif("one sweeping service path", "ribbon", 1, 4, 528, 510, 560, 108, 0, 0),
    ],
    relationship: "A cart and three provisions move along a sweeping path beside the long serving tray.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "the-progress",
    sourceCue:
      "Tall windows, leafy plants, and a geometric hanging form connect the dining room, balcony, and concrete mezzanine.",
    styleSignature: "marquetry-strata",
    palette: [
      { name: "warm-cream wall", hex: "#EEE2C9" },
      { name: "concrete-charcoal join", hex: "#303638" },
      { name: "window blue", hex: "#4E7182" },
      { name: "leaf green", hex: "#55764E" },
      { name: "warm-oak balcony", hex: "#AA6A43" },
    ],
    motifs: [
      motif("three tall window arches", "arch", 3, 2, 448, 374, 144, 360, 178, 0),
      motif("one leafy canopy mass", "leaf", 1, 3, 650, 516, 300, 260, 0, 0),
      motif("one raised balcony band", "horizon", 1, 4, 448, 654, 720, 144, 0, 0),
      motif("one hanging geometric diamond", "triangle", 1, 1, 448, 184, 190, 190, 0, 0),
    ],
    relationship:
      "Three tall windows rise above the balcony while a plant mass and hanging geometry bridge the levels.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "7-adams",
    sourceCue:
      "A calm railway-shaped room draws the eye along an open kitchen toward warm milk bread and cultured butter.",
    styleSignature: "paper-layer",
    palette: [
      { name: "bread-cream paper", hex: "#F3E6C9" },
      { name: "charcoal cut edge", hex: "#252B2D" },
      { name: "warm-oak room", hex: "#A96D48" },
      { name: "butter gold", hex: "#D4A239" },
      { name: "slate-blue shadow", hex: "#536879" },
      { name: "milk-bread tan", hex: "#D8BB82" },
    ],
    motifs: [
      motif("one long railway-room band", "horizon", 1, 2, 448, 494, 790, 256, 0, 0),
      motif("one open kitchen rectangle", "block", 1, 1, 668, 404, 220, 190, 0, 0),
      motif("one warm bread dome", "arch", 1, 5, 326, 576, 260, 176, 0, 0),
      motif("one butter-gold oval", "oval", 1, 3, 574, 590, 184, 126, 0, 0),
    ],
    relationship: "The long room points from its open kitchen toward one bread dome and one butter oval.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "acquerello",
    sourceCue:
      "A signature A-frame ceiling and warm furnishings culminate in a rolling cart laden with petite sweets.",
    styleSignature: "marquetry-strata",
    palette: [
      { name: "warm-cream room", hex: "#F0E1C5" },
      { name: "charcoal join", hex: "#282B2D" },
      { name: "walnut ceiling", hex: "#8A543B" },
      { name: "antique-gold cart", hex: "#C59238" },
      { name: "plum confection", hex: "#70455F" },
      { name: "warm furnishing", hex: "#D0AE77" },
    ],
    motifs: [
      motif("one steep ceiling chevron", "triangle", 1, 2, 448, 288, 670, 430, 0, 0),
      motif("one warm room arch", "arch", 1, 5, 448, 486, 600, 480, 0, 0),
      motif("one rolling service block", "block", 1, 3, 448, 650, 350, 172, 0, 0),
      motif("three broad confection disks", "disk", 3, 4, 448, 570, 104, 104, 128, 0),
    ],
    relationship: "The steep ceiling shelters a warm arch and rolling cart topped by three legible sweets.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "restaurant-naides",
    sourceCue:
      "A Filipino steamed rice cake carries pork rillette, thin lardo, and fresh herbs in the tasting sequence.",
    styleSignature: "painted-mass",
    palette: [
      { name: "rice-ivory ground", hex: "#F1E6D1" },
      { name: "charcoal painted edge", hex: "#2C3030" },
      { name: "rillette umber", hex: "#9A5A43" },
      { name: "lardo cream", hex: "#E2CFAE" },
      { name: "fresh-herb green", hex: "#4F744B" },
      { name: "steamed-rice cake", hex: "#D7C8A8" },
    ],
    motifs: [
      motif("one steamed rice-cake disk", "disk", 1, 5, 448, 514, 460, 460, 0, 0),
      motif("one savory rillette wave", "ribbon", 1, 2, 448, 474, 430, 104, 0, 0),
      motif("one pale lardo oval", "oval", 1, 3, 448, 386, 340, 138, 0, 0),
      motif("one fresh-herb leaf", "leaf", 1, 4, 547, 358, 125, 143, 0, 0),
    ],
    layerOrder: [0, 1, 2, 3],
    relationship: "The rice-cake disk carries a rillette ribbon, broad lardo oval, and one fresh-herb leaf.",
    edgeStrategy: "full-bleed",
  }),
] as const;

function motif(
  label: string,
  kind: RestaurantMotifKind,
  count: 1 | 2 | 3,
  colorIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
  spreadX: number,
  spreadY: number,
): RestaurantGeometryMotif {
  return {
    label,
    kind,
    count,
    colorIndex,
    x: x / ARTBOARD,
    y: y / ARTBOARD,
    width: width / ARTBOARD,
    height: height / ARTBOARD,
    spreadX: spreadX / ARTBOARD,
    spreadY: spreadY / ARTBOARD,
  };
}
