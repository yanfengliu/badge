import type { PackRef } from "@badge/pack-contract";
import type { RenderRecipe } from "@badge/render-recipe";

export type FixtureLifecycle = "suggested" | "planned" | "earned";

export interface PublishedBadgeFixture {
  definitionId: string;
  collectionId: string;
  title: string;
  shortTitle: string;
  criterion: string;
  description: string;
  accessibleDescription: string;
  sourceAssetHash: string;
  sourceUrl: string;
  visualEditionId: string;
  renderRecipe: RenderRecipe;
  packRef: PackRef;
  initialLifecycle: FixtureLifecycle;
  sayingSuggestions: readonly string[];
}

export interface FixtureCollection {
  collectionId: string;
  title: string;
  eyebrow: string;
  description: string;
  badges: readonly PublishedBadgeFixture[];
}

export interface StudioCandidateFixture {
  id: string;
  label: string;
  direction: string;
  sourceUrl: string;
  sourceAssetHash: string;
}
