import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  archiveFixtureTestRootDirectory,
  createArchiveFixtureTestTarget,
  expectedGeneratedArchiveFixtures as expectedArchiveFixtures,
  generateArchiveFixtures,
} from "./generate-archive-fixtures.mjs";

const taskRoots = [];

describe.sequential("fresh Archive fixture publication on Windows", () => {
  beforeAll(() => mkdir(archiveFixtureTestRootDirectory, { recursive: true }));

  afterAll(async () => {
    for (const root of taskRoots.reverse()) await removeTaskRoot(root);
  });

  it("retries a transient fresh-publish denial and validates the exact output", async () => {
    let attempts = 0;
    const target = await newTarget({
      beforePublishRenameAttempt() {
        attempts += 1;
        if (attempts === 1) throw transientError("EPERM", "simulated transient fixture scanner hold");
      },
    });

    await expect(generateArchiveFixtures(target)).resolves.toHaveLength(expectedArchiveFixtures.length);
    expect(attempts).toBe(2);
    expect(await readFixtureTree(target.outputDirectory)).toEqual(expectedFixtureTree());
    expect(await readdir(target.generatedRoot)).toEqual(["archive-fixtures"]);
  });

  it("retries a transient denial while validating a successfully renamed tree", async () => {
    let validationAttempts = 0;
    const target = await newTarget({
      beforePublishValidationAttempt() {
        validationAttempts += 1;
        if (validationAttempts === 1) {
          throw transientError("EACCES", "simulated published-file scanner hold");
        }
      },
    });

    await expect(generateArchiveFixtures(target)).resolves.toHaveLength(expectedArchiveFixtures.length);
    expect(validationAttempts).toBe(2);
    expect(await readFixtureTree(target.outputDirectory)).toEqual(expectedFixtureTree());
  });

  it("bounds persistent validation denials while retaining the exact published tree", async () => {
    let validationAttempts = 0;
    const denial = transientError("EBUSY", "simulated persistent published-file hold");
    const target = await newTarget({
      beforePublishValidationAttempt() {
        validationAttempts += 1;
        throw denial;
      },
    });

    const failure = await rejected(generateArchiveFixtures(target));
    expect(failure.message).toMatch(/after 8 transient Windows filesystem denials/i);
    expect(failure.cause).toBe(denial);
    expect(validationAttempts).toBe(8);
    expect(await readFixtureTree(target.outputDirectory)).toEqual(expectedFixtureTree());
    expect(await readdir(target.generatedRoot)).toEqual(["archive-fixtures"]);
  });

  it("accepts an ambiguous rename success only after validating the exact tree", async () => {
    let renameAttempts = 0;
    const ambiguousDenial = transientError("EBUSY", "simulated ambiguous rename result");
    const target = await newTarget({
      async beforePublishRenameAttempt({ stagingDirectory, outputDirectory }) {
        renameAttempts += 1;
        await rename(stagingDirectory, outputDirectory);
        throw ambiguousDenial;
      },
    });

    await expect(generateArchiveFixtures(target)).resolves.toHaveLength(expectedArchiveFixtures.length);
    expect(renameAttempts).toBe(1);
    expect(await readFixtureTree(target.outputDirectory)).toEqual(expectedFixtureTree());
  });

  it("rejects an ambiguous rename result whose published tree is not exact", async () => {
    const ambiguousDenial = transientError("EPERM", "simulated invalid ambiguous rename result");
    const target = await newTarget({
      async beforePublishRenameAttempt({ stagingDirectory, outputDirectory }) {
        await rename(stagingDirectory, outputDirectory);
        await writeFile(path.join(outputDirectory, expectedArchiveFixtures[0].fileName), "corrupt");
        throw ambiguousDenial;
      },
    });

    const failure = await rejected(generateArchiveFixtures(target));
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toMatch(/did not produce the complete exact fixture tree/i);
    expect(failure.cause).toBe(ambiguousDenial);
    expect(await readdir(target.generatedRoot)).toEqual(["archive-fixtures"]);
  });

  it.each(["EPERM", "EACCES", "EBUSY"])(
    "bounds %s retries, preserves the cause, and leaves no partial public tree",
    async (code) => {
      let attempts = 0;
      const denial = transientError(code, `simulated persistent ${code} fixture hold`);
      const target = await newTarget({
        beforePublishRenameAttempt() {
          attempts += 1;
          throw denial;
        },
      });

      const failure = await rejected(generateArchiveFixtures(target));
      expect(failure).toBeInstanceOf(Error);
      expect(failure.message).toMatch(/after 8 transient Windows filesystem denials/i);
      expect(failure.cause).toBe(denial);
      expect(attempts).toBe(8);
      await expect(lstat(target.outputDirectory)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readdir(target.generatedRoot)).toEqual([]);
    },
  );

  it.each([false, true])("validates an attempt-eight ambiguous success (corrupt: %s)", async (corrupt) => {
    let attempts = 0;
    const denial = transientError("EPERM", "simulated final-attempt ambiguous result");
    const target = await newTarget({
      async beforePublishRenameAttempt({ stagingDirectory, outputDirectory }) {
        attempts += 1;
        if (attempts < 8) throw denial;
        await rename(stagingDirectory, outputDirectory);
        if (corrupt) {
          await writeFile(path.join(outputDirectory, expectedArchiveFixtures[0].fileName), "corrupt");
        }
        throw denial;
      },
    });

    if (corrupt) {
      const failure = await rejected(generateArchiveFixtures(target));
      expect(failure.message).toMatch(/did not produce the complete exact fixture tree/i);
      expect(failure.cause).toBe(denial);
    } else {
      await expect(generateArchiveFixtures(target)).resolves.toHaveLength(expectedArchiveFixtures.length);
      expect(await readFixtureTree(target.outputDirectory)).toEqual(expectedFixtureTree());
    }
    expect(attempts).toBe(8);
  });

  it("aggregates publish, staging-cleanup, and lock-release failures", async () => {
    const publishDenial = transientError("EPERM", "simulated persistent publish hold");
    const cleanupDenial = transientError("EPERM", "simulated staging cleanup hold");
    const releaseDenial = transientError("EPERM", "simulated lock release hold");
    const target = await newTarget({
      beforePublishRenameAttempt() {
        throw publishDenial;
      },
      beforeFailedStagingCleanup() {
        throw cleanupDenial;
      },
      beforeLockRenameAttempt() {
        throw releaseDenial;
      },
    });

    const failure = await rejected(generateArchiveFixtures(target));
    expect(failure).toBeInstanceOf(AggregateError);
    expect(failure.cause).toBe(releaseDenial);
    expect(failure.errors[0]).toBeInstanceOf(AggregateError);
    expect(failure.errors[0].cause).toBe(cleanupDenial);
    expect(failure.errors[0].errors[0].cause).toBe(publishDenial);
    expect(failure.errors[1]).toBe(releaseDenial);
    const retainedEntries = await readdir(target.generatedRoot);
    expect(retainedEntries).toHaveLength(2);
    expect(retainedEntries).toEqual(
      expect.arrayContaining([expect.stringMatching(/^\.archive-fixtures-stage-/), ".archive-fixtures-lock"]),
    );
  });
});

