export const CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF = {
  id: "code-native-enamel-geometry",
  revision: 1,
} as const;

export type CodeNativeCatalogueDirectory = "books-read" | "life-milestones" | "michelin-dining";

export type CodeNativePoint = readonly [number, number];

export type CodeNativeArtCommand =
  | {
      readonly kind: "rect";
      readonly color: number;
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: "circle";
      readonly color: number;
      readonly cx: number;
      readonly cy: number;
      readonly radius: number;
    }
  | {
      readonly kind: "ellipse";
      readonly color: number;
      readonly cx: number;
      readonly cy: number;
      readonly radiusX: number;
      readonly radiusY: number;
    }
  | {
      readonly kind: "polygon";
      readonly color: number;
      readonly points: readonly CodeNativePoint[];
    }
  | {
      readonly kind: "curve";
      readonly color: number;
      readonly width: number;
      readonly points: readonly [CodeNativePoint, CodeNativePoint, CodeNativePoint, CodeNativePoint];
    }
  | {
      readonly kind: "arc";
      readonly color: number;
      readonly cx: number;
      readonly cy: number;
      readonly outerRadius: number;
      readonly innerRadius: number;
      readonly startDegrees: number;
      readonly endDegrees: number;
    }
  | {
      readonly kind: "star";
      readonly color: number;
      readonly cx: number;
      readonly cy: number;
      readonly outerRadius: number;
      readonly innerRadius: number;
      readonly points: number;
      readonly rotationDegrees?: number;
    };

export interface CodeNativeArtRecipe {
  readonly schemaVersion: 1;
  readonly renderer: typeof CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF;
  readonly catalogueDirectory: CodeNativeCatalogueDirectory;
  readonly slug: string;
  readonly primaryStyleId: string;
  readonly manufacturingLanguage: string;
  readonly styleComparison: string;
  readonly forms: readonly [string, string, string, ...string[]];
  readonly relationship: string;
  readonly palette: readonly [
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    { readonly name: string; readonly hex: `#${string}` },
    ...{ readonly name: string; readonly hex: `#${string}` }[],
  ];
  readonly backgroundColor: number;
  readonly commands: readonly CodeNativeArtCommand[];
  readonly minimumFeaturePixels: number;
  readonly minimumNegativeGapPixels: number;
  readonly edgeStrategy: string;
  readonly safeguards: readonly [
    "flat-color-only",
    "no-repeated-microdetail",
    "no-four-edge-inset",
    "no-typography-or-logos",
    "source-form-and-relationship-lock",
  ];
  readonly sourceSpecificExclusions: readonly string[];
}

export const CODE_NATIVE_SAFEGUARDS = [
  "flat-color-only",
  "no-repeated-microdetail",
  "no-four-edge-inset",
  "no-typography-or-logos",
  "source-form-and-relationship-lock",
] as const;

export type CodeNativeRecipeInput = Omit<CodeNativeArtRecipe, "schemaVersion" | "renderer" | "safeguards">;

export function defineCodeNativeArtRecipe(input: CodeNativeRecipeInput): CodeNativeArtRecipe {
  return {
    schemaVersion: 1,
    renderer: CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
    ...input,
    safeguards: CODE_NATIVE_SAFEGUARDS,
  };
}
