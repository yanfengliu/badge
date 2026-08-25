import { readFile } from "node:fs/promises";
import { discoveryBadges } from "@badge/catalogue-fixtures/discovery";
import { describe, expect, it } from "vitest";

import { discoveryThumbnailKeys, resolveDiscoveryThumbnail } from "./discovery-media.js";

describe("Archive discovery thumbnail boundary", () => {
  it("bundles the complete manifest-qualified thumbnail tier for every selected catalogue study", async () => {
    const thumbnailKeys = discoveryThumbnailKeys();
    const manifest = JSON.parse(
      await readFile(
        new URL(
          "../../../packages/catalogue-authoring/assets/discovery-thumbnails.manifest.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const manifestKeys = manifest.entries.map((entry: { readonly key: string }) => entry.key).sort();
    const sourceStudies = discoveryBadges.filter((badge) => badge.availability === "source-study");

    expect(thumbnailKeys).toHaveLength(113);
    expect(new Set(thumbnailKeys)).toHaveProperty("size", 113);
    expect(thumbnailKeys).toEqual(manifestKeys);
    expect(thumbnailKeys).toContain("national-parks/yosemite.jpg");
    expect(thumbnailKeys).toContain("us-states/washington.jpg");
    for (const thumbnailKey of thumbnailKeys) {
      const [catalogue, fileName] = thumbnailKey.split("/");
      expect(resolveDiscoveryThumbnail(thumbnailKey), thumbnailKey).toContain(
        `/assets/${catalogue}/thumbnails/${fileName}`,
      );
    }
    for (const badge of sourceStudies) {
      expect(thumbnailKeys, badge.discoveryId).toContain(badge.thumbnailKey);
      expect(resolveDiscoveryThumbnail(badge.thumbnailKey), badge.discoveryId).toMatch(/\.jpg(?:\?|$)/u);
    }
    expect(resolveDiscoveryThumbnail("missing-selected-study.jpg")).toBeNull();
  });
});
