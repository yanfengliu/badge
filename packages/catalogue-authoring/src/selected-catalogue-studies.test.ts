import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { bookAuthoringCampaign } from "./books-edition.js";
import {
  CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
  findCodeNativeArtRecipe,
  serializeCodeNativeArtRecipe,
} from "./code-native-art-recipes.js";
import { educationMilestoneCampaign } from "./education-milestones.js";
import { compileManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe.js";
import { michelinDiningCampaign } from "./michelin-dining.js";
import { videoGameAuthoringCampaign } from "./video-games-edition.js";
import {
  selectedBookStudies,
  selectedEducationMilestoneStudies,
  selectedMichelinDiningStudies,
  selectedVideoGameStudies,
} from "./selected-catalogue-studies.js";
import type { CatalogueStudyRecord, PlannedCatalogueStudyProject, SelectedSourceStudy } from "./types.js";

type BoundStudy = CatalogueStudyRecord & {
  readonly selectedSource: SelectedSourceStudy;
};

const groups = [
  {
    assetDirectory: "books-read",
    studies: selectedBookStudies,
    campaign: bookAuthoringCampaign,
  },
  {
    assetDirectory: "life-milestones",
    studies: selectedEducationMilestoneStudies,
    campaign: educationMilestoneCampaign,
  },
  {
    assetDirectory: "michelin-dining",
    studies: selectedMichelinDiningStudies,
    campaign: michelinDiningCampaign,
  },
  {
    assetDirectory: "video-games",
    studies: selectedVideoGameStudies,
    campaign: videoGameAuthoringCampaign,
  },
] as const;

const rendererImplementationFiles = [
  "../../../scripts/render-code-native-catalogue-art.mjs",
  "../../../scripts/code-native-art/flat-raster.mjs",
  "../../../scripts/code-native-art/png.mjs",
] as const;

describe("new selected catalogue source studies", () => {
  it("describes every code-native pixel study by its realized construction", () => {
    for (const group of groups) {
      for (const study of group.studies as readonly BoundStudy[]) {
        const recipe = findCodeNativeArtRecipe(group.assetDirectory, study.slug);
        expect(recipe, study.title).toBeDefined();
        expect(study.selectedSource.accessibleDescription, study.title).toContain(
          recipe?.manufacturingLanguage,
        );
      }
    }
  });

  // Compiles all 234 campaign prompts and reads and hashes every source and thumbnail
  // asset, so a loaded parallel suite needs the same 60s budget as the sibling
  // prompt-export and geometry gates rather than vitest's 5s default.
  it("binds every study to an immutable direct or replacement code-native history", async () => {
    const sourceHashes = new Set<string>();
    const thumbnailHashes = new Set<string>();
    const rendererImplementationSha256 = await sha256Files(rendererImplementationFiles);
    let codeNativeReplacementCount = 0;
    let directCodeNativeCount = 0;
    let canonicalOnlyCount = 0;
    let studyCount = 0;
    for (const group of groups) {
      for (const study of group.studies as readonly BoundStudy[]) {
        studyCount += 1;
        const project = (group.campaign as readonly PlannedCatalogueStudyProject[]).find(
          (candidate) => candidate.definitionId === study.definitionId,
        );
        const primary = project?.candidates.find(
          (candidate) => candidate.candidateKey === project.primaryCandidateKey,
        );
        if (!project || !primary) throw new Error(`Missing primary campaign entry for ${study.title}.`);
        const canonicalPrompt = compileManufacturableCandidatePrompt(project.brief, primary).prompt;
        const canonicalPromptSha256 = createHash("sha256").update(canonicalPrompt, "utf8").digest("hex");
        const sourceHistory = study.selectedSource.sourceHistory;
        if (!sourceHistory) throw new Error(`Missing exact source history for ${study.title}.`);
        expect(study.selectedSource.selectedCandidateKey).toBe(primary.candidateKey);
        expect(study.selectedSource.promptRecipe, study.title).toEqual({
          id: "badge-source-art",
          revision: 2,
        });
        expect(study.selectedSource.promptSha256, study.title).toBe(canonicalPromptSha256);
        const recipe = findCodeNativeArtRecipe(group.assetDirectory, study.slug);
        if (recipe) {
          const designBriefSha256 = createHash("sha256")
            .update(serializeCodeNativeArtRecipe(recipe), "utf8")
            .digest("hex");
          const firstStep = sourceHistory[0];
          const renderStep =
            firstStep.kind === "direct-code-native-render"
              ? firstStep
              : sourceHistory.length === 2
                ? sourceHistory[1]
                : undefined;
          if (
            !renderStep ||
            (renderStep.kind !== "direct-code-native-render" && renderStep.kind !== "code-native-replacement")
          ) {
            throw new Error(`Missing direct or replacement code-native render step for ${study.title}.`);
          }
          expect(renderStep.renderRecipe, study.title).toEqual(CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF);
          expect(renderStep.designBriefSha256, study.title).toBe(designBriefSha256);
          expect(renderStep.rendererImplementationSha256, study.title).toBe(rendererImplementationSha256);
          expect(study.selectedSource.provenance.generationWorkflow, study.title).toBe(
            "deterministic-code-native-enamel-geometry",
          );
          expect(study.selectedSource.provenance.contentOrigin, study.title).toBe("code-authored-geometry");
          if (renderStep.kind === "direct-code-native-render") {
            directCodeNativeCount += 1;
            expect(sourceHistory, study.title).toHaveLength(1);
            expect(renderStep).not.toHaveProperty("supersededCanonicalSourceSha256");
            expect(study.selectedSource.provenance.promptBinding, study.title).toBe(
              "recorded-canonical-prompt-association-and-code-native-design",
            );
          } else {
            codeNativeReplacementCount += 1;
            expect(sourceHistory, study.title).toHaveLength(2);
            expect(firstStep, study.title).toMatchObject({
              kind: "initial-generation",
              promptRecipe: { id: "badge-source-art", revision: 2 },
              promptSha256: canonicalPromptSha256,
            });
            if (firstStep.kind !== "initial-generation") {
              throw new Error(`Missing predecessor generation for replacement ${study.title}.`);
            }
            expect(firstStep.outputSourceSha256, study.title).toMatch(/^[a-f0-9]{64}$/u);
            expect(renderStep.supersededCanonicalSourceSha256, study.title).toBe(
              firstStep.outputSourceSha256,
            );
            expect(study.selectedSource.provenance.promptBinding, study.title).toBe(
              "recorded-canonical-generation-and-code-native-design",
            );
          }
        } else {
          canonicalOnlyCount += 1;
          expect(sourceHistory, study.title).toHaveLength(1);
          const generationStep = sourceHistory[0];
          expect(generationStep, study.title).toMatchObject({
            kind: "initial-generation",
            promptRecipe: { id: "badge-source-art", revision: 2 },
            promptSha256: canonicalPromptSha256,
          });
          if (generationStep.kind !== "initial-generation") {
            throw new Error(`Missing canonical generation for ${study.title}.`);
          }
          expect(generationStep.outputSourceSha256, study.title).toBe(study.selectedSource.sha256);
          expect(study.selectedSource.provenance.generationWorkflow, study.title).toBe(
            "openai-image-generation-via-codex-imagegen",
          );
          expect(study.selectedSource.provenance.contentOrigin, study.title).toBe("trained-algorithm");
          expect(study.selectedSource.provenance.promptBinding, study.title).toBe(
            "recorded-exact-canonical-prompt",
          );
        }
        expect(study.defaultQuotationId, study.title).toMatch(/^historic-quotation\//u);

        const sourceBytes = await readAsset(group.assetDirectory, study.selectedSource.fileName);
        expect(sourceBytes.byteLength, study.title).toBeLessThanOrEqual(256 * 1024);
        expect(readJpegHeaderSize(sourceBytes), study.title).toEqual({ width: 896, height: 896 });
        const sourceHash = createHash("sha256").update(sourceBytes).digest("hex");
        expect(sourceHash, study.title).toBe(study.selectedSource.sha256);
        sourceHashes.add(sourceHash);

        const thumbnailBytes = await readAsset(
          `${group.assetDirectory}/thumbnails`,
          study.selectedSource.thumbnail.fileName,
        );
        expect(thumbnailBytes.byteLength, `${study.title} thumbnail`).toBeLessThanOrEqual(16 * 1024);
        expect(readJpegHeaderSize(thumbnailBytes), `${study.title} thumbnail`).toEqual({
          width: 128,
          height: 128,
        });
        const thumbnailHash = createHash("sha256").update(thumbnailBytes).digest("hex");
        expect(thumbnailHash, `${study.title} thumbnail`).toBe(study.selectedSource.thumbnail.sha256);
        thumbnailHashes.add(thumbnailHash);
      }
    }
    expect(studyCount).toBe(234);
    expect(sourceHashes.size).toBe(studyCount);
    expect(thumbnailHashes.size).toBe(studyCount);
    expect(codeNativeReplacementCount).toBe(52);
    expect(directCodeNativeCount).toBe(182);
    expect(canonicalOnlyCount).toBe(0);
  }, 60_000);

  it("keeps every normalized full source authoring-only without conflating generation workflows", () => {
    const studies = groups.flatMap((group) => [...group.studies]) as readonly BoundStudy[];
    expect(studies.length).toBeGreaterThan(0);
    const workflows = new Map<string, number>();
    for (const study of studies) {
      const isDirectCodeNative =
        study.selectedSource.sourceHistory?.some((step) => step.kind === "direct-code-native-render") ??
        false;
      expect(study.selectedSource.generatedOn).toBe(
        isDirectCodeNative
          ? study.artBrief.badgeKey.startsWith("video-games-played/")
            ? "2026-08-27"
            : "2026-08-26"
          : "2026-08-25",
      );
      workflows.set(
        study.selectedSource.provenance.generationWorkflow,
        (workflows.get(study.selectedSource.provenance.generationWorkflow) ?? 0) + 1,
      );
      expect(study.selectedSource.provenance.normalization.recipe).toEqual({
        id: "catalogue-study-jpeg",
        revision: 1,
      });
    }
    expect(workflows.get("openai-image-generation-via-codex-imagegen") ?? 0).toBe(0);
    expect(workflows.get("deterministic-code-native-enamel-geometry")).toBe(studies.length);
    expect([...workflows.values()].reduce((total, count) => total + count, 0)).toBe(studies.length);
  });
});

async function readAsset(directory: string, fileName: string): Promise<Uint8Array> {
  return readFile(fileURLToPath(new URL(`../assets/${directory}/${fileName}`, import.meta.url)));
}

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
