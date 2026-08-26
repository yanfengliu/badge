import { describe, expect, it } from "vitest";

import { archiveAssetFileName } from "./vite.config.js";

describe("Archive catalogue asset naming", () => {
  it("preserves each discovery catalogue in the emitted production path", () => {
    expect(
      archiveAssetFileName({
        originalFileNames: [
          "C:\\repo\\packages\\catalogue-authoring\\assets\\us-states\\thumbnails\\new-york.jpg",
        ],
      }),
    ).toBe("assets/discovery/us-states/[name]-[hash][extname]");
    expect(
      archiveAssetFileName({
        originalFileNames: [
          "/repo/packages/catalogue-authoring/assets/national-parks/thumbnails/yosemite.jpg",
        ],
      }),
    ).toBe("assets/discovery/national-parks/[name]-[hash][extname]");
    expect(
      archiveAssetFileName({
        originalFileNames: [
          "/repo/packages/catalogue-authoring/assets/michelin-dining/details/singlethread.jpg",
        ],
      }),
    ).toBe("assets/discovery-details/michelin-dining/[name]-[hash][extname]");
  });

  it("keeps unrelated Archive assets on the ordinary bounded asset path", () => {
    expect(archiveAssetFileName({ originalFileNames: ["/repo/apps/archive-web/src/archive.css"] })).toBe(
      "assets/[name]-[hash][extname]",
    );
  });
});
