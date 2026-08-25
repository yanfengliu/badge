import { findArtStyle } from "./art-styles";
import {
  selectedSourceHashes,
  selectedSourcePromptHashes,
  selectedSourceThumbnailHashes,
} from "./selected-source-hashes";
import type { BadgeArtBrief, NationalParkAuthoringRecord } from "./types";

export interface NationalParkSeed {
  slug: string;
  siteCode: string;
  officialName: string;
  shortName: string;
  locationLabel: string;
  signature: string;
  symbol: string;
  terrain: string;
  palette: readonly [string, string, string, ...string[]];
  styles: readonly [string, string, string];
  aliases?: readonly string[];
  excludedMotifs?: readonly string[];
}

export function defineNationalPark(seed: NationalParkSeed): NationalParkAuthoringRecord {
  const criterion = `Visit ${seed.officialName}`;
  const primaryStyle = findArtStyle(seed.styles[0]);
  if (!primaryStyle) {
    throw new Error(
      `National-park authoring record ${seed.slug} references missing primary style ${seed.styles[0]}; register that immutable style revision before loading the catalogue.`,
    );
  }
  const artBrief: BadgeArtBrief = {
    schemaVersion: 1,
    badgeKey: `us-national-parks/${seed.slug}`,
    title: seed.shortName,
    criterion,
    description: `Remember ${seed.shortName} through ${seed.signature}, with the feeling of ${seed.symbol}.`,
    themeCues: [seed.signature, seed.symbol, seed.terrain],
    requiredMotifs: [seed.signature],
    excludedMotifs: [
      "visitor-center signage",
      "souvenir icon cluster",
      "generic mountain logo",
      ...(seed.excludedMotifs ?? []),
    ],
    moodCues: ["specific to this place", "quietly triumphant", "worthy of close inspection"],
    paletteCues: seed.palette,
  };
  const selectedCandidateKey = `${seed.slug}:landmark-witness`;
  return {
    definitionId: `visited-${seed.slug}`,
    slug: seed.slug,
    officialName: seed.officialName,
    shortName: seed.shortName,
    criterion,
    locationLabel: seed.locationLabel,
    npsSiteCode: seed.siteCode,
    npsUrl: `https://www.nps.gov/${seed.siteCode}/`,
    aliases: seed.aliases ?? [],
    artBrief,
    candidateStyles: seed.styles,
    selectedSource: {
      status: "selected-source-study",
      fileName: `${seed.slug}.jpg`,
      mimeType: "image/jpeg",
      width: 896,
      height: 896,
      sha256: selectedSourceHashes[seed.slug] ?? `pending:${seed.slug}`,
      promptSha256: selectedSourcePromptHashes[seed.slug] ?? `pending:${seed.slug}`,
      generatedOn: "2026-08-24",
      promptRecipe: { id: "badge-source-art", revision: 1 },
      selectedCandidateKey,
      accessibleDescription: `An original ${primaryStyle.label.toLowerCase()} source study showing ${seed.signature}.`,
      provenance: {
        generationWorkflow: "openai-image-generation-via-codex-imagegen",
        contentOrigin: "trained-algorithm",
        promptBinding: "recorded-exact-canonical-prompt",
        rightsBasis: "owner-directed-original-generation-for-badge",
        normalization: {
          recipe: { id: "national-park-study-jpeg", revision: 1 },
          tool: "system-drawing",
          targetWidth: 896,
          targetHeight: 896,
          qualityLadder: [88, 84, 80, 76, 72, 68, 64, 60],
          maximumBytes: 262144,
        },
      },
      thumbnail: {
        fileName: `${seed.slug}.jpg`,
        mimeType: "image/jpeg",
        width: 128,
        height: 128,
        sha256: selectedSourceThumbnailHashes[seed.slug] ?? `pending:${seed.slug}`,
        derivationRecipe: { id: "catalogue-list-thumbnail", revision: 1 },
      },
    },
  };
}
