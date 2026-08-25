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
  const catalogue = await server.ssrLoadModule(path.posix.join("/packages/catalogue-authoring/src/index.ts"));
  const statesByDefinitionId = new Map(catalogue.usStates.map((state) => [state.definitionId, state]));
  const rows = catalogue.usStateCampaign
    .filter((project) => {
      const state = statesByDefinitionId.get(project.definitionId);
      return state && (requestedSelectors.size === 0 || matchesSelector(state, requestedSelectors));
    })
    .map((project) => {
      const state = statesByDefinitionId.get(project.definitionId);
      const candidate = project.candidates.find(
        (entry) => entry.candidateKey === project.primaryCandidateKey,
      );
      if (!state || !candidate) {
        throw new Error(
          `State project ${project.projectId} has no state or primary candidate; repair the campaign before generating art.`,
        );
      }
      return {
        catalogueId: catalogue.usStateCatalogueEdition.catalogueId,
        censusStateFips: state.censusStateFips,
        postalCode: state.postalCode,
        slug: state.slug,
        candidateKey: candidate.candidateKey,
        ...catalogue.compileCandidatePrompt(project.brief, candidate),
      };
    });

  if (requestedSelectors.size > 0) {
    const matched = new Set(
      rows.flatMap((row) => [row.censusStateFips, row.postalCode.toLowerCase(), row.slug]),
    );
    const missing = [...requestedSelectors].filter((selector) => !matched.has(selector));
    if (missing.length > 0) {
      throw new Error(
        `Unknown U.S. state selector(s): ${missing.join(", ")}; use a two-digit Census FIPS, USPS code, or state slug.`,
      );
    }
  }

  process.stdout.write(`${JSON.stringify(rows)}\n`);
} finally {
  await server.close();
}

function matchesSelector(state, selectors) {
  return (
    selectors.has(state.censusStateFips) ||
    selectors.has(state.postalCode.toLowerCase()) ||
    selectors.has(state.slug)
  );
}