async function newTarget(testHooks) {
  const root = await mkdtemp(path.join(archiveFixtureTestRootDirectory, `publish-${process.pid}-`));
  taskRoots.push(root);
  return createArchiveFixtureTestTarget(root, testHooks);
}

async function removeTaskRoot(root) {
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(archiveFixtureTestRootDirectory)) {
    throw new Error(`Refusing to clean unexpected Archive fixture test root ${resolved}.`);
  }
  const status = await lstatOrUndefined(resolved);
  if (!status) return;
  if (status.isSymbolicLink()) throw new Error(`Refusing linked test-root cleanup ${resolved}.`);
  await rm(resolved, { recursive: true, force: false });
}

async function readFixtureTree(outputDirectory) {
  return Promise.all(
    (await readdir(outputDirectory)).sort().map(async (name) => {
      const bytes = await readFile(path.join(outputDirectory, name));
      return { name, byteLength: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
    }),
  );
}

function expectedFixtureTree() {
  return expectedArchiveFixtures
    .map((fixture) => ({
      name: fixture.fileName,
      byteLength: fixture.outputByteLength,
      sha256: fixture.sha256,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function transientError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function rejected(promise) {
  return promise.then(
    () => undefined,
    (error) => error,
  );
}

async function lstatOrUndefined(candidate) {
  try {
    return await lstat(candidate);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}
