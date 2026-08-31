import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { legacyStarterRepairSources } from "@badge/catalogue-fixtures/legacy-repair";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import {
  legacyStarterActivationRepairSourcesForState,
  legacyStarterRepairSourcesForState,
  loadStarterSourceAssets,
} from "./starter-assets.js";
import { LEGACY_STARTER_VISUAL_LINEAGES } from "./starter-visual-upgrade.js";

afterEach(() => vi.unstubAllGlobals());

describe("trusted starter repair assets", () => {
  it("loads current publication art without eagerly fetching the hidden alpha.3 repair set", async () => {
    const fetched: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        fetched.push(url);
        return new Response(new Blob([new Uint8Array([1])], { type: "image/png" }));
      }),
    );

    const assets = await loadStarterSourceAssets();

    expect(fetched).toEqual(starterBadges.map((badge) => badge.sourceUrl));
    expect(assets.map((asset) => asset.hash)).toEqual(starterBadges.map((badge) => badge.sourceAssetHash));
    const publishedHashes = new Set(starterBadges.map((badge) => badge.sourceAssetHash));
    expect(legacyStarterRepairSources.every((source) => !publishedHashes.has(source.sourceAssetHash))).toBe(
      true,
    );
    expect(legacyStarterRepairSources.map((source) => [source.recordId, source.sourceAssetHash])).toEqual(
      LEGACY_STARTER_VISUAL_LINEAGES.map((lineage) => [
        lineage.recordId,
        lineage.publishedVisual.sourceAssetHash,
      ]),
    );
  });

  it("separates upgrade-only published visuals from earned activation repair", () => {
    const current = createStarterArchiveState();
    const [upgradeOnlyLegacy, activatedLegacy] = LEGACY_STARTER_VISUAL_LINEAGES;
    const state = {
      ...current,
      records: current.records.map((record, index) => {
        if (index === 0) return { ...record, publishedVisual: upgradeOnlyLegacy.publishedVisual };
        if (index !== 1) return record;
        return {
          ...record,
          publishedVisual: activatedLegacy.publishedVisual,
          lifecycle: "earned" as const,
          activation: {
            occurredStart: "2024-01-01",
            occurredEnd: "2024-01-01",
            recordedAt: "2024-01-02T00:00:00.000Z",
            activatedAt: "2024-01-02T00:00:00.000Z",
            visualPin: activatedLegacy.publishedVisual,
          },
        };
      }),
    };

    expect(legacyStarterRepairSourcesForState(state).map((source) => source.recordId)).toEqual([
      upgradeOnlyLegacy.recordId,
      activatedLegacy.recordId,
    ]);
    expect(legacyStarterActivationRepairSourcesForState(state).map((source) => source.recordId)).toEqual([
      activatedLegacy.recordId,
    ]);
  });
});
