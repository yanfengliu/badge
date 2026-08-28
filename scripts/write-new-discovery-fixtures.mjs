import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { createServer } from "vite";

const root = process.cwd();
const BAY_AREA_PARTITION_SIZE = 21;
const VIDEO_GAME_PARTITION_SIZE = 25;
const server = await createServer({
  root,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const catalogue = await server.ssrLoadModule(
    "/packages/catalogue-authoring/src/selected-catalogue-studies.ts",
  );
  const expectedCounts = {
    selectedBookStudies: 50,
    selectedEducationMilestoneStudies: 2,
    selectedMichelinDiningStudies: 132,
    selectedVideoGameStudies: 50,
  };
  for (const [exportName, expectedCount] of Object.entries(expectedCounts)) {
    const records = catalogue[exportName];
    if (!Array.isArray(records) || records.length !== expectedCount) {
      throw new Error(
        `New discovery projection expected ${expectedCount} records from ${exportName}; found ${String(records?.length)}.`,
      );
    }
  }

  const bookRows = catalogue.selectedBookStudies.map((record) =>
    row(record, record.selectedSource.accessibleDescription),
  );
  const educationRows = catalogue.selectedEducationMilestoneStudies.map((record) =>
    row(record, record.selectedSource.accessibleDescription),
  );
  const videoGameRows = catalogue.selectedVideoGameStudies.map((record) =>
    row(record, record.selectedSource.accessibleDescription),
  );
  const diningRowsByRegion = Object.fromEntries(
    ["bay-area", "new-york-city", "washington-dc"].map((regionId) => [
      regionId,
      catalogue.selectedMichelinDiningStudies
        .filter((record) => record.restaurant.regionId === regionId)
        .map((record) =>
          row(
            record,
            record.selectedSource.accessibleDescription,
            record.restaurant.guideUrl,
            visualEvidenceUrl(record.restaurant),
          ),
        ),
    ]),
  );

  await Promise.all([
    writeProjection({
      outputName: "discovery-books.ts",
      exportName: "discoveryBooks",
      rows: bookRows,
      setId: "books-read",
      assetDirectory: "books-read",
      comment: "the closed fifty-work book authoring edition",
    }),
    writeProjection({
      outputName: "discovery-education-milestones.ts",
      exportName: "discoveryEducationMilestones",
      rows: educationRows,
      setId: "life-milestones",
      assetDirectory: "life-milestones",
      comment: "the two education milestone authoring records",
    }),
    writeProjection({
      outputName: "discovery-video-games-01.ts",
      exportName: "discoveryVideoGamesPartOne",
      rows: videoGameRows.slice(0, VIDEO_GAME_PARTITION_SIZE),
      setId: "video-games-played",
      assetDirectory: "video-games",
      comment: "part one of the closed fifty-game editorial edition",
    }),
    writeProjection({
      outputName: "discovery-video-games-02.ts",
      exportName: "discoveryVideoGamesPartTwo",
      rows: videoGameRows.slice(VIDEO_GAME_PARTITION_SIZE),
      setId: "video-games-played",
      assetDirectory: "video-games",
      comment: "part two of the closed fifty-game editorial edition",
    }),
    writeProjection({
      outputName: "discovery-michelin-dining-bay-area-01.ts",
      exportName: "discoveryMichelinDiningBayAreaPartOne",
      rows: diningRowsByRegion["bay-area"].slice(0, BAY_AREA_PARTITION_SIZE),
      setId: "michelin-dining",
      assetDirectory: "michelin-dining",
      regionId: "bay-area",
      comment: "part one of the source-checked nine-county Bay Area restaurant edition",
    }),
    writeProjection({
      outputName: "discovery-michelin-dining-bay-area-02.ts",
      exportName: "discoveryMichelinDiningBayAreaPartTwo",
      rows: diningRowsByRegion["bay-area"].slice(BAY_AREA_PARTITION_SIZE),
      setId: "michelin-dining",
      assetDirectory: "michelin-dining",
      regionId: "bay-area",
      comment: "part two of the source-checked nine-county Bay Area restaurant edition",
    }),
    writeProjection({
      outputName: "discovery-michelin-dining-nyc-01.ts",
      exportName: "discoveryMichelinDiningNycPartOne",
      rows: diningRowsByRegion["new-york-city"].slice(0, 35),
      setId: "michelin-dining",
      assetDirectory: "michelin-dining",
      regionId: "new-york-city",
      comment: "part one of the source-checked New York City restaurant edition",
    }),
    writeProjection({
      outputName: "discovery-michelin-dining-nyc-02.ts",
      exportName: "discoveryMichelinDiningNycPartTwo",
      rows: diningRowsByRegion["new-york-city"].slice(35),
      setId: "michelin-dining",
      assetDirectory: "michelin-dining",
      regionId: "new-york-city",
      comment: "part two of the source-checked New York City restaurant edition",
    }),
    writeProjection({
      outputName: "discovery-michelin-dining-dc.ts",
      exportName: "discoveryMichelinDiningDc",
      rows: diningRowsByRegion["washington-dc"],
      setId: "michelin-dining",
      assetDirectory: "michelin-dining",
      regionId: "washington-dc",
      comment: "the source-checked Washington, DC and surroundings restaurant edition",
    }),
    writeBayAreaAggregator(),
    writeNewYorkAggregator(),
    writeDiningAggregator(),
    writeVideoGamesAggregator(),
  ]);
} finally {
  await server.close();
}

async function writeVideoGamesAggregator() {
  const outputFile = path.resolve(root, "packages/catalogue-fixtures/src/discovery-video-games.ts");
  const source = [
    "// Generated by scripts/write-new-discovery-fixtures.mjs from two bounded video-game partitions.",
    'import { discoveryVideoGamesPartOne } from "./discovery-video-games-01.js";',
    'import { discoveryVideoGamesPartTwo } from "./discovery-video-games-02.js";',
    "",
    "export const discoveryVideoGames = [",
    "  ...discoveryVideoGamesPartOne,",
    "  ...discoveryVideoGamesPartTwo,",
    "] as const;",
    "",
  ].join("\n");
  await writeFile(outputFile, source, "utf8");
}

async function writeBayAreaAggregator() {
  const outputFile = path.resolve(
    root,
    "packages/catalogue-fixtures/src/discovery-michelin-dining-bay-area.ts",
  );
  const source = [
    "// Generated by scripts/write-new-discovery-fixtures.mjs from two bounded Bay Area partitions.",
    'import { discoveryMichelinDiningBayAreaPartOne } from "./discovery-michelin-dining-bay-area-01.js";',
    'import { discoveryMichelinDiningBayAreaPartTwo } from "./discovery-michelin-dining-bay-area-02.js";',
    "",
    "export const discoveryMichelinDiningBayArea = [",
    "  ...discoveryMichelinDiningBayAreaPartOne,",
    "  ...discoveryMichelinDiningBayAreaPartTwo,",
    "] as const;",
    "",
  ].join("\n");
  await writeFile(outputFile, source, "utf8");
}

async function writeDiningAggregator() {
  const outputFile = path.resolve(root, "packages/catalogue-fixtures/src/discovery-michelin-dining.ts");
  const source = [
    "// Generated by scripts/write-new-discovery-fixtures.mjs from the three source-checked regional restaurant editions.",
    'import { discoveryMichelinDiningBayArea } from "./discovery-michelin-dining-bay-area.js";',
    'import { discoveryMichelinDiningDc } from "./discovery-michelin-dining-dc.js";',
    'import { discoveryMichelinDiningNyc } from "./discovery-michelin-dining-nyc.js";',
    "",
    "export const discoveryMichelinDining = [",
    "  ...discoveryMichelinDiningBayArea,",
    "  ...discoveryMichelinDiningNyc,",
    "  ...discoveryMichelinDiningDc,",
    "] as const;",
    "",
  ].join("\n");
  await writeFile(outputFile, source, "utf8");
  process.stdout.write(`Projected the named restaurant aggregate into ${path.relative(root, outputFile)}.\n`);
}

async function writeNewYorkAggregator() {
  const outputFile = path.resolve(root, "packages/catalogue-fixtures/src/discovery-michelin-dining-nyc.ts");
  const source = [
    "// Generated by scripts/write-new-discovery-fixtures.mjs from two bounded New York City partitions.",
    'import { discoveryMichelinDiningNycPartOne } from "./discovery-michelin-dining-nyc-01.js";',
    'import { discoveryMichelinDiningNycPartTwo } from "./discovery-michelin-dining-nyc-02.js";',
    "",
    "export const discoveryMichelinDiningNyc = [",
    "  ...discoveryMichelinDiningNycPartOne,",
    "  ...discoveryMichelinDiningNycPartTwo,",
    "] as const;",
    "",
  ].join("\n");
  await writeFile(outputFile, source, "utf8");
}

function visualEvidenceUrl(restaurant) {
  return restaurant.evidenceSourceUrls.find((url) => new URL(url).hostname !== "guide.michelin.com");
}

function row(record, accessibleDescription, referenceUrl, distinctVisualEvidenceUrl) {
  const values = [
    record.definitionId,
    record.title,
    record.criterion,
    record.contextLabel,
    `${record.slug}.jpg`,
    accessibleDescription,
    record.aliases,
  ];
  if (referenceUrl) values.push(referenceUrl);
  if (distinctVisualEvidenceUrl) values.push(distinctVisualEvidenceUrl);
  return values;
}

async function writeProjection({ outputName, exportName, rows, setId, assetDirectory, regionId, comment }) {
  const outputFile = path.resolve(root, "packages/catalogue-fixtures/src", outputName);
  const serializedRows = rows.map((values) => {
    const lines = values.map((value) => `      ${JSON.stringify(value)},`);
    return ["    [", ...lines, "    ],"].join("\n");
  });
  const source = [
    `// Generated by scripts/write-new-discovery-fixtures.mjs from ${comment}.`,
    "// This Archive-safe file intentionally excludes prompts, source hashes, quotations, and authoring internals.",
    'import { defineSourceStudyBadges } from "./discovery-source-studies.js";',
    "",
    `export const ${exportName} = defineSourceStudyBadges(`,
    "  [",
    serializedRows.join("\n"),
    "  ],",
    `  { setId: ${JSON.stringify(setId)}, assetDirectory: ${JSON.stringify(assetDirectory)}${regionId ? `, regionId: ${JSON.stringify(regionId)}` : ""} },`,
    ");",
    "",
  ].join("\n");
  await writeFile(outputFile, source, "utf8");
  process.stdout.write(`Projected ${rows.length} records into ${path.relative(root, outputFile)}.\n`);
}
