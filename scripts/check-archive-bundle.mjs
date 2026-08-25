import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const archiveOutputDirectory = path.resolve(process.argv[2] ?? "dist/archive");
const discoveryAssetsRoot = path.resolve("packages/catalogue-authoring/assets");
const discoveryThumbnailManifestPath = path.join(discoveryAssetsRoot, "discovery-thumbnails.manifest.json");
const forbiddenFileExtensions = new Set([".wasm", ".webp"]);
const studioOnlyCandidateName = /(?:^|[/\\])yosemite-(?:symbolic|topographic)(?:\.|$)/i;
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt"]);
const forbiddenText = [
  { label: "the generator-only @jsquash dependency", pattern: /@jsquash/i },
  { label: "a WebP decoder marker", pattern: /webp(?:_dec|decoder|\.wasm)/i },
  { label: "the removed WASM CSP exception", pattern: /wasm-unsafe-eval/i },
  { label: "the Studio-only catalogue prompt compiler", pattern: /ACHIEVEMENT REFERENCE DATA/i },
  { label: "the Studio-only art-style registry", pattern: /pixel-cluster-landscape/i },
];
const discoveryThumbnailManifest = JSON.parse(await readFile(discoveryThumbnailManifestPath, "utf8"));
if (discoveryThumbnailManifest.schemaVersion !== 1) {
  throw new Error(
    `Discovery thumbnail manifest schema ${discoveryThumbnailManifest.schemaVersion} is unsupported; regenerate schemaVersion 1 before building Archive.`,
  );
}
if (
  discoveryThumbnailManifest.recipe?.id !== "catalogue-list-thumbnail" ||
  discoveryThumbnailManifest.recipe?.revision !== 1 ||
  discoveryThumbnailManifest.width !== 128 ||
  discoveryThumbnailManifest.height !== 128
) {
  throw new Error(
    "Discovery thumbnail manifest must declare catalogue-list-thumbnail@1 at exactly 128 by 128 pixels; regenerate the reviewed derivative tier.",
  );
}
const manifestEntries = discoveryThumbnailManifest.entries;
if (!Array.isArray(manifestEntries) || manifestEntries.length === 0) {
  throw new Error("Discovery thumbnail manifest has no entries; regenerate the reviewed derivative tier.");
}
const manifestKeys = new Set();
const manifestHashes = new Set();
for (const entry of manifestEntries) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/u.test(entry.key)) {
    throw new Error(`Discovery thumbnail manifest key ${String(entry.key)} is not catalogue-qualified.`);
  }
  if (
    !/^[a-f0-9]{64}$/u.test(entry.sha256) ||
    entry.width !== discoveryThumbnailManifest.width ||
    entry.height !== discoveryThumbnailManifest.height ||
    !Number.isInteger(entry.bytes) ||
    entry.bytes <= 0 ||
    entry.bytes > discoveryThumbnailManifest.limits.maximumFileBytes
  ) {
    throw new Error(
      `Discovery thumbnail manifest entry ${entry.key} has invalid integrity, dimensions, or byte bounds; refresh it from decoded source derivatives.`,
    );
  }
  if (manifestKeys.has(entry.key) || manifestHashes.has(entry.sha256)) {
    throw new Error(
      `Discovery thumbnail manifest entry ${entry.key} duplicates a qualified key or byte hash; every reviewed derivative must be unique.`,
    );
  }
  manifestKeys.add(entry.key);
  manifestHashes.add(entry.sha256);
}
const manifestEntriesByKey = new Map(manifestEntries.map((entry) => [entry.key, entry]));
execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.resolve("scripts/check-discovery-thumbnail-decode.ps1"),
    "-ManifestPath",
    discoveryThumbnailManifestPath,
    "-AssetsRoot",
    discoveryAssetsRoot,
  ],
  { cwd: path.resolve("."), encoding: "utf8", windowsHide: true },
);

const files = await listFiles(archiveOutputDirectory);
const forbiddenFile = files.find((file) => forbiddenFileExtensions.has(path.extname(file).toLowerCase()));
if (forbiddenFile) {
  const extension = path.extname(forbiddenFile).toLowerCase();
  const kind = extension === ".wasm" ? "decoder WASM" : "WebP asset";
  throw new Error(
    `Archive build contains forbidden runtime ${kind} ${path.relative(archiveOutputDirectory, forbiddenFile)}; keep source conversion in the Node fixture generator.`,
  );
}
const leakedStudioCandidate = files.find((file) =>
  studioOnlyCandidateName.test(path.relative(archiveOutputDirectory, file)),
);
if (leakedStudioCandidate) {
  throw new Error(
    `Archive build contains Studio-only candidate ${path.relative(archiveOutputDirectory, leakedStudioCandidate)}; Archive may ship only the four published derivatives.`,
  );
}

