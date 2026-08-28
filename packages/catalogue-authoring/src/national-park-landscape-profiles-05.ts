import { defineLandscapeArtProfile, motif, palette } from "./code-native-landscape-profile";

export const nationalParkLandscapeProfiles05 = [
  defineLandscapeArtProfile({
    slug: "kings-canyon",
    sourceCue: "the South Fork Kings River beneath immense granite canyon walls",
    primaryStyleId: "cut-paper-strata",
    palette: palette(
      ["sky", "#8BB7C9"],
      ["granite", "#B8B7AD"],
      ["river", "#2D8190"],
      ["pine", "#3D674B"],
      ["sun", "#DBA847"],
    ),
    motifs: [
      motif(
        "the South Fork Kings River beneath immense granite canyon walls",
        "corner",
        1,
        0.55,
        0.46,
        0.72,
        0.62,
      ),
      motif("a whitewater thread descending from high Sierra light", "ribbon", 2, 0.48, 0.62, 0.26, 0.52),
      motif(
        "deep glacial canyon, granite domes, river, and high basins",
        "horizon",
        3,
        0.54,
        0.83,
        0.84,
        0.2,
      ),
    ],
    relationship:
      "Immense granite walls open around one descending whitewater thread above a consolidated pine basin.",
    edgeStrategy: "Granite and pine reach both lower sides while open blue sky separates the canyon walls.",
  }),
  defineLandscapeArtProfile({
    slug: "kobuk-valley",
    sourceCue: "caribou crossing immense Arctic sand dunes under a low sun",
    primaryStyleId: "cyanotype-field-study",
    palette: palette(
      ["arctic sky", "#315F83"],
      ["sand", "#D5A95C"],
      ["caribou", "#634D39"],
      ["river", "#6FA7BE"],
      ["sun", "#E2A450"],
    ),
    motifs: [
      motif(
        "caribou crossing immense Arctic sand dunes under a low sun",
        "caribou",
        2,
        0.39,
        0.54,
        0.34,
        0.26,
      ),
      motif("migration tracks writing one brief line across moving sand", "stripe", 1, 0.68, 0.62, 0.42, 0.2),
      motif(
        "Great Kobuk dunes, broad river valley, tundra, and boreal forest",
        "ribbon",
        3,
        0.5,
        0.82,
        0.82,
        0.22,
      ),
    ],
    relationship:
      "The caribou silhouette crosses one dune band while a broad blue river valley anchors the migration.",
    edgeStrategy:
      "Dune and river bands cross the lower face; Arctic sky stays open around the single animal.",
  }),
  defineLandscapeArtProfile({
    slug: "lake-clark",
    sourceCue: "turquoise Lake Clark below smoking volcanoes and red tundra",
    primaryStyleId: "fresco-mineral-pigment",
    palette: palette(
      ["ash sky", "#777D7C"],
      ["lake", "#2F9A9B"],
      ["tundra", "#A64F49"],
      ["snow", "#E6E5D7"],
      ["spruce", "#345A48"],
    ),
    motifs: [
      motif(
        "turquoise Lake Clark below smoking volcanoes and red tundra",
        "triangle",
        3,
        0.6,
        0.42,
        0.58,
        0.52,
      ),
      motif("salmon connecting ocean, river, bear, and mountain", "fish", 2, 0.32, 0.66, 0.28, 0.2),
      motif(
        "volcanic peaks, glacial lakes, braided rivers, tundra, and coast",
        "oval",
        1,
        0.55,
        0.82,
        0.8,
        0.22,
      ),
    ],
    relationship:
      "One snow volcano rises beyond the lake while a salmon crosses the red tundra edge in the foreground.",
    edgeStrategy: "Lake and tundra reach both lower sides while ash sky opens around the volcanic summit.",
  }),
  defineLandscapeArtProfile({
    slug: "lassen-volcanic",
    sourceCue: "Lassen Peak above steaming hydrothermal pools and mountain lake",
    primaryStyleId: "prismatic-geometric-symbolism",
    palette: palette(
      ["lava", "#242526"],
      ["sulfur", "#D3B52F"],
      ["hydrothermal", "#3B9D9E"],
      ["snow", "#E7E5D9"],
      ["pine", "#386046"],
    ),
    motifs: [
      motif(
        "Lassen Peak above steaming hydrothermal pools and mountain lake",
        "triangle",
        3,
        0.55,
        0.4,
        0.56,
        0.5,
      ),
      motif("four kinds of volcano gathered in one bright landscape", "ring", 1, 0.29, 0.61, 0.28, 0.28),
      motif("volcanic dome, cinder cone, lava fields, meadows, and lakes", "oval", 2, 0.58, 0.82, 0.74, 0.22),
    ],
    relationship:
      "The snow peak, one sulfur volcanic ring, and a broad hydrothermal lake form three crisp facets.",
    edgeStrategy:
      "The lake reaches both lower sides while black ground opens around the peak and sulfur ring.",
  }),
  defineLandscapeArtProfile({
    slug: "mammoth-cave",
    sourceCue:
      "a historic lantern lighting one immense dry, broad limestone passage disappearing into darkness",
    primaryStyleId: "ceramic-underglaze",
    palette: palette(
      ["cave", "#17191B"],
      ["limestone", "#777872"],
      ["lantern", "#D89A3D"],
      ["river", "#376A83"],
      ["forest", "#385644"],
    ),
    motifs: [
      motif(
        "a historic lantern lighting one immense dry, broad limestone passage disappearing into darkness",
        "arch",
        1,
        0.53,
        0.53,
        0.72,
        0.62,
      ),
      motif("an unseen underground river connecting an endless maze", "ribbon", 3, 0.57, 0.75, 0.54, 0.2),
      motif(
        "vast horizontally layered passages, a Rotunda-like chamber, sinkholes, and restrained limestone detail",
        "stripe",
        2,
        0.42,
        0.3,
        0.5,
        0.2,
      ),
    ],
    relationship:
      "A single lantern-lit limestone arch opens above an unseen blue river and one broad passage layer.",
    edgeStrategy:
      "The dry passage and hidden river cross the lower face while cave black remains dominant and uncluttered.",
  }),
  defineLandscapeArtProfile({
    slug: "mesa-verde",
    sourceCue: "Cliff Palace held beneath a great sandstone alcove",
    primaryStyleId: "wood-marquetry-landscape",
    palette: palette(
      ["sky", "#628DA5"],
      ["sandstone", "#BE825A"],
      ["adobe", "#8E4E3A"],
      ["juniper", "#45634A"],
      ["shadow", "#514A65"],
    ),
    motifs: [
      motif("Cliff Palace held beneath a great sandstone alcove", "arch", 1, 0.5, 0.49, 0.72, 0.58),
      motif("warm windows and ladders nested inside protective stone", "block", 2, 0.48, 0.61, 0.44, 0.28),
      motif(
        "mesa tops, branching canyons, cliff alcoves, and high-desert woodland",
        "horizon",
        3,
        0.57,
        0.84,
        0.8,
        0.2,
      ),
    ],
    relationship:
      "One adobe dwelling block nests beneath a protective sandstone arch above a juniper mesa shelf.",
    edgeStrategy:
      "The alcove and mesa shelf meet the lower sides while blue sky remains open beyond the stone.",
  }),
  defineLandscapeArtProfile({
    slug: "mount-rainier",
    sourceCue: "Mount Rainier above a meadow blazing with summer wildflowers",
    primaryStyleId: "luminous-ligne-claire",
    palette: palette(
      ["open sky", "#A9D5E5"],
      ["mountain", "#F1EFE2"],
      ["meadow", "#4E8252"],
      ["lupine", "#6D63A4"],
      ["paintbrush", "#C95045"],
    ),
    motifs: [
      motif(
        "Mount Rainier above a meadow blazing with summer wildflowers",
        "triangle",
        1,
        0.56,
        0.38,
        0.56,
        0.48,
      ),
      motif("a white volcanic dome gathering every river around it", "disk", 1, 0.56, 0.26, 0.22, 0.22),
      motif(
        "glaciated volcano, subalpine meadows, old forest, and radial valleys",
        "horizon",
        2,
        0.53,
        0.82,
        0.82,
        0.2,
      ),
    ],
    accent: motif("one open journey line across the flower meadow", "ribbon", 4, 0.34, 0.66, 0.3, 0.14),
    relationship:
      "The white volcanic dome rises alone above one meadow band, crossed by a single open red journey line.",
    edgeStrategy:
      "The meadow touches only the lower sides so a broad luminous sky remains visibly open around the mountain.",
  }),
  defineLandscapeArtProfile({
    slug: "national-park-american-samoa",
    sourceCue: "a flying fox crossing a steep rainforest island above coral water",
    primaryStyleId: "pixel-cluster-landscape",
    palette: palette(
      ["reef", "#2A9A9B"],
      ["rainforest", "#2F6A49"],
      ["lava", "#292A2A"],
      ["fruit", "#C95142"],
      ["sun", "#DDB24A"],
    ),
    motifs: [
      motif(
        "a flying fox crossing a steep rainforest island above coral water",
        "bat",
        2,
        0.38,
        0.38,
        0.34,
        0.24,
      ),
      motif("mountain forest and reef joined by one tropical slope", "triangle", 1, 0.65, 0.52, 0.48, 0.48),
      motif(
        "volcanic ridges, rainforest, village coast, and coral reef",
        "ribbon",
        3,
        0.52,
        0.82,
        0.82,
        0.22,
      ),
    ],
    relationship:
      "The flying fox crosses one steep green island as a coral-colored reef ribbon joins mountain to water.",
    edgeStrategy:
      "Reef water crosses the lower edge while clear turquoise surrounds the fox and island profile.",
  }),
  defineLandscapeArtProfile({
    slug: "new-river-gorge",
    sourceCue: "the New River Gorge Bridge spanning autumn forest and whitewater",
    primaryStyleId: "thread-painted-embroidery",
    palette: palette(
      ["mist", "#D8D9D0"],
      ["steel", "#65757D"],
      ["river", "#39758E"],
      ["autumn", "#A8583F"],
      ["forest", "#426345"],
    ),
    motifs: [
      motif(
        "the New River Gorge Bridge spanning autumn forest and whitewater",
        "arch",
        1,
        0.52,
        0.47,
        0.76,
        0.48,
      ),
      motif("one steel arc connecting two ancient ridges", "stripe", 3, 0.52, 0.48, 0.66, 0.2),
      motif(
        "deep Appalachian gorge, river rapids, cliffs, and forested plateaus",
        "ribbon",
        2,
        0.52,
        0.8,
        0.76,
        0.26,
      ),
    ],
    relationship:
      "One steel bridge arc joins autumn ridges while a broad blue river descends through the gorge below.",
    edgeStrategy:
      "Autumn ridges touch the sides and river touches the bottom; pale mist remains open through the center.",
  }),
];
