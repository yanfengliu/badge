export type CandidateRole = "landmark-witness" | "emblematic-metaphor" | "terrain-memory";

export type CompositionLayout =
  | "central-iconic"
  | "asymmetric-landscape"
  | "layered-horizon"
  | "diagonal-journey"
  | "radial"
  | "all-over-pattern"
  | "map-field";

export type CompositionViewpoint = "eye-level" | "low" | "elevated" | "aerial" | "macro";

export interface ArtStyleDefinition {
  id: string;
  revision: 1;
  label: string;
  family:
    | "paint"
    | "print"
    | "ink"
    | "pixel"
    | "fiber"
    | "paper"
    | "cartographic"
    | "mosaic"
    | "geometric"
    | "ceramic"
    | "wood";
  summary: string;
  promptDirectives: readonly [string, string, string, ...string[]];
  tags: readonly string[];
}

export interface BadgeArtBrief {
  schemaVersion: 1;
  badgeKey: string;
  title: string;
  criterion: string;
  description: string;
  themeCues: readonly [string, string, string, ...string[]];
  requiredMotifs: readonly [string, ...string[]];
  excludedMotifs: readonly string[];
  moodCues: readonly [string, string, ...string[]];
  paletteCues: readonly [string, string, string, ...string[]];
}

export interface CandidatePlan {
  schemaVersion: 1;
  candidateKey: string;
  role: CandidateRole;
  styleId: string;
  composition: {
    layout: CompositionLayout;
    viewpoint: CompositionViewpoint;
    depth: "flat" | "shallow" | "layered" | "deep";
    essentialSafeZone: number;
    focalSubjects: readonly [string, ...string[]];
    supportingElements: readonly string[];
    narrativeBeat: string;
  };
}

export interface CatalogueAuthoringProject {
  projectId: string;
  brief: BadgeArtBrief;
  candidates: readonly [CandidatePlan, CandidatePlan, CandidatePlan];
  selectedCandidateKey: string;
  status: "selected-source-study";
}

export interface CatalogueEdition {
  schemaVersion: 1;
  catalogueId: string;
  edition: string;
  declaredCount: number;
  source: {
    authority: string;
    url: string;
    section: string;
    pageLastUpdated: string;
    retrievedAt: string;
    scope: string;
  };
}

export type HistoricQuotationId = `historic-quotation/${string}`;

export interface HistoricQuotationRecord {
  quotationId: HistoricQuotationId;
  text: string;
  personName: string;
  sourceTitle: string;
  sourceUrl: string;
  personWikipediaUrl?: string;
}

export interface CatalogueStudyRecord {
  definitionId: string;
  slug: string;
  title: string;
  criterion: string;
  contextLabel: string;
  aliases: readonly string[];
  artBrief: BadgeArtBrief;
  candidateStyles: readonly [string, string, string];
  artBriefProvenance: {
    kind: "curated-editorial";
    note: string;
    sourceUrls: readonly string[];
  };
  defaultQuotationId?: HistoricQuotationId;
}

export interface PlannedCatalogueStudyProject {
  projectId: string;
  definitionId: string;
  brief: BadgeArtBrief;
  candidates: readonly [CandidatePlan, CandidatePlan, CandidatePlan];
  primaryCandidateKey: string;
  status: "source-study-planned";
}

export interface SelectedSourceStudy {
  status: "selected-source-study";
  fileName: string;
  mimeType: "image/jpeg";
  width: 896;
  height: 896;
  sha256: string;
  promptSha256: string;
  generatedOn: string;
  promptRecipe: { id: "badge-source-art"; revision: 1 };
  selectedCandidateKey: string;
  accessibleDescription: string;
  provenance: {
    generationWorkflow: "openai-image-generation-via-codex-imagegen";
    contentOrigin: "trained-algorithm";
    promptBinding: "recorded-exact-canonical-prompt";
    rightsBasis: "owner-directed-original-generation-for-badge";
    normalization: {
      recipe: { id: "national-park-study-jpeg" | "catalogue-study-jpeg"; revision: 1 };
      tool: "system-drawing";
      targetWidth: 896;
      targetHeight: 896;
      qualityLadder: readonly [88, 84, 80, 76, 72, 68, 64, 60];
      maximumBytes: 262144;
    };
  };
  thumbnail: {
    fileName: string;
    mimeType: "image/jpeg";
    width: 128;
    height: 128;
    sha256: string;
    derivationRecipe: { id: "catalogue-list-thumbnail"; revision: 1 };
  };
}

export interface NationalParkAuthoringRecord {
  definitionId: string;
  slug: string;
  officialName: string;
  shortName: string;
  criterion: string;
  locationLabel: string;
  npsSiteCode: string;
  npsUrl: string;
  aliases: readonly string[];
  artBrief: BadgeArtBrief;
  candidateStyles: readonly [string, string, string];
  selectedSource: SelectedSourceStudy;
}

export interface UsStateAuthoringRecord extends CatalogueStudyRecord {
  defaultQuotationId: HistoricQuotationId;
  censusStateFips: string;
  postalCode: string;
  name: string;
}

export type SelectedUsStateStudy = UsStateAuthoringRecord & {
  selectedSource: SelectedSourceStudy;
};

export interface CommonAchievementIdea {
  id: string;
  category: "adventure" | "learning" | "life" | "creative" | "wellbeing" | "community" | "craft" | "nature";
  title: string;
  criterion: string;
  themeCues: readonly [string, string, string, ...string[]];
  suggestedStyleIds: readonly [string, string, string];
}
