import type { RestaurantStyleSignature } from "./restaurant-art-profile";

export const CODE_NATIVE_STYLE_SIGNATURE_BY_STYLE_ID = {
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

const MANUFACTURING_LANGUAGE_BY_SIGNATURE = {
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
} as const satisfies Readonly<Record<RestaurantStyleSignature, string>>;

export function styleSignatureForArtStyle(styleId: string): RestaurantStyleSignature {
  const signature =
    CODE_NATIVE_STYLE_SIGNATURE_BY_STYLE_ID[styleId as keyof typeof CODE_NATIVE_STYLE_SIGNATURE_BY_STYLE_ID];
  if (!signature) {
    throw new Error(
      `Code-native construction references unregistered style ${styleId}; map that authoring direction to a realized construction signature.`,
    );
  }
  return signature;
}

export function manufacturingLanguageForSignature(signature: RestaurantStyleSignature): string {
  return MANUFACTURING_LANGUAGE_BY_SIGNATURE[signature];
}

export function landscapeManufacturingLanguageForStyle(styleId: string): string {
  return styleId === "luminous-ligne-claire"
    ? "open clear-line enamel scene"
    : manufacturingLanguageForSignature(styleSignatureForArtStyle(styleId));
}
