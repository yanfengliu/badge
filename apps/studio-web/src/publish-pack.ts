import { createAuthoringRequest } from "@badge/authoring-request-contract";
import {
  admitPack,
  canonicalJsonBytes,
  sha256Hex,
  validatePackDependencyClosure,
} from "@badge/pack-contract";
import { compilePack, preparePackObject } from "@badge/pack-compiler";
import { renderRecipeSchema, type RenderRecipe } from "@badge/render-recipe";

import { compileHeirloomThemePack } from "./heirloom-theme-pack";
import { validateImageAssetForPublication, type ImageAsset } from "./image-processing";

export interface PublishInput {
  asset: ImageAsset;
  recipe: RenderRecipe;
  accessibleDescription: string;
  provenance: "generated" | "uploaded";
}

const YOSEMITE_REQUEST_ID = "d66b05d8-f649-4f64-a02a-851911b3f7c1";

export async function publishYosemitePack(input: PublishInput) {
  const recipe = renderRecipeSchema.parse(input.recipe);
  Object.freeze(recipe.crop);
  Object.freeze(recipe);
  const provenance = input.provenance;
  const accessibleDescription = input.accessibleDescription;
  const asset = await validateImageAssetForPublication(input.asset);
  const themeDependency = await compileHeirloomThemePack();
  const themePack = themeDependency.packRef;
  const request = await createAuthoringRequest({
    schemaVersion: 1,
    requestId: YOSEMITE_REQUEST_ID,
    localDefinitionId: "visited-yosemite",
    semanticRevision: 1,
    title: "Yosemite",
    criterion: "Visit Yosemite National Park",
    description: "A private semantic brief containing no dates, notes, or visibility choices.",
  });
  const object = await preparePackObject({
    bytes: asset.bytes,
    mimeType: asset.mimeType,
    role: "source-art",
    width: asset.width,
    height: asset.height,
  });
  const releaseSeed = {
    schemaVersion: 1,
    kind: "targeted-visual",
    packId: "local.visual.visited-yosemite",
    version: "0.0.0",
    minimumArchiveVersion: "0.1.0",
    dependencies: [themePack],
    objects: [object.entry],
    compatibility: { renderRecipeVersions: [1] },
    licenses: [{ id: "personal-memory", name: "Personal memory use" }],
    provenance: {
      source: provenance,
      summary:
        provenance === "uploaded"
          ? "User-provided artwork selected and constructed locally in Badge Studio."
          : "Generated artwork selected and constructed locally in Badge Studio.",
    },
    themePack,
    target: {
      localDefinitionId: request.localDefinitionId,
      semanticRevision: request.semanticRevision,
      requestId: request.requestId,
      requestDigest: request.requestDigest,
    },
    visual: {
      visualEditionId: "visual.yosemite.studio",
      version: "0.0.0",
      sourceArtHash: object.hash,
      renderRecipe: recipe,
      fallback: {
        frontTemplateId: "heirloom-front",
        edgeTemplateId: "heirloom-edge",
        backTemplateId: "heirloom-back",
      },
      accessibleDescription,
    },
  } as const;
  const releaseFingerprint = await sha256Hex(canonicalJsonBytes(releaseSeed));
  const releaseVersion = `0.1.0-studio.${releaseFingerprint}`;
  const manifest = {
    ...releaseSeed,
    version: releaseVersion,
    visual: { ...releaseSeed.visual, version: releaseVersion },
  } as const;
  const compiled = await compilePack({ manifest, objects: [object] });
  const admitted = await admitPack(compiled.bytes);
  validatePackDependencyClosure(admitted, [themeDependency.admitted]);
  return { ...compiled, admitted, themeDependency };
}
