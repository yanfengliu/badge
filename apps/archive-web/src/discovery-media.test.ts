import { readFile } from "node:fs/promises";
import { discoveryBadges } from "@badge/catalogue-fixtures/discovery";
import { describe, expect, it } from "vitest";

import {
  discoveryDetailKeys,
  discoveryThumbnailKeys,
  resolveDiscoveryDetail,
  resolveDiscoveryThumbnail,
} from "./discovery-media.js";

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

    expect(thumbnailKeys).toHaveLength(297);
    expect(manifest.limits).toEqual({
      maximumEntries: 320,
      maximumFileBytes: 16 * 1024,
      maximumTotalBytes: 2 * 1024 * 1024,
    });
    expect(manifest.totalBytes).toBeLessThanOrEqual(manifest.limits.maximumTotalBytes);
    expect(new Set(thumbnailKeys)).toHaveProperty("size", 297);
    expect(thumbnailKeys).toEqual(manifestKeys);
    expect(thumbnailKeys).toContain("national-parks/yosemite.jpg");
    expect(thumbnailKeys).toContain("us-states/washington.jpg");
    expect(thumbnailKeys).toContain("books-read/nineteen-eighty-four.jpg");
    expect(thumbnailKeys).toContain("life-milestones/masters-degree.jpg");
    expect(thumbnailKeys).toContain("michelin-dining/jont.jpg");
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

  it("keeps a matching, lazy-loaded detail tier for every selected study", async () => {
    const detailKeys = discoveryDetailKeys();
    const manifest = JSON.parse(
      await readFile(
        new URL(
          "../../../packages/catalogue-authoring/assets/discovery-details.manifest.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const manifestKeys = manifest.entries.map((entry: { readonly key: string }) => entry.key).sort();

    expect(detailKeys).toHaveLength(297);
    expect(detailKeys).toEqual(discoveryThumbnailKeys());
    expect(detailKeys).toEqual(manifestKeys);
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      recipe: { id: "catalogue-detail-preview", revision: 1 },
      width: 384,
      height: 384,
      loading: "on-demand",
      limits: {
        maximumEntries: 320,
        maximumFileBytes: 64 * 1024,
        maximumTotalBytes: 16 * 1024 * 1024,
      },
    });
    expect(await resolveDiscoveryDetail("michelin-dining/singlethread.jpg")).toContain(
      "/assets/michelin-dining/details/singlethread.jpg",
    );
    expect(await resolveDiscoveryDetail("missing-selected-study.jpg")).toBeNull();
  });
});
