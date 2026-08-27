import { describe, expect, it } from "vitest";
import { cataloguePackBadges } from "@badge/catalogue-fixtures/catalogue-pack";

import { catalogueSourceKeys, resolveCatalogueSourceUrl } from "./catalogue-source-media";

describe("catalogue source media", () => {
  it("bundles exactly the canonical sources the pack fixture pins, excluding the deduplicated Yosemite input", () => {
    const packKeys = [...new Set(cataloguePackBadges.map((badge) => badge.assetKey))].sort();
    expect(catalogueSourceKeys()).toEqual(packKeys);
    expect(catalogueSourceKeys()).not.toContain("national-parks/yosemite.jpg");
    for (const badge of cataloguePackBadges) {
      expect(resolveCatalogueSourceUrl(badge.assetKey), badge.assetKey).toBeTruthy();
    }
  });
});
