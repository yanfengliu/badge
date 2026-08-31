import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";
import { starterBadges } from "@badge/catalogue-fixtures/archive";

import { APP_MARKERS } from "./local-launcher.mjs";

const outputDirectory = path.resolve("dist/local");
const htmlPath = path.join(outputDirectory, "index.html");
const studioDocumentPath = path.join(outputDirectory, "studio", "index.html");
const manifestPath = path.join(outputDirectory, ".vite", "manifest.json");
const [html, manifestSource] = await Promise.all([
  readFile(htmlPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);

const MAX_HOST_SHELL_CODE_BROTLI_BYTES = 96 * 1024;
const MAX_ARCHIVE_STARTUP_CODE_BROTLI_BYTES = 280 * 1024;
const MAX_ARCHIVE_STARTUP_ART_BYTES = 1080 * 1024;
const MAX_ARCHIVE_STARTUP_TRANSFER_BYTES = 1400 * 1024;

function normalizedPath(value) {
  return value.replaceAll("\\", "/");
}

function manifestKeyForSource(manifest, sourceSuffix) {
  const normalizedSuffix = normalizedPath(sourceSuffix);
  return Object.entries(manifest).find(([key, value]) => {
    const source = typeof value?.src === "string" ? value.src : key;
    return normalizedPath(source).endsWith(normalizedSuffix);
  })?.[0];
}

function collectManifestClosure(manifest, rootKey, includeDynamicImports) {
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk || typeof chunk.file !== "string") {
      throw new Error(`The host manifest references missing chunk ${key}.`);
    }
    visited.add(key);
    for (const importedKey of chunk.imports ?? []) visit(importedKey);
    if (includeDynamicImports) {
      for (const importedKey of chunk.dynamicImports ?? []) visit(importedKey);
    }
  };
  visit(rootKey);
  return visited;
}

function manifestFiles(manifest, keys, extensions) {
  return [
    ...new Set(
      [...keys].flatMap((key) => {
        const chunk = manifest[key];
        return [chunk?.file, ...(chunk?.css ?? [])].filter(
          (file) => typeof file === "string" && extensions.some((extension) => file.endsWith(extension)),
        );
      }),
    ),
  ];
}

async function compressedCodeBytes(manifest, keys) {
  const files = manifestFiles(manifest, keys, [".js", ".css"]);
  const sources = await Promise.all(files.map((file) => readFile(path.join(outputDirectory, file))));
  return sources.reduce(
    (total, source) =>
      total +
      brotliCompressSync(source, {
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
      }).byteLength,
    0,
  );
}

async function combinedJavaScriptSource(manifest, keys) {
  const files = manifestFiles(manifest, keys, [".js"]);
  return (await Promise.all(files.map((file) => readFile(path.join(outputDirectory, file), "utf8")))).join(
    "\n",
  );
}

if (
  !html.includes(APP_MARKERS.badge) ||
  !html.includes('<div id="root"></div>') ||
  html.includes('content="archive"') ||
  html.includes('content="studio"')
) {
  throw new Error("The built root document must identify the complete single-root Badge application.");
}

try {
  await access(studioDocumentPath);
  throw new Error(
    "The built site still contains studio/index.html; Badge Studio must be a root-page section.",
  );
} catch (error) {
  if (!(error && typeof error === "object" && error.code === "ENOENT")) throw error;
}

const manifest = JSON.parse(manifestSource);
const entry = manifest["index.html"];
if (!entry?.isEntry || typeof entry.file !== "string") {
  throw new Error("The built root document has no manifest-bound host entry chunk.");
}

const archiveKey = manifestKeyForSource(manifest, "/archive-web/src/ArchiveSurface.tsx");
const studioKey = manifestKeyForSource(manifest, "/studio-web/src/StudioSurface.tsx");
if (!archiveKey || !studioKey) {
  throw new Error("The root host must keep Archive and Studio as separately manifest-bound surface chunks.");
}
const rootDynamicImports = new Set(entry.dynamicImports ?? []);
if (!rootDynamicImports.has(archiveKey) || !rootDynamicImports.has(studioKey)) {
  throw new Error(
    "The root host must defer both Archive and Studio from its loading shell and select one by root-document state.",
  );
}

const hostStaticClosure = collectManifestClosure(manifest, "index.html", false);
const archiveStaticClosure = collectManifestClosure(manifest, archiveKey, false);
if (archiveStaticClosure.has(studioKey)) {
  throw new Error("Opening Archive must not load the Badge Studio surface chunk.");
}
const archiveStaticSource = await combinedJavaScriptSource(manifest, archiveStaticClosure);
if (!archiveStaticSource.includes("The Field Archive")) {
  throw new Error("The Archive startup closure no longer contains the Collection surface.");
}
for (const forbiddenMarker of ["A shape for the memory.", "Adjust light", "Reset view"]) {
  if (archiveStaticSource.includes(forbiddenMarker)) {
    throw new Error(
      `The Archive startup closure contains deferred Studio or live-renderer marker ${JSON.stringify(forbiddenMarker)}.`,
    );
  }
}

