import path from "node:path";
import process from "node:process";

import { createServer } from "vite";

const root = process.cwd();
const requestedSlugs = new Set(process.argv.slice(2));
const server = await createServer({
  root,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const catalogue = await server.ssrLoadModule(path.posix.join("/packages/catalogue-authoring/src/index.ts"));
  const parksByBadgeKey = new Map(catalogue.usNationalParks.map((park) => [park.artBrief.badgeKey, park]));
  const rows = catalogue.nationalParkCampaign
    .filter((project) => {
      const park = parksByBadgeKey.get(project.brief.badgeKey);
      return park && (requestedSlugs.size === 0 || requestedSlugs.has(park.slug));
    })
    .map((project) => {
      const park = parksByBadgeKey.get(project.brief.badgeKey);
      const candidate = project.candidates.find(
        (entry) => entry.candidateKey === project.selectedCandidateKey,
      );
      if (!park || !candidate) {
        throw new Error(
          `Catalogue project ${project.projectId} has no park or selected candidate; repair the campaign before generating art.`,
        );
      }
      return {
        slug: park.slug,
        candidateKey: candidate.candidateKey,
        ...catalogue.compileCandidatePrompt(project.brief, candidate),
      };
    });
  if (requestedSlugs.size > 0 && rows.length !== requestedSlugs.size) {
    const found = new Set(rows.map((row) => row.slug));
    const missing = [...requestedSlugs].filter((slug) => !found.has(slug));
    throw new Error(`Unknown national-park prompt slug(s): ${missing.join(", ")}.`);
  }
  process.stdout.write(`${JSON.stringify(rows)}\n`);
} finally {
  await server.close();
}
