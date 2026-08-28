import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createServer } from "vite";

import { regenerateNationalParkThumbnails } from "./national-park-thumbnail-derivation.mjs";

const root = process.cwd();
const outputFile = path.resolve(root, "packages/catalogue-authoring/src/selected-source-hashes.ts");
const lineageOutputFile = path.resolve(
  root,
  "packages/catalogue-authoring/src/selected-source-code-native-lineage.ts",
);
const assetsDirectory = path.resolve(root, "packages/catalogue-authoring/assets/national-parks");
const thumbnailsDirectory = path.join(assetsDirectory, "thumbnails");
const rendererImplementationFiles = [
  "scripts/render-code-native-catalogue-art.mjs",
  "scripts/code-native-art/flat-raster.mjs",
  "scripts/code-native-art/png.mjs",
];

await regenerateNationalParkThumbnails({ repositoryRoot: root });

const server = await createServer({
  root,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const [catalogue, codeNative, existingHashes, existingLineage] = await Promise.all([
    server.ssrLoadModule("/packages/catalogue-authoring/src/index.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/code-native-art-recipes.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/selected-source-hashes.ts"),
    loadOptionalModule(
      server,
      lineageOutputFile,
      "/packages/catalogue-authoring/src/selected-source-code-native-lineage.ts",
    ),
  ]);
  const projectsByBadgeKey = new Map(
    catalogue.nationalParkCampaign.map((project) => [project.brief.badgeKey, project]),
  );
  const assetHashes = {};
  const promptHashes = {};
  const thumbnailHashes = {};
  const lineage = {};
  const rendererImplementationSha256 = await sha256Files(rendererImplementationFiles);
  for (const park of catalogue.usNationalParks) {
    const assetFile = path.join(assetsDirectory, `${park.slug}.jpg`);
    let bytes;
    try {
      bytes = await readFile(assetFile);
    } catch (error) {
      throw new Error(
        `Catalogue integrity could not read selected study ${assetFile}; prepare all 63 source assets before refreshing hashes.`,
        { cause: error },
      );
    }
    if (bytes.byteLength > 256 * 1024) {
      throw new Error(
        `Catalogue integrity rejected ${assetFile} at ${bytes.byteLength} bytes; normalize it to the 256 KiB repository ceiling first.`,
      );
    }
    const project = projectsByBadgeKey.get(park.artBrief.badgeKey);
    const candidate = project?.candidates.find(
      (entry) => entry.candidateKey === project.selectedCandidateKey,
    );
    if (!project || !candidate) {
      throw new Error(
        `Catalogue integrity found no selected prompt candidate for ${park.slug}; repair its authoring project before refreshing hashes.`,
      );
    }
    const prompt = catalogue.compileCandidatePrompt(project.brief, candidate).prompt;
    const promptSha256 = sha256(new TextEncoder().encode(prompt));
    const recipe = codeNative.findCodeNativeArtRecipe("national-parks", park.slug);
    if (!recipe) {
      throw new Error(
        `Catalogue integrity found no code-native replacement recipe for national-parks/${park.slug}; register every reviewed park design before refreshing lineage.`,
      );
    }
    const priorLineage = existingLineage?.nationalParkCodeNativeLineage?.[park.slug];
    const canonicalPromptSha256 =
      priorLineage?.canonicalPromptSha256 ?? existingHashes.selectedSourcePromptHashes[park.slug];
    if (!canonicalPromptSha256 || canonicalPromptSha256 !== promptSha256) {
      throw new Error(
        `Catalogue integrity refused to change the original selected prompt for ${park.slug}; preserve its v1 generation association or record an explicit successor lineage.`,
      );
    }
    assetHashes[park.slug] = sha256(bytes);
    promptHashes[park.slug] = promptSha256;
    lineage[park.slug] = {
      canonicalSourceSha256:
        priorLineage?.canonicalSourceSha256 ?? existingHashes.selectedSourceHashes[park.slug],
      canonicalPromptSha256,
      designBriefSha256: sha256(new TextEncoder().encode(codeNative.serializeCodeNativeArtRecipe(recipe))),
      rendererImplementationSha256,
    };
    const thumbnailFile = path.join(thumbnailsDirectory, `${park.slug}.jpg`);
    let thumbnailBytes;
    try {
      thumbnailBytes = await readFile(thumbnailFile);
    } catch (error) {
      throw new Error(
        `Catalogue integrity could not read list thumbnail ${thumbnailFile}; run npm run catalogue:thumbnails before refreshing hashes.`,
        { cause: error },
      );
    }
    if (thumbnailBytes.byteLength > 16 * 1024) {
      throw new Error(
        `Catalogue integrity rejected ${thumbnailFile} at ${thumbnailBytes.byteLength} bytes; regenerate the 128-pixel list derivative below 16 KiB.`,
      );
    }
    thumbnailHashes[park.slug] = sha256(thumbnailBytes);
  }

  const source = [
    "// Generated by scripts/write-national-park-integrity.mjs after visual selection and asset normalization.",
    "// Tests bind each source study to its compact bytes, list derivative, and recorded exact canonical prompt.",
    "// These digests prove association and immutability, not the historical causation of a model call.",
    `export const selectedSourceHashes: Readonly<Record<string, string>> = ${formatHashRecord(assetHashes)};`,
    "",
    `export const selectedSourcePromptHashes: Readonly<Record<string, string>> = ${formatHashRecord(promptHashes)};`,
    "",
    `export const selectedSourceThumbnailHashes: Readonly<Record<string, string>> = ${formatHashRecord(thumbnailHashes)};`,
    "",
  ].join("\n");
  await writeFile(outputFile, source, "utf8");
  const lineageSource = [
    "// Generated by scripts/write-national-park-integrity.mjs before and after reviewed code-native replacement promotion.",
    'import type { SelectedSourceCodeNativeLineage } from "./types";',
    "",
    "export const nationalParkCodeNativeLineage: Readonly<",
    "  Record<string, SelectedSourceCodeNativeLineage>",
    `> = ${formatLineageRecord(lineage)};`,
    "",
  ].join("\n");
  await writeFile(lineageOutputFile, lineageSource, "utf8");
  process.stdout.write(
    `Regenerated list derivatives and bound ${Object.keys(assetHashes).length} national-park source studies to asset, thumbnail, and prompt SHA-256 digests.\n`,
  );
} finally {
  await server.close();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function formatHashRecord(record) {
  const entries = Object.entries(record).map(([key, value]) => {
    const formattedKey = /^[A-Za-z_$][\w$]*$/u.test(key) ? key : JSON.stringify(key);
    return `  ${formattedKey}: ${JSON.stringify(value)},`;
  });
  return `{\n${entries.join("\n")}\n}`;
}

function formatLineageRecord(record) {
  const entries = Object.entries(record).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );
  return `{\n${entries.join("\n")}\n}`;
}

async function loadOptionalModule(server, file, moduleId) {
  try {
    await readFile(file);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
  return server.ssrLoadModule(moduleId);
}

async function sha256Files(relativeFiles) {
  const hash = createHash("sha256");
  for (const relativeFile of relativeFiles) {
    hash.update(relativeFile, "utf8");
    hash.update("\0", "utf8");
    hash.update(await readFile(path.resolve(root, relativeFile)));
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}