const discoveryThumbnails = files.filter((file) => path.extname(file).toLowerCase() === ".jpg");
if (discoveryThumbnails.length !== manifestEntries.length) {
  throw new Error(
    `Archive build contains ${discoveryThumbnails.length} JPEG files; the reviewed manifest requires exactly ${manifestEntries.length} list thumbnails and no full Studio source studies. Rebuild the integrity-bound thumbnail tier before shipping.`,
  );
}
let discoveryThumbnailBytes = 0;
const seenKeys = new Set();
for (const file of discoveryThumbnails) {
  const bytes = await readFile(file);
  const relativeOutputPath = path.relative(archiveOutputDirectory, file).replaceAll(path.sep, "/");
  const thumbnailKey = discoveryKeyFromOutputPath(relativeOutputPath);
  const entry = manifestEntriesByKey.get(thumbnailKey);
  discoveryThumbnailBytes += bytes.byteLength;
  if (bytes.byteLength > discoveryThumbnailManifest.limits.maximumFileBytes) {
    throw new Error(
      `Archive discovery asset ${path.relative(archiveOutputDirectory, file)} is ${bytes.byteLength} bytes; only reviewed list thumbnails at or below ${discoveryThumbnailManifest.limits.maximumFileBytes} bytes may cross the Studio boundary.`,
    );
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  const dimensions = readJpegHeaderSize(bytes);
  if (
    dimensions.width !== discoveryThumbnailManifest.width ||
    dimensions.height !== discoveryThumbnailManifest.height
  ) {
    throw new Error(
      `Archive discovery asset ${path.relative(archiveOutputDirectory, file)} declares ${dimensions.width} by ${dimensions.height} in its JPEG header, not the reviewed ${discoveryThumbnailManifest.width} by ${discoveryThumbnailManifest.height} boundary.`,
    );
  }
  if (!entry || entry.sha256 !== hash || entry.bytes !== bytes.byteLength || seenKeys.has(thumbnailKey)) {
    throw new Error(
      `Archive discovery asset ${relativeOutputPath} does not contain the exact bytes bound to ${thumbnailKey}; keep the catalogue-qualified output path and refresh assets with their manifest.`,
    );
  }
  seenKeys.add(thumbnailKey);
}
if (
  discoveryThumbnailBytes !== discoveryThumbnailManifest.totalBytes ||
  seenKeys.size !== manifestEntries.length ||
  [...manifestKeys].some((key) => !seenKeys.has(key))
) {
  throw new Error(
    `Archive discovery JPEGs total ${discoveryThumbnailBytes} bytes across ${seenKeys.size} exact key bindings, not the reviewed ${discoveryThumbnailManifest.totalBytes} bytes across ${manifestEntries.length}; refresh catalogue thumbnails and their manifest together.`,
  );
}

for (const file of files) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const contents = await readFile(file, "utf8");
  for (const forbidden of forbiddenText) {
    if (forbidden.pattern.test(contents)) {
      throw new Error(
        `Archive build ${path.relative(archiveOutputDirectory, file)} contains ${forbidden.label}; keep source conversion in the Node fixture generator.`,
      );
    }
  }
}

console.log(
  `Archive bundle boundary passed for ${files.length} files: ${discoveryThumbnails.length} bounded discovery thumbnails (${discoveryThumbnailBytes} bytes), with no full Studio studies, decoder WASM, or WebP runtime markers.`,
);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(absolute) : [absolute];
    }),
  );
  return nested.flat().sort();
}

function discoveryKeyFromOutputPath(outputPath) {
  const match =
    /^assets\/discovery\/(?<catalogue>[a-z0-9]+(?:-[a-z0-9]+)*)\/(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)-[A-Za-z0-9_-]{8}\.jpg$/u.exec(
      outputPath,
    );
  if (!match?.groups) {
    throw new Error(
      `Archive discovery asset ${outputPath} lost its assets/discovery/<catalogue>/<slug>-<hash>.jpg identity; preserve qualified output paths so payload swaps remain detectable.`,
    );
  }
  return `${match.groups.catalogue}/${match.groups.slug}.jpg`;
}

function readJpegHeaderSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Archive discovery asset is not JPEG.");
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
  throw new Error("Archive discovery JPEG dimensions are missing.");
}
