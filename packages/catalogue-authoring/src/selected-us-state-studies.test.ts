import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { compileCandidatePrompt } from "./prompt-recipe.js";
import { selectedUsStateStudies } from "./selected-us-state-studies.js";
import { usStateCampaign } from "./us-states-campaign.js";

describe("selected U.S. state source studies", () => {
  it("binds all 50 reviewed images, thumbnails, and canonical primary prompts", async () => {
    expect(selectedUsStateStudies).toHaveLength(50);
    for (const study of selectedUsStateStudies) {
      const project = usStateCampaign.find((candidate) => candidate.definitionId === study.definitionId);
      const primary = project?.candidates.find(
        (candidate) => candidate.candidateKey === project.primaryCandidateKey,
      );
      if (!project || !primary) throw new Error(`Missing primary campaign entry for ${study.name}.`);
      const prompt = compileCandidatePrompt(project.brief, primary).prompt;
      expect(study.selectedSource.selectedCandidateKey).toBe(primary.candidateKey);
      expect(createHash("sha256").update(prompt, "utf8").digest("hex"), study.name).toBe(
        study.selectedSource.promptSha256,
      );
      const sourceBytes = await readFile(
        fileURLToPath(new URL(`../assets/us-states/${study.selectedSource.fileName}`, import.meta.url)),
      );
      expect(sourceBytes.byteLength, study.name).toBeLessThanOrEqual(256 * 1024);
      expect(readJpegHeaderSize(sourceBytes), study.name).toEqual({ width: 896, height: 896 });
      expect(createHash("sha256").update(sourceBytes).digest("hex"), study.name).toBe(
        study.selectedSource.sha256,
      );
      const thumbnailBytes = await readFile(
        fileURLToPath(
          new URL(
            `../assets/us-states/thumbnails/${study.selectedSource.thumbnail.fileName}`,
            import.meta.url,
          ),
        ),
      );
      expect(thumbnailBytes.byteLength, `${study.name} thumbnail`).toBeLessThanOrEqual(16 * 1024);
      expect(readJpegHeaderSize(thumbnailBytes), `${study.name} thumbnail`).toEqual({
        width: 128,
        height: 128,
      });
      expect(createHash("sha256").update(thumbnailBytes).digest("hex"), `${study.name} thumbnail`).toBe(
        study.selectedSource.thumbnail.sha256,
      );
      expect(prompt).toContain(study.name);
      expect(study.defaultQuotationId).toMatch(/^historic-quotation\//u);
    }
  });

  it("keeps selected studies in Studio-authoring assets while exposing only bounded list derivatives", () => {
    for (const study of selectedUsStateStudies) {
      expect(study.selectedSource.width).toBe(896);
      expect(study.selectedSource.height).toBe(896);
      expect(study.selectedSource.provenance.normalization.maximumBytes).toBe(256 * 1024);
      expect(study.selectedSource.thumbnail.width).toBe(128);
      expect(study.selectedSource.thumbnail.height).toBe(128);
    }
  });
});

function readJpegHeaderSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Selected source is not a JPEG image.");
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error(`Malformed JPEG marker at byte ${offset}.`);
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw new Error(`Malformed JPEG segment at byte ${offset}.`);
    }
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  throw new Error("JPEG dimensions are missing.");
}
