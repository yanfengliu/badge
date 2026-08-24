import type { BadgeArtBrief, CandidatePlan, CandidateRole, CommonAchievementIdea } from "./types";

const roles = ["landmark-witness", "emblematic-metaphor", "terrain-memory"] as const;
const layouts = ["layered-horizon", "central-iconic", "map-field"] as const;
const viewpoints = ["eye-level", "elevated", "aerial"] as const;
const depths = ["deep", "layered", "shallow"] as const;
const safeZones = [0.72, 0.66, 0.78] as const;
const narrativeBeats = [
  "Recognition first: make the achievement legible through one concrete lived moment.",
  "Emotion first: let one restrained metaphor carry the personal meaning.",
  "Movement first: let sequence, rhythm, or remembered progress lead the eye.",
] as const;

export interface CommonAchievementAuthoringProject {
  brief: BadgeArtBrief;
  candidates: readonly [CandidatePlan, CandidatePlan, CandidatePlan];
}

export function buildCommonAchievementProject(
  idea: Readonly<CommonAchievementIdea>,
): CommonAchievementAuthoringProject {
  const brief: BadgeArtBrief = {
    schemaVersion: 1,
    badgeKey: `common-idea/${idea.id}`,
    title: idea.title,
    criterion: idea.criterion,
    description: `Preserve the personal meaning of ${idea.title.toLowerCase()} through concrete, memorable imagery.`,
    themeCues: idea.themeCues,
    requiredMotifs: [idea.themeCues[0]],
    excludedMotifs: ["generic trophy", "leaderboard imagery", "confetti"],
    moodCues: ["quiet pride", "warm recollection", "specific rather than generic"],
    paletteCues: ["warm mineral neutrals", "controlled darks", "one luminous accent"],
  };
  return {
    brief,
    candidates: [candidateFor(idea, 0), candidateFor(idea, 1), candidateFor(idea, 2)],
  };
}

export function findCommonAchievementCandidate(
  project: Readonly<CommonAchievementAuthoringProject>,
  role: CandidateRole,
): CandidatePlan {
  const candidate = project.candidates.find((entry) => entry.role === role);
  if (!candidate) {
    throw new Error(
      `Common achievement ${project.brief.badgeKey} has no ${role} candidate; restore all three canonical authoring roles.`,
    );
  }
  return candidate;
}

function candidateFor(idea: Readonly<CommonAchievementIdea>, index: 0 | 1 | 2): CandidatePlan {
  const role = roles[index];
  return {
    schemaVersion: 1,
    candidateKey: `${idea.id}:${role}`,
    role,
    styleId: idea.suggestedStyleIds[index],
    composition: {
      layout: layouts[index],
      viewpoint: viewpoints[index],
      depth: depths[index],
      essentialSafeZone: safeZones[index],
      focalSubjects: [idea.themeCues[index]],
      supportingElements: idea.themeCues.filter((_, cueIndex) => cueIndex !== index),
      narrativeBeat: narrativeBeats[index],
    },
  };
}
