import { findArtStyle } from "./art-styles";
import {
  compileManufacturableCandidatePrompt,
  manufacturingTreatmentByFamily,
  SMALL_BADGE_MANUFACTURING_LIMITS,
} from "./manufacturable-prompt-recipe";
import type { CompiledManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe";
import { sanFranciscoMichelinRestaurantSeeds } from "./michelin-restaurants-bay-area";
import { washingtonDcMichelinRestaurantSeeds } from "./michelin-restaurants-dc";
import { newYorkCityMichelinRestaurantSeeds } from "./michelin-restaurants-nyc";
import type { MichelinRestaurantResearchSeed, RestaurantVisualCueType } from "./michelin-restaurant-seed";
import type {
  BadgeArtBrief,
  CandidatePlan,
  CatalogueStudyRecord,
  HistoricQuotationRecord,
  PlannedCatalogueStudyProject,
} from "./types";

const CHECKED_AT = "2026-08-26" as const;

export const michelinDiningSet = {
  schemaVersion: 2,
  setId: "michelin-dining",
  title: "Michelin dining",
  declaredCount: 132,
  checkedAt: CHECKED_AT,
  regionCounts: {
    "bay-area": 41,
    "new-york-city": 69,
    "washington-dc": 22,
  },
  scope:
    "Named restaurants in the live Michelin Guide selections for the nine-county Bay Area, New York City, and Washington, DC and surroundings; each original badge study is grounded in a source-checked interior, dish, or cultural cue.",
} as const;

export interface SourceCheckedHistoricQuotation extends HistoricQuotationRecord {
  readonly personWikipediaUrl: string;
  readonly sourceCitation: string;
  readonly checkedAt: typeof CHECKED_AT;
}

export const OSCAR_WILDE_DINNER_QUOTATION: SourceCheckedHistoricQuotation = {
  quotationId: "historic-quotation/oscar-wilde-good-dinner",
  text: "After a good dinner one can forgive anybody, even one’s own relations.",
  personName: "Oscar Wilde",
  sourceTitle: "A Woman of No Importance",
  sourceCitation: "Act II; Project Gutenberg eBook #854",
  sourceUrl: "https://www.gutenberg.org/cache/epub/854/pg854-images.html",
  personWikipediaUrl: "https://en.wikipedia.org/wiki/Oscar_Wilde",
  checkedAt: CHECKED_AT,
};

export const michelinDiningQuotationBank: readonly SourceCheckedHistoricQuotation[] = [
  OSCAR_WILDE_DINNER_QUOTATION,
];

export interface MichelinGuideSource {
  readonly authority: "The MICHELIN Guide";
  readonly url: string;
  readonly checkedAt: typeof CHECKED_AT;
  readonly starCount: 1 | 2 | 3;
  readonly usage: "Current listing and factual research cue; no Guide prose, photography, or branding reproduced.";
}

export interface MiniatureManufacturingArtBrief {
  readonly referenceWidthMillimeters: 32;
  readonly thumbnailProofPixels: 48;
  readonly primaryForms: readonly [string, string, string, ...string[]];
  readonly supportingAccents: readonly string[];
  readonly colorFamilies: readonly [string, string, string, ...string[]];
}

export interface RegisteredTreatmentChoice {
  readonly styleId: string;
  readonly styleRevision: 1;
  readonly treatmentId: string;
  readonly treatmentRevision: 1;
  readonly treatmentLabel: string;
}

export interface MichelinDiningAuthoringRecord extends CatalogueStudyRecord {
  readonly setIds: readonly ["michelin-dining"];
  readonly restaurant: MichelinRestaurantResearchSeed;
  readonly guideSource: MichelinGuideSource;
  readonly manufacturingArtBrief: MiniatureManufacturingArtBrief;
  readonly treatmentChoices: readonly [
    RegisteredTreatmentChoice,
    RegisteredTreatmentChoice,
    RegisteredTreatmentChoice,
  ];
  readonly accessibleDescription: string;
  readonly defaultQuotationId: typeof OSCAR_WILDE_DINNER_QUOTATION.quotationId;
  readonly defaultQuotation: SourceCheckedHistoricQuotation;
  readonly primaryPrompt: CompiledManufacturableCandidatePrompt;
}

interface BuiltRestaurant {
  readonly record: MichelinDiningAuthoringRecord;
  readonly project: PlannedCatalogueStudyProject;
  readonly primaryPrompt: {
    readonly definitionId: string;
    readonly compiled: CompiledManufacturableCandidatePrompt;
  };
}

export const michelinRestaurantResearchSeeds: readonly MichelinRestaurantResearchSeed[] = [
  ...sanFranciscoMichelinRestaurantSeeds,
  ...newYorkCityMichelinRestaurantSeeds,
  ...washingtonDcMichelinRestaurantSeeds,
];

validateResearchEdition(michelinRestaurantResearchSeeds);

const builtRestaurants = michelinRestaurantResearchSeeds.map(buildRestaurant);

export const michelinDiningAuthoringRecords: readonly MichelinDiningAuthoringRecord[] = builtRestaurants.map(
  ({ record }) => record,
);

export const michelinDiningCampaign: readonly PlannedCatalogueStudyProject[] = builtRestaurants.map(
  ({ project }) => project,
);

export const michelinDiningPrimaryPrompts: readonly BuiltRestaurant["primaryPrompt"][] = builtRestaurants.map(
  ({ primaryPrompt }) => primaryPrompt,
);

function buildRestaurant(seed: MichelinRestaurantResearchSeed): BuiltRestaurant {
  const definitionId = `michelin-dining-${seed.slug}`;
  const title = `Dined at ${seed.restaurantName}`;
  const criterion = `Dine at ${seed.restaurantName} on a date when it is listed with at least one Michelin star; verify the visit-date status against the linked official Guide page.`;
  const artBrief: BadgeArtBrief = {
    schemaVersion: 1,
    badgeKey: `michelin-dining/${seed.slug}`,
    title,
    criterion,
    description: `Remember ${seed.restaurantName} through an original miniature abstraction of this source-checked ${seed.cueType} cue: ${seed.evidenceCue}`,
    themeCues: [seed.primaryForms[0], seed.primaryForms[1], seed.primaryForms[2]],
    requiredMotifs: seed.primaryForms,
    excludedMotifs: [
      "Michelin logo, star pictogram, red commercial-guide trade dress, or rating marks",
      "restaurant logos, names, signage, menus, chef likenesses, words, letters, numerals, or typography",
      "photographic copying of referenced interiors or food",
      "dense inventories of tableware, garnish, windows, tiles, stitches, or repeated microdetail beyond the named broad source forms",
      "finished badge rim, pin, bevel, cast shadow, or product mockup",
    ],
    moodCues: ["memorable hospitality", "distinctive place", "quiet celebration"],
    paletteCues: seed.colorFamilies,
  };
  const candidates = buildCandidates(definitionId, artBrief, seed.candidateStyles, seed.cueType);
  const project: PlannedCatalogueStudyProject = {
    projectId: `michelin-dining-project/${seed.slug}`,
    definitionId,
    brief: artBrief,
    candidates,
    primaryCandidateKey: candidates[0].candidateKey,
    status: "source-study-planned",
  };
  const primaryPrompt = compileManufacturableCandidatePrompt(artBrief, candidates[0]);
  const treatmentChoices = seed.candidateStyles.map(registeredTreatmentChoice) as [
    RegisteredTreatmentChoice,
    RegisteredTreatmentChoice,
    RegisteredTreatmentChoice,
  ];
  const aliases = uniqueStrings([
    seed.restaurantName,
    seed.cuisine,
    seed.regionLabel,
    ...seed.locationAliases,
  ]);
  const record: MichelinDiningAuthoringRecord = {
    definitionId,
    slug: seed.slug,
    title,
    criterion,
    contextLabel: `${seed.locationLabel} · ${seed.cuisine}`,
    aliases,
    setIds: ["michelin-dining"],
    restaurant: seed,
    guideSource: {
      authority: "The MICHELIN Guide",
      url: seed.guideUrl,
      checkedAt: CHECKED_AT,
      starCount: seed.starCount,
      usage: "Current listing and factual research cue; no Guide prose, photography, or branding reproduced.",
    },
    artBrief,
    manufacturingArtBrief: {
      referenceWidthMillimeters: SMALL_BADGE_MANUFACTURING_LIMITS.referenceWidthMillimeters,
      thumbnailProofPixels: SMALL_BADGE_MANUFACTURING_LIMITS.thumbnailProofPixels,
      primaryForms: seed.primaryForms,
      supportingAccents: seed.supportingAccents,
      colorFamilies: seed.colorFamilies,
    },
    candidateStyles: seed.candidateStyles,
    treatmentChoices,
    artBriefProvenance: {
      kind: "curated-editorial",
      note: `Original ${seed.cueType}-led geometry based on a paraphrased factual cue; no source pixels, branding, or prose are reproduced.`,
      sourceUrls: seed.evidenceSourceUrls,
    },
    accessibleDescription: `An original ${seed.cueType}-led miniature badge study for ${seed.restaurantName}, based on this researched cue: ${seed.evidenceCue} The design reduces that cue to ${seed.primaryForms.length} broad flat forms for legibility on a manufactured badge.`,
    defaultQuotationId: OSCAR_WILDE_DINNER_QUOTATION.quotationId,
    defaultQuotation: OSCAR_WILDE_DINNER_QUOTATION,
    primaryPrompt,
  };
  return {
    record,
    project,
    primaryPrompt: { definitionId, compiled: primaryPrompt },
  };
}

function validateResearchEdition(seeds: readonly MichelinRestaurantResearchSeed[]): void {
  if (seeds.length !== michelinDiningSet.declaredCount) {
    throw new Error(
      `Michelin dining research expected ${michelinDiningSet.declaredCount} named restaurants; found ${seeds.length}. Refresh every regional inventory together.`,
    );
  }
  for (const field of ["slug", "restaurantName"] as const) {
    if (new Set(seeds.map((seed) => seed[field])).size !== seeds.length) {
      throw new Error(
        `Michelin dining research repeats a ${field}; assign one stable named achievement per restaurant.`,
      );
    }
  }
  for (const seed of seeds) {
    if (seed.checkedAt !== CHECKED_AT || !seed.guideUrl.startsWith("https://guide.michelin.com/")) {
      throw new Error(
        `Michelin dining record ${seed.slug} lacks current official Guide provenance; refresh its checked date and individual Guide URL.`,
      );
    }
    if (seed.primaryForms.length < 3 || seed.primaryForms.length > 5) {
      throw new Error(`Michelin dining record ${seed.slug} must define exactly 3 to 5 broad primary forms.`);
    }
    if (seed.supportingAccents.length > SMALL_BADGE_MANUFACTURING_LIMITS.supportingAccentsMaximum) {
      throw new Error(
        `Michelin dining record ${seed.slug} has too many supporting accents; keep no more than 3.`,
      );
    }
    if (seed.colorFamilies.length > SMALL_BADGE_MANUFACTURING_LIMITS.colorFamiliesMaximum) {
      throw new Error(
        `Michelin dining record ${seed.slug} has too many color families; keep no more than 6.`,
      );
    }
  }
  for (const [regionId, expectedCount] of Object.entries(michelinDiningSet.regionCounts)) {
    const actualCount = seeds.filter((seed) => seed.regionId === regionId).length;
    if (actualCount !== expectedCount) {
      throw new Error(
        `Michelin dining region ${regionId} expected ${expectedCount} restaurants; found ${actualCount}. Refresh the live Guide inventory.`,
      );
    }
  }
}

function registeredTreatmentChoice(styleId: string): RegisteredTreatmentChoice {
  const style = findArtStyle(styleId);
  if (!style) {
    throw new Error(
      `Michelin dining style ${JSON.stringify(styleId)} is not registered; choose an immutable Studio art style.`,
    );
  }
  const treatment = manufacturingTreatmentByFamily[style.family];
  return {
    styleId: style.id,
    styleRevision: style.revision,
    treatmentId: treatment.id,
    treatmentRevision: treatment.revision,
    treatmentLabel: treatment.label,
  };
}

function buildCandidates(
  definitionId: string,
  brief: BadgeArtBrief,
  styles: readonly [string, string, string],
  cueType: RestaurantVisualCueType,
): readonly [CandidatePlan, CandidatePlan, CandidatePlan] {
  const roles: readonly [CandidatePlan["role"], CandidatePlan["role"], CandidatePlan["role"]] =
    cueType === "interior"
      ? ["landmark-witness", "emblematic-metaphor", "terrain-memory"]
      : ["emblematic-metaphor", "landmark-witness", "terrain-memory"];
  return [
    candidate(definitionId, brief, 0, roles[0], styles[0]),
    candidate(definitionId, brief, 1, roles[1], styles[1]),
    candidate(definitionId, brief, 2, roles[2], styles[2]),
  ];
}

function candidate(
  definitionId: string,
  brief: BadgeArtBrief,
  index: 0 | 1 | 2,
  role: CandidatePlan["role"],
  styleId: string,
): CandidatePlan {
  const layouts = ["central-iconic", "radial", "layered-horizon"] as const;
  const viewpoints = ["elevated", "aerial", "eye-level"] as const;
  const depths = ["shallow", "flat", "layered"] as const;
  const safeZones = [0.72, 0.68, 0.76] as const;
  const narratives = [
    "Place first: make the verified restaurant cue legible through a few broad joined masses.",
    "Meaning first: reduce the remembered dish, room, or cultural practice to one generous emblem.",
    "Hospitality first: let the factual cue and one welcoming field read together at miniature scale.",
  ] as const;
  return {
    schemaVersion: 1,
    candidateKey: `${definitionId}:${role}`,
    role,
    styleId,
    composition: {
      layout: layouts[index],
      viewpoint: viewpoints[index],
      depth: depths[index],
      essentialSafeZone: safeZones[index],
      focalSubjects: [brief.themeCues[index]],
      supportingElements: brief.requiredMotifs.filter((motif) => motif !== brief.themeCues[index]),
      narrativeBeat: narratives[index],
    },
  };
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
