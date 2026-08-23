import literalUrl from "../assets/yosemite-literal.webp";
import symbolicUrl from "../assets/yosemite-symbolic.webp";
import topographicUrl from "../assets/yosemite-topographic.webp";
import type { StudioCandidateFixture } from "./types";

export const studioFixtureCandidates: readonly StudioCandidateFixture[] = [
  {
    id: "candidate-literal",
    label: "Valley witness",
    direction: "Literal landscape",
    sourceUrl: literalUrl,
    sourceAssetHash: "66ff0b12c95341493dd674f77b427be0c8de81350e7e20286d1984e20722a35b",
  },
  {
    id: "candidate-symbolic",
    label: "Granite portal",
    direction: "Symbolic passage",
    sourceUrl: symbolicUrl,
    sourceAssetHash: "b2ef9b66c7009bfb0716e0b404ec9e236ad2d2723c252a917de3ac9de43848a1",
  },
  {
    id: "candidate-topographic",
    label: "Contour journey",
    direction: "Map and pattern",
    sourceUrl: topographicUrl,
    sourceAssetHash: "1c1c4396a99ec00a142d0fee2317482858133cf6ca667d1bee1aa1fb3616ece6",
  },
] as const;

export type { StudioCandidateFixture } from "./types";
