import type { BookAuthoringRecord } from "./book-authoring-record";
import type { CandidatePlan, PlannedCatalogueStudyProject } from "./types";

const roles = ["landmark-witness", "emblematic-metaphor", "terrain-memory"] as const;
const layouts = ["central-iconic", "radial", "diagonal-journey"] as const;
const viewpoints = ["eye-level", "elevated", "aerial"] as const;
const depths = ["shallow", "layered", "flat"] as const;
const safeZones = [0.78, 0.72, 0.8] as const;
const narrativeBeats = [
  "Recognition first: use the three original forms and their central relationship to evoke this work without borrowed edition imagery.",
  "Meaning first: let the second form carry a restrained metaphor while the remaining masses preserve miniature clarity.",
  "Memory first: let the third form lead one broad route through the composition without scenes that need magnification.",
] as const;

function candidateFor(book: BookAuthoringRecord, index: 0 | 1 | 2): CandidatePlan {
  const role = roles[index];
  return {
    schemaVersion: 1,
    candidateKey: `${book.definitionId}:${role}`,
    role,
    styleId: book.candidateStyles[index],
    composition: {
      layout: layouts[index],
      viewpoint: viewpoints[index],
      depth: depths[index],
      essentialSafeZone: safeZones[index],
      focalSubjects: [book.artBrief.themeCues[index]],
      supportingElements: book.artBrief.themeCues.filter((_, cueIndex) => cueIndex !== index),
      narrativeBeat: narrativeBeats[index],
    },
  };
}

export function buildBookAuthoringCampaign(
  books: readonly BookAuthoringRecord[],
): readonly PlannedCatalogueStudyProject[] {
  return books.map((book) => ({
    projectId: `book-project/${book.slug}`,
    definitionId: book.definitionId,
    brief: book.artBrief,
    candidates: [candidateFor(book, 0), candidateFor(book, 1), candidateFor(book, 2)],
    primaryCandidateKey: `${book.definitionId}:landmark-witness`,
    status: "source-study-planned",
  }));
}
