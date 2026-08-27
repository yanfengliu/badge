import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const archiveOutputDirectory = path.resolve(process.argv[2] ?? "dist/archive");
const discoveryAssetsRoot = path.resolve("packages/catalogue-authoring/assets");
const discoveryThumbnailManifestPath = path.join(discoveryAssetsRoot, "discovery-thumbnails.manifest.json");
const discoveryDetailManifestPath = path.join(discoveryAssetsRoot, "discovery-details.manifest.json");
const discoverySourceManifestPath = path.join(discoveryAssetsRoot, "discovery-sources.manifest.json");
const discoverySourceExcludedKeys = new Set(["national-parks/yosemite.jpg"]);
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
const discoveryDetailManifest = JSON.parse(await readFile(discoveryDetailManifestPath, "utf8"));
const discoverySourceManifest = JSON.parse(await readFile(discoverySourceManifestPath, "utf8"));
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
if (
  discoveryThumbnailManifest.limits?.maximumEntries !== 320 ||
  discoveryThumbnailManifest.limits?.maximumFileBytes !== 16 * 1024 ||
  discoveryThumbnailManifest.limits?.maximumTotalBytes !== 2 * 1024 * 1024 ||
  manifestEntries.length > discoveryThumbnailManifest.limits.maximumEntries ||
  discoveryThumbnailManifest.totalBytes > discoveryThumbnailManifest.limits.maximumTotalBytes
) {
  throw new Error(
    "Discovery thumbnail manifest exceeds the reviewed 320-entry, 16-KiB-per-file, or 2-MiB-total tier; shard the catalogue before shipping more media.",
  );
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
if (
  discoveryDetailManifest.schemaVersion !== 1 ||
  discoveryDetailManifest.recipe?.id !== "catalogue-detail-preview" ||
  discoveryDetailManifest.recipe?.revision !== 1 ||
  discoveryDetailManifest.width !== 384 ||
  discoveryDetailManifest.height !== 384 ||
  discoveryDetailManifest.loading !== "on-demand"
) {
  throw new Error(
    "Discovery detail manifest must declare on-demand catalogue-detail-preview@1 at exactly 384 by 384 pixels; regenerate the reviewed tier.",
  );
}
const detailManifestEntries = discoveryDetailManifest.entries;
if (!Array.isArray(detailManifestEntries) || detailManifestEntries.length !== manifestEntries.length) {
  throw new Error(
    `Discovery detail manifest contains ${Array.isArray(detailManifestEntries) ? detailManifestEntries.length : "invalid"} entries; keep exactly one detail preview for each of the ${manifestEntries.length} list studies.`,
  );
}
if (
  discoveryDetailManifest.limits?.maximumEntries !== 320 ||
  discoveryDetailManifest.limits?.maximumFileBytes !== 64 * 1024 ||
  discoveryDetailManifest.limits?.maximumTotalBytes !== 16 * 1024 * 1024 ||
  discoveryDetailManifest.totalBytes > discoveryDetailManifest.limits.maximumTotalBytes
) {
  throw new Error(
    "Discovery detail manifest exceeds the reviewed 320-entry, 64-KiB-per-file, or 16-MiB-total tier; shard the catalogue before shipping more media.",
  );
}
const detailManifestKeys = new Set();
const detailManifestHashes = new Set();
for (const entry of detailManifestEntries) {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/u.test(entry.key) ||
    !/^[a-f0-9]{64}$/u.test(entry.sha256) ||
    entry.width !== discoveryDetailManifest.width ||
    entry.height !== discoveryDetailManifest.height ||
    !Number.isInteger(entry.bytes) ||
    entry.bytes <= 0 ||
    entry.bytes > discoveryDetailManifest.limits.maximumFileBytes ||
    detailManifestKeys.has(entry.key) ||
    detailManifestHashes.has(entry.sha256)
  ) {
    throw new Error(
      `Discovery detail manifest entry ${String(entry.key)} has invalid integrity, dimensions, bounds, or uniqueness; refresh it from decoded detail derivatives.`,
    );
  }
  detailManifestKeys.add(entry.key);
  detailManifestHashes.add(entry.sha256);
}
if ([...manifestKeys].some((key) => !detailManifestKeys.has(key))) {
  throw new Error("Discovery detail manifest keys no longer match the complete list-thumbnail tier.");
}
const detailManifestEntriesByKey = new Map(detailManifestEntries.map((entry) => [entry.key, entry]));
if (
  discoverySourceManifest.schemaVersion !== 1 ||
  discoverySourceManifest.recipe?.id !== "catalogue-source-study" ||
  discoverySourceManifest.recipe?.revision !== 1 ||
  discoverySourceManifest.width !== 896 ||
  discoverySourceManifest.height !== 896 ||
  discoverySourceManifest.loading !== "on-demand"
) {
  throw new Error(
    "Discovery source manifest must declare on-demand catalogue-source-study@1 at exactly 896 by 896 pixels; regenerate the reviewed tier.",
  );
}
const sourceManifestEntries = discoverySourceManifest.entries;
const expectedSourceKeyCount = manifestEntries.length - discoverySourceExcludedKeys.size;
if (!Array.isArray(sourceManifestEntries) || sourceManifestEntries.length !== expectedSourceKeyCount) {
  throw new Error(
    `Discovery source manifest contains ${Array.isArray(sourceManifestEntries) ? sourceManifestEntries.length : "invalid"} entries; keep exactly one canonical study for each of the ${expectedSourceKeyCount} activatable concepts.`,
  );
}
if (
  discoverySourceManifest.limits?.maximumEntries !== 320 ||
  discoverySourceManifest.limits?.maximumFileBytes !== 256 * 1024 ||
  discoverySourceManifest.limits?.maximumTotalBytes !== 48 * 1024 * 1024 ||
  discoverySourceManifest.totalBytes > discoverySourceManifest.limits.maximumTotalBytes
) {
  throw new Error(
    "Discovery source manifest exceeds the reviewed 320-entry, 256-KiB-per-file, or 48-MiB-total tier; shard the catalogue before shipping more media.",
  );
}
const sourceManifestKeys = new Set();
const sourceManifestHashes = new Set();
for (const entry of sourceManifestEntries) {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/u.test(entry.key) ||
    !/^[a-f0-9]{64}$/u.test(entry.sha256) ||
    entry.width !== discoverySourceManifest.width ||
    entry.height !== discoverySourceManifest.height ||
    !Number.isInteger(entry.bytes) ||
    entry.bytes <= 0 ||
    entry.bytes > discoverySourceManifest.limits.maximumFileBytes ||
    discoverySourceExcludedKeys.has(entry.key) ||
    !manifestKeys.has(entry.key) ||
    sourceManifestKeys.has(entry.key) ||
    sourceManifestHashes.has(entry.sha256)
  ) {
    throw new Error(
      `Discovery source manifest entry ${String(entry.key)} has invalid integrity, dimensions, bounds, or uniqueness; refresh it from decoded canonical studies.`,
    );
  }
  sourceManifestKeys.add(entry.key);
  sourceManifestHashes.add(entry.sha256);
}
const sourceManifestEntriesByKey = new Map(sourceManifestEntries.map((entry) => [entry.key, entry]));
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
execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.resolve("scripts/check-discovery-detail-decode.ps1"),
    "-ManifestPath",
    discoveryDetailManifestPath,
    "-AssetsRoot",
    discoveryAssetsRoot,
  ],
  { cwd: path.resolve("."), encoding: "utf8", windowsHide: true },
);
execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.resolve("scripts/check-discovery-source-decode.ps1"),
    "-ManifestPath",
    discoverySourceManifestPath,
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

