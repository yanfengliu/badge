import {
  artStyleLibrary,
  buildCommonAchievementProject,
  commonAchievementIdeas,
  compileManufacturableCandidatePrompt,
  findCommonAchievementCandidate,
  nationalParkCampaign,
  usNationalParks,
  type ArtStyleDefinition,
  type CandidateRole,
  type CommonAchievementIdea,
  type NationalParkAuthoringRecord,
} from "@badge/catalogue-authoring";

import { matchesQuery, requireStyle } from "./art-direction-library-utils";
import { nationalParkMediaResolver, type NationalParkMediaResolver } from "./national-park-source-urls";

export function filterNationalParks(query: string): readonly NationalParkAuthoringRecord[] {
  return usNationalParks.filter((park) =>
    matchesQuery(query, [
      park.shortName,
      park.officialName,
      park.locationLabel,
      park.npsSiteCode,
      ...park.aliases,
      ...park.artBrief.themeCues,
    ]),
  );
}

export function filterCommonIdeas(query: string): readonly CommonAchievementIdea[] {
  return commonAchievementIdeas.filter((idea) =>
    matchesQuery(query, [idea.title, idea.criterion, idea.category, ...idea.themeCues]),
  );
}

export function filterArtStyles(query: string): readonly ArtStyleDefinition[] {
  return artStyleLibrary.filter((style) =>
    matchesQuery(query, [style.label, style.family, style.summary, ...style.tags]),
  );
}

export function formatDirectionCount(count: number): string {
  return `${count} ${count === 1 ? "direction" : "directions"}`;
}

export function compileArtDirectionPrompt(
  input: {
    kind: "park" | "idea";
    id: string;
    role: CandidateRole;
    styleId?: string | null;
  },
  mediaResolver: NationalParkMediaResolver = nationalParkMediaResolver,
) {
  const source =
    input.kind === "park" ? parkPromptSource(input.id, input.role) : ideaPromptSource(input.id, input.role);
  const recommendedStyle = requireStyle(source.candidate.styleId);
  const style = requireStyle(input.styleId ?? recommendedStyle.id);
  const candidate = { ...source.candidate, styleId: style.id };
  return {
    subjectTitle: source.brief.title,
    subjectCriterion: source.brief.criterion,
    role: input.role,
    recommendedStyle,
    style,
    compiled: compileManufacturableCandidatePrompt(source.brief, candidate),
    promptStatus: "manufacturable-candidate" as const,
    sourceStudyStatus: input.kind === "park" ? "selected-source-study" : "idea-only",
    sourceStudyMedia: source.park ? mediaResolver.sourceStudy(source.park.selectedSource.fileName) : null,
    sourceStudyDescription: source.park ? source.park.selectedSource.accessibleDescription : null,
    selectedCandidateKey: source.park ? source.park.selectedSource.selectedCandidateKey : null,
  };
}

function parkPromptSource(slug: string, role: CandidateRole) {
  const park = usNationalParks.find((item) => item.slug === slug);
  const project = nationalParkCampaign.find((item) => item.brief.badgeKey === `us-national-parks/${slug}`);
  const candidate = project?.candidates.find((item) => item.role === role);
  if (!park || !candidate) throw new Error(`National park authoring project ${slug} is unavailable.`);
  return { brief: park.artBrief, candidate, park };
}

function ideaPromptSource(id: string, role: CandidateRole) {
  const idea = commonAchievementIdeas.find((item) => item.id === id);
  if (!idea) throw new Error(`Common achievement idea ${id} is unavailable.`);
  const project = buildCommonAchievementProject(idea);
  return {
    brief: project.brief,
    candidate: findCommonAchievementCandidate(project, role),
    park: null,
  };
}
