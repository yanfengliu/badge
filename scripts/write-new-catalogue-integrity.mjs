import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createServer } from "vite";

const root = process.cwd();
const aggregateOutputFile = path.resolve(
  root,
  "packages/catalogue-authoring/src/new-catalogue-selected-source-hashes.ts",
);
const outputDirectory = path.dirname(aggregateOutputFile);
const assetsRoot = path.resolve(root, "packages/catalogue-authoring/assets");
const maximumGeneratedSourceLines = 499;
const rendererImplementationFiles = [
  "scripts/render-code-native-catalogue-art.mjs",
  "scripts/code-native-art/flat-raster.mjs",
  "scripts/code-native-art/png.mjs",
];
const outputPartitions = [
  {
    id: "books-read",
    exportName: "newCatalogueSelectedSourceIntegrityBooksRead",
    moduleName: "new-catalogue-selected-source-hashes-books-read",
  },
  {
    id: "life-milestones",
    exportName: "newCatalogueSelectedSourceIntegrityLifeMilestones",
    moduleName: "new-catalogue-selected-source-hashes-life-milestones",
  },
  {
    id: "video-games",
    exportName: "newCatalogueSelectedSourceIntegrityVideoGames",
    moduleName: "new-catalogue-selected-source-hashes-video-games",
  },
  {
    id: "michelin-dining/bay-area",
    exportName: "newCatalogueSelectedSourceIntegrityMichelinDiningBayArea",
    moduleName: "new-catalogue-selected-source-hashes-michelin-dining-bay-area",
  },
  {
    id: "michelin-dining/new-york-city-a-m",
    exportName: "newCatalogueSelectedSourceIntegrityMichelinDiningNewYorkCityAM",
    moduleName: "new-catalogue-selected-source-hashes-michelin-dining-new-york-city-a-m",
  },
  {
    id: "michelin-dining/new-york-city-n-z",
    exportName: "newCatalogueSelectedSourceIntegrityMichelinDiningNewYorkCityNZ",
    moduleName: "new-catalogue-selected-source-hashes-michelin-dining-new-york-city-n-z",
  },
  {
    id: "michelin-dining/washington-dc",
    exportName: "newCatalogueSelectedSourceIntegrityMichelinDiningWashingtonDc",
    moduleName: "new-catalogue-selected-source-hashes-michelin-dining-washington-dc",
  },
];

