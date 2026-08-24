import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { regenerateNationalParkThumbnails } from "../../../scripts/national-park-thumbnail-derivation.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const sourceAssets = path.join(repositoryRoot, "packages/catalogue-authoring/assets/national-parks");
const windowsIt = process.platform === "win32" ? it : it.skip;

describe("national-park thumbnail derivation", () => {
  windowsIt("replaces an unrelated stale thumbnail with the derivative of the current source", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "badge-thumbnail-derivation-"));
    const temporarySources = path.join(temporaryRoot, "sources");
    const temporaryThumbnails = path.join(temporaryRoot, "thumbnails");
    const temporarySource = path.join(temporarySources, "study.jpg");
    const temporaryThumbnail = path.join(temporaryThumbnails, "study.jpg");

    try {
      await mkdir(temporarySources, { recursive: true });
      await mkdir(temporaryThumbnails, { recursive: true });
      await copyFile(path.join(sourceAssets, "acadia.jpg"), temporarySource);
      await copyFile(path.join(sourceAssets, "thumbnails/arches.jpg"), temporaryThumbnail);
      const staleHash = sha256(await readFile(temporaryThumbnail));

      await regenerateNationalParkThumbnails({
        repositoryRoot,
        sourceDirectory: temporarySources,
        outputDirectory: temporaryThumbnails,
        expectedCount: 1,
      });
      const refreshedHash = sha256(await readFile(temporaryThumbnail));
      const expectedHash = sha256(await readFile(path.join(sourceAssets, "thumbnails/acadia.jpg")));
      expect(refreshedHash).not.toBe(staleHash);
      expect(refreshedHash).toBe(expectedHash);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
