import type { CandidatePlan, CatalogueAuthoringProject, NationalParkAuthoringRecord } from "./types";
import { usNationalParks } from "./us-national-parks";

function candidate(park: NationalParkAuthoringRecord, index: 0 | 1 | 2): CandidatePlan {
  const role = (["landmark-witness", "emblematic-metaphor", "terrain-memory"] as const)[index];
  const layouts = ["layered-horizon", "central-iconic", "map-field"] as const;
  const viewpoints = ["eye-level", "elevated", "aerial"] as const;
  const depths = ["deep", "layered", "shallow"] as const;
  return {
    schemaVersion: 1,
    candidateKey: `${park.slug}:${role}`,
    role,
    styleId: park.candidateStyles[index],
    composition: {
      layout: layouts[index],
      viewpoint: viewpoints[index],
      depth: depths[index],
      essentialSafeZone: index === 0 ? 0.72 : index === 1 ? 0.66 : 0.78,
      focalSubjects: [park.artBrief.themeCues[index]],
      supportingElements: park.artBrief.themeCues.filter((_, cueIndex) => cueIndex !== index),
      narrativeBeat:
        index === 0
          ? "Recognition first: the place should be unmistakable before the viewer notices the medium."
          : index === 1
            ? "Emotion first: one memorable metaphor should carry the achievement without becoming a logo."
            : "Movement first: terrain, ecology, or a remembered route should lead the eye through the place.",
    },
  };
}

export const nationalParkCampaign: readonly CatalogueAuthoringProject[] = usNationalParks.map((park) => ({
  projectId: `park-project/${park.slug}`,
  brief: park.artBrief,
  candidates: [candidate(park, 0), candidate(park, 1), candidate(park, 2)],
  selectedCandidateKey: park.selectedSource.selectedCandidateKey,
  status: "selected-source-study",
}));