const archiveJpegs = files.filter((file) => path.extname(file).toLowerCase() === ".jpg");
const discoveryThumbnails = archiveJpegs.filter((file) =>
  path.relative(archiveOutputDirectory, file).replaceAll(path.sep, "/").startsWith("assets/discovery/"),
);
const discoveryDetails = archiveJpegs.filter((file) =>
  path
    .relative(archiveOutputDirectory, file)
    .replaceAll(path.sep, "/")
    .startsWith("assets/discovery-details/"),
);
const discoverySources = archiveJpegs.filter((file) =>
  path
    .relative(archiveOutputDirectory, file)
    .replaceAll(path.sep, "/")
    .startsWith("assets/discovery-sources/"),
);
if (archiveJpegs.length !== discoveryThumbnails.length + discoveryDetails.length + discoverySources.length) {
  throw new Error(
    `Archive build contains ${archiveJpegs.length - discoveryThumbnails.length - discoveryDetails.length - discoverySources.length} unqualified JPEG assets; keep catalogue media in its integrity-bound list, detail, or canonical-source tier.`,
  );
}
const discoveryThumbnailBytes = await validateArchiveMediaTier({
  files: discoveryThumbnails,
  manifest: discoveryThumbnailManifest,
  entriesByKey: manifestEntriesByKey,
  keys: manifestKeys,
  outputTier: "discovery",
  label: "list thumbnail",
});
const discoveryDetailBytes = await validateArchiveMediaTier({
  files: discoveryDetails,
  manifest: discoveryDetailManifest,
  entriesByKey: detailManifestEntriesByKey,
  keys: detailManifestKeys,
  outputTier: "discovery-details",
  label: "on-demand detail preview",
});
const discoverySourceBytes = await validateArchiveMediaTier({
  files: discoverySources,
  manifest: discoverySourceManifest,
  entriesByKey: sourceManifestEntriesByKey,
  keys: sourceManifestKeys,
  outputTier: "discovery-sources",
  label: "on-demand canonical source study",
});

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
  `Archive bundle boundary passed for ${files.length} files: ${discoveryThumbnails.length} bounded list thumbnails (${discoveryThumbnailBytes} bytes), ${discoveryDetails.length} on-demand detail previews (${discoveryDetailBytes} bytes), and ${discoverySources.length} on-demand canonical sources (${discoverySourceBytes} bytes), with no draft Studio candidates, decoder WASM, or WebP runtime markers.`,
);

