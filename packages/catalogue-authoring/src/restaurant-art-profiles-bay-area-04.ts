import { defineRestaurantArtProfile } from "./restaurant-art-profile";
import type { RestaurantGeometryMotif, RestaurantMotifKind } from "./restaurant-art-profile";

const ARTBOARD = 896;

export const bayAreaRestaurantArtProfilesPartFour = [
  defineRestaurantArtProfile({
    slug: "singlethread",
    sourceCue:
      "A botanical opening arrangement links precise first bites to a nearby 24-acre farm, followed by donabe-cooked seafood and vegetables shaped by Japanese kaiseki.",
    styleSignature: "fiber-applique",
    palette: [
      { name: "warm-cream textile", hex: "#F1E5CF" },
      { name: "farm-umber stitch", hex: "#30302D" },
      { name: "leaf-green canopy", hex: "#55744D" },
      { name: "donabe-clay bowl", hex: "#A65E43" },
      { name: "sea-blue ribbon", hex: "#477486" },
    ],
    motifs: [
      motif("one botanical first-bite canopy", "leaf", 1, 2, 448, 310, 540, 330, 0, 0),
      motif("one farm-field band", "horizon", 1, 2, 448, 690, 780, 150, 0, 0),
      motif("one donabe bowl arc", "arch", 1, 3, 448, 540, 520, 320, 0, 0),
      motif("one seafood-and-vegetable ribbon", "ribbon", 1, 4, 448, 480, 660, 112, 0, 0),
    ],
    relationship:
      "The botanical canopy and farm band gather around a donabe arc crossed by one seafood ribbon.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "auberge-du-soleil",
    sourceCue:
      "A terrace-like perch overlooks vineyard and mountain bands while a local-grower wine program accompanies scallops in green garlic and dark squid-ink pasta.",
    styleSignature: "marquetry-strata",
    palette: [
      { name: "scallop-cream veneer", hex: "#F1E4C8" },
      { name: "ink-charcoal grain", hex: "#292D2D" },
      { name: "vineyard-green terrace", hex: "#5B754A" },
      { name: "mountain-blue ridge", hex: "#527486" },
      { name: "wine-plum accent", hex: "#75465A" },
    ],
    motifs: [
      motif("one vineyard terrace", "block", 1, 2, 448, 635, 760, 210, 0, 0),
      motif("one mountain horizon", "horizon", 1, 3, 448, 365, 780, 250, 0, 0),
      motif("one scallop disk", "disk", 1, 4, 300, 500, 250, 250, 0, 0),
      motif("one squid-ink pasta ribbon", "ribbon", 1, 1, 550, 490, 420, 125, 0, 0),
    ],
    relationship:
      "A scallop disk and dark pasta ribbon sit on the vineyard terrace beneath the mountain horizon.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "auro",
    sourceCue:
      "A glass-encased kitchen flanks the dining room while on-site garden produce meets Mexican accents in mole, bright aguachile, and a blue-and-yellow corn tetela.",
    styleSignature: "lead-cell",
    palette: [
      { name: "warm-cream glass", hex: "#F1E5CB" },
      { name: "mole-umber lead", hex: "#2B2A29" },
      { name: "glass-blue frame", hex: "#4B7886" },
      { name: "garden-green leaf", hex: "#5D774B" },
      { name: "corn-gold fan", hex: "#D09A35" },
    ],
    motifs: [
      motif("one glass-kitchen frame", "block", 1, 2, 448, 430, 730, 570, 0, 0),
      motif("one garden-leaf mass", "leaf", 1, 3, 300, 510, 310, 350, 0, 0),
      motif("one mole-dark oval", "oval", 1, 1, 570, 530, 310, 210, 0, 0),
      motif("one blue-and-yellow corn fan", "triangle", 1, 4, 566, 310, 300, 280, 0, 0),
    ],
    relationship:
      "The glass kitchen contains one garden leaf, mole oval, and broad corn fan as joined lead cells.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "enclos",
    sourceCue:
      "A cozy Victorian shell frames Stone Edge Farm produce and New England memory through clam-chowder chawanmushi and hearth-roasted quail with rose and burnt citrus.",
    styleSignature: "painted-mass",
    palette: [
      { name: "Victorian-cream plaster", hex: "#F1E3C8" },
      { name: "charcoal mineral line", hex: "#2B2D2C" },
      { name: "field-green farm", hex: "#56744C" },
      { name: "hearth-amber quail", hex: "#C06D3E" },
      { name: "rose-pink accent", hex: "#A85863" },
    ],
    motifs: [
      motif("one Victorian-house arch", "arch", 1, 1, 448, 430, 700, 620, 0, 0),
      motif("one farm-field band", "horizon", 1, 2, 448, 700, 790, 140, 0, 0),
      motif("one chowder-bowl oval", "oval", 1, 4, 302, 510, 300, 220, 0, 0),
      motif("one hearth-quail silhouette", "oval", 1, 3, 584, 492, 330, 220, 0, 0),
    ],
    relationship:
      "The Victorian arch shelters a farm band, a pale chowder bowl, and one hearth-warm quail mass.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "the-french-laundry",
    sourceCue:
      "Flowing ceiling lines crown a precisely planned cooking space, while a crisp cornet of crème fraîche and salmon tartare introduces produce from the garden across the street.",
    styleSignature: "lead-cell",
    palette: [
      { name: "ceiling-ivory glass", hex: "#F2E6CF" },
      { name: "charcoal lead", hex: "#282C2C" },
      { name: "garden-green field", hex: "#5A774F" },
      { name: "salmon-coral disk", hex: "#C96D5D" },
      { name: "cornet-gold cone", hex: "#D09A39" },
    ],
    motifs: [
      motif("two flowing ceiling ribbons", "ribbon", 2, 1, 448, 260, 600, 100, 0, 140),
      motif("one crisp cornet cone", "cone", 1, 4, 330, 475, 230, 330, 0, 0),
      motif("one salmon-tartare disk", "disk", 1, 3, 530, 470, 240, 240, 0, 0),
      motif("one garden-field band", "horizon", 1, 2, 448, 700, 790, 140, 0, 0),
    ],
    relationship:
      "Two ceiling ribbons crown the cornet and salmon disk above the garden field in four large cells.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "the-village-pub",
    sourceCue:
      "A polished pub room pairs a single round raviolo with molten yolk and potato against a row of warm, fluffy Parker House rolls.",
    styleSignature: "marquetry-strata",
    palette: [
      { name: "roll-cream veneer", hex: "#F1E3C5" },
      { name: "pub-walnut grain", hex: "#302B29" },
      { name: "pasta-gold raviolo", hex: "#C99538" },
      { name: "yolk-amber center", hex: "#D17E2F" },
      { name: "potato-cream inlay", hex: "#D6C3A1" },
    ],
    motifs: [
      motif("one polished pub arch", "arch", 1, 1, 251, 376, 340, 448, 0, 0),
      motif("one raviolo disk", "disk", 1, 2, 609, 349, 305, 305, 0, 0),
      motif("one molten-yolk disk", "disk", 1, 3, 609, 349, 134, 134, 0, 0),
      motif("three Parker House roll domes", "arch", 3, 4, 323, 663, 125, 116, 170, 0),
    ],
    layerOrder: [0, 3, 1, 2],
    relationship:
      "The polished pub arch stands beside the concentric raviolo and yolk, with three generous roll domes forming the lower row.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "cyrus",
    sourceCue:
      "Concrete and glass sit against rolling vineyard bands and an old plum tree, while dinner moves from lounge to kitchen, dining room, and chocolate room.",
    styleSignature: "paper-layer",
    palette: [
      { name: "glass-blue paper", hex: "#E6E2D1" },
      { name: "concrete-charcoal edge", hex: "#292D2E" },
      { name: "vineyard-green band", hex: "#58754C" },
      { name: "plum-purple canopy", hex: "#754D67" },
      { name: "chocolate-brown route", hex: "#76503A" },
    ],
    motifs: [
      motif("one concrete-and-glass block", "block", 1, 1, 448, 440, 650, 500, 0, 0),
      motif("one vineyard horizon", "horizon", 1, 2, 448, 690, 790, 150, 0, 0),
      motif("one old plum-tree canopy", "leaf", 1, 3, 300, 355, 330, 340, 0, 0),
      motif("one four-room progression ribbon", "ribbon", 1, 4, 500, 505, 570, 110, 0, 0),
    ],
    relationship:
      "The plum canopy and vineyard meet a concrete block crossed by one continuous four-room route.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "protege",
    sourceCue:
      "A sleek modern room presents a nine-layer morel lasagna with Madeira before a rolling dessert trolley of tarts and cookies.",
    styleSignature: "paper-layer",
    palette: [
      { name: "pastry-cream paper", hex: "#F1E4CA" },
      { name: "room-charcoal edge", hex: "#292D2E" },
      { name: "morel-brown layer", hex: "#76523C" },
      { name: "pasta-gold block", hex: "#C9993C" },
      { name: "Madeira-plum ribbon", hex: "#7B475C" },
    ],
    motifs: [
      motif("one sleek dining-room frame", "block", 1, 1, 448, 430, 720, 570, 0, 0),
      motif("one nine-layer lasagna block", "block", 1, 3, 350, 500, 330, 300, 0, 0),
      motif("one Madeira ribbon", "ribbon", 1, 4, 448, 360, 620, 110, 0, 0),
      motif("one dessert-trolley arc", "arch", 1, 2, 610, 520, 300, 310, 0, 0),
    ],
    relationship:
      "The Madeira ribbon crosses a broad lasagna block and curves into the dessert trolley within the room frame.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "selbys",
    sourceCue:
      "Old-Hollywood glamour frames a tall Gruyère popover and a butter-poached lobster composition with golden gnocchi and black trumpet mushrooms.",
    styleSignature: "painted-mass",
    palette: [
      { name: "glamour-cream paint", hex: "#F2E3C8" },
      { name: "mushroom-black contour", hex: "#292A2B" },
      { name: "popover-gold mass", hex: "#C79437" },
      { name: "lobster-coral crescent", hex: "#C76858" },
      { name: "velvet-plum arch", hex: "#72475E" },
    ],
    motifs: [
      motif("one Hollywood-glamour arch", "arch", 1, 4, 448, 420, 710, 620, 0, 0),
      motif("one Gruyere popover dome", "arch", 1, 2, 320, 470, 280, 360, 0, 0),
      motif("one lobster crescent", "arch", 1, 3, 585, 450, 330, 250, 0, 0),
      motif("three golden gnocchi disks", "disk", 3, 2, 448, 680, 130, 130, 160, 0),
    ],
    relationship:
      "The glamour arch frames one tall popover and lobster crescent above three broad gnocchi disks.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "troubadour",
    sourceCue:
      "A small daytime bakery transforms at night, pairing a prominent bread course with gently cooked rockfish, saffron-yuzu emulsion, and a clam croquette.",
    styleSignature: "woven-band",
    palette: [
      { name: "bakery-cream weave", hex: "#F1E4C8" },
      { name: "night-blue weft", hex: "#26333C" },
      { name: "bread-gold dome", hex: "#C99539" },
      { name: "rockfish-silver oval", hex: "#75878A" },
      { name: "saffron-amber ribbon", hex: "#D17B2F" },
    ],
    motifs: [
      motif("one bakery-to-evening split field", "horizon", 1, 1, 448, 430, 790, 610, 0, 0),
      motif("one bread-course dome", "arch", 1, 2, 305, 490, 310, 300, 0, 0),
      motif("one rockfish oval", "oval", 1, 3, 585, 500, 340, 200, 0, 0),
      motif("one saffron-yuzu ribbon", "ribbon", 1, 4, 448, 335, 640, 110, 0, 0),
    ],
    relationship:
      "A saffron ribbon unites the bread dome and rockfish oval across the bakery-to-evening field.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "plumed-horse",
    sourceCue:
      "An elegant room opens toward a glass wine cellar while a tall black-pepper and Parmesan soufflé rises above uni and Dungeness crab sauce.",
    styleSignature: "lead-cell",
    palette: [
      { name: "room-ivory glass", hex: "#F1E4C9" },
      { name: "charcoal lead", hex: "#292C2D" },
      { name: "glass-blue cellar", hex: "#4C7582" },
      { name: "wine-burgundy block", hex: "#784554" },
      { name: "souffle-gold dome", hex: "#D09A38" },
      { name: "crab-coral sauce", hex: "#C66C5A" },
    ],
    motifs: [
      motif("one elegant dining-room arch", "arch", 1, 1, 448, 425, 710, 620, 0, 0),
      motif("one glass-wine-cellar block", "block", 1, 2, 600, 420, 270, 390, 0, 0),
      motif("one tall souffle dome", "arch", 1, 4, 320, 480, 300, 380, 0, 0),
      motif("one crab-and-uni sauce wave", "ribbon", 1, 5, 448, 680, 660, 120, 0, 0),
    ],
    relationship: "The room arch joins a glass cellar and tall souffle over one generous crab-and-uni wave.",
    edgeStrategy: "full-bleed",
  }),
  defineRestaurantArtProfile({
    slug: "press",
    sourceCue:
      "A soaring warm-wood dining room centers a fireplace, with charcoal-grilled lobster and round ricotta gnudi receiving a tableside consommé pour.",
    styleSignature: "marquetry-strata",
    palette: [
      { name: "warm-cream veneer", hex: "#F1E3C6" },
      { name: "charcoal grain", hex: "#292B2A" },
      { name: "warm-wood arch", hex: "#895C3F" },
      { name: "fireplace-amber oval", hex: "#CC7133" },
      { name: "lobster-coral crescent", hex: "#C86656" },
      { name: "consomme-gold arc", hex: "#C79538" },
    ],
    motifs: [
      motif("one soaring warm-wood arch", "arch", 1, 2, 269, 349, 412, 609, 0, 0),
      motif("one central fireplace oval", "oval", 1, 3, 269, 412, 197, 251, 0, 0),
      motif("one charcoal-lobster crescent", "arch", 1, 4, 609, 564, 269, 179, 0, 0),
      motif("one tableside consomme arc", "arch", 1, 5, 591, 376, 323, 269, 0, 0),
    ],
    layerOrder: [0, 1, 3, 2],
    relationship:
      "The soaring wood arch and fireplace rise together on one side, balanced by the separate lobster crescent below a tableside pouring arc.",
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
