import { defineRestaurantArtProfile } from "./restaurant-art-profile";
import type { RestaurantGeometryMotif, RestaurantMotifKind } from "./restaurant-art-profile";

const ARTBOARD = 896;

export const sanFranciscoRestaurantArtProfilesPartThree = [
  defineRestaurantArtProfile({
    slug: "saison",
    sourceCue:
      "An open wood hearth shapes a California-terroir menu sourced from regional farms, ranches, and fisheries.",
    styleSignature: "screenprint-overlap",
    palette: [
      { name: "warm-cream paper", hex: "#F0E2C7" },
      { name: "smoke-charcoal overprint", hex: "#2B3031" },
      { name: "ember-orange hearth", hex: "#CF6532" },
      { name: "field-green farm", hex: "#55744D" },
      { name: "fishery blue", hex: "#426F82" },
    ],
    motifs: [
      motif("one broad open-hearth arch", "arch", 1, 1, 448, 470, 690, 580, 0, 0),
      motif("one rising flame ribbon", "ribbon", 1, 2, 448, 330, 390, 120, 0, 0),
      motif("one farm-field band", "horizon", 1, 3, 448, 674, 790, 146, 0, 0),
      motif("one fishery wave", "ribbon", 1, 4, 448, 540, 720, 126, 0, 0),
    ],
    relationship: "The open hearth and rising flame bridge the regional farm band and fishery wave.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "atelier-crenn",
    sourceCue:
      "A pescatarian tasting connects Brittany and California through seafood, farm produce, sauces, and a grandmother's brioche.",
    styleSignature: "woven-band",
    palette: [
      { name: "warm-cream woven ground", hex: "#F1E3C7" },
      { name: "charcoal weft", hex: "#283033" },
      { name: "Atlantic-blue seafood", hex: "#3F7082" },
      { name: "field-green produce", hex: "#55774F" },
      { name: "bread-gold brioche", hex: "#C89136" },
    ],
    motifs: [
      motif("one Brittany-seafood wave", "ribbon", 1, 2, 448, 620, 780, 148, 0, 0),
      motif("one California field band", "horizon", 1, 3, 448, 704, 790, 130, 0, 0),
      motif("one seafood silhouette", "oval", 1, 2, 304, 382, 320, 190, 0, 0),
      motif("one braided bread dome", "arch", 1, 4, 604, 422, 320, 240, 0, 0),
    ],
    relationship: "Seafood and brioche sit between the Brittany-seafood ribbon and California farm band.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "sorrel",
    sourceCue:
      "Italian-inflected Californian cooking follows farmers-market harvests and ingredients foraged from a rooftop garden.",
    styleSignature: "fiber-applique",
    palette: [
      { name: "cream textile ground", hex: "#F0E3C8" },
      { name: "charcoal stitch", hex: "#293033" },
      { name: "sorrel-green garden", hex: "#4E754C" },
      { name: "terra-cotta terrace", hex: "#AD6043" },
      { name: "harvest-gold basket", hex: "#CD9636" },
    ],
    motifs: [
      motif("one rooftop garden terrace", "block", 1, 3, 448, 604, 720, 230, 0, 0),
      motif("one market-basket oval", "oval", 1, 4, 300, 454, 300, 210, 0, 0),
      motif("one climbing sorrel leaf", "leaf", 1, 2, 600, 350, 300, 360, 0, 0),
      motif("one Italian-inflected course band", "horizon", 1, 1, 448, 252, 620, 116, 0, 0),
    ],
    relationship:
      "A rooftop terrace supports the market harvest while sorrel climbs toward the tasting-course band.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "angler-sf",
    sourceCue:
      "A waterfront dining room frames steel beams, native flowers, and an expansive wood hearth touching every seafood dish with fire.",
    styleSignature: "lead-cell",
    palette: [
      { name: "flower-cream glass", hex: "#F1E4CA" },
      { name: "charcoal lead", hex: "#242A2D" },
      { name: "waterfront blue", hex: "#437486" },
      { name: "steel-gray beam", hex: "#5C6971" },
      { name: "ember-orange hearth", hex: "#D06434" },
      { name: "native-flower gold", hex: "#D19A36" },
    ],
    motifs: [
      motif("one broad waterfront horizon", "horizon", 1, 2, 448, 654, 790, 168, 0, 0),
      motif("two steel beam diagonals", "ribbon", 2, 3, 448, 330, 110, 520, 250, 0),
      motif("one expansive hearth oval", "oval", 1, 4, 448, 550, 570, 240, 0, 0),
      motif("one seafood silhouette", "oval", 1, 2, 448, 380, 360, 180, 0, 0),
    ],
    relationship: "Two steel beams frame one fish over the expansive hearth and waterfront horizon.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "wolfsbane",
    sourceCue:
      "Michelin pairs Wolfsbane's Dungeness crab with earthy sweet potato and buttery Maltaise sauce, tinted blush with blood orange and beet.",
    styleSignature: "paper-layer",
    palette: [
      { name: "sauce-ivory paper", hex: "#F1E3C8" },
      { name: "sweet-potato purple edge", hex: "#603E52" },
      { name: "crab-coral cut layer", hex: "#C9654C" },
      { name: "beet-blush Maltaise", hex: "#D4938B" },
      { name: "blood-orange crimson", hex: "#B84835" },
    ],
    motifs: [
      motif("one Dungeness-crab claw", "claw", 1, 2, 326, 450, 350, 270, 0, 0),
      motif("one Maltaise-sauce disk", "disk", 1, 3, 470, 510, 430, 430, 0, 0),
      motif("one sweet-potato crescent", "arch", 1, 1, 654, 590, 250, 180, 0, 0),
      motif("one blood-orange-and-beet ring", "ring", 1, 4, 628, 338, 250, 250, 0, 0),
    ],
    layerOrder: [1, 3, 0, 2],
    relationship:
      "The coral crab claw and purple sweet potato remain distinct over a blush Maltaise disk beside a closed blood-orange-and-beet ring.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "sun-moon-studio",
    sourceCue:
      "An intimate seasonal tasting pairs Dungeness crab and yuzu-kosho butter with silken tofu, plus savory egg tart and salmon roe.",
    styleSignature: "ceramic-roundel",
    palette: [
      { name: "tofu-ivory glaze", hex: "#F0E3CC" },
      { name: "charcoal contour", hex: "#252A2C" },
      { name: "crab-coral form", hex: "#C86858" },
      { name: "tart-gold disk", hex: "#D09A34" },
      { name: "deep-teal butter", hex: "#39716F" },
      { name: "silken-tofu ivory", hex: "#D9C9AA" },
    ],
    motifs: [
      motif("one crab-claw crescent", "arch", 1, 2, 290, 430, 330, 240, 0, 0),
      motif("one silken tofu block", "block", 1, 5, 594, 430, 280, 260, 0, 0),
      motif("one savory tart disk", "disk", 1, 3, 448, 648, 250, 250, 0, 0),
      motif("one yuzu-butter arc", "arch", 1, 4, 448, 316, 560, 240, 0, 0),
    ],
    relationship: "The yuzu-butter arc connects Dungeness crab and silken tofu above the savory tart.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "commis",
    sourceCue:
      "A signature slow-poached egg yolk rests in onion-and-malt cream within a serene, pendant-lit dining room.",
    styleSignature: "lead-cell",
    palette: [
      { name: "cream glass ground", hex: "#F1E2C5" },
      { name: "charcoal lead", hex: "#262A2C" },
      { name: "yolk-gold center", hex: "#D5A02F" },
      { name: "malt-brown bowl", hex: "#8F573E" },
      { name: "walnut room", hex: "#674838" },
      { name: "onion-cream wave", hex: "#DCC9A8" },
    ],
    motifs: [
      motif("one glowing yolk disk", "disk", 1, 2, 448, 470, 310, 310, 0, 0),
      motif("one onion-cream wave", "ribbon", 1, 5, 448, 560, 570, 120, 0, 0),
      motif("one malt-brown bowl arc", "arch", 1, 3, 448, 588, 600, 320, 0, 0),
      motif("two pendant-light ovals", "oval", 2, 2, 448, 210, 112, 168, 250, 0),
    ],
    relationship: "Two pendant lights align over a centered yolk, cream wave, and malt bowl arc.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "madcap",
    sourceCue:
      "Crisp-skinned trout, cauliflower purée, and kohlrabi ribbons finish with a tableside stream of dashi.",
    styleSignature: "painted-mass",
    palette: [
      { name: "cauliflower-cream wash", hex: "#F0E4CF" },
      { name: "trout-charcoal edge", hex: "#303638" },
      { name: "trout-silver mass", hex: "#77878B" },
      { name: "kohlrabi green", hex: "#66804F" },
      { name: "dashi amber", hex: "#B87836" },
      { name: "cauliflower-cream puree", hex: "#D8C9AC" },
    ],
    motifs: [
      motif("one broad trout silhouette", "oval", 1, 2, 448, 470, 600, 260, 0, 0),
      motif("one cauliflower-cream oval", "oval", 1, 5, 448, 612, 470, 190, 0, 0),
      motif("two kohlrabi ribbons", "ribbon", 2, 3, 448, 340, 470, 86, 0, 120),
      motif("one pouring dashi arc", "arch", 1, 4, 448, 410, 690, 520, 0, 0),
    ],
    relationship: "A broad trout rests on cauliflower while two kohlrabi ribbons meet the pouring dashi arc.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "wakuriya",
    sourceCue:
      "A reservation-only Japanese kitchen presents kaiseki as a measured progression from starter and appetizers through seasonal cooked courses.",
    styleSignature: "ceramic-roundel",
    palette: [
      { name: "course-ivory glaze", hex: "#F1E5CC" },
      { name: "ink-black contour", hex: "#24292B" },
      { name: "celadon-green course", hex: "#6D8868" },
      { name: "warm-clay bowl", hex: "#A86646" },
      { name: "seasonal-gold course", hex: "#CC9637" },
    ],
    motifs: [
      motif("one measured course-path ribbon", "ribbon", 1, 2, 448, 470, 720, 126, 0, 0),
      motif("one seasonal course disk", "disk", 1, 4, 294, 330, 230, 230, 0, 0),
      motif("one steaming bowl arc", "arch", 1, 3, 592, 562, 360, 270, 0, 0),
      motif("one folded appetizer fan", "triangle", 1, 2, 598, 306, 260, 230, 0, 0),
    ],
    relationship:
      "The measured progression ribbon links a seasonal course, appetizer fan, and steaming bowl.",
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
