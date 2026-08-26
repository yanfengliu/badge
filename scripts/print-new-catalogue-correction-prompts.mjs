import path from "node:path";
import process from "node:process";

import { createServer } from "vite";

const requestedSlugs = process.argv.slice(2);
if (requestedSlugs.length === 0) {
  throw new Error(
    "New catalogue correction prompt export requires one or more slugs. Pass only visually rejected studies that need a referenced-image correction.",
  );
}

const root = process.cwd();
const server = await createServer({
  root,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const [books, education, dining, corrections] = await Promise.all([
    server.ssrLoadModule("/packages/catalogue-authoring/src/books-edition.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/education-milestones.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/michelin-dining.ts"),
    server.ssrLoadModule("/packages/catalogue-authoring/src/new-catalogue-corrections.ts"),
  ]);
  const groups = [
    {
      assetDirectory: "books-read",
      records: books.bookAuthoringRecords,
      campaign: books.bookAuthoringCampaign,
    },
    {
      assetDirectory: "life-milestones",
      records: education.educationMilestoneAuthoringRecords,
      campaign: education.educationMilestoneCampaign,
    },
    {
      assetDirectory: "michelin-dining",
      records: dining.michelinDiningAuthoringRecords,
      campaign: dining.michelinDiningCampaign,
    },
  ];
  const rows = [];
  for (const slug of requestedSlugs) {
    let match;
    for (const group of groups) {
      const record = group.records.find((candidate) => candidate.slug === slug);
      const project = record
        ? group.campaign.find((candidate) => candidate.definitionId === record.definitionId)
        : undefined;
      if (record && project) {
        match = { group, record, project };
        break;
      }
    }
    if (!match) throw new Error(`New catalogue correction prompt export found no study for slug ${slug}.`);
    if (!corrections.requiresSourceCorrection(slug)) {
      throw new Error(
        `New catalogue correction prompt export refused ${slug}; the independent native review accepted its canonical source.`,
      );
    }
    rows.push({
      catalogueDirectory: match.group.assetDirectory,
      definitionId: match.record.definitionId,
      slug,
      inputPath: path.join(
        root,
        "packages/catalogue-authoring/assets",
        match.group.assetDirectory,
        `${slug}.jpg`,
      ),
      correctionRecipe: corrections.SOURCE_CORRECTION_RECIPE_REF,
      prompt: corrections.compileSourceCorrectionPrompt(match.record, match.project),
    });
  }
  process.stdout.write(`${JSON.stringify(rows)}\n`);
} finally {
  await server.close();
}
