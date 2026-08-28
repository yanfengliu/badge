import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
  findCodeNativeArtRecipe,
  serializeCodeNativeArtRecipe,
} from "./code-native-art-recipes.js";
import { compileCandidatePrompt } from "./prompt-recipe.js";
import { selectedUsStateStudies } from "./selected-us-state-studies.js";
import { usStateCampaign } from "./us-states-campaign.js";

const rendererImplementationFiles = [
  "../../../scripts/render-code-native-catalogue-art.mjs",
  "../../../scripts/code-native-art/flat-raster.mjs",
  "../../../scripts/code-native-art/png.mjs",
] as const;

describe("selected U.S. state source studies", () => {
  it("binds all 50 replacements, thumbnails, canonical prompts, and predecessor histories", async () => {
    expect(selectedUsStateStudies).toHaveLength(50);
    const rendererImplementationSha256 = await sha256Files(rendererImplementationFiles);
    for (const study of selectedUsStateStudies) {
      const project = usStateCampaign.find((candidate) => candidate.definitionId === study.definitionId);
      const primary = project?.candidates.find(
        (candidate) => candidate.candidateKey === project.primaryCandidateKey,
      );
      if (!project || !primary) throw new Error(`Missing primary campaign entry for ${study.name}.`);
      const prompt = compileCandidatePrompt(project.brief, primary).prompt;
      expect(study.selectedSource.selectedCandidateKey).toBe(primary.candidateKey);
      expect(createHash("sha256").update(prompt, "utf8").digest("hex"), study.name).toBe(
        study.selectedSource.promptSha256,
      );
      expect(study.selectedSource).toMatchObject({
        generatedOn: "2026-08-26",
        provenance: {
          generationWorkflow: "deterministic-code-native-enamel-geometry",
          contentOrigin: "code-authored-geometry",
          promptBinding: "recorded-canonical-generation-and-code-native-design",
        },
      });
      const sourceBytes = await readFile(
        fileURLToPath(new URL(`../assets/us-states/${study.selectedSource.fileName}`, import.meta.url)),
      );
      expect(sourceBytes.byteLength, study.name).toBeLessThanOrEqual(256 * 1024);
      expect(readJpegHeaderSize(sourceBytes), study.name).toEqual({ width: 896, height: 896 });
      expect(createHash("sha256").update(sourceBytes).digest("hex"), study.name).toBe(
        study.selectedSource.sha256,
      );
      const thumbnailBytes = await readFile(
        fileURLToPath(
          new URL(
            `../assets/us-states/thumbnails/${study.selectedSource.thumbnail.fileName}`,
            import.meta.url,
          ),
        ),
      );
      expect(thumbnailBytes.byteLength, `${study.name} thumbnail`).toBeLessThanOrEqual(16 * 1024);
      expect(readJpegHeaderSize(thumbnailBytes), `${study.name} thumbnail`).toEqual({
        width: 128,
        height: 128,
      });
      expect(createHash("sha256").update(thumbnailBytes).digest("hex"), `${study.name} thumbnail`).toBe(
        study.selectedSource.thumbnail.sha256,
      );
      const recipe = findCodeNativeArtRecipe("us-states", study.slug);
      if (!recipe) throw new Error(`Missing code-native U.S. state recipe for ${study.name}.`);
      expect(study.selectedSource.accessibleDescription, study.name).toContain(recipe.manufacturingLanguage);
      const sourceHistory = study.selectedSource.sourceHistory;
      if (!sourceHistory || sourceHistory.length !== 2) {
        throw new Error(`Missing two-step source history for ${study.name}.`);
      }
      expect(sourceHistory[0], study.name).toMatchObject({
        kind: "initial-generation",
        promptRecipe: { id: "badge-source-art", revision: 1 },
        promptSha256: study.selectedSource.promptSha256,
      });
      expect(sourceHistory[1], study.name).toEqual({
        kind: "code-native-replacement",
        renderRecipe: CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
        designBriefSha256: createHash("sha256")
          .update(serializeCodeNativeArtRecipe(recipe), "utf8")
          .digest("hex"),
        rendererImplementationSha256,
        supersededCanonicalSourceSha256:
          sourceHistory[0].kind === "initial-generation" ? sourceHistory[0].outputSourceSha256 : "",
      });
      if (sourceHistory[0].kind === "initial-generation") {
        expect(sourceHistory[0].outputSourceSha256, study.name).not.toBe(study.selectedSource.sha256);
      }
      expect(prompt).toContain(study.name);
      expect(study.defaultQuotationId).toMatch(/^historic-quotation\//u);
    }
  });

  it("keeps selected studies in Studio-authoring assets while exposing only bounded list derivatives", () => {
    for (const study of selectedUsStateStudies) {
      expect(study.selectedSource.width).toBe(896);
      expect(study.selectedSource.height).toBe(896);
      expect(study.selectedSource.provenance.normalization.maximumBytes).toBe(256 * 1024);
      expect(study.selectedSource.thumbnail.width).toBe(128);
      expect(study.selectedSource.thumbnail.height).toBe(128);
    }
  });
});

async function sha256Files(relativeFiles: readonly string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const relativeFile of relativeFiles) {
    hash.update(relativeFile.replace("../../../", ""), "utf8");
    hash.update("\0", "utf8");
    hash.update(await readFile(fileURLToPath(new URL(relativeFile, import.meta.url))));
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

function readJpegHeaderSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Selected source is not a JPEG image.");
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error(`Malformed JPEG marker at byte ${offset}.`);
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw new Error(`Malformed JPEG segment at byte ${offset}.`);
    }
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  throw new Error("JPEG dimensions are missing.");
}
