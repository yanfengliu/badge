import type { CompiledManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe";
import { compileManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe";
import type { PlannedCatalogueStudyProject } from "./types";

export interface BookPrimaryPrompt {
  readonly definitionId: string;
  readonly compiled: CompiledManufacturableCandidatePrompt;
}

export function buildBookPrimaryPrompts(
  campaign: readonly PlannedCatalogueStudyProject[],
): readonly BookPrimaryPrompt[] {
  return campaign.map((project) => ({
    definitionId: project.definitionId,
    compiled: compileManufacturableCandidatePrompt(project.brief, project.candidates[0]),
  }));
}
