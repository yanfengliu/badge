import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FUTURE_EXPANSION_EDITION,
  FUTURE_EXPANSION_SCHEMA_VERSION,
  futureExpansionBrief,
  greatAmericanReadPlan,
  lifeMilestoneCategories,
  lifeMilestoneCategoryIds,
  lifeMilestoneTemplates,
  lifeMilestonesPlan,
  michelinDiningMilestonePlan,
  municipalityExpansionPlans,
  tokyoEssentialPlaces,
  tokyoEssentialsPlan,
  type PlanningSource,
} from "@badge/catalogue-fixtures/future-expansion";
import { describe, expect, it } from "vitest";

const allSources: readonly PlanningSource[] = [
  ...municipalityExpansionPlans[0].sources,
  ...municipalityExpansionPlans[1].sources,
  ...greatAmericanReadPlan.sources,
  ...tokyoEssentialsPlan.sources,
  ...michelinDiningMilestonePlan.sources,
  ...lifeMilestonesPlan.sources,
];

const collectKeys = (value: unknown, keys = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }

  if (typeof value !== "object" || value === null) return keys;

  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    collectKeys(child, keys);
  }
  return keys;
};

const listProductionTypeScriptFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listProductionTypeScriptFiles(entryPath);
      if (!/\.tsx?$/u.test(entry.name) || /\.test\.tsx?$/u.test(entry.name)) return [];
      return [entryPath];
    }),
  );
  return files.flat();
};

