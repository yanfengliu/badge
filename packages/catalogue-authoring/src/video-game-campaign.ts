import type { VideoGameAuthoringRecord } from "./video-game-record";
import type { CandidatePlan, PlannedCatalogueStudyProject } from "./types";

const roles = ["landmark-witness", "emblematic-metaphor", "terrain-memory"] as const;
const layouts = ["layered-horizon", "central-iconic", "diagonal-journey"] as const;
const viewpoints = ["eye-level", "elevated", "aerial"] as const;
const depths = ["layered", "shallow", "flat"] as const;
const safeZones = [0.78, 0.74, 0.8] as const;
const narrativeBeats = [
  "Place first: let the environmental form establish a distinct atmosphere while every franchise-specific subject stays absent.",
  "Mechanic first: express play as a generic geometric relationship with one immediate focal action and no interface reconstruction.",
  "Memory first: let the journey contour lead through broad forms that remain readable at badge scale without recreating a scene.",
] as const;

function candidateFor(game: VideoGameAuthoringRecord, index: 0 | 1 | 2): CandidatePlan {
  const role = roles[index];
  return {
    schemaVersion: 1,
    candidateKey: `${game.definitionId}:${role}`,
    role,
    styleId: game.candidateStyles[index],
    composition: {
      layout: layouts[index],
      viewpoint: viewpoints[index],
      depth: depths[index],
      essentialSafeZone: safeZones[index],
      focalSubjects: [game.artBrief.themeCues[index]],
      supportingElements: game.artBrief.themeCues.filter((_, cueIndex) => cueIndex !== index),
      narrativeBeat: narrativeBeats[index],
    },
  };
}

export function buildVideoGameAuthoringCampaign(
  games: readonly VideoGameAuthoringRecord[],
): readonly PlannedCatalogueStudyProject[] {
  return games.map((game) => ({
    projectId: `video-game-project/${game.slug}`,
    definitionId: game.definitionId,
    brief: game.artBrief,
    candidates: [candidateFor(game, 0), candidateFor(game, 1), candidateFor(game, 2)],
    primaryCandidateKey: `${game.definitionId}:landmark-witness`,
    status: "source-study-planned",
  }));
}
