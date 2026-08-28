import { findArtStyle } from "./art-styles";
import { defaultVideoGameQuotationId } from "./video-game-quotations";
import type { BadgeArtBrief, CatalogueStudyRecord } from "./types";

export type VideoGameCategory =
  | "action-adventure"
  | "adventure"
  | "arcade"
  | "fighting"
  | "platformer"
  | "puzzle"
  | "rhythm"
  | "role-playing"
  | "sandbox"
  | "shooter"
  | "simulation"
  | "sports"
  | "strategy";

export interface VideoGameSeed {
  readonly slug: string;
  readonly gameTitle: string;
  readonly category: VideoGameCategory;
  readonly completionCriterion: string;
  readonly forms: readonly [string, string, string];
  readonly relationship: string;
  readonly palette: readonly [string, string, string, ...string[]];
  readonly styles: readonly [string, string, string];
}

export interface VideoGameAuthoringRecord extends CatalogueStudyRecord {
  readonly gameTitle: string;
  readonly category: VideoGameCategory;
  readonly relationship: string;
  readonly workScope: "single-game";
}

const categoryLabels: Readonly<Record<VideoGameCategory, string>> = {
  "action-adventure": "Action-adventure",
  adventure: "Adventure",
  arcade: "Arcade",
  fighting: "Fighting",
  platformer: "Platformer",
  puzzle: "Puzzle",
  rhythm: "Rhythm",
  "role-playing": "Role-playing",
  sandbox: "Sandbox",
  shooter: "Shooter",
  simulation: "Simulation",
  sports: "Sports",
  strategy: "Strategy",
};

export const videoGameRightsExclusions = [
  "box art, key art, screenshots, gameplay captures, or copied scene compositions",
  "interface, UI, HUD, score display, menu, or map imagery",
  "logos, wordmarks, franchise emblems, publisher marks, or typography",
  "recognizable characters, creatures, vehicles, items, or branded equipment",
  "commercial trade dress, official palettes, promotional styling, or adaptation imagery",
] as const;

export function defineVideoGame(seed: Readonly<VideoGameSeed>): VideoGameAuthoringRecord {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(seed.slug)) {
    throw new Error(
      `Video game ${seed.gameTitle} has invalid slug ${JSON.stringify(seed.slug)}; use a stable lowercase ASCII slug with single hyphen separators.`,
    );
  }
  if (!seed.completionCriterion.trim()) {
    throw new Error(
      `Video game ${seed.gameTitle} has no completion criterion; name the exact finish or finite milestone that earns this badge.`,
    );
  }
  if (new Set(seed.styles).size !== seed.styles.length) {
    throw new Error(
      `Video game ${seed.gameTitle} repeats a candidate style; assign three distinct registered styles before compiling.`,
    );
  }
  for (const styleId of seed.styles) {
    if (!findArtStyle(styleId)) {
      throw new Error(
        `Video game ${seed.gameTitle} references missing style ${styleId}; register that immutable style revision before loading the edition.`,
      );
    }
  }

  const definitionId = `played-video-game-${seed.slug}`;
  const title = `Played ${seed.gameTitle}`;
  const artBrief: BadgeArtBrief = {
    schemaVersion: 1,
    badgeKey: `video-games-played/${seed.slug}`,
    title,
    criterion: seed.completionCriterion,
    description: `Interpret ${seed.gameTitle} through an original symbolic miniature: ${seed.relationship}.`,
    themeCues: seed.forms,
    requiredMotifs: [seed.relationship],
    excludedMotifs: videoGameRightsExclusions,
    moodCues: ["evocative rather than promotional", "clear at miniature scale", "crafted restraint"],
    paletteCues: seed.palette,
  };

  return {
    definitionId,
    slug: seed.slug,
    title,
    gameTitle: seed.gameTitle,
    category: seed.category,
    relationship: seed.relationship,
    workScope: "single-game",
    criterion: seed.completionCriterion,
    contextLabel: categoryLabels[seed.category],
    aliases: [seed.gameTitle],
    artBrief,
    candidateStyles: seed.styles,
    artBriefProvenance: {
      kind: "curated-editorial",
      note: "Original Badge editorial abstraction for one video game; the title establishes identity only, and no official or commercial game artwork is a visual source.",
      sourceUrls: [],
    },
    defaultQuotationId: defaultVideoGameQuotationId(),
  };
}
