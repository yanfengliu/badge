import type { ArtStyleDefinition } from "./types";

export const artStyleLibrary: readonly ArtStyleDefinition[] = [
  {
    id: "pixel-cluster-landscape",
    revision: 1,
    label: "Pixel cluster landscape",
    family: "pixel",
    summary: "Hand-authored pixel clusters turn broad atmosphere and terrain into a precise miniature world.",
    promptDirectives: [
      "Use deliberate pixel clusters and a controlled 24-to-40-color palette.",
      "Build depth through clustered value steps and restrained ordered dithering.",
      "Keep hard pixel edges with no antialiasing, game interface, sprite sheet, or mascot language.",
    ],
    tags: ["crisp", "nostalgic", "atmospheric"],
  },
  {
    id: "thread-painted-embroidery",
    revision: 1,
    label: "Thread-painted embroidery",
    family: "fiber",
    summary:
      "Directional thread painting gives landscapes tactile depth while remaining an edge-to-edge picture.",
    promptDirectives: [
      "Build pictorial forms with directional long-and-short stitch, satin stitch, couching, and tiny knot texture.",
      "Let thread direction describe geology, water, foliage, and light with disciplined craftsmanship.",
      "Fill the pictorial field edge to edge without a hoop, backing object, stitched outline, or loose textile edge.",
    ],
    tags: ["tactile", "crafted", "rich"],
  },
  {
    id: "plein-air-broken-color",
    revision: 1,
    label: "Plein-air broken color",
    family: "paint",
    summary:
      "Visible bristle marks and broken color preserve the movement of weather and fleeting natural light.",
    promptDirectives: [
      "Use original historical-impressionist qualities: broken color, visible brushwork, and atmospheric light.",
      "Resolve the focal silhouette clearly while allowing peripheral marks to stay lively and open.",
      "Avoid copying a known painting or naming, imitating, or quoting any creator.",
    ],
    tags: ["luminous", "painterly", "weather"],
  },
  {
    id: "relief-blockprint",
    revision: 1,
    label: "Relief block print",
    family: "print",
    summary:
      "Bold carved marks and compact color fields make geology feel immediate, graphic, and monumental.",
    promptDirectives: [
      "Use expressive gouged marks, confident black shapes, and visible carved-grain rhythm.",
      "Limit the palette to three or four inks plus the paper tone.",
      "Preserve one unmistakable subject silhouette at small scale without clip-art simplification.",
    ],
    tags: ["bold", "graphic", "geologic"],
  },
  {
    id: "stained-glass-field",
    revision: 1,
    label: "Stained-glass field",
    family: "mosaic",
    summary: "Luminous irregular color cells and internal dark rhythm make water, wildlife, and sky glow.",
    promptDirectives: [
      "Build the scene from irregular translucent color cells with elegant internal dark joins.",
      "Use jewel-like color variation and transmitted-light luminosity within the depicted scene.",
      "Continue the pictorial cells to every edge without an enclosing frame, plaque, or object boundary.",
    ],
    tags: ["luminous", "jewel-tone", "wildlife"],
  },
  {
    id: "monoprint-ink-wash",
    revision: 1,
    label: "Monoprint ink wash",
    family: "ink",
    summary:
      "Velvety ink pools, dry-brush textures, and controlled negative space create singular dramatic depth.",
    promptDirectives: [
      "Combine broad ink-wash masses with dry-brush and transferred monoprint texture.",
      "Reserve one restrained accent hue against layered charcoal and mineral neutrals.",
      "Use negative space deliberately while retaining a clear focal route through the image.",
    ],
    tags: ["dramatic", "minimal", "textured"],
  },
  {
    id: "contour-atlas-ink",
    revision: 1,
    label: "Contour atlas ink",
    family: "cartographic",
    summary:
      "Fine unlabeled contour lines turn terrain, water, and remembered routes into an elegant visual field.",
    promptDirectives: [
      "Use nested topographic contours, watershed rhythms, and one clear landmark silhouette.",
      "Combine precise dark linework with restrained mineral color fields and route-like movement.",
      "Include no map key, coordinate, place label, compass text, or informational annotation.",
    ],
    tags: ["topographic", "precise", "journey"],
  },
  {
    id: "mineral-line-engraving",
    revision: 1,
    label: "Mineral line engraving",
    family: "print",
    summary:
      "Fine engraved hatching and restrained oxidized-earth color give landscape the dignity of an heirloom plate.",
    promptDirectives: [
      "Describe form with precise crosshatching, stipple, and flowing engraved lines.",
      "Use warm paper, deep graphite, and two restrained mineral accent colors.",
      "Keep the line hierarchy clean enough to read at thumbnail size without decorative clutter.",
    ],
    tags: ["heirloom", "precise", "mineral"],
  },
  {
    id: "aquatint-atmosphere",
    revision: 1,
    label: "Aquatint atmosphere",
    family: "print",
    summary: "Tonal intaglio grain and deep distance create quiet drama for valleys, fog, snow, and night.",
    promptDirectives: [
      "Use layered aquatint grain, etched accents, and broad tonal atmosphere.",
      "Hold a restrained near-monochrome palette with one luminous environmental accent.",
      "Separate foreground, middle distance, and horizon through value rather than outlines alone.",
    ],
    tags: ["tonal", "quiet", "deep"],
  },
  {
    id: "risograph-overprint",
    revision: 1,
    label: "Risograph overprint",
    family: "print",
    summary:
      "A few vivid ink layers and subtle registration character make natural forms playful but disciplined.",
    promptDirectives: [
      "Use two to four translucent spot-ink layers with selective overprint colors.",
      "Let subtle registration shifts energize secondary edges while the focal subject stays legible.",
      "Use paper grain and halftone sparingly, with no poster wording or commercial graphic language.",
    ],
    tags: ["graphic", "vivid", "layered"],
  },
  {
    id: "matte-gouache-editorial",
    revision: 1,
    label: "Matte gouache editorial",
    family: "paint",
    summary: "Opaque matte shapes and mature color blocking give iconic scenes a calm contemporary clarity.",
    promptDirectives: [
      "Use opaque matte gouache, crisp large shapes, and selective dry-brush detail.",
      "Favor a mature restrained palette with one surprising saturated accent.",
      "Simplify peripheral detail while keeping the primary landscape or action unmistakable.",
    ],
    tags: ["modern", "clear", "matte"],
  },
  {
    id: "woven-tapestry-field",
    revision: 1,
    label: "Woven tapestry field",
    family: "fiber",
    summary:
      "Pictorial warp-and-weft rhythm turns forests and layered horizons into warm, patient craftsmanship.",
    promptDirectives: [
      "Translate forms into interlocking woven color areas with visible warp-and-weft rhythm.",
      "Use small slubs and color variation to enrich surfaces without obscuring the focal silhouette.",
      "Continue the woven image to every edge without fringe, hanging hardware, or a separate textile object.",
    ],
    tags: ["woven", "patient", "warm"],
  },
  {
    id: "cut-paper-strata",
    revision: 1,
    label: "Cut-paper strata",
    family: "paper",
    summary:
      "Layered paper shapes express terrain, atmosphere, and depth with sculptural clarity and no clutter.",
    promptDirectives: [
      "Construct the scene from crisp layered paper silhouettes with subtle fibrous edges.",
      "Use overlapping strata and value steps to describe depth instead of realistic shading.",
      "Keep the image full bleed and pictorial, without a card, frame, diorama box, or display surface.",
    ],
    tags: ["layered", "clean", "sculptural"],
  },
  {
    id: "cyanotype-field-study",
    revision: 1,
    label: "Cyanotype field study",
    family: "print",
    summary:
      "Prussian-blue silhouettes and pale botanical or geological traces feel scientific, intimate, and mysterious.",
    promptDirectives: [
      "Use deep Prussian cyanotype blue with pale photographic silhouettes and soft exposure variation.",
      "Layer observational natural specimens around one bold environmental subject.",
      "Include no specimen labels, handwriting, measurement marks, or archival captions.",
    ],
    tags: ["botanical", "scientific", "blue"],
  },
  {
    id: "watercolor-naturalist-study",
    revision: 1,
    label: "Watercolor naturalist study",
    family: "paint",
    summary:
      "Transparent washes and exact observation celebrate plants, animals, water, and geology without labels.",
    promptDirectives: [
      "Use transparent watercolor blooms, dry-brush edges, and precise observational detail.",
      "Balance a central natural subject with smaller ecological supporting forms.",
      "Keep the paper field edge to edge and omit specimen text, arrows, numbers, or annotation.",
    ],
    tags: ["observational", "delicate", "ecological"],
  },
  {
    id: "charcoal-pastel-weather",
    revision: 1,
    label: "Charcoal and pastel weather",
    family: "paint",
    summary:
      "Broad charcoal masses and selective pastel capture wind, cloud, snow, surf, smoke, and changing sky.",
    promptDirectives: [
      "Use compressed charcoal, lifted highlights, and restrained soft-pastel color.",
      "Let weather movement organize the composition around one stable landmark.",
      "Preserve tactile dust and sweeping marks while maintaining a readable silhouette.",
    ],
    tags: ["weather", "expressive", "moody"],
  },
  {
    id: "screenprint-night",
    revision: 1,
    label: "Screenprint night",
    family: "print",
    summary:
      "Layered nocturnal silhouettes and a few luminous inks make night landscapes feel deep and quietly electric.",
    promptDirectives: [
      "Use flat layered screenprint silhouettes with three dark inks and one luminous accent.",
      "Make moonlight, stars, fire, or bioluminescence part of the depicted scene rather than surface shine.",
      "Keep edges confident and the focal subject legible without poster lettering.",
    ],
    tags: ["night", "luminous", "graphic"],
  },
  {
    id: "mosaic-tesserae-field",
    revision: 1,
    label: "Mosaic tesserae field",
    family: "mosaic",
    summary:
      "Irregular stone and glass tesserae create rhythmic color while preserving a strong pictorial silhouette.",
    promptDirectives: [
      "Build the scene from varied hand-set tesserae with directional flow around the focal form.",
      "Mix matte stone colors with sparse glass-like environmental highlights.",
      "Continue tessellation through the image edges without an enclosing plaque or architectural surround.",
    ],
    tags: ["rhythmic", "stone", "color"],
  },
  {
    id: "fresco-mineral-pigment",
    revision: 1,
    label: "Fresco mineral pigment",
    family: "paint",
    summary:
      "Weathered mineral pigment and quiet monumental forms make ancient geology feel timeless and grounded.",
    promptDirectives: [
      "Use matte mineral pigments, lime-plaster variation, and softly weathered edges.",
      "Organize the landscape into broad monumental masses with restrained earthen color.",
      "Let age appear within the pictorial surface without depicting a wall fragment or framed mural.",
    ],
    tags: ["ancient", "earth", "monumental"],
  },
  {
    id: "prismatic-geometric-symbolism",
    revision: 1,
    label: "Prismatic geometric symbolism",
    family: "geometric",
    summary:
      "Disciplined faceted geometry turns the emotional idea of an achievement into a memorable emblematic scene.",
    promptDirectives: [
      "Translate the subject into clear interlocking geometric planes and one poetic visual metaphor.",
      "Use a restrained dark ground with prismatic color concentrated at the conceptual focus.",
      "Keep the result pictorial and spatial rather than a logo, mark, seal, or heraldic device.",
    ],
    tags: ["symbolic", "faceted", "modern"],
  },
  {
    id: "ceramic-underglaze",
    revision: 1,
    label: "Ceramic underglaze painting",
    family: "ceramic",
    summary:
      "Painterly underglaze blooms and earthy kiln color give land and water a tactile, elemental character.",
    promptDirectives: [
      "Use brushed underglaze color, wax-resist-like edges, and subtle kiln variation within the image.",
      "Describe subjects with cobalt, iron, copper, and warm clay hues while preserving clear hierarchy.",
      "Fill the field without depicting a tile, plate, vessel, glaze edge, or display object.",
    ],
    tags: ["elemental", "earthy", "brushed"],
  },
  {
    id: "wood-marquetry-landscape",
    revision: 1,
    label: "Wood marquetry landscape",
    family: "wood",
    summary:
      "Carefully chosen wood grain and inlaid silhouettes give forests and mountains warm structural depth.",
    promptDirectives: [
      "Build pictorial forms from fitted wood-grain shapes in contrasting natural tones.",
      "Let grain direction reinforce water flow, tree growth, rock strata, and atmosphere.",
      "Continue the inlaid image to every edge without a panel outline, frame, furniture, or display setting.",
    ],
    tags: ["warm", "structural", "natural"],
  },
  {
    id: "scratchboard-nocturne",
    revision: 1,
    label: "Scratchboard nocturne",
    family: "ink",
    summary:
      "Fine light carved from darkness creates intricate night wildlife, rock, forest, and star detail.",
    promptDirectives: [
      "Carve luminous fine lines and stipple from a deep black ground.",
      "Use one restrained color wash beneath selected highlights for atmospheric hierarchy.",
      "Keep the strongest silhouette bold enough to survive thumbnail reduction.",
    ],
    tags: ["night", "intricate", "high-contrast"],
  },
  {
    id: "luminous-ligne-claire",
    revision: 1,
    label: "Luminous ligne claire",
    family: "ink",
    summary:
      "Clean flowing line, immense airy space, and surreal but original color make a journey feel mythic.",
    promptDirectives: [
      "Use clean confident contour line, sparse internal hatching, and large areas of luminous color.",
      "Give the landscape elegant scale through tiny natural details and immense atmospheric space.",
      "Keep the visual language original and creator-neutral, with no copied character, vehicle, or known composition.",
    ],
    tags: ["airy", "mythic", "journey"],
  },
] as const;

const stylesById = new Map(artStyleLibrary.map((style) => [style.id, style]));

export function findArtStyle(styleId: string): ArtStyleDefinition | undefined {
  return stylesById.get(styleId);
}
