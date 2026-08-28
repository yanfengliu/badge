import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DISCOVERY_MANIFEST_MAXIMUM_ENTRIES } from "./discovery-media-limits.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

describe("discovery media population limits", () => {
  it("pins the measured 384-entry ceiling across both writers and the Archive boundary", async () => {
    expect(DISCOVERY_MANIFEST_MAXIMUM_ENTRIES).toBe(384);

    for (const relativePath of [
      "scripts/write-discovery-source-manifest.mjs",
      "scripts/write-discovery-thumbnail-manifest.mjs",
      "scripts/check-archive-bundle.mjs",
    ]) {
      const source = await readFile(path.join(repositoryRoot, relativePath), "utf8");
      expect(source, relativePath).toContain("DISCOVERY_MANIFEST_MAXIMUM_ENTRIES");
      expect(source, relativePath).not.toMatch(/\b320(?:-entry)?\b/u);
    }
  });

  it("keeps renderer admission aligned with the 0.035 normalization boundary", async () => {
    const source = await readFile(
      path.join(repositoryRoot, "scripts/render-code-native-catalogue-art.mjs"),
      "utf8",
    );
    expect(source).toContain("const MAXIMUM_MINIATURE_RESIDUAL = 0.035;");
    expect(source).toContain("quantitativePass: miniatureResidual <= MAXIMUM_MINIATURE_RESIDUAL");
  });
});
