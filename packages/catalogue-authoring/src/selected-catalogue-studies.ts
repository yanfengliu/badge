import { bookAuthoringCampaign, bookAuthoringRecords } from "./books-edition";
import { CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF, findCodeNativeArtRecipe } from "./code-native-art-recipes";
import { educationMilestoneAuthoringRecords, educationMilestoneCampaign } from "./education-milestones";
import { michelinDiningAuthoringRecords, michelinDiningCampaign } from "./michelin-dining";
import { videoGameAuthoringCampaign, videoGameAuthoringRecords } from "./video-games-edition";
import {
  newCatalogueSelectedSourceIntegrity,
  type NewCatalogueSelectedSourceIntegrity,
} from "./new-catalogue-selected-source-hashes";
import type { CatalogueStudyRecord, PlannedCatalogueStudyProject, SelectedSourceStudy } from "./types";

export type SelectedCatalogueStudy<T extends CatalogueStudyRecord> = T & {
  readonly selectedSource: SelectedSourceStudy;
};

export const selectedBookStudies = bindSelectedStudies(
  bookAuthoringRecords,
  bookAuthoringCampaign,
  "books-read",
  (record) => describeRealizedStudy("books-read", record, record.artBrief.description),
);

export const selectedEducationMilestoneStudies = bindSelectedStudies(
  educationMilestoneAuthoringRecords,
  educationMilestoneCampaign,
  "life-milestones",
  (record) => describeRealizedStudy("life-milestones", record, record.accessibleDescription),
);

export const selectedMichelinDiningStudies = bindSelectedStudies(
  michelinDiningAuthoringRecords,
  michelinDiningCampaign,
  "michelin-dining",
  (record) => describeRealizedStudy("michelin-dining", record, record.accessibleDescription),
);

export const selectedVideoGameStudies = bindSelectedStudies(
  videoGameAuthoringRecords,
  videoGameAuthoringCampaign,
  "video-games",
  (record) => describeRealizedStudy("video-games", record, record.artBrief.description),
);

function describeRealizedStudy(
  assetDirectory: "books-read" | "life-milestones" | "michelin-dining" | "video-games",
  record: CatalogueStudyRecord,
  description: string,
): string {
  const recipe = findCodeNativeArtRecipe(assetDirectory, record.slug);
  if (!recipe) {
    throw new Error(
      `Selected catalogue study ${record.title} has no realized code-native construction at ${assetDirectory}/${record.slug}; register its recipe before binding accessible art metadata.`,
    );
  }
  return `Original abstract source study using ${recipe.manufacturingLanguage} for ${record.title}: ${description}`;
}

function bindSelectedStudies<T extends CatalogueStudyRecord>(
  records: readonly T[],
  campaign: readonly PlannedCatalogueStudyProject[],
  assetDirectory: "books-read" | "life-milestones" | "michelin-dining" | "video-games",
  describe: (record: T) => string,
): readonly SelectedCatalogueStudy<T>[] {
  const projectsByDefinitionId = new Map(campaign.map((project) => [project.definitionId, project]));
  return records.map((record) => {
    const project = projectsByDefinitionId.get(record.definitionId);
    const primary = project?.candidates.find(
      (candidate) => candidate.candidateKey === project.primaryCandidateKey,
    );
    if (!project || !primary) {
      throw new Error(
        `Selected catalogue study ${record.title} has no primary campaign candidate; repair ${record.definitionId} before binding generated art.`,
      );
    }
    const integrityKey = `${assetDirectory}/${record.slug}`;
    const integrity = newCatalogueSelectedSourceIntegrity[integrityKey];
    if (!integrity) {
      throw new Error(
        `Selected catalogue study ${record.title} has no integrity entry at ${integrityKey}; normalize its source and thumbnail, then run scripts/write-new-catalogue-integrity.mjs.`,
      );
    }
    return {
      ...record,
      selectedSource: buildSelectedSource(
        assetDirectory,
        record.slug,
        primary.candidateKey,
        describe(record),
        integrity,
      ),
    };
  });
}