async function validateArchiveMediaTier({ files, manifest, entriesByKey, keys, outputTier, label }) {
  if (files.length !== manifest.entries.length) {
    throw new Error(
      `Archive build contains ${files.length} ${label} files; the reviewed manifest requires exactly ${manifest.entries.length}. Rebuild the complete integrity-bound tier.`,
    );
  }
  let totalBytes = 0;
  const seenKeys = new Set();
  for (const file of files) {
    const bytes = await readFile(file);
    const relativeOutputPath = path.relative(archiveOutputDirectory, file).replaceAll(path.sep, "/");
    const key = discoveryKeyFromOutputPath(relativeOutputPath, outputTier);
    const entry = entriesByKey.get(key);
    totalBytes += bytes.byteLength;
    const hash = createHash("sha256").update(bytes).digest("hex");
    const dimensions = readJpegHeaderSize(bytes);
    if (
      bytes.byteLength > manifest.limits.maximumFileBytes ||
      dimensions.width !== manifest.width ||
      dimensions.height !== manifest.height ||
      !entry ||
      entry.sha256 !== hash ||
      entry.bytes !== bytes.byteLength ||
      seenKeys.has(key)
    ) {
      throw new Error(
        `Archive ${label} ${relativeOutputPath} does not match the exact manifest-bound bytes, dimensions, or qualified key ${key}; refresh the asset and manifest together.`,
      );
    }
    seenKeys.add(key);
  }
  if (
    totalBytes !== manifest.totalBytes ||
    seenKeys.size !== manifest.entries.length ||
    [...keys].some((key) => !seenKeys.has(key))
  ) {
    throw new Error(
      `Archive ${label} tier totals ${totalBytes} bytes across ${seenKeys.size} keys, not the reviewed ${manifest.totalBytes} bytes across ${manifest.entries.length}; refresh the complete tier.`,
    );
  }
  return totalBytes;
}

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

function discoveryKeyFromOutputPath(outputPath, outputTier) {
  const match = new RegExp(
    `^assets/${outputTier}/(?<catalogue>[a-z0-9]+(?:-[a-z0-9]+)*)/(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)-[A-Za-z0-9_-]{8}\\.jpg$`,
    "u",
  ).exec(outputPath);
  if (!match?.groups) {
    throw new Error(
      `Archive discovery asset ${outputPath} lost its assets/${outputTier}/<catalogue>/<slug>-<hash>.jpg identity; preserve qualified output paths so payload swaps remain detectable.`,
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
