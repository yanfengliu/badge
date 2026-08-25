import literalUrl from "../assets/yosemite-literal-manufactured-v2.webp";
import symbolicUrl from "../assets/yosemite-symbolic-manufactured-v2.webp";
import topographicUrl from "../assets/yosemite-topographic-manufactured-v2.webp";
import type { StudioCandidateFixture } from "./types";

export const studioFixtureCandidates: readonly StudioCandidateFixture[] = [
  {
    id: "candidate-literal",
    label: "Cloisonné valley",
    direction: "Stained-glass field",
    sourceUrl: literalUrl,
    sourceAssetHash: "ca4a1fade0aea9340114978c27c9df8e838568015bcc81e3f0dc02c52e22f907",
  },
  {
    id: "candidate-symbolic",
    label: "Underglaze portal",
    direction: "Ceramic field",
    sourceUrl: symbolicUrl,
    sourceAssetHash: "8dfb334b62e82cfe462e8544bc537e7a65f75c78c4b6ae9a748c56f6f9edfe32",
  },
  {
    id: "candidate-topographic",
    label: "Blockprint route",
    direction: "Relief-print terrain",
    sourceUrl: topographicUrl,
    sourceAssetHash: "86572d56789350193e161ada5560842b793b6ea35d2d0259b1c78ebb698a1218",
  },
] as const;

export type { StudioCandidateFixture } from "./types";
