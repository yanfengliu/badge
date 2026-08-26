export type RestaurantStyleSignature =
  | "ceramic-roundel"
  | "fiber-applique"
  | "geometric-facet"
  | "ink-contour"
  | "lead-cell"
  | "map-contour"
  | "marquetry-strata"
  | "mosaic-cell"
  | "painted-mass"
  | "paper-layer"
  | "pixel-step"
  | "relief-cut"
  | "screenprint-overlap"
  | "woven-band";

export type RestaurantMotifKind =
  | "arch"
  | "block"
  | "bird"
  | "claw"
  | "cone"
  | "corner"
  | "disk"
  | "fish"
  | "horizon"
  | "leaf"
  | "oval"
  | "prawn"
  | "ring"
  | "ribbon"
  | "shell"
  | "stripe"
  | "triangle";

export interface RestaurantGeometryMotif {
  readonly label: string;
  readonly kind: RestaurantMotifKind;
  readonly count: 1 | 2 | 3;
  readonly colorIndex: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly spreadX?: number;
  readonly spreadY?: number;
}

export interface RestaurantArtProfile {
  readonly schemaVersion: 1;
  readonly slug: string;
  readonly sourceCue: string;
  readonly styleSignature: RestaurantStyleSignature;
  readonly palette: readonly [
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    ...{ readonly name: string; readonly hex: `#${string}` }[],
  ];
  readonly motifs: readonly [
    RestaurantGeometryMotif,
    RestaurantGeometryMotif,
    RestaurantGeometryMotif,
    ...RestaurantGeometryMotif[],
  ];
  readonly layerOrder?: readonly number[];
  readonly relationship: string;
  readonly edgeStrategy: string;
}

export type RestaurantArtProfileInput = Omit<RestaurantArtProfile, "schemaVersion">;

export function defineRestaurantArtProfile(input: RestaurantArtProfileInput): RestaurantArtProfile {
  return { schemaVersion: 1, ...input };
}
