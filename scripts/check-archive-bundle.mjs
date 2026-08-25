import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const archiveOutputDirectory = path.resolve("dist/archive");
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
const discoveryThumbnailContract = {
  count: 63,
  maximumBytes: 8004,
  totalBytes: 373657,
};

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
if (discoveryThumbnails.length !== discoveryThumbnailContract.count) {
  throw new Error(
    `Archive build contains ${discoveryThumbnails.length} JPEG files; Discover requires exactly ${discoveryThumbnailContract.count} reviewed list thumbnails and no full Studio source studies. Rebuild the integrity-bound thumbnail tier before shipping.`,
  );
}
let discoveryThumbnailBytes = 0;
for (const file of discoveryThumbnails) {
  const bytes = await readFile(file);
  discoveryThumbnailBytes += bytes.byteLength;
  if (bytes.byteLength > discoveryThumbnailContract.maximumBytes) {
    throw new Error(
      `Archive discovery asset ${path.relative(archiveOutputDirectory, file)} is ${bytes.byteLength} bytes; only reviewed list thumbnails at or below ${discoveryThumbnailContract.maximumBytes} bytes may cross the Studio boundary.`,
    );
  }
}
if (discoveryThumbnailBytes !== discoveryThumbnailContract.totalBytes) {
  throw new Error(
    `Archive discovery JPEGs total ${discoveryThumbnailBytes} bytes, not the reviewed ${discoveryThumbnailContract.totalBytes}; refresh catalogue thumbnails and their integrity bindings before shipping.`,
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