function buildSelectedSource(
  assetDirectory: "books-read" | "life-milestones" | "michelin-dining" | "video-games",
  slug: string,
  selectedCandidateKey: string,
  accessibleDescription: string,
  integrity: NewCatalogueSelectedSourceIntegrity,
): SelectedSourceStudy {
  const codeNativeRecipe = findCodeNativeArtRecipe(assetDirectory, slug);
  const isReplacement = integrity.sourceWorkflow === "code-native-replacement";
  const isDirectCodeNative = integrity.sourceWorkflow === "direct-code-native";
  const isCodeNative = isReplacement || isDirectCodeNative;
  if (Boolean(codeNativeRecipe) !== isCodeNative) {
    throw new Error(
      `Selected catalogue study ${slug} has mismatched source workflow ${integrity.sourceWorkflow}; refresh integrity after adding or removing its immutable code-native art recipe.`,
    );
  }
  const sourceHistory: SelectedSourceStudy["sourceHistory"] = isReplacement
    ? [
        {
          kind: "initial-generation",
          promptRecipe: { id: "badge-source-art", revision: 2 },
          promptSha256: integrity.canonicalPromptSha256,
          outputSourceSha256: integrity.canonicalSourceSha256,
        },
        {
          kind: "code-native-replacement",
          renderRecipe: CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
          designBriefSha256: integrity.designBriefSha256,
          rendererImplementationSha256: integrity.rendererImplementationSha256,
          supersededCanonicalSourceSha256: integrity.canonicalSourceSha256,
        },
      ]
    : isDirectCodeNative
      ? [
          {
            kind: "direct-code-native-render",
            renderRecipe: CODE_NATIVE_ENAMEL_GEOMETRY_RECIPE_REF,
            designBriefSha256: integrity.designBriefSha256,
            rendererImplementationSha256: integrity.rendererImplementationSha256,
          },
        ]
      : [
          {
            kind: "initial-generation",
            promptRecipe: { id: "badge-source-art", revision: 2 },
            promptSha256: integrity.canonicalPromptSha256,
            outputSourceSha256: integrity.sourceSha256,
          },
        ];
  return {
    status: "selected-source-study",
    fileName: `${slug}.jpg`,
    mimeType: "image/jpeg",
    width: 896,
    height: 896,
    sha256: integrity.sourceSha256,
    promptSha256: integrity.canonicalPromptSha256,
    generatedOn: isDirectCodeNative
      ? assetDirectory === "video-games"
        ? "2026-08-27"
        : "2026-08-26"
      : "2026-08-25",
    promptRecipe: { id: "badge-source-art", revision: 2 },
    sourceHistory,
    selectedCandidateKey,
    accessibleDescription,
    provenance: {
      generationWorkflow: isCodeNative
        ? "deterministic-code-native-enamel-geometry"
        : "openai-image-generation-via-codex-imagegen",
      contentOrigin: isCodeNative ? "code-authored-geometry" : "trained-algorithm",
      promptBinding: isCodeNative
        ? isReplacement
          ? "recorded-canonical-generation-and-code-native-design"
          : "recorded-canonical-prompt-association-and-code-native-design"
        : "recorded-exact-canonical-prompt",
      rightsBasis: "owner-directed-original-generation-for-badge",
      normalization: {
        recipe: { id: "catalogue-study-jpeg", revision: 1 },
        tool: "system-drawing",
        targetWidth: 896,
        targetHeight: 896,
        qualityLadder: [88, 84, 80, 76, 72, 68, 64, 60],
        maximumBytes: 262144,
      },
    },
    thumbnail: {
      fileName: `${slug}.jpg`,
      mimeType: "image/jpeg",
      width: 128,
      height: 128,
      sha256: integrity.thumbnailSha256,
      derivationRecipe: { id: "catalogue-list-thumbnail", revision: 1 },
    },
  };
}
