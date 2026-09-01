import type { PackRef } from "@badge/pack-contract";
import type { RenderRecipe } from "@badge/render-recipe";

import { fixtureQuotationBankForDefinition } from "@badge/catalogue-fixtures/catalogue-quotations";
import type { FixtureHistoricalQuotation } from "./types";

export const CATALOGUE_PACK_ID = "badge.catalogue.discovery";
export const CATALOGUE_RECORD_ID_PREFIX = "catalogue:";

export interface CataloguePackBadgeFixture {
  readonly recordId: string;
  readonly definitionId: string;
  readonly setId: string;
  readonly regionId?: string;
  readonly title: string;
  readonly criterion: string;
  readonly description: string;
  readonly accessibleDescription: string;
  /** Catalogue-qualified key of the canonical 896×896 source study, e.g. "national-parks/acadia.jpg". */
  readonly assetKey: string;
  readonly sourceAssetHash: string;
  readonly visualEditionId: string;
  readonly renderRecipe: RenderRecipe;
  readonly defaultQuotationId: string;
  readonly historicalQuotations: readonly FixtureHistoricalQuotation[];
  readonly referenceUrl?: string;
}

export type CataloguePackBadgeRow = readonly [
  definitionId: string,
  title: string,
  criterion: string,
  description: string,
  accessibleDescription: string,
  sourceFileName: string,
  sourceSha256: string,
  defaultQuotationId: string,
  referenceUrl?: string,
];

const setRenderRecipes: Readonly<Record<string, RenderRecipe>> = {
  "us-national-parks": {
    version: 1,
    shape: "circle",
    material: "enamel",
    borderColor: "#514637",
    borderWidth: 0.075,
    thickness: 0.13,
    relief: 0.032,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
  "us-states": {
    version: 1,
    shape: "shield",
    material: "enamel",
    borderColor: "#6f6657",
    borderWidth: 0.07,
    thickness: 0.12,
    relief: 0.028,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
  "books-read": {
    version: 1,
    shape: "rectangle",
    material: "wool",
    borderColor: "#a65c3e",
    borderWidth: 0.055,
    thickness: 0.075,
    relief: 0.018,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
  "video-games-played": {
    version: 1,
    shape: "square",
    material: "enamel",
    borderColor: "#3d3a5d",
    borderWidth: 0.065,
    thickness: 0.11,
    relief: 0.026,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
  "life-milestones": {
    version: 1,
    shape: "shield",
    material: "enamel",
    borderColor: "#b8aa8e",
    borderWidth: 0.065,
    thickness: 0.11,
    relief: 0.026,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
  "michelin-dining": {
    version: 1,
    shape: "circle",
    material: "enamel",
    borderColor: "#7a2e2e",
    borderWidth: 0.07,
    thickness: 0.12,
    relief: 0.03,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};

export function catalogueRenderRecipeForSet(setId: string): RenderRecipe {
  const recipe = setRenderRecipes[setId];
  if (!recipe) {
    throw new Error(
      `Catalogue set ${setId} has no published render recipe; register one in catalogue-pack-types before projecting its badges.`,
    );
  }
  return recipe;
}

export function defineCataloguePackBadges(
  rows: readonly CataloguePackBadgeRow[],
  options: {
    readonly setId: string;
    readonly assetDirectory: string;
    readonly regionId?: string;
  },
): readonly CataloguePackBadgeFixture[] {
  const renderRecipe = catalogueRenderRecipeForSet(options.setId);
  return rows.map(
    ([
      definitionId,
      title,
      criterion,
      description,
      accessibleDescription,
      sourceFileName,
      sourceSha256,
      defaultQuotationId,
      referenceUrl,
    ]) => {
      const bank = fixtureQuotationBankForDefinition(definitionId);
      if (!bank.some((quotation) => quotation.id === defaultQuotationId)) {
        throw new Error(
          `Catalogue badge ${definitionId} designates quotation ${defaultQuotationId}, which is not in its record-private source-checked bank; regenerate the catalogue pack fixture.`,
        );
      }
      return {
        recordId: `${CATALOGUE_RECORD_ID_PREFIX}${definitionId}`,
        definitionId,
        setId: options.setId,
        ...(options.regionId ? { regionId: options.regionId } : {}),
        title,
        criterion,
        description,
        accessibleDescription,
        assetKey: `${options.assetDirectory}/${sourceFileName}`,
        sourceAssetHash: sourceSha256,
        visualEditionId: `visual.${definitionId}.study.jpeg.v1`,
        renderRecipe,
        defaultQuotationId,
        historicalQuotations: bank,
        ...(referenceUrl ? { referenceUrl } : {}),
      };
    },
  );
}

export interface CataloguePack {
  readonly packRef: PackRef;
  readonly badges: readonly CataloguePackBadgeFixture[];
}
