import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { legacyStarterRepairSources } from "@badge/catalogue-fixtures/legacy-repair";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadStarterSourceAssets } from "./starter-assets.js";
import { LEGACY_STARTER_VISUAL_LINEAGES } from "./starter-visual-upgrade.js";

afterEach(() => vi.unstubAllGlobals());

describe("trusted starter repair assets", () => {
  it("loads current publication art and the hidden alpha.3 repair set by exact hash", async () => {
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

    expect(fetched).toEqual([
      ...starterBadges.map((badge) => badge.sourceUrl),
      ...legacyStarterRepairSources.map((source) => source.sourceUrl),
    ]);
    expect(assets.map((asset) => asset.hash)).toEqual([
      ...starterBadges.map((badge) => badge.sourceAssetHash),
      ...legacyStarterRepairSources.map((source) => source.sourceAssetHash),
    ]);
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
});
