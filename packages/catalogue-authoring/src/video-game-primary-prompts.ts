import type { CompiledManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe";
import { compileManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe";
import type { PlannedCatalogueStudyProject } from "./types";

export interface VideoGamePrimaryPrompt {
  readonly definitionId: string;
  readonly compiled: CompiledManufacturableCandidatePrompt;
}

export function buildVideoGamePrimaryPrompts(
  campaign: readonly PlannedCatalogueStudyProject[],
): readonly VideoGamePrimaryPrompt[] {
  return campaign.map((project) => ({
    definitionId: project.definitionId,
    compiled: compileManufacturableCandidatePrompt(project.brief, project.candidates[0]),
  }));
}
