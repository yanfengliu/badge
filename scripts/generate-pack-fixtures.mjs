import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { admitPack, validatePackDependencyClosure } from "@badge/pack-contract";

import {
  compileHeirloomThemeFixture,
  compileStarterCatalogueFixture,
  starterPackFixtureMetadata,
} from "./pack-fixture-compiler.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const packFixtureOutputDirectory = path.join(repositoryRoot, "tmp", "generated", "pack-fixtures");
const archiveFixtureDirectory = path.join(repositoryRoot, "tmp", "generated", "archive-fixtures");

export async function generatePackFixtures(options = {}) {
  const sourceDirectory = path.resolve(options.archiveFixtureDirectory ?? archiveFixtureDirectory);
  const outputDirectory = path.resolve(options.outputDirectory ?? packFixtureOutputDirectory);
  assertInsideRepository(sourceDirectory, "Archive fixture input");
  assertInsideRepository(outputDirectory, "pack fixture output");
  await assertNoLinkedAncestors(sourceDirectory);
  await assertNoLinkedAncestors(outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  await assertNoLinkedAncestors(outputDirectory);

  const pngByFileName = new Map();
  for (const badge of starterPackFixtureMetadata.badges) {
    const inputPath = path.join(sourceDirectory, badge.fileName);
    const status = await lstat(inputPath).catch((error) => {
      throw new Error(
        `Archive fixture ${inputPath} is unavailable; run npm run generate:archive-fixtures first.`,
        { cause: error },
      );
    });
    if (!status.isFile() || status.isSymbolicLink()) {
      throw new Error(`Archive fixture ${inputPath} must be a regular file, not a link or directory.`);
    }
    pngByFileName.set(badge.fileName, new Uint8Array(await readFile(inputPath)));
  }

  const catalogue = compileStarterCatalogueFixture(pngByFileName);
  const theme = compileHeirloomThemeFixture();
  if (!samePackRef(catalogue.theme.packRef, theme.packRef)) {
    throw new Error("Starter catalogue and generated theme dependency disagree; no pack files were written.");
  }
  const admittedTheme = await admitPack(theme.bytes);
  if (!samePackRef(admittedTheme.packRef, theme.packRef)) {
    throw new Error(
      "Independent admission returned a different Heirloom theme identity; no pack files were written.",
    );
  }
  const admittedCatalogue = await admitPack(catalogue.bytes);
  if (!samePackRef(admittedCatalogue.packRef, catalogue.packRef)) {
    throw new Error(
      "Independent admission returned a different starter catalogue identity; no pack files were written.",
    );
  }
  if (
    admittedCatalogue.manifest.kind !== "catalogue" ||
    !samePackRef(admittedCatalogue.manifest.themePack, admittedTheme.packRef)
  ) {
    throw new Error(
      "Independently admitted starter catalogue does not close over the emitted Heirloom theme; no pack files were written.",
    );
  }
  validatePackDependencyClosure(admittedCatalogue, [admittedTheme]);
  const themePath = path.join(outputDirectory, `heirloom-${theme.packRef.packDigest}.badgetheme`);
  const cataloguePath = path.join(outputDirectory, `starter-${catalogue.packRef.packDigest}.badgepack`);
  await publishExactFile(themePath, theme.bytes);
  await publishExactFile(cataloguePath, catalogue.bytes);
  return { theme: { ...theme, path: themePath }, catalogue: { ...catalogue, path: cataloguePath } };
}

async function publishExactFile(destination, bytes) {
  const existing = await readFile(destination).catch((error) => {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  });
  if (existing) {
    if (sameBytes(existing, bytes)) return;
    throw new Error(
      `Generated pack path ${destination} contains bytes that contradict its content-addressed name; preserve it for inspection, then remove that exact ignored file before retrying.`,
    );
  }

  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes, { flag: "wx" });
  try {
    await rename(temporary, destination);
  } catch (error) {
    if (!hasCode(error, "EEXIST") && !hasCode(error, "EPERM")) throw error;
    const winner = await readFile(destination);
    if (!sameBytes(winner, bytes)) {
      throw new Error(
        `Concurrent pack fixture writer published different bytes at ${destination}; the task-owned temporary file was preserved for inspection.`,
        { cause: error },
      );
    }
    await unlink(temporary);
  }
}

async function assertNoLinkedAncestors(candidate) {
  const relative = path.relative(repositoryRoot, candidate);
  let cursor = repositoryRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const status = await lstat(cursor).catch((error) => {
      if (hasCode(error, "ENOENT")) return undefined;
      throw error;
    });
    if (status?.isSymbolicLink()) {
      throw new Error(`Refusing pack fixture path with symbolic link or junction ancestor ${cursor}.`);
    }
  }
}

function assertInsideRepository(candidate, subject) {
  const relative = path.relative(repositoryRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${subject} ${candidate} must remain inside ${repositoryRoot}.`);
  }
}

function sameBytes(left, right) {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

function samePackRef(left, right) {
  return (
    left.packId === right.packId && left.version === right.version && left.packDigest === right.packDigest
  );
}

function hasCode(error, code) {
  return error && typeof error === "object" && error.code === code;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    const generated = await generatePackFixtures();
    process.stdout.write(
      `${generated.theme.path} ${generated.theme.packRef.packDigest}\n${generated.catalogue.path} ${generated.catalogue.packRef.packDigest}\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
