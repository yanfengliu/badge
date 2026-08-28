import { buildVideoGameAuthoringCampaign } from "./video-game-campaign";
import { defineVideoGame } from "./video-game-record";
import type { VideoGameAuthoringRecord } from "./video-game-record";
import { buildVideoGamePrimaryPrompts } from "./video-game-primary-prompts";
import { videoGameHistoricQuotations } from "./video-game-quotations";
import { earlyVideoGameSeeds } from "./video-game-seeds-01";
import { foundationalVideoGameSeeds } from "./video-game-seeds-02";
import { expansionVideoGameSeeds } from "./video-game-seeds-03";
import { modernVideoGameSeeds } from "./video-game-seeds-04";
import { contemporaryVideoGameSeeds } from "./video-game-seeds-05";

export interface VideoGameAuthoringEdition {
  readonly schemaVersion: 1;
  readonly catalogueId: "video-games-played";
  readonly edition: "2026-08-27.badge-editorial-50@1";
  readonly declaredCount: 50;
  readonly scope: string;
}

export const videoGameAuthoringEdition: VideoGameAuthoringEdition = {
  schemaVersion: 1,
  catalogueId: "video-games-played",
  edition: "2026-08-27.badge-editorial-50@1",
  declaredCount: 50,
  scope:
    "Fifty single-game achievements spanning arcade, console, computer, mobile, and virtual-reality play.",
};

export const videoGameSeeds = [
  ...earlyVideoGameSeeds,
  ...foundationalVideoGameSeeds,
  ...expansionVideoGameSeeds,
  ...modernVideoGameSeeds,
  ...contemporaryVideoGameSeeds,
] as const;

export const videoGameAuthoringRecords: readonly VideoGameAuthoringRecord[] =
  videoGameSeeds.map(defineVideoGame);

export const videoGameAuthoringCampaign = buildVideoGameAuthoringCampaign(videoGameAuthoringRecords);

export const videoGamePrimaryPrompts = buildVideoGamePrimaryPrompts(videoGameAuthoringCampaign);

export { videoGameHistoricQuotations };
export type { VideoGameAuthoringRecord, VideoGameCategory, VideoGameSeed } from "./video-game-record";
export type { VideoGamePrimaryPrompt } from "./video-game-primary-prompts";
