import { findArtStyle } from "./art-styles";
import { CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF } from "./code-native-art-recipe-types";
import { landscapeManufacturingLanguageForStyle } from "./code-native-construction-language";
import type { SelectedUsStateStudy } from "./types";
import {
  usStatePromptHashes,
  usStateSourceHashes,
  usStateThumbnailHashes,
} from "./us-state-selected-source-hashes";
import { usStateCodeNativeLineage } from "./us-state-code-native-lineage";
import { usStateCampaign } from "./us-states-campaign";
import { usStates } from "./us-states";

const projectsByDefinitionId = new Map(usStateCampaign.map((project) => [project.definitionId, project]));

export const selectedUsStateStudies: readonly SelectedUsStateStudy[] = usStates.map((state) => {
  const project = projectsByDefinitionId.get(state.definitionId);
  const primary = project?.candidates.find(
    (candidate) => candidate.candidateKey === project.primaryCandidateKey,
  );
  const style = primary ? findArtStyle(primary.styleId) : undefined;
  if (!project || !primary || !style) {
    throw new Error(
      `Selected U.S. state study ${state.name} has no valid primary prompt candidate; repair the campaign before binding generated art.`,
    );
  }
  const codeNativeLineage = usStateCodeNativeLineage[state.slug];
  const currentPromptSha256 = usStatePromptHashes[state.slug];
  if (!codeNativeLineage || !currentPromptSha256) {
    throw new Error(
      `Selected U.S. state study ${state.name} has no code-native replacement lineage; run the integrity writer against the reviewed predecessor before binding replacement art.`,
    );
  }
  if (codeNativeLineage.canonicalPromptSha256 !== currentPromptSha256) {
    throw new Error(
      `Selected U.S. state study ${state.name} changed its canonical prompt while binding replacement art; preserve the original prompt association.`,
    );
  }
  return {
    ...state,
    selectedSource: {
      status: "selected-source-study",
      fileName: `${state.slug}.jpg`,
      mimeType: "image/jpeg",
      width: 896,
      height: 896,
      sha256: usStateSourceHashes[state.slug] ?? `pending:${state.slug}`,
      promptSha256: usStatePromptHashes[state.slug] ?? `pending:${state.slug}`,
      generatedOn: "2026-08-26",
      promptRecipe: { id: "badge-source-art", revision: 1 },
      sourceHistory: [
        {
          kind: "initial-generation",
          promptRecipe: { id: "badge-source-art", revision: 1 },
          promptSha256: codeNativeLineage.canonicalPromptSha256,
          outputSourceSha256: codeNativeLineage.canonicalSourceSha256,
        },
        {
          kind: "code-native-replacement",
          renderRecipe: CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
          designBriefSha256: codeNativeLineage.designBriefSha256,
          rendererImplementationSha256: codeNativeLineage.rendererImplementationSha256,
          supersededCanonicalSourceSha256: codeNativeLineage.canonicalSourceSha256,
        },
      ],
      selectedCandidateKey: primary.candidateKey,
      accessibleDescription: `An original source study using ${landscapeManufacturingLanguageForStyle(primary.styleId)}, showing ${state.artBrief.requiredMotifs[0]}.`,
      provenance: {
        generationWorkflow: "deterministic-code-native-enamel-geometry",
        contentOrigin: "code-authored-geometry",
        promptBinding: "recorded-canonical-generation-and-code-native-design",
        rightsBasis: "owner-directed-original-generation-for-badge",
        normalization: {
          recipe: { id: "catalogue-study-jpeg", revision: 1 },
          tool: "system-drawing",
          targetWidth: 896,
          targetHeight: 896,
          qualityLadder: [88, 84, 80, 76, 72, 68, 64, 60],
          maximumBytes: 262144,
        },
      },
      thumbnail: {
        fileName: `${state.slug}.jpg`,
        mimeType: "image/jpeg",
        width: 128,
        height: 128,
        sha256: usStateThumbnailHashes[state.slug] ?? `pending:${state.slug}`,
        derivationRecipe: { id: "catalogue-list-thumbnail", revision: 1 },
      },
    },
  };
});
