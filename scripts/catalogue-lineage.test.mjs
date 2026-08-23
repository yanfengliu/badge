import { lstat, mkdir, mkdtemp, readFile, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { admitPack } from "@badge/pack-contract";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { compileHeirloomThemePack } from "../apps/studio-web/src/heirloom-theme-pack.js";
import {
  archiveFixtureTestRootDirectory,
  createArchiveFixtureTestTarget,
  generateArchiveFixtures,
} from "./generate-archive-fixtures.mjs";
import { generatePackFixtures } from "./generate-pack-fixtures.mjs";
import { starterPackFixtureMetadata } from "./pack-fixture-compiler.mjs";

let taskRoot;
let generated;

describe.sequential("starter catalogue exact pack lineage", () => {
  beforeAll(async () => {
    await mkdir(archiveFixtureTestRootDirectory, { recursive: true });
    taskRoot = await mkdtemp(path.join(archiveFixtureTestRootDirectory, `catalogue-${process.pid}-`));
    const archiveTarget = createArchiveFixtureTestTarget(taskRoot);
    await generateArchiveFixtures(archiveTarget);
    generated = await generatePackFixtures({
      archiveFixtureDirectory: archiveTarget.outputDirectory,
      outputDirectory: path.join(taskRoot, "pack-output"),
    });
  }, 60_000);

  afterAll(async () => {
    if (taskRoot) {
      const resolved = path.resolve(taskRoot);
      if (path.dirname(resolved) !== path.resolve(archiveFixtureTestRootDirectory)) {
        throw new Error(`Refusing to clean unexpected catalogue fixture root ${resolved}.`);
      }
      const status = await lstat(resolved).catch((error) => {
        if (error?.code === "ENOENT") return undefined;
        throw error;
      });
      if (status?.isSymbolicLink()) throw new Error(`Refusing linked test root ${resolved}.`);
      if (status) await rm(resolved, { recursive: true, force: false });
    }
    await rmdir(archiveFixtureTestRootDirectory).catch((error) => {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") throw error;
    });
  });

  it("derives both displayed PackRefs from independently admitted canonical bytes", async () => {
    const admittedTheme = await admitPack(generated.theme.bytes);
    const admittedCatalogue = await admitPack(generated.catalogue.bytes);
    const studioTheme = await compileHeirloomThemePack();

    expect(admittedTheme.packRef).toEqual(generated.theme.packRef);
    expect(studioTheme.packRef).toEqual(generated.theme.packRef);
    expect(studioTheme.bytes).toEqual(generated.theme.bytes);
    expect(admittedCatalogue.packRef).toEqual(generated.catalogue.packRef);
    expect(admittedCatalogue.manifest.dependencies).toEqual([generated.theme.packRef]);
    expect(admittedCatalogue.manifest.themePack).toEqual(generated.theme.packRef);
    expect(new Uint8Array(await readFile(generated.theme.path))).toEqual(generated.theme.bytes);
    expect(new Uint8Array(await readFile(generated.catalogue.path))).toEqual(generated.catalogue.bytes);
  }, 30_000);

  it("binds every Archive definition, visual, source object, and PackRef to that catalogue", () => {
    const expectedById = new Map(
      starterPackFixtureMetadata.badges.map((badge) => [badge.definitionId, badge]),
    );

    expect(starterBadges).toHaveLength(starterPackFixtureMetadata.badges.length);
    for (const badge of starterBadges) {
      const expected = expectedById.get(badge.definitionId);
      expect(expected, `${badge.definitionId} must exist in the compiled starter pack`).toBeDefined();
      expect(badge).toMatchObject({
        collectionId: expected.collectionId,
        title: expected.title,
        criterion: expected.criterion,
        description: expected.description,
        accessibleDescription: expected.accessibleDescription,
        sourceAssetHash: expected.sourceAssetHash,
        sourceUrl: `/${expected.fileName}`,
        visualEditionId: expected.visualEditionId,
        renderRecipe: expected.renderRecipe,
        packRef: generated.catalogue.packRef,
      });
    }
  });
});