const server = await createServer({
  root,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const [books, education, dining, videoGames, prompts, codeNative, existingIntegrity] = await Promise.all([
    server.ssrLoadModule("/packages/catalogue-authoring/src/books-edition.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/education-milestones.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/michelin-dining.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/video-games-edition.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/manufacturable-prompt-recipe.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/code-native-art-recipes.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/new-catalogue-selected-source-hashes.ts"),
  ]);
  const groups = [
    {
      assetDirectory: "books-read",
      records: books.bookAuthoringRecords,
      campaign: books.bookAuthoringCampaign,
      partitionId: () => "books-read",
    },
    {
      assetDirectory: "life-milestones",
      records: education.educationMilestoneAuthoringRecords,
      campaign: education.educationMilestoneCampaign,
      partitionId: () => "life-milestones",
    },
    {
      assetDirectory: "video-games",
      records: videoGames.videoGameAuthoringRecords,
      campaign: videoGames.videoGameAuthoringCampaign,
      partitionId: () => "video-games",
    },
    {
      assetDirectory: "michelin-dining",
      records: dining.michelinDiningAuthoringRecords,
      campaign: dining.michelinDiningCampaign,
      partitionId: (record) => {
        if (record.restaurant.regionId !== "new-york-city") {
          return `michelin-dining/${record.restaurant.regionId}`;
        }
        return record.slug.localeCompare("n", "en-US") < 0
          ? "michelin-dining/new-york-city-a-m"
          : "michelin-dining/new-york-city-n-z";
      },
    },
  ];
  const integrityByKey = {};
  const integrityByPartition = Object.fromEntries(outputPartitions.map(({ id }) => [id, {}]));
  const rendererImplementationSha256 = await sha256Files(rendererImplementationFiles);
  let codeNativeReplacementCount = 0;
  let directCodeNativeCount = 0;
  for (const group of groups) {
    const projectsByDefinitionId = new Map(group.campaign.map((project) => [project.definitionId, project]));
    for (const record of group.records) {
      const key = `${group.assetDirectory}/${record.slug}`;
      if (integrityByKey[key]) {
        throw new Error(
          `New catalogue integrity found duplicate key ${key}; assign one unique directory and slug to every selected source study.`,
        );
      }
      const project = projectsByDefinitionId.get(record.definitionId);
      const primary = project?.candidates.find(
        (candidate) => candidate.candidateKey === project.primaryCandidateKey,
      );
      if (!project || !primary) {
        throw new Error(
          `New catalogue integrity found no primary prompt for ${key}; repair its campaign before refreshing hashes.`,
        );
      }
      const sourceFile = path.join(assetsRoot, group.assetDirectory, `${record.slug}.jpg`);
      const thumbnailFile = path.join(assetsRoot, group.assetDirectory, "thumbnails", `${record.slug}.jpg`);
      const sourceBytes = await readBounded(sourceFile, 256 * 1024, "selected source study");
      const thumbnailBytes = await readBounded(thumbnailFile, 16 * 1024, "list thumbnail");
      const canonicalPrompt = prompts.compileManufacturableCandidatePrompt(project.brief, primary).prompt;
      const canonicalPromptSha256 = sha256(new TextEncoder().encode(canonicalPrompt));
      const sourceSha256 = sha256(sourceBytes);
      const priorIntegrity = existingIntegrity.newCatalogueSelectedSourceIntegrity[key];
      const codeNativeRecipe = codeNative.findCodeNativeArtRecipe(group.assetDirectory, record.slug);
      if (codeNativeRecipe) {
        const priorWasDirect = priorIntegrity?.sourceWorkflow === "direct-code-native";
        const canonicalSourceSha256 = priorWasDirect
          ? undefined
          : (priorIntegrity?.canonicalSourceSha256 ??
            priorIntegrity?.inputSourceSha256 ??
            priorIntegrity?.sourceSha256);
        const codeNativeBinding = {
          sourceSha256,
          canonicalPromptSha256,
          designBriefSha256: sha256(
            new TextEncoder().encode(codeNative.serializeCodeNativeArtRecipe(codeNativeRecipe)),
          ),
          rendererImplementationSha256,
          thumbnailSha256: sha256(thumbnailBytes),
        };
        if (canonicalSourceSha256) {
          codeNativeReplacementCount += 1;
          integrityByKey[key] = {
            sourceWorkflow: "code-native-replacement",
            ...codeNativeBinding,
            canonicalSourceSha256,
          };
        } else {
          directCodeNativeCount += 1;
          integrityByKey[key] = {
            sourceWorkflow: "direct-code-native",
            ...codeNativeBinding,
          };
        }
      } else {
        integrityByKey[key] = {
          sourceWorkflow: "canonical-imagegen",
          sourceSha256,
          canonicalPromptSha256,
          thumbnailSha256: sha256(thumbnailBytes),
        };
      }
      const partitionId = group.partitionId(record);
      const partition = integrityByPartition[partitionId];
      if (!partition) {
        throw new Error(
          `New catalogue integrity has no generated output partition for ${key} (${partitionId}); register its stable partition before refreshing hashes.`,
        );
      }
      partition[key] = integrityByKey[key];
    }
  }
  if (Object.keys(integrityByKey).length === 0) {
    throw new Error(
      "New catalogue integrity found no selected studies; supply at least one authoring record.",
    );
  }

  for (const partition of outputPartitions) {
    const records = integrityByPartition[partition.id];
    if (Object.keys(records).length === 0) {
      throw new Error(
        `New catalogue integrity output partition ${partition.id} is empty; remove the partition or restore its authoring records.`,
      );
    }
    const source = [
      "// Generated by scripts/write-new-catalogue-integrity.mjs after visual review and asset normalization.",
      'import type { NewCatalogueSelectedSourceIntegrity } from "./new-catalogue-selected-source-hashes";',
      "",
      `export const ${partition.exportName}: Readonly<`,
      "  Record<string, NewCatalogueSelectedSourceIntegrity>",
      `> = ${formatIntegrityRecord(records)};`,
      "",
    ].join("\n");
    await writeGeneratedModule(path.join(outputDirectory, `${partition.moduleName}.ts`), source);
  }

  const source = [
    "// Generated by scripts/write-new-catalogue-integrity.mjs after visual review and asset normalization.",
    "// Digests bind selected bytes and list derivatives to either an exact canonical prompt or an exact code-native design history.",
    "// A superseded canonical digest records lineage only; it does not claim that its pixels were an input to the code-native renderer.",
    ...outputPartitions.flatMap((partition) => [
      `import { ${partition.exportName} } from "./${partition.moduleName}";`,
    ]),
    "",
    "export type NewCatalogueSelectedSourceIntegrity =",
    "  | {",
    '      readonly sourceWorkflow: "canonical-imagegen";',
    "      readonly sourceSha256: string;",
    "      readonly canonicalPromptSha256: string;",
    "      readonly thumbnailSha256: string;",
    "    }",
    "  | {",
    '      readonly sourceWorkflow: "code-native-replacement";',
    "      readonly sourceSha256: string;",
    "      readonly canonicalSourceSha256: string;",
    "      readonly canonicalPromptSha256: string;",
    "      readonly designBriefSha256: string;",
    "      readonly rendererImplementationSha256: string;",
    "      readonly thumbnailSha256: string;",
    "    }",
    "  | {",
    '      readonly sourceWorkflow: "direct-code-native";',
    "      readonly sourceSha256: string;",
    "      readonly canonicalPromptSha256: string;",
    "      readonly designBriefSha256: string;",
    "      readonly rendererImplementationSha256: string;",
    "      readonly thumbnailSha256: string;",
    "    };",
    "",
    "export const newCatalogueSelectedSourceIntegrity: Readonly<",
    "  Record<string, NewCatalogueSelectedSourceIntegrity>",
    "> = {",
    ...outputPartitions.map((partition) => `  ...${partition.exportName},`),
    "};",
    "",
  ].join("\n");
  await writeGeneratedModule(aggregateOutputFile, source);
  process.stdout.write(
    `Bound ${Object.keys(integrityByKey).length} new catalogue studies to source, thumbnail, and immutable design-history SHA-256 digests (${codeNativeReplacementCount} code-native replacements; ${directCodeNativeCount} direct code-native).\n`,
  );
} finally {
  await server.close();
}

async function readBounded(file, maximumBytes, kind) {
  let bytes;
  try {
    bytes = await readFile(file);
  } catch (error) {
    throw new Error(
      `New catalogue integrity could not read ${kind} ${file}; prepare every normalized source and thumbnail before refreshing hashes.`,
      { cause: error },
    );
  }
  if (bytes.byteLength > maximumBytes) {
    throw new Error(
      `New catalogue integrity rejected ${kind} ${file} at ${bytes.byteLength} bytes; keep it at or below ${maximumBytes} bytes.`,
    );
  }
  return bytes;
}

async function writeGeneratedModule(file, source) {
  const lineCount = source.endsWith("\n") ? source.split("\n").length - 1 : source.split("\n").length;
  if (lineCount > maximumGeneratedSourceLines) {
    throw new Error(
      `New catalogue integrity would write ${file} at ${lineCount} lines; split its output partition so every generated TypeScript module stays below 500 lines.`,
    );
  }
  await writeFile(file, source, "utf8");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

function formatIntegrityRecord(record) {
  const entries = Object.entries(record).map(
    ([key, value]) =>
      `  ${JSON.stringify(key)}: {\n` +
      `    sourceWorkflow: ${JSON.stringify(value.sourceWorkflow)},\n` +
      `    sourceSha256: ${JSON.stringify(value.sourceSha256)},\n` +
      `    canonicalPromptSha256: ${JSON.stringify(value.canonicalPromptSha256)},\n` +
      (value.canonicalSourceSha256
        ? `    canonicalSourceSha256: ${JSON.stringify(value.canonicalSourceSha256)},\n`
        : "") +
      (value.designBriefSha256
        ? `    designBriefSha256: ${JSON.stringify(value.designBriefSha256)},\n`
        : "") +
      (value.rendererImplementationSha256
        ? `    rendererImplementationSha256: ${JSON.stringify(value.rendererImplementationSha256)},\n`
        : "") +
      `    thumbnailSha256: ${JSON.stringify(value.thumbnailSha256)},\n` +
      "  },",
  );
  return `{\n${entries.join("\n")}\n}`;
}