const archiveDeferredKeys = [
  ...new Set([...archiveStaticClosure].flatMap((key) => manifest[key]?.dynamicImports ?? [])),
];
const archiveDeferredSources = await Promise.all(
  archiveDeferredKeys.map(async (key) => ({
    key,
    source: await readFile(path.join(outputDirectory, manifest[key].file), "utf8"),
  })),
);
const rendererKey = archiveDeferredSources.find(
  ({ source }) => source.includes("Adjust light") && source.includes("Reset view"),
)?.key;
if (!rendererKey) {
  throw new Error("The host build has no separately manifest-bound live renderer chunk.");
}
if (archiveStaticClosure.has(rendererKey)) {
  throw new Error(
    "Opening the Archive collection must defer the live 3D renderer until an inspection surface needs it.",
  );
}
const archiveReachableClosure = collectManifestClosure(manifest, archiveKey, true);
if (!archiveReachableClosure.has(rendererKey)) {
  throw new Error("Archive inspection surfaces no longer reach the shared live renderer chunk.");
}

const [hostShellCodeBrotliBytes, archiveStartupCodeBrotliBytes, starterArtStats] = await Promise.all([
  compressedCodeBytes(manifest, hostStaticClosure),
  compressedCodeBytes(manifest, new Set([...hostStaticClosure, ...archiveStaticClosure])),
  Promise.all(
    starterBadges.map(async ({ sourceUrl, title }) => {
      const relativePath = sourceUrl.replace(/^\/+|\?.*$/gu, "");
      if (!relativePath || relativePath.includes("..") || path.isAbsolute(relativePath)) {
        throw new Error(`Archive startup art for ${title} has unsafe public URL ${sourceUrl}.`);
      }
      return stat(path.join(outputDirectory, relativePath));
    }),
  ),
]);
const archiveStartupArtBytes = starterArtStats.reduce((total, asset) => total + asset.size, 0);
const archiveStartupTransferBytes = archiveStartupCodeBrotliBytes + archiveStartupArtBytes;
if (hostShellCodeBrotliBytes > MAX_HOST_SHELL_CODE_BROTLI_BYTES) {
  throw new Error(
    `The root host loading shell is ${hostShellCodeBrotliBytes} Brotli code bytes; keep it at or below ${MAX_HOST_SHELL_CODE_BROTLI_BYTES}.`,
  );
}
if (archiveStartupCodeBrotliBytes > MAX_ARCHIVE_STARTUP_CODE_BROTLI_BYTES) {
  throw new Error(
    `Archive startup is ${archiveStartupCodeBrotliBytes} Brotli JavaScript and CSS bytes; keep it at or below ${MAX_ARCHIVE_STARTUP_CODE_BROTLI_BYTES}.`,
  );
}
if (archiveStartupArtBytes > MAX_ARCHIVE_STARTUP_ART_BYTES) {
  throw new Error(
    `Archive startup art is ${archiveStartupArtBytes} bytes; keep the trusted current source set at or below ${MAX_ARCHIVE_STARTUP_ART_BYTES}.`,
  );
}
if (archiveStartupTransferBytes > MAX_ARCHIVE_STARTUP_TRANSFER_BYTES) {
  throw new Error(
    `Archive startup is ${archiveStartupTransferBytes} budgeted transfer bytes across Brotli code and trusted current art; keep it at or below ${MAX_ARCHIVE_STARTUP_TRANSFER_BYTES}.`,
  );
}

const completeHostClosure = collectManifestClosure(manifest, "index.html", true);
const completeHostSource = await combinedJavaScriptSource(manifest, completeHostClosure);
for (const surface of ["Badge Archive", "Badge Studio"]) {
  if (!completeHostSource.includes(surface)) {
    throw new Error(`The single root host does not compose the ${surface} surface.`);
  }
}

const entryBytes = (await stat(path.join(outputDirectory, entry.file))).size;
console.log(
  `Single-root site build passed: ${entryBytes} entry bytes, ${hostShellCodeBrotliBytes} Brotli shell-code bytes, and ${archiveStartupTransferBytes} budgeted Archive-startup bytes (${archiveStartupCodeBrotliBytes} Brotli code + ${archiveStartupArtBytes} current art) with deferred Studio and renderer chunks.`,
);
