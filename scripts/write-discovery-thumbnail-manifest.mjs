import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const assetsRoot = path.resolve(repositoryRoot, "packages/catalogue-authoring/assets");
const outputFile = path.join(assetsRoot, "discovery-thumbnails.manifest.json");
const temporaryOutputFile = `${outputFile}.${process.pid}.tmp`;
const decodeGate = path.resolve(repositoryRoot, "scripts/check-discovery-thumbnail-decode.ps1");
const maximumEntries = 256;
const maximumFileBytes = 16 * 1024;
const maximumTotalBytes = 2 * 1024 * 1024;

const catalogues = (await readdir(assetsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const entries = [];
for (const catalogue of catalogues) {
  const thumbnailDirectory = path.join(assetsRoot, catalogue, "thumbnails");
  let files;
  try {
    files = await readdir(thumbnailDirectory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
    throw error;
  }
  for (const file of files.filter((entry) => entry.isFile() && entry.name.endsWith(".jpg"))) {
    const bytes = await readFile(path.join(thumbnailDirectory, file.name));
    if (bytes.byteLength > maximumFileBytes) {
      throw new Error(
        `Discovery thumbnail ${catalogue}/${file.name} is ${bytes.byteLength} bytes; derive a 128-pixel JPEG at or below ${maximumFileBytes} bytes before refreshing the manifest.`,
      );
    }
    const dimensions = readJpegHeaderSize(bytes);
    if (dimensions.width !== 128 || dimensions.height !== 128) {
      throw new Error(
        `Discovery thumbnail ${catalogue}/${file.name} declares ${dimensions.width} by ${dimensions.height} in its JPEG header; derive the exact 128 by 128 catalogue-list-thumbnail@1 asset before refreshing the manifest.`,
      );
    }
    entries.push({
      key: `${catalogue}/${file.name}`,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width: dimensions.width,
      height: dimensions.height,
    });
  }
}
entries.sort((left, right) => left.key.localeCompare(right.key));
if (entries.length === 0 || entries.length > maximumEntries) {
  throw new Error(
    `Discovery thumbnail manifest found ${entries.length} entries; keep one reviewed tier between 1 and ${maximumEntries} entries or shard the catalogue before shipping.`,
  );
}
if (new Set(entries.map((entry) => entry.key)).size !== entries.length) {
  throw new Error(
    "Discovery thumbnail manifest contains duplicate qualified keys; repair the catalogue directories.",
  );
}
if (new Set(entries.map((entry) => entry.sha256)).size !== entries.length) {
  throw new Error(
    "Discovery thumbnail manifest contains duplicate image bytes; each qualified study must retain one independently reviewed derivative.",
  );
}
const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
if (totalBytes > maximumTotalBytes) {
  throw new Error(
    `Discovery thumbnail tier totals ${totalBytes} bytes; keep the reviewed Archive tier at or below ${maximumTotalBytes} bytes or shard it before shipping.`,
  );
}
const manifest = {
  schemaVersion: 1,
  recipe: { id: "catalogue-list-thumbnail", revision: 1 },
  width: 128,
  height: 128,
  limits: { maximumEntries, maximumFileBytes, maximumTotalBytes },
  totalBytes,
  entries,
};
try {
  await writeFile(temporaryOutputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      decodeGate,
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
process.stdout.write(`Bound ${entries.length} qualified discovery thumbnails (${totalBytes} bytes).\n`);

function readJpegHeaderSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("Discovery thumbnail is not a JPEG image.");
  }
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
  throw new Error("Discovery thumbnail JPEG dimensions are missing.");
}
