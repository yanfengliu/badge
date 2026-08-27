import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const assetsRoot = path.resolve(repositoryRoot, "packages/catalogue-authoring/assets");
const thumbnailManifestPath = path.join(assetsRoot, "discovery-thumbnails.manifest.json");
const outputFile = path.join(assetsRoot, "discovery-sources.manifest.json");
const temporaryOutputFile = `${outputFile}.${process.pid}.tmp`;
const maximumEntries = 320;
const maximumFileBytes = 256 * 1024;
const maximumTotalBytes = 48 * 1024 * 1024;
// Yosemite's study is deduplicated in favor of the published starter badge, so its canonical
// source stays an authoring input and never enters the shipped activation tier.
const excludedKeys = new Set(["national-parks/yosemite.jpg"]);
const thumbnailManifest = JSON.parse(await readFile(thumbnailManifestPath, "utf8"));
const expectedKeys = new Set(
  thumbnailManifest.entries.map(({ key }) => key).filter((key) => !excludedKeys.has(key)),
);

const entries = [];
for (const catalogue of (await readdir(assetsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  const catalogueDirectory = path.join(assetsRoot, catalogue);
  const files = await readdir(catalogueDirectory, { withFileTypes: true });
  for (const file of files.filter((entry) => entry.isFile() && entry.name.endsWith(".jpg"))) {
    const key = `${catalogue}/${file.name}`;
    if (excludedKeys.has(key)) continue;
    const bytes = await readFile(path.join(catalogueDirectory, file.name));
    if (bytes.byteLength > maximumFileBytes) {
      throw new Error(
        `Discovery source ${key} is ${bytes.byteLength} bytes; normalize the 896-pixel study to at most ${maximumFileBytes} bytes before refreshing the manifest.`,
      );
    }
    const dimensions = readJpegHeaderSize(bytes);
    if (dimensions.width !== 896 || dimensions.height !== 896) {
      throw new Error(
        `Discovery source ${key} declares ${dimensions.width} by ${dimensions.height}; normalize the canonical study to exactly 896 by 896 pixels.`,
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
    `Discovery source manifest found ${entries.length} entries for ${expectedKeys.size} thumbnail-qualified studies; regenerate the complete matched tier within the ${maximumEntries}-entry ceiling.`,
  );
}
if (new Set(entries.map(({ sha256 }) => sha256)).size !== entries.length) {
  throw new Error(
    "Discovery canonical sources repeat image bytes; keep one independently reviewed study per concept.",
  );
}
const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
if (totalBytes > maximumTotalBytes) {
  throw new Error(
    `Discovery source tier totals ${totalBytes} bytes; keep it at or below ${maximumTotalBytes} bytes or shard the catalogue before shipping.`,
  );
}
const manifest = {
  schemaVersion: 1,
  recipe: { id: "catalogue-source-study", revision: 1 },
  width: 896,
  height: 896,
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
      path.resolve(repositoryRoot, "scripts/check-discovery-source-decode.ps1"),
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
process.stdout.write(
  `Bound ${entries.length} on-demand discovery canonical sources (${totalBytes} bytes).\n`,
);

function readJpegHeaderSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Discovery source is not a JPEG image.");
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
  throw new Error("Discovery source JPEG dimensions are missing.");
}
