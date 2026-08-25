import { discoveryBadges } from "@badge/catalogue-fixtures/discovery";
import { describe, expect, it } from "vitest";

import { discoveryThumbnailFileNames, resolveDiscoveryThumbnail } from "./discovery-media.js";

describe("Archive discovery thumbnail boundary", () => {
  it("bundles only the complete bounded thumbnail tier for selected park studies", () => {
    const fileNames = discoveryThumbnailFileNames();
    const sourceStudies = discoveryBadges.filter((badge) => badge.availability === "source-study");

    expect(fileNames).toHaveLength(63);
    expect(new Set(fileNames)).toHaveProperty("size", 63);
    expect(fileNames).toContain("yosemite.jpg");
    for (const badge of sourceStudies) {
      expect(fileNames, badge.discoveryId).toContain(badge.thumbnailFileName);
      expect(resolveDiscoveryThumbnail(badge.thumbnailFileName), badge.discoveryId).toMatch(/\.jpg(?:\?|$)/u);
    }
    expect(resolveDiscoveryThumbnail("missing-selected-study.jpg")).toBeNull();
  });
});
