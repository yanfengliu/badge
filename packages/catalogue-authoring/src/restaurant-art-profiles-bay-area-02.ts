import { defineRestaurantArtProfile } from "./restaurant-art-profile";
import type { RestaurantGeometryMotif, RestaurantMotifKind } from "./restaurant-art-profile";

const ARTBOARD = 896;

export const sanFranciscoRestaurantArtProfilesPartTwo = [
  defineRestaurantArtProfile({
    slug: "niku-steakhouse",
    sourceCue:
      "A gleaming entry opens to a wood-lined room and long chef counter glowing over a bed of coals.",
    styleSignature: "marquetry-strata",
    palette: [
      { name: "cream wall ground", hex: "#F1E3C8" },
      { name: "coal-black join", hex: "#22272A" },
      { name: "walnut wall", hex: "#87513A" },
      { name: "burnished-gold entry", hex: "#C58E34" },
      { name: "ember-orange coal", hex: "#D15F32" },
    ],
    motifs: [
      motif("one luminous entry rectangle", "block", 1, 3, 244, 382, 230, 350, 0, 0),
      motif("one long chef-counter arc", "arch", 1, 2, 500, 566, 690, 300, 0, 0),
      motif("one wood-lined wall field", "block", 1, 2, 600, 340, 410, 360, 0, 0),
      motif("one glowing coal oval", "oval", 1, 4, 520, 680, 480, 128, 0, 0),
    ],
    layerOrder: [2, 0, 3, 1],
    relationship: "The luminous entry opens across a walnut room to the long counter and its coal bed.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "ssal",
    sourceCue:
      "A single tasting menu joins Korean aesthetics and sensibilities with French dégustation technique beside an open kitchen.",
    styleSignature: "ceramic-roundel",
    palette: [
      { name: "rice-ivory glaze", hex: "#F1E5CD" },
      { name: "ink-black contour", hex: "#24282A" },
      { name: "celadon kitchen", hex: "#6F8968" },
      { name: "warm-brass horizon", hex: "#C4933B" },
      { name: "clay-brown vessel", hex: "#9B6044" },
    ],
    motifs: [
      motif("one open kitchen window", "block", 1, 2, 448, 350, 560, 310, 0, 0),
      motif("one single-menu oval", "oval", 1, 4, 278, 560, 240, 142, 0, 0),
      motif("one folded tasting path", "ribbon", 1, 3, 500, 522, 530, 116, 0, 0),
      motif("one degustation arc", "arch", 1, 1, 618, 586, 300, 210, 0, 0),
    ],
    relationship:
      "An open kitchen overlooks the single-menu oval while one tasting path meets the degustation arc.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "mister-jius",
    sourceCue:
      "A contemporary banquet meal in historic Chinatown centers on whole roasted duck prepared through traditional Chinese technique.",
    styleSignature: "relief-cut",
    palette: [
      { name: "warm-ivory paper", hex: "#F1E2C5" },
      { name: "night-blue carved line", hex: "#263340" },
      { name: "roast-umber duck", hex: "#995038" },
      { name: "jade-green window", hex: "#47735D" },
      { name: "brass-gold service", hex: "#C3923B" },
    ],
    motifs: [
      motif("one round banquet-table disk", "disk", 1, 4, 448, 560, 500, 500, 0, 0),
      motif("one broad roast-duck silhouette", "leaf", 1, 2, 448, 454, 360, 220, 0, 0),
      motif("one Chinatown window arch", "arch", 1, 3, 448, 330, 570, 430, 0, 0),
      motif("one shared serving arc", "arch", 1, 1, 448, 650, 660, 240, 0, 0),
    ],
    relationship:
      "The historic window arch frames a whole roast duck above the round banquet and shared serving arc.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "benu",
    sourceCue:
      "Michelin highlights Benu's whole roasted quail, glazed with maple and soy and served with sweet-potato crepinette and black truffles.",
    styleSignature: "ink-contour",
    palette: [
      { name: "porcelain-ivory paper", hex: "#F0E3C9" },
      { name: "truffle-black contour", hex: "#242426" },
      { name: "maple-amber quail", hex: "#C87832" },
      { name: "sweet-potato plum", hex: "#6D405C" },
      { name: "soy-brown glaze", hex: "#6D4030" },
      { name: "dumpling ivory", hex: "#D8C8A8" },
    ],
    motifs: [
      motif("one whole roasted-quail silhouette", "bird", 1, 2, 448, 408, 540, 310, 0, 0),
      motif("one maple-soy wing leaf", "leaf", 1, 4, 430, 402, 270, 145, 0, 0),
      motif("one sweet-potato crepinette oval", "oval", 1, 3, 430, 624, 430, 180, 0, 0),
      motif("three broad black-truffle rosettes", "disk", 3, 1, 658, 568, 92, 92, 100, 48),
    ],
    layerOrder: [2, 0, 1, 3],
    relationship:
      "The amber quail body carries one darker glazed wing above its plum crepinette, with three broad truffle rosettes held to the side.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "nisei",
    sourceCue:
      "Michelin identifies Nisei's omurice topped with Japanese omelet and caviar, alongside nori maki filled with silken tofu, Blue Lake lava beans, and trout roe.",
    styleSignature: "ceramic-roundel",
    palette: [
      { name: "tofu-ivory paper", hex: "#F1E5CC" },
      { name: "nori-green black", hex: "#24352F" },
      { name: "omelet gold", hex: "#D5A33A" },
      { name: "lava-bean violet", hex: "#76506D" },
      { name: "trout-roe vermilion", hex: "#C85D3B" },
    ],
    motifs: [
      motif("one omelet-covered omurice oval", "oval", 1, 2, 316, 500, 420, 260, 0, 0),
      motif("three black-caviar beads", "disk", 3, 1, 286, 404, 90, 90, 100, 30),
      motif("one dark nori-maki ring", "ring", 1, 1, 650, 500, 282, 282, 0, 0),
      motif("one violet lava-bean center", "oval", 1, 3, 630, 500, 126, 102, 0, 0),
      motif("one vermilion trout-roe bead", "disk", 1, 4, 706, 478, 90, 90, 0, 0),
    ],
    layerOrder: [0, 2, 3, 4, 1],
    relationship:
      "The gold omurice carries a dark caviar cluster beside a nori ring whose separate violet bean center and vermilion trout-roe bead remain broad and legible.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "lazy-bear",
    sourceCue:
      "Lazy Bear's bi-level warehouse resembles a hunting lodge; its paired oysters use gooseberry mignonette or charbroiled Jimmy Nardello pepper glaze with pickled biquinho peppers.",
    styleSignature: "ceramic-roundel",
    palette: [
      { name: "night-blue woven ground", hex: "#293949" },
      { name: "honey-timber frame", hex: "#D0A56F" },
      { name: "oyster-pearl shell", hex: "#E9DCC2" },
      { name: "gooseberry-green mignonette", hex: "#6D853F" },
      { name: "pepper-vermilion glaze", hex: "#B84C36" },
      { name: "ember-orange char", hex: "#D27B35" },
    ],
    motifs: [
      motif("two broad oyster half-shells", "shell", 2, 2, 448, 548, 310, 236, 344, 0),
      motif("three broad gooseberry drops", "disk", 3, 3, 278, 548, 90, 90, 100, 30),
      motif("one Jimmy-Nardello glaze ribbon", "ribbon", 1, 4, 620, 548, 240, 98, 0, 0),
      motif("two pickled-biquinho pepper disks", "disk", 2, 5, 642, 506, 90, 90, 100, 34),
      motif("one broad bi-level timber roofline", "corner", 1, 1, 448, 330, 700, 360, 0, 0),
    ],
    layerOrder: [4, 0, 1, 2, 3],
    relationship:
      "Two fan-shaped oyster shells sit beneath one broad stepped timber roofline, with green mignonette on the left and Jimmy Nardello glaze plus two pickled peppers on the right.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "sons-and-daughters",
    sourceCue:
      "New Nordic preservation shapes vegetables, foraged mushrooms, and seafood, with British roots appearing in a quail Scotch egg.",
    styleSignature: "fiber-applique",
    palette: [
      { name: "mushroom-cream cloth", hex: "#EFE1C5" },
      { name: "charcoal stitch", hex: "#292D2E" },
      { name: "forest-green forage", hex: "#4E714B" },
      { name: "ocean-blue seafood", hex: "#426E7E" },
      { name: "yolk-gold egg", hex: "#D19A32" },
      { name: "mushroom beige", hex: "#D7C6A4" },
    ],
    motifs: [
      motif("one preserved-vegetable ribbon", "ribbon", 1, 2, 448, 540, 700, 124, 0, 0),
      motif("one broad mushroom dome", "arch", 1, 5, 300, 376, 310, 220, 0, 0),
      motif("one ocean-blue wave", "ribbon", 1, 3, 448, 680, 780, 130, 0, 0),
      motif("one nested egg oval", "oval", 1, 4, 622, 360, 270, 220, 0, 0),
    ],
    relationship:
      "Preserved vegetables cross between a foraged mushroom, seafood wave, and nested Scotch-egg oval.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "hilda-and-jesse",
    sourceCue:
      "A cheerful modernist-diner room delivers an ambitious brunch as a frequently changing sequence of surprise dishes.",
    styleSignature: "screenprint-overlap",
    palette: [
      { name: "cream paper ground", hex: "#F3E5CB" },
      { name: "charcoal overprint", hex: "#262A2D" },
      { name: "soft-teal diner", hex: "#4F7D7C" },
      { name: "sunny-gold brunch", hex: "#D4A035" },
      { name: "deep-plum surprise", hex: "#704761" },
    ],
    motifs: [
      motif("one modernist diner arch", "arch", 1, 2, 448, 440, 690, 590, 0, 0),
      motif("one brunch-course disk", "disk", 1, 3, 302, 450, 250, 250, 0, 0),
      motif("one surprise-path zigzag", "ribbon", 1, 4, 504, 326, 530, 110, 0, 0),
      motif("one open counter block", "block", 1, 1, 554, 600, 430, 168, 0, 0),
    ],
    relationship:
      "A modern diner arch contains the brunch disk while a changing path crosses the open counter.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "san-ho-won",
    sourceCue:
      "Korean barbecue and home cooking meet in pork jowl with aged kimchi stew and a soy-pickled ramp.",
    styleSignature: "ceramic-roundel",
    palette: [
      { name: "rice-ivory glaze", hex: "#F1E4CC" },
      { name: "charcoal grill line", hex: "#24292B" },
      { name: "ember orange", hex: "#D06033" },
      { name: "kimchi amber", hex: "#BD7634" },
      { name: "ramp green", hex: "#51754B" },
    ],
    motifs: [
      motif("one charcoal grill oval", "oval", 1, 1, 448, 612, 620, 230, 0, 0),
      motif("one warm stew-bowl arc", "arch", 1, 3, 310, 442, 340, 250, 0, 0),
      motif("one pork-jowl crescent", "arch", 1, 2, 590, 410, 300, 210, 0, 0),
      motif("one pickled ramp curve", "ribbon", 1, 4, 448, 266, 500, 100, 0, 0),
    ],
    relationship: "The grill supports distinct stew and pork-jowl arcs beneath one green pickled-ramp curve.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "quince",
    sourceCue:
      "Fireplace-cooked local lamb meets fava beans, green garlic, edible blossoms, and vegetable-ash bread.",
    styleSignature: "painted-mass",
    palette: [
      { name: "bread-cream plaster", hex: "#EFE1C6" },
      { name: "ash-charcoal edge", hex: "#2B3030" },
      { name: "hearth amber", hex: "#C97732" },
      { name: "fava green", hex: "#55754B" },
      { name: "blossom violet", hex: "#7A536F" },
    ],
    motifs: [
      motif("one hearth-glow arch", "arch", 1, 2, 448, 478, 680, 580, 0, 0),
      motif("one local lamb silhouette", "oval", 1, 1, 448, 484, 370, 220, 0, 0),
      motif("one broad fava-leaf mass", "leaf", 1, 3, 292, 300, 310, 250, 0, 0),
      motif("one ash-dark bread dome", "arch", 1, 1, 622, 642, 290, 186, 0, 0),
    ],
    relationship: "The hearth frames local lamb and fava leaves beside a broad ash-bread dome.",
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
