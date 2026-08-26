import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const assetsRoot = path.resolve(repositoryRoot, "packages/catalogue-authoring/assets");
const thumbnailManifestPath = path.join(assetsRoot, "discovery-thumbnails.manifest.json");
const outputFile = path.join(assetsRoot, "discovery-details.manifest.json");
const temporaryOutputFile = `${outputFile}.${process.pid}.tmp`;
const maximumEntries = 320;
const maximumFileBytes = 64 * 1024;
const maximumTotalBytes = 16 * 1024 * 1024;
const thumbnailManifest = JSON.parse(await readFile(thumbnailManifestPath, "utf8"));
const expectedKeys = new Set(thumbnailManifest.entries.map(({ key }) => key));

const entries = [];
for (const catalogue of (await readdir(assetsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  const detailDirectory = path.join(assetsRoot, catalogue, "details");
  let files;
  try {
    files = await readdir(detailDirectory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
    throw error;
  }
  for (const file of files.filter((entry) => entry.isFile() && entry.name.endsWith(".jpg"))) {
    const key = `${catalogue}/${file.name}`;
    const bytes = await readFile(path.join(detailDirectory, file.name));
    if (bytes.byteLength > maximumFileBytes) {
      throw new Error(
        `Discovery detail ${key} is ${bytes.byteLength} bytes; derive a 384-pixel JPEG at or below ${maximumFileBytes} bytes before refreshing the manifest.`,
      );
    }
    const dimensions = readJpegHeaderSize(bytes);
    if (dimensions.width !== 384 || dimensions.height !== 384) {
      throw new Error(
        `Discovery detail ${key} declares ${dimensions.width} by ${dimensions.height}; derive catalogue-detail-preview@1 at exactly 384 by 384 pixels.`,
      );
    }
    entries.push({
      key,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width: dimensions.width,
      height: dimensions.height,
    });
  }
}
entries.sort((left, right) => left.key.localeCompare(right.key));
const keys = new Set(entries.map(({ key }) => key));
if (
  entries.length === 0 ||
  entries.length > maximumEntries ||
  keys.size !== entries.length ||
  entries.some(({ key }) => !expectedKeys.has(key)) ||
  [...expectedKeys].some((key) => !keys.has(key))
) {
  throw new Error(
    `Discovery detail manifest found ${entries.length} entries for ${expectedKeys.size} thumbnail-qualified studies; regenerate the complete matched tier within the ${maximumEntries}-entry ceiling.`,
  );
}
if (new Set(entries.map(({ sha256 }) => sha256)).size !== entries.length) {
  throw new Error(
    "Discovery detail previews repeat image bytes; keep one independently reviewed derivative per study.",
  );
}
const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
if (totalBytes > maximumTotalBytes) {
  throw new Error(
    `Discovery detail tier totals ${totalBytes} bytes; keep it at or below ${maximumTotalBytes} bytes or shard the catalogue before shipping.`,
  );
}
const manifest = {
  schemaVersion: 1,
  recipe: { id: "catalogue-detail-preview", revision: 1 },
  width: 384,
  height: 384,
  loading: "on-demand",
  limits: { maximumEntries, maximumFileBytes, maximumTotalBytes },
  totalBytes,
  entries,
};
try {
  await writeFile(temporaryOutputFile, `${JSON.stringify(manifest)}\n`, "utf8");
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      path.resolve(repositoryRoot, "scripts/check-discovery-detail-decode.ps1"),
      "-ManifestPath",
      temporaryOutputFile,
      "-AssetsRoot",
      assetsRoot,
    ],
    { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
  );
  await rename(temporaryOutputFile, outputFile);
} finally {
  await rm(temporaryOutputFile, { force: true });
}
process.stdout.write(`Bound ${entries.length} on-demand discovery detail previews (${totalBytes} bytes).\n`);

function readJpegHeaderSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Discovery detail is not a JPEG image.");
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
  throw new Error("Discovery detail JPEG dimensions are missing.");
}
