import { findArtStyle } from "./art-styles";
import type { SelectedUsStateStudy } from "./types";
import {
  usStatePromptHashes,
  usStateSourceHashes,
  usStateThumbnailHashes,
} from "./us-state-selected-source-hashes";
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
      generatedOn: "2026-08-25",
      promptRecipe: { id: "badge-source-art", revision: 1 },
      selectedCandidateKey: primary.candidateKey,
      accessibleDescription: `An original ${style.label.toLowerCase()} source study showing ${state.artBrief.requiredMotifs[0]}.`,
      provenance: {
        generationWorkflow: "openai-image-generation-via-codex-imagegen",
        contentOrigin: "trained-algorithm",
        promptBinding: "recorded-exact-canonical-prompt",
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
