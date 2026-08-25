import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  MANUFACTURABLE_PROMPT_RECIPE_REF,
  SMALL_BADGE_MANUFACTURING_LIMITS,
  SMALL_BADGE_MANUFACTURING_PROFILE_REF,
} from "@badge/catalogue-authoring/manufacturable-prompts";
import {
  manufacturedFixtureArt,
  manufacturedFixtureArtProfile,
} from "@badge/catalogue-fixtures/manufacturing";
import decodeWebp, { init as initializeWebpDecoder } from "@jsquash/webp/decode.js";
import { beforeAll, describe, expect, it } from "vitest";

import { measureMiniatureResidual, resizeRgbaBilinear } from "./normalize-generated-fixture-art.mjs";

const sourceDirectory = path.resolve("packages/catalogue-fixtures/assets");
const maximumTrackedAssetBytes = 256 * 1024;

describe("manufactured starter art", () => {
  beforeAll(async () => {
    installImageDataForNode();
    const wasmPath = path.resolve("node_modules/@jsquash/webp/codec/dec/webp_dec.wasm");
    await initializeWebpDecoder(await WebAssembly.compile(await readFile(wasmPath)));
  });

  it("pins the fixture review profile to the current small-badge manufacturing contract", () => {
    expect(manufacturedFixtureArtProfile).toEqual({
      promptRecipe: MANUFACTURABLE_PROMPT_RECIPE_REF,
      manufacturingProfile: SMALL_BADGE_MANUFACTURING_PROFILE_REF,
      ...SMALL_BADGE_MANUFACTURING_LIMITS,
      miniatureResidualMaximum: 0.045,
      proofResize: "bilinear-center-sample-round",
      reviewQualification:
        "Appearance-screened source art; a production vendor must still preflight and adapt final vector, mold, print, inlay, or stitch files.",
    });
    expect(manufacturedFixtureArtProfile).toMatchObject({
      referenceWidthMillimeters: 32,
      primaryForms: { minimum: 3, maximum: 5 },
      supportingAccentsMaximum: 3,
      colorFamiliesMaximum: 6,
      minimumRecognitionFeatureMillimeters: 1,
      minimumRecognitionFeaturePercentOfWidth: 3.125,
      minimumNegativeGapMillimeters: 0.8,
      minimumNegativeGapPercentOfWidth: 2.5,
      thumbnailProofPixels: 48,
      miniatureResidualMaximum: 0.045,
    });
  });

  it("keeps all six sources bounded and pins their human-reviewed 48-pixel proofs", async () => {
    expect(manufacturedFixtureArt).toHaveLength(6);
    expect(new Set(manufacturedFixtureArt.map(({ id }) => id)).size).toBe(6);
    expect(new Set(manufacturedFixtureArt.map(({ sourceFileName }) => sourceFileName)).size).toBe(6);
    expect(new Set(manufacturedFixtureArt.map(({ sourceSha256 }) => sourceSha256)).size).toBe(6);
    expect(
      new Set(manufacturedFixtureArt.map(({ manufacturingReview }) => manufacturingReview.process)).size,
    ).toBe(6);
    expect(
      new Set(manufacturedFixtureArt.map(({ thumbnailProof }) => thumbnailProof.rawRgbaSha256)).size,
    ).toBe(6);
    expect(new Set(manufacturedFixtureArt.map(({ generation }) => generation.candidateKey)).size).toBe(6);

    for (const record of manufacturedFixtureArt) {
      const source = new Uint8Array(await readFile(path.join(sourceDirectory, record.sourceFileName)));
      expect(source.byteLength, record.id).toBe(record.sourceByteLength);
      expect(source.byteLength, record.id).toBeLessThanOrEqual(maximumTrackedAssetBytes);
      expect(sha256(source), record.id).toBe(record.sourceSha256);

      const decoded = await decodeWebp(exactArrayBuffer(source));
      expect(record.normalizedSizePixels, record.id).toBe(896);
      expect({ width: decoded.width, height: decoded.height }, record.id).toEqual({
        width: 896,
        height: 896,
      });

      const proof = resizeRgbaBilinear(decoded, manufacturedFixtureArtProfile.thumbnailProofPixels);
      expect(record.thumbnailProof.sizePixels, record.id).toBe(
        manufacturedFixtureArtProfile.thumbnailProofPixels,
      );
      expect(sha256(proof.data), record.id).toBe(record.thumbnailProof.rawRgbaSha256);
      const miniatureResidual = measureMiniatureResidual(
        decoded,
        manufacturedFixtureArtProfile.thumbnailProofPixels,
      );
      expect(miniatureResidual, record.id).toBeCloseTo(record.thumbnailProof.miniatureResidual, 12);
      expect(miniatureResidual, record.id).toBeLessThanOrEqual(
        manufacturedFixtureArtProfile.miniatureResidualMaximum,
      );

      expect(record.generation).toMatchObject({
        provider: "OpenAI image generation",
        mode: "composition-preserving image edit",
        generatedAt: "2026-08-25",
        promptWorkflow: { id: "fixture-image-edit-manual", revision: 1 },
        manufacturingContract: SMALL_BADGE_MANUFACTURING_PROFILE_REF,
      });
      expect(sha256(new TextEncoder().encode(record.generation.exactPrompt)), record.id).toBe(
        record.generation.promptSha256,
      );
      for (const edit of record.generation.priorEdits ?? []) {
        expect(sha256(new TextEncoder().encode(edit.exactPrompt)), `${record.id}: ${edit.purpose}`).toBe(
          edit.promptSha256,
        );
        expect(edit.inputReferenceSha256, `${record.id}: ${edit.purpose}`).toMatch(/^[a-f0-9]{64}$/);
        expect(edit.generatedMasterSha256, `${record.id}: ${edit.purpose}`).toMatch(/^[a-f0-9]{64}$/);
      }
      const effectivePromptHistory = [
        ...(record.generation.priorEdits ?? []).map(({ exactPrompt }) => exactPrompt),
        record.generation.exactPrompt,
      ];
      for (const requiredFragment of [
        "32 mm",
        "48 x 48 pixels",
        "3 to 5 primary forms",
        "no more than 3 supporting accents",
        "no more than 6 color",
        "3.125 percent",
        "2.5 percent",
        "Do not depict a finished badge",
      ]) {
        expect(
          effectivePromptHistory.some((prompt) => prompt.includes(requiredFragment)),
          `${record.id}: ${requiredFragment}`,
        ).toBe(true);
      }
      expect(record.generation.rightsProvenance, record.id).toContain("Original AI-generated");
      expect(record.generation.inputReferenceSha256, record.id).toMatch(/^[a-f0-9]{64}$/);
      expect(record.generation.generatedMasterSha256, record.id).toMatch(/^[a-f0-9]{64}$/);
      expect(record.normalization, record.id).toEqual({
        script: "scripts/normalize-generated-fixture-art.mjs",
        sizePixels: 896,
        quality: 78,
      });

      expect(record.manufacturingReview.primaryForms, record.id).toBeGreaterThanOrEqual(
        manufacturedFixtureArtProfile.primaryForms.minimum,
      );
      expect(record.manufacturingReview.primaryForms, record.id).toBeLessThanOrEqual(
        manufacturedFixtureArtProfile.primaryForms.maximum,
      );
      expect(record.manufacturingReview.supportingAccents, record.id).toBeLessThanOrEqual(
        manufacturedFixtureArtProfile.supportingAccentsMaximum,
      );
      expect(record.manufacturingReview.supportingAccents, record.id).toBeGreaterThanOrEqual(0);
      expect(record.manufacturingReview.colorFamilies, record.id).toBeLessThanOrEqual(
        manufacturedFixtureArtProfile.colorFamiliesMaximum,
      );
      expect(record.manufacturingReview.colorFamilies, record.id).toBeGreaterThanOrEqual(1);
      expect(record.manufacturingReview.processLineFloorMillimeters, record.id).toBeGreaterThan(0);
      expect(
        [
          record.manufacturingReview.primaryForms,
          record.manufacturingReview.supportingAccents,
          record.manufacturingReview.colorFamilies,
        ].every(Number.isInteger),
        record.id,
      ).toBe(true);
    }
  });

  it("locally measures reported narrow features against their process-aware floors", async () => {
    const probedRecords = manufacturedFixtureArt.filter(
      ({ manufacturingReview }) => manufacturingReview.localizedFeatureProbes,
    );
    expect(probedRecords.map(({ id }) => id).sort()).toEqual([
      "sapiens-embroidered-v2",
      "yosemite-literal-cloisonne-v2",
    ]);

    for (const record of probedRecords) {
      const source = new Uint8Array(await readFile(path.join(sourceDirectory, record.sourceFileName)));
      const decoded = await decodeWebp(exactArrayBuffer(source));
      for (const probe of record.manufacturingReview.localizedFeatureProbes ?? []) {
        const measuredRunPixels = measureChannelRangeRun(decoded, probe);
        const measuredMillimeters =
          (measuredRunPixels / decoded.width) * manufacturedFixtureArtProfile.referenceWidthMillimeters;

        expect(measuredRunPixels, `${record.id}: ${probe.label}`).toBe(probe.measuredRunPixels);
        expect(measuredMillimeters, `${record.id}: ${probe.label}`).toBeGreaterThanOrEqual(
          probe.minimumMillimeters,
        );
        if (probe.role === "process-construction-line") {
          expect(measuredMillimeters, `${record.id}: ${probe.label}`).toBeLessThan(
            manufacturedFixtureArtProfile.minimumRecognitionFeatureMillimeters,
          );
        }
      }
    }
  });

  it("rejects the dense legacy texture class that disappeared in a 48-pixel proof", async () => {
    const legacy = new Uint8Array(await readFile(path.join(sourceDirectory, "sapiens.webp")));
    const decoded = await decodeWebp(exactArrayBuffer(legacy));
    expect(
      measureMiniatureResidual(decoded, manufacturedFixtureArtProfile.thumbnailProofPixels),
    ).toBeGreaterThan(manufacturedFixtureArtProfile.miniatureResidualMaximum);
  });
});

function installImageDataForNode() {
  if (globalThis.ImageData) return;
  Object.defineProperty(globalThis, "ImageData", {
    configurable: true,
    value: class ImageData {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    },
  });
}

function measureChannelRangeRun(image, probe) {
  const coordinate = (offset) =>
    probe.axis === "x" ? [offset, probe.fixedPixel] : [probe.fixedPixel, offset];
  const qualifies = (offset) => {
    const [x, y] = coordinate(offset);
    const index = (y * image.width + x) * 4;
    return probe.channelRanges.every(
      ([minimum, maximum], channel) =>
        image.data[index + channel] >= minimum && image.data[index + channel] <= maximum,
    );
  };
  expect(qualifies(probe.centerPixel)).toBe(true);
  let start = probe.centerPixel;
  let end = probe.centerPixel;
  while (start > 0 && qualifies(start - 1)) start -= 1;
  const maximum = probe.axis === "x" ? image.width - 1 : image.height - 1;
  while (end < maximum && qualifies(end + 1)) end += 1;
  return end - start + 1;
}

function exactArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
