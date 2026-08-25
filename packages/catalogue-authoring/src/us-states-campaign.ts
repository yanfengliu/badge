import type { CandidatePlan, PlannedCatalogueStudyProject, UsStateAuthoringRecord } from "./types";
import { usStates } from "./us-states";

const roles = ["landmark-witness", "emblematic-metaphor", "terrain-memory"] as const;
const layouts = ["layered-horizon", "central-iconic", "map-field"] as const;
const viewpoints = ["eye-level", "elevated", "aerial"] as const;
const depths = ["deep", "layered", "shallow"] as const;
const safeZones = [0.72, 0.66, 0.78] as const;
const narrativeBeats = [
  "Recognition first: make the state unmistakable through its specific landmark and landscape.",
  "Meaning first: use the documented state-specific symbol as a restrained visual metaphor, never a logo.",
  "Movement first: let the state's terrain and ecology lead the eye through remembered travel.",
] as const;

function candidateFor(state: UsStateAuthoringRecord, index: 0 | 1 | 2): CandidatePlan {
  const role = roles[index];
  return {
    schemaVersion: 1,
    candidateKey: `${state.definitionId}:${role}`,
    role,
    styleId: state.candidateStyles[index],
    composition: {
      layout: layouts[index],
      viewpoint: viewpoints[index],
      depth: depths[index],
      essentialSafeZone: safeZones[index],
      focalSubjects: [state.artBrief.themeCues[index]],
      supportingElements: state.artBrief.themeCues.filter((_, cueIndex) => cueIndex !== index),
      narrativeBeat: narrativeBeats[index],
    },
  };
}

export const usStateCampaign: readonly PlannedCatalogueStudyProject[] = usStates.map((state) => ({
  projectId: `state-project/${state.censusStateFips}`,
  definitionId: state.definitionId,
  brief: state.artBrief,
  candidates: [candidateFor(state, 0), candidateFor(state, 1), candidateFor(state, 2)],
  primaryCandidateKey: `${state.definitionId}:landmark-witness`,
  status: "source-study-planned",
}));