describe("the future catalogue expansion brief", () => {
  it("is explicitly versioned planning metadata rather than created badge state", () => {
    expect(FUTURE_EXPANSION_SCHEMA_VERSION).toBe(1);
    expect(FUTURE_EXPANSION_EDITION).toBe("2026-08-24.future-expansion-brief@1");
    expect(futureExpansionBrief).toMatchObject({
      schemaVersion: 1,
      edition: FUTURE_EXPANSION_EDITION,
      status: "planning-only",
    });

    const statuses = [
      ...municipalityExpansionPlans.map((plan) => plan.status),
      greatAmericanReadPlan.status,
      tokyoEssentialsPlan.status,
      michelinDiningMilestonePlan.status,
      lifeMilestonesPlan.status,
    ];
    expect(new Set(statuses)).toEqual(new Set(["planning-only"]));

    const forbiddenRuntimeFields = [
      "acceptedSaying",
      "availability",
      "definitionId",
      "historicalQuotations",
      "packRef",
      "prompt",
      "quotationBank",
      "recordId",
      "renderRecipe",
      "selectedSource",
      "sourceAssetHash",
      "visualEditionId",
    ];
    const keys = collectKeys(futureExpansionBrief);
    for (const field of forbiddenRuntimeFields) expect(keys.has(field), field).toBe(false);
  });

  it("pins the incorporated-municipality boundaries without embedding municipality lists", () => {
    expect(
      municipalityExpansionPlans.map((plan) => ({
        jurisdiction: plan.jurisdiction,
        count: plan.expectedItemCount,
        edition: plan.edition,
      })),
    ).toEqual([
      { jurisdiction: "Washington", count: 281, edition: "2026-04-01.wa-ofm" },
      {
        jurisdiction: "California",
        count: 483,
        edition: "2026.ca-roster+2026-01-01.ca-dof-e1",
      },
    ]);
    expect(municipalityExpansionPlans.reduce((sum, plan) => sum + plan.expectedItemCount, 0)).toBe(764);
    for (const plan of municipalityExpansionPlans) {
      expect(plan.excluded).toContain("Unincorporated communities");
      expect(plan).not.toHaveProperty("municipalities");
      expect(plan.sources.length).toBeGreaterThan(0);
    }
  });

  it("pins the fixed PBS 100-title-or-series boundary without copying protected media", () => {
    expect(greatAmericanReadPlan).toMatchObject({
      status: "planning-only",
      edition: "2018.pbs-great-american-read",
      expectedItemCount: 100,
      sourceBoundaryComplete: true,
      claimsUniversalCanon: false,
    });
    expect(greatAmericanReadPlan).not.toHaveProperty("books");
    expect(greatAmericanReadPlan.seriesHandling).toContain("series-level entry");
    expect(greatAmericanReadPlan.excluded).toContain("Publisher cover art");
  });

  it("defines one non-exhaustive 34-place Tokyo editorial boundary", () => {
    expect(tokyoEssentialsPlan).toMatchObject({
      status: "planning-only",
      expectedItemCount: 34,
      exhaustive: false,
      itemProvenanceStatus: "required-before-authoring",
    });
    expect(tokyoEssentialPlaces).toHaveLength(34);
    expect(new Set(tokyoEssentialPlaces.map((place) => place.placeId))).toHaveProperty("size", 34);
    expect(new Set(tokyoEssentialPlaces.map((place) => place.label))).toHaveProperty("size", 34);
    expect(
      Object.fromEntries(
        [
          "heritage-and-sacred",
          "gardens-and-nature",
          "views-and-landmarks",
          "museums-and-culture",
          "neighborhoods-and-experiences",
        ].map((category) => [
          category,
          tokyoEssentialPlaces.filter((place) => place.category === category).length,
        ]),
      ),
    ).toEqual({
      "heritage-and-sacred": 5,
      "gardens-and-nature": 6,
      "views-and-landmarks": 5,
      "museums-and-culture": 9,
      "neighborhoods-and-experiences": 9,
    });
    expect(tokyoEssentialsPlan.excluded.join(" ")).toContain("Chiba Prefecture");
    expect(tokyoEssentialsPlan.authoringGate).toContain("Bind every place");
  });

  it("keeps Michelin dining nominative, user-entered, historical, and free of brand assets", () => {
    expect(michelinDiningMilestonePlan).toMatchObject({
      status: "planning-only",
      kind: "user-entered-template",
      restaurantRecordsIncluded: 0,
      currentStatusLookupIncluded: false,
      nominativeTrademarkReferenceIncluded: true,
      brandAssetsIncluded: false,
    });
    expect(michelinDiningMilestonePlan.userEnteredFields).toEqual([
      "restaurantName",
      "location",
      "visitDate",
      "ratingObservedAtVisit",
    ]);
    expect(michelinDiningMilestonePlan).not.toHaveProperty("restaurants");
    expect(michelinDiningMilestonePlan.redistributionBoundary).toContain(
      "Do not ship a scraped Michelin restaurant directory",
    );
    expect(michelinDiningMilestonePlan.historyBoundary).toContain("must not rewrite");
  });

  it("keeps 64 optional non-normative milestones grouped eight by eight", () => {
    expect(lifeMilestonesPlan).toMatchObject({
      status: "planning-only",
      expectedItemCount: 64,
      expectedCategoryCount: 8,
      optional: true,
      normative: false,
      verification: "personal-honesty-only",
    });
    expect(lifeMilestoneCategoryIds).toHaveLength(8);
    expect(lifeMilestoneCategories).toHaveLength(8);
    expect(lifeMilestoneTemplates).toHaveLength(64);
    expect(new Set(lifeMilestoneTemplates.map((template) => template.templateId))).toHaveProperty("size", 64);

    for (const categoryId of lifeMilestoneCategoryIds) {
      expect(
        lifeMilestoneTemplates.filter((template) => template.categoryId === categoryId),
        categoryId,
      ).toHaveLength(8);
    }
    for (const template of lifeMilestoneTemplates) {
      expect(Object.keys(template).sort()).toEqual(["categoryId", "label", "reflectionPrompt", "templateId"]);
      expect(template.label).not.toMatch(/\bmust|required|by age\b/iu);
    }
  });

  it("records HTTPS provenance, editions, dates, and bounded reuse guidance", () => {
    expect(allSources.length).toBeGreaterThanOrEqual(12);
    for (const source of allSources) {
      const url = new URL(source.url);
      expect(url.protocol, source.title).toBe("https:");
      expect(source.publisher.trim(), source.title).not.toBe("");
      expect(source.sourceEdition.trim(), source.title).not.toBe("");
      expect(source.observedOn, source.title).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(source.usageBoundary.trim(), source.title).not.toBe("");
    }
    expect(allSources.find((source) => source.url.endsWith("sma16-4953.pdf"))).toMatchObject({
      title: "Learn the Eight Dimensions of Wellness",
      sourceEdition: "SMA16-4953",
    });
  });

  it("cannot enter any production application or package TypeScript graph", async () => {
    const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
    const productionFiles = (
      await Promise.all(
        ["apps", "packages"].map((directory) =>
          listProductionTypeScriptFiles(path.join(repositoryRoot, directory)),
        ),
      )
    ).flat();
    for (const filePath of productionFiles) {
      if (["future-expansion.ts", "future-life-milestones.ts"].includes(path.basename(filePath))) {
        continue;
      }
      const source = await readFile(filePath, "utf8");
      expect(source, path.relative(repositoryRoot, filePath)).not.toMatch(
        /["'][^"'\r\n]*(?:future-expansion|future-life-milestones)(?:\.js)?["']/u,
      );
    }
  });

  it("keeps every new source file below 500 lines", async () => {
    for (const fileName of ["future-expansion.ts", "future-life-milestones.ts", "future-expansion.test.ts"]) {
      const source = await readFile(new URL(fileName, import.meta.url), "utf8");
      expect(source.split(/\r?\n/u).length, fileName).toBeLessThan(500);
    }
  });
});
