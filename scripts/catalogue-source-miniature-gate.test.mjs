import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import decodeWebp, { init as initializeWebpDecoder } from "@jsquash/webp/decode.js";
import { beforeAll, describe, expect, it } from "vitest";

import { encodeRgbPng } from "./code-native-art/png.mjs";
import {
  decodeGeneratedRgbPng,
  measureMiniatureResidual,
  resizeRgbaBilinear,
} from "./normalize-generated-fixture-art.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const measurementScript = path.join(repositoryRoot, "scripts/measure-catalogue-source-miniatures.ps1");
const maximumResidual = 0.045;
const windowsIt = process.platform === "win32" ? it : it.skip;

describe("selected catalogue source miniature gate", () => {
  beforeAll(async () => {
    installImageDataForNode();
    const wasmPath = path.resolve("node_modules/@jsquash/webp/codec/dec/webp_dec.wasm");
    await initializeWebpDecoder(await WebAssembly.compile(await readFile(wasmPath)));
  });

  windowsIt("matches the canonical JavaScript proof and residual instrument exactly", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "badge-miniature-instrument-"));
    const inputPath = path.join(temporaryRoot, "instrument.png");
    const proofRoot = path.join(temporaryRoot, "proofs");
    try {
      const image = makeInstrumentImage();
      await writeFile(inputPath, encodeRgbPng(image));
      const result = runMeasurement(["-SingleImagePath", inputPath, "-ProofOutputRoot", proofRoot]);
      expect(result.status, result.stderr).toBe(0);
      const measured = JSON.parse(result.stdout);
      expect(measured.proofResize).toBe("bilinear-center-sample-round");
      expect(measured.miniatureResidual).toBe(measureMiniatureResidual(image, 48));

      const expectedProof = resizeRgbaBilinear(image, 48);
      const actualProof = decodeGeneratedRgbPng(
        new Uint8Array(await readFile(path.join(proofRoot, "instrument-48.png"))),
      );
      expect(actualProof.width).toBe(48);
      expect(actualProof.height).toBe(48);
      expect(Buffer.from(actualProof.data)).toEqual(Buffer.from(expectedProof.data));
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  windowsIt(
    "fully decodes and measures the entire current 52-source books and education class",
    () => {
      const result = runMeasurement(["-ExpectedCount", "52", "-MaximumResidual", "0.045"]);
      expect(result.status, result.stderr).toBe(0);
      const records = JSON.parse(result.stdout);
      expect(records).toHaveLength(52);
      expect(records.filter(({ key }) => key.startsWith("books-read/"))).toHaveLength(50);
      expect(records.filter(({ key }) => key.startsWith("life-milestones/"))).toHaveLength(2);
      expect(records.some(({ key }) => key.startsWith("michelin-dining/"))).toBe(false);
      for (const record of records) {
        expect(record, record.key).toMatchObject({
          width: 896,
          height: 896,
          proofSize: 48,
          proofResize: "bilinear-center-sample-round",
          passes: true,
        });
        expect(record.bytes, record.key).toBeLessThanOrEqual(256 * 1024);
        expect(record.miniatureResidual, record.key).toBeLessThanOrEqual(maximumResidual);
      }
    },
    20_000,
  );

  windowsIt(
    "fully decodes and measures all 132 source-grounded named restaurant badges",
    () => {
      const result = runMeasurement([
        "-CatalogueDirectories",
        "michelin-dining",
        "-ExpectedCount",
        "132",
        "-MaximumResidual",
        "0.045",
      ]);
      expect(result.status, result.stderr).toBe(0);
      const records = JSON.parse(result.stdout);
      expect(records).toHaveLength(132);
      expect(records.every(({ key }) => key.startsWith("michelin-dining/"))).toBe(true);
      for (const record of records) {
        expect(record, record.key).toMatchObject({
          width: 896,
          height: 896,
          proofSize: 48,
          proofResize: "bilinear-center-sample-round",
          passes: true,
        });
        expect(record.bytes, record.key).toBeLessThanOrEqual(256 * 1024);
        expect(record.miniatureResidual, record.key).toBeLessThanOrEqual(maximumResidual);
      }
    },
    20_000,
  );

  it("keeps the dense historical Sapiens source as a positive control above the ceiling", async () => {
    const source = new Uint8Array(
      await readFile(path.join(repositoryRoot, "packages/catalogue-fixtures/assets/sapiens.webp")),
    );
    const decoded = await decodeWebp(exactArrayBuffer(source));
    expect(measureMiniatureResidual(decoded, 48)).toBeGreaterThan(maximumResidual);
  });
});

function runMeasurement(arguments_) {
  return spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", measurementScript, ...arguments_],
    { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
  );
}

function makeInstrumentImage() {
  const width = 896;
  const height = 896;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const left = x < 370;
      const lower = y > 520;
      data[index] = left ? 31 : lower ? 201 : 226;
      data[index + 1] = lower ? 129 : left ? 79 : 214;
      data[index + 2] = x + y > 1040 ? 58 : 122;
      data[index + 3] = 255;
    }
  }
  return { data, width, height };
}

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

function exactArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
