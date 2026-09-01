import { compileManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe";
import { catalogueQuotationBankForDefinition } from "@badge/catalogue-quotation-data";
import type { CompiledManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe";
import type {
  BadgeArtBrief,
  CandidatePlan,
  CatalogueStudyRecord,
  HistoricQuotationId,
  HistoricQuotationRecord,
  PlannedCatalogueStudyProject,
} from "./types";

export interface EducationMilestoneAuthoringRecord extends CatalogueStudyRecord {
  collectionId: "life-milestones";
  accessibleDescription: string;
  defaultQuotationId: HistoricQuotationId;
}

export interface EducationMilestonePrimaryPrompt {
  definitionId: string;
  compiled: CompiledManufacturableCandidatePrompt;
}

type SourceCheckedHistoricQuotation = HistoricQuotationRecord & {
  personWikipediaUrl: string;
  sourceCitation: string;
  checkedAt: typeof CHECKED_AT;
};

interface EducationMilestoneSeed {
  definitionId: string;
  slug: string;
  title: string;
  criterion: string;
  contextLabel: string;
  aliases: readonly [string, string, string, ...string[]];
  accessibleDescription: string;
  description: string;
  themeCues: BadgeArtBrief["themeCues"];
  requiredMotifs: readonly [string, string, string, string];
  excludedMotifs: readonly string[];
  moodCues: BadgeArtBrief["moodCues"];
  paletteCues: BadgeArtBrief["paletteCues"];
  candidateStyles: readonly [string, string, string];
  artBriefProvenance: EducationMilestoneAuthoringRecord["artBriefProvenance"];
}

const MUELLER_TOWER_SOURCE_URL = "https://historicbuildings.unl.edu/building.php?b=91";
const LOVE_LIBRARY_SOURCE_URL = "https://archives-spec.unl.edu/pages-to-paths/unl-library-architecture";
const CHECKED_AT = "2026-08-25" as const;

export const educationMilestoneQuotationBank: readonly SourceCheckedHistoricQuotation[] = [
  {
    quotationId: "historic-quotation/frederick-douglass-no-struggle-1857",
    text: "If there is no struggle, there is no progress.",
    personName: "Frederick Douglass",
    sourceTitle: "West India Emancipation address, August 3, 1857",
    sourceCitation:
      "West India Emancipation speech, Canandaigua, New York, August 3, 1857; U.S. National Archives Documented Rights exhibit.",
    sourceUrl: "https://www.archives.gov/exhibits/documented-rights/exhibit/section2/index.html",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Frederick_Douglass",
    checkedAt: CHECKED_AT,
  },
  {
    quotationId: "historic-quotation/theodore-roosevelt-hard-to-fail-1899",
    text: "It is hard to fail, but it is worse never to have tried to succeed.",
    personName: "Theodore Roosevelt",
    sourceTitle: "The Strenuous Life, Hamilton Club speech, April 10, 1899",
    sourceCitation:
      "The Strenuous Life, address before the Hamilton Club, Chicago, April 10, 1899; Project Gutenberg eBook #58821.",
    sourceUrl: "https://www.gutenberg.org/files/58821/58821-h/58821-h.htm",
    personWikipediaUrl: "https://en.wikipedia.org/wiki/Theodore_Roosevelt",
    checkedAt: CHECKED_AT,
  },
] as const;

const educationMilestoneSeeds: readonly EducationMilestoneSeed[] = [
  {
    definitionId: "finished-masters-degree",
    slug: "masters-degree",
    title: "Master's degree",
    criterion: "Complete a master's degree",
    contextLabel: "Graduate education · advanced degree",
    aliases: [
      "master's degree",
      "master’s degree",
      "master degree",
      "graduate degree",
      "postgraduate degree",
      "MA",
      "MS",
      "MSc",
      "MBA",
    ],
    accessibleDescription:
      "Four broad underglaze-style forms show a stepped path leading through an open doorway toward a rising sun and a calm horizon.",
    description:
      "Honor the sustained study behind a master's degree with a spare threshold-and-horizon composition.",
    themeCues: [
      "advanced study completed through sustained effort",
      "a threshold crossed after a long ascent",
      "knowledge opening into a wider horizon",
    ],
    requiredMotifs: [
      "one monumental open doorway",
      "one broad three-step staircase treated as a single primary form",
      "one rising sun disk beyond the threshold",
      "one continuous horizon field",
    ],
    excludedMotifs: [
      "graduation cap, rolled diploma, trophy, or confetti",
      "school seal, crest, logo, wordmark, or monogram",
      "bookshelf, equations, tiny academic tools, or classroom microdetail",
      "words, letters, numerals, signs, or typography",
      "photorealistic people or generic stock celebration imagery",
    ],
    moodCues: ["earned confidence", "patient ascent", "a future newly opened"],
    paletteCues: ["deep cobalt", "warm clay", "sunlit ochre", "quiet cream"],
    candidateStyles: ["ceramic-underglaze", "woven-tapestry-field", "relief-blockprint"],
    artBriefProvenance: {
      kind: "curated-editorial",
      note: "The threshold, ascent, and horizon are original editorial metaphors for advanced study rather than claims about a specific institution or degree program.",
      sourceUrls: [],
    },
  },
  {
    definitionId: "earned-unl-degree",
    slug: "university-nebraska-lincoln-degree",
    title: "University of Nebraska–Lincoln degree",
    criterion: "Complete a degree from the University of Nebraska–Lincoln",
    contextLabel: "Lincoln, Nebraska · higher education",
    aliases: [
      "UNL degree",
      "University of Nebraska Lincoln degree",
      "Nebraska degree",
      "University of Nebraska–Lincoln",
      "Lincoln campus degree",
    ],
    accessibleDescription:
      "Large stained-glass-style fields pair Mueller Tower with Love Library's white cupola across a broad campus mall and prairie sky.",
    description:
      "Remember a University of Nebraska–Lincoln degree through two campus landmarks joined by the mall, without using university branding.",
    themeCues: [
      "Mueller Tower's tall octagonal landmark silhouette",
      "Love Library's dignified brick-and-limestone mass and white cupola",
      "the campus mall connecting tower and library beneath an open prairie sky",
    ],
    requiredMotifs: [
      "one tall octagonal limestone silhouette of Mueller Tower",
      "one low brick-and-limestone mass representing Love Library",
      "one broad white cupola above Love Library",
      "one continuous campus mall path joining the landmarks",
    ],
    excludedMotifs: [
      "university logo, seal, or wordmark",
      "mascot or athletic branding",
      "the letter N in any form",
      "graduation cap, rolled diploma, trophy, or confetti",
      "words, letters, numerals, signs, or typography",
      "tiny corn ornament, individual bells, windows, bricks, or architectural microdetail",
    ],
    moodCues: ["dignified accomplishment", "campus memory", "open-hearted prairie light"],
    paletteCues: ["limestone cream", "warm campus brick", "prairie gold", "deep glass blue"],
    candidateStyles: ["stained-glass-field", "wood-marquetry-landscape", "cut-paper-strata"],
    artBriefProvenance: {
      kind: "curated-editorial",
      note: "Official UNL architecture sources establish Mueller Tower as an 84-foot octagonal landmark on the mall from Love Library and describe Love Library's brick-and-limestone design and distinctive white cupola; the simplified composition is original art direction.",
      sourceUrls: [MUELLER_TOWER_SOURCE_URL, LOVE_LIBRARY_SOURCE_URL],
    },
  },
] as const;

const roles = ["landmark-witness", "emblematic-metaphor", "terrain-memory"] as const;
const layouts = ["central-iconic", "radial", "diagonal-journey"] as const;
const viewpoints = ["low", "elevated", "eye-level"] as const;
const depths = ["shallow", "layered", "flat"] as const;
const safeZones = [0.76, 0.7, 0.78] as const;
const narrativeBeats = [
  "Recognition first: hold the milestone in one bold landmark relationship.",
  "Meaning first: turn completion into a restrained emblematic relationship.",
  "Memory first: let the route through four large forms carry the achievement.",
] as const;

export const educationMilestoneAuthoringRecords: readonly EducationMilestoneAuthoringRecord[] =
  educationMilestoneSeeds.map(defineEducationMilestone);

export const educationMilestoneCampaign: readonly PlannedCatalogueStudyProject[] =
  educationMilestoneAuthoringRecords.map((record) => {
    const candidates = buildCandidates(record);
    return {
      projectId: `education-milestone/${record.definitionId}`,
      definitionId: record.definitionId,
      brief: record.artBrief,
      candidates,
      primaryCandidateKey: candidates[0].candidateKey,
      status: "source-study-planned",
    };
  });

export const educationMilestonePrimaryPrompts: readonly EducationMilestonePrimaryPrompt[] =
  educationMilestoneCampaign.map((project) => ({
    definitionId: project.definitionId,
    compiled: compileManufacturableCandidatePrompt(project.brief, project.candidates[0]),
  }));

function defineEducationMilestone(seed: Readonly<EducationMilestoneSeed>): EducationMilestoneAuthoringRecord {
  const artBrief: BadgeArtBrief = {
    schemaVersion: 1,
    badgeKey: `life-milestones/${seed.slug}`,
    title: seed.title,
    criterion: seed.criterion,
    description: seed.description,
    themeCues: seed.themeCues,
    requiredMotifs: seed.requiredMotifs,
    excludedMotifs: seed.excludedMotifs,
    moodCues: seed.moodCues,
    paletteCues: seed.paletteCues,
  };
  return {
    definitionId: seed.definitionId,
    slug: seed.slug,
    title: seed.title,
    criterion: seed.criterion,
    contextLabel: seed.contextLabel,
    aliases: seed.aliases,
    collectionId: "life-milestones",
    accessibleDescription: seed.accessibleDescription,
    artBrief,
    candidateStyles: seed.candidateStyles,
    artBriefProvenance: seed.artBriefProvenance,
    defaultQuotationId: catalogueQuotationBankForDefinition(seed.definitionId)[0].quotationId,
  };
}

function buildCandidates(
  record: Readonly<EducationMilestoneAuthoringRecord>,
): readonly [CandidatePlan, CandidatePlan, CandidatePlan] {
  return [candidateFor(record, 0), candidateFor(record, 1), candidateFor(record, 2)];
}

function candidateFor(record: Readonly<EducationMilestoneAuthoringRecord>, index: 0 | 1 | 2): CandidatePlan {
  const role = roles[index];
  return {
    schemaVersion: 1,
    candidateKey: `${record.definitionId}:${role}`,
    role,
    styleId: record.candidateStyles[index],
    composition: {
      layout: layouts[index],
      viewpoint: viewpoints[index],
      depth: depths[index],
      essentialSafeZone: safeZones[index],
      focalSubjects: [record.artBrief.requiredMotifs[index]],
      supportingElements: record.artBrief.requiredMotifs.filter((_, motifIndex) => motifIndex !== index),
      narrativeBeat: narrativeBeats[index],
    },
  };
}
