import path from "node:path";
import process from "node:process";

import { createServer } from "vite";

const root = process.cwd();
const requestedSelectors = new Set(process.argv.slice(2).map((value) => value.toLowerCase()));
const server = await createServer({
  root,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const [books, education, dining, recipes] = await Promise.all([
    server.ssrLoadModule(path.posix.join("/packages/catalogue-authoring/src/books-edition.ts")),
    server.ssrLoadModule(path.posix.join("/packages/catalogue-authoring/src/education-milestones.ts")),
    server.ssrLoadModule(path.posix.join("/packages/catalogue-authoring/src/michelin-dining.ts")),
    server.ssrLoadModule(
      path.posix.join("/packages/catalogue-authoring/src/manufacturable-prompt-recipe.ts"),
    ),
  ]);
  const groups = [
    {
      selector: "books",
      catalogueDirectory: "books-read",
      records: books.bookAuthoringRecords,
      campaign: books.bookAuthoringCampaign,
    },
    {
      selector: "education",
      catalogueDirectory: "life-milestones",
      records: education.educationMilestoneAuthoringRecords,
      campaign: education.educationMilestoneCampaign,
    },
    {
      selector: "michelin",
      catalogueDirectory: "michelin-dining",
      records: dining.michelinDiningAuthoringRecords,
      campaign: dining.michelinDiningCampaign,
    },
  ];
  const rows = groups.flatMap((group) => {
    const recordsByDefinitionId = new Map(group.records.map((record) => [record.definitionId, record]));
    return group.campaign.flatMap((project) => {
      const record = recordsByDefinitionId.get(project.definitionId);
      const primary = project.candidates.find(
        (candidate) => candidate.candidateKey === project.primaryCandidateKey,
      );
      if (!record || !primary) {
        throw new Error(
          `New catalogue project ${project.projectId} has no record or primary candidate; repair the campaign before generating art.`,
        );
      }
      if (
        requestedSelectors.size > 0 &&
        !requestedSelectors.has(group.selector) &&
        !requestedSelectors.has(record.slug)
      ) {
        return [];
      }
      const compiled = recipes.compileManufacturableCandidatePrompt(project.brief, primary);
      return [
        {
          catalogueDirectory: group.catalogueDirectory,
          definitionId: record.definitionId,
          slug: record.slug,
          candidateKey: primary.candidateKey,
          promptRecipe: compiled.recipe,
          prompt: compiled.prompt,
        },
      ];
    });
  });

  if (requestedSelectors.size > 0) {
    const knownSelectors = new Set([
      ...groups.map((group) => group.selector),
      ...groups.flatMap((group) => group.records.map((record) => record.slug)),
    ]);
    const missing = [...requestedSelectors].filter((selector) => !knownSelectors.has(selector));
    if (missing.length > 0) {
      throw new Error(
        `Unknown new-catalogue selector(s): ${missing.join(", ")}; use books, education, michelin, or an exact record slug.`,
      );
    }
  }

  process.stdout.write(`${JSON.stringify(rows)}\n`);
} finally {
  await server.close();
}
