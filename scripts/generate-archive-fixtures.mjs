import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import decodeWebp, { init as initializeWebpDecoder } from "@jsquash/webp/decode.js";

import {
  encodeCanonicalRgbaPng,
  exactArrayBuffer,
  expectedArchiveFixtures,
  sha256Hex,
} from "./archive-fixture-contract.mjs";
import {
  isTransientWindowsRenameError,
  publishFreshFixtureDirectory,
  TRANSIENT_WINDOWS_RENAME_ATTEMPTS,
} from "./archive-fixture-fresh-publish.mjs";
import { expectedLegacyArchiveRepairFixtures } from "./archive-legacy-repair-contract.mjs";

export { expectedArchiveFixtures } from "./archive-fixture-contract.mjs";
export { expectedLegacyArchiveRepairFixtures } from "./archive-legacy-repair-contract.mjs";

export const expectedGeneratedArchiveFixtures = [
  ...expectedArchiveFixtures,
  ...expectedLegacyArchiveRepairFixtures,
];

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(repositoryRoot, "packages", "catalogue-fixtures", "assets");
const canonicalGeneratedRoot = path.join(repositoryRoot, "tmp", "generated");
export const archiveFixtureOutputDirectory = path.join(canonicalGeneratedRoot, "archive-fixtures");
export const archiveFixtureTestRootDirectory = path.join(
  repositoryRoot,
  "tmp",
  "tests",
  "archive-fixture-generator",
);
const LOCK_OWNER_FILE = "owner.json";
const LOCK_WAIT_TIMEOUT_MS = 120_000;
const fixtureTargetBrand = Symbol("archive-fixture-target");

let decoderReady;
const canonicalTarget = createFixtureTarget(canonicalGeneratedRoot);
export function createArchiveFixtureTestTarget(testRootDirectory, testHooks = {}) {
  const resolved = path.resolve(testRootDirectory);
  if (path.dirname(resolved) !== path.resolve(archiveFixtureTestRootDirectory)) {
    throw new Error(
      `Archive fixture test target ${resolved} must be one direct task-owned child of ${archiveFixtureTestRootDirectory}.`,
    );
  }
  return createFixtureTarget(resolved, testHooks);
}
export async function generateArchiveFixtures(target = canonicalTarget) {
  const fixtureTarget = requireFixtureTarget(target);
  await prepareGeneratedRoot(fixtureTarget);
  return withFixtureGenerationLock(fixtureTarget, async (owner) => {
    const existing = await readExistingFixtures(fixtureTarget);
    if (existing) {
      await removeUnexpectedOutputEntries(fixtureTarget, existing.unexpectedNames);
      return existing.fixtures;
    }

    await initializeDecoder();
    const stagingDirectory = stagingPath(fixtureTarget, owner.token);
    await removeOwnedDirectory(fixtureTarget, stagingDirectory, "staging", owner.token);
    await mkdir(stagingDirectory);
    await assertNoLinksAlongPath(stagingDirectory);

    try {
      const generated = [];
      for (const expected of expectedGeneratedArchiveFixtures) {
        const source = await readVerifiedSource(expected);
        const decoded = await decodeWebp(exactArrayBuffer(source));
        if (decoded.width !== expected.width || decoded.height !== expected.height) {
          throw new Error(
            `${expected.sourceFileName} decoded as ${decoded.width}x${decoded.height}; expected ${expected.width}x${expected.height}.`,
          );
        }
        const png = encodeCanonicalRgbaPng(decoded.data, decoded.width, decoded.height);
        const sha256 = sha256Hex(png);
        if (png.byteLength !== expected.outputByteLength || sha256 !== expected.sha256) {
          throw new Error(
            `${expected.fileName} derived as ${png.byteLength} bytes with SHA-256 ${sha256}; expected ${expected.outputByteLength} bytes and ${expected.sha256}. Review the decoder and canonical filter-0 encoder before updating the fixed output.`,
          );
        }
        generated.push({ ...expected, byteLength: png.byteLength });
        await writeFile(path.join(stagingDirectory, expected.fileName), png, { flag: "wx" });
      }

      await publishGeneratedFixtures(fixtureTarget, stagingDirectory, owner.token);
      return generated;
    } catch (error) {
      try {
        await fixtureTarget.testHooks.beforeFailedStagingCleanup?.({
          ...fixtureTarget,
          stagingDirectory,
          error,
        });
        await removeOwnedDirectory(fixtureTarget, stagingDirectory, "staging", owner.token);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `Archive fixture generation failed for ${fixtureTarget.outputDirectory}, and cleanup could not remove task-owned staging directory ${stagingDirectory}; release the filesystem hold and inspect that retained directory before retrying.`,
          { cause: cleanupError },
        );
      }
      throw error;
    }
  });
}

function createFixtureTarget(generatedRoot, testHooks = {}) {
  return Object.freeze({
    [fixtureTargetBrand]: true,
    generatedRoot,
    outputDirectory: path.join(generatedRoot, "archive-fixtures"),
    lockDirectory: path.join(generatedRoot, ".archive-fixtures-lock"),
    testHooks,
  });
}

function requireFixtureTarget(target) {
  if (!target || target[fixtureTargetBrand] !== true) {
    throw new Error("Use createArchiveFixtureTestTarget() for an isolated Archive fixture target.");
  }
  return target;
}

async function prepareGeneratedRoot(target) {
  await assertNoLinksAlongPath(target.generatedRoot);
  await mkdir(target.generatedRoot, { recursive: true });
  await assertNoLinksAlongPath(target.generatedRoot);
  const status = await lstat(target.generatedRoot);
  if (!status.isDirectory()) {
    throw new Error(`Archive fixture root ${target.generatedRoot} must be a real directory.`);
  }
}

async function withFixtureGenerationLock(target, action) {
  const owner = await acquireFixtureGenerationLock(target);
  const outcome = await action(owner).then(
    (result) => ({ result }),
    (error) => ({ error }),
  );
  try {
    await releaseFixtureGenerationLock(target, owner);
  } catch (releaseError) {
    if ("error" in outcome) {
      throw new AggregateError(
        [outcome.error, releaseError],
        `Archive fixture generation failed for ${target.outputDirectory}, and its generation lock ${target.lockDirectory} could not be released; preserve both errors, release the filesystem hold, and retry.`,
        { cause: releaseError },
      );
    }
    throw releaseError;
  }
  if ("error" in outcome) throw outcome.error;
  return outcome.result;
}

async function acquireFixtureGenerationLock(target) {
  const owner = { token: randomUUID(), pid: process.pid, createdAt: new Date().toISOString() };
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
  while (true) {
    try {
      await mkdir(target.lockDirectory);
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
      await target.testHooks.onLockExists?.({ ...target });
      let lockStatus;
      try {
        lockStatus = await lstat(target.lockDirectory);
      } catch (statError) {
        if (hasCode(statError, "ENOENT")) continue;
        throw statError;
      }
      assertRealDirectory(lockStatus, target.lockDirectory, "generation lock");
      if (Date.now() >= deadline) {
        throw new Error(
          `Timed out waiting for Archive fixture generation lock ${target.lockDirectory}; stop the owning generator or remove the stale lock after confirming its recorded process is not active.`,
          { cause: error },
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      continue;
    }

    try {
      await writeFile(lockOwnerPath(target.lockDirectory), JSON.stringify(owner), { flag: "wx" });
    } catch (error) {
      const abandonedPath = lockTransitionPath(target, "abandoned", owner.token);
      await rename(target.lockDirectory, abandonedPath);
      await removeOwnedDirectory(target, abandonedPath, "abandoned", owner.token);
      throw error;
    }
    await target.testHooks.onLockAcquired?.({ ...target, owner });
    return owner;
  }
}

async function releaseFixtureGenerationLock(target, owner) {
  await target.testHooks.beforeLockRelease?.({ ...target, owner });
  const currentOwner = await readLockOwner(target.lockDirectory);
  if (currentOwner?.token !== owner.token) return;

  const releasePath = lockTransitionPath(target, "release", owner.token);
  try {
    await renameLockForRelease(target, releasePath);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return;
    throw error;
  }
  const movedOwner = await readLockOwner(releasePath);
  if (movedOwner?.token !== owner.token) {
    await restoreTransitionedLock(target, releasePath);
    throw new Error(
      `Refusing to release Archive fixture lock because ownership changed from ${owner.token} to ${movedOwner?.token ?? "unknown"}.`,
    );
  }
  await removeOwnedDirectory(target, releasePath, "release", owner.token);
}

async function renameLockForRelease(target, releasePath) {
  for (let attempt = 1; attempt <= TRANSIENT_WINDOWS_RENAME_ATTEMPTS; attempt += 1) {
    try {
      await target.testHooks.beforeLockRenameAttempt?.({ ...target, attempt });
      await rename(target.lockDirectory, releasePath);
      return;
    } catch (error) {
      if (!isTransientWindowsRenameError(error) || attempt === TRANSIENT_WINDOWS_RENAME_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(10 * 2 ** (attempt - 1), 100)));
    }
  }
}

async function restoreTransitionedLock(target, transitionedPath) {
  try {
    await rename(transitionedPath, target.lockDirectory);
  } catch (error) {
    throw new Error(
      `Archive fixture lock changed during a guarded transition; preserved ${transitionedPath} for inspection.`,
      { cause: error },
    );
  }
}

async function readLockOwner(directory) {
  let encoded;
  try {
    encoded = await readFile(lockOwnerPath(directory), "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  }
  try {
    const owner = JSON.parse(encoded);
    return typeof owner.token === "string" && Number.isInteger(owner.pid) ? owner : undefined;
  } catch {
    return undefined;
  }
}

async function readExistingFixtures(target) {
  const outputStatus = await lstatOrUndefined(target.outputDirectory);
  if (!outputStatus) return undefined;
  assertRealDirectory(outputStatus, target.outputDirectory, "output");
  await assertNoLinksInTree(target.outputDirectory);

  const entries = await readdir(target.outputDirectory, { withFileTypes: true });
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const fixtures = [];
  for (const expected of expectedGeneratedArchiveFixtures) {
    const entry = byName.get(expected.fileName);
    if (!entry) return undefined;
    if (!entry.isFile()) {
      throw new Error(
        `Archive fixture output ${path.join(target.outputDirectory, expected.fileName)} must be a regular file, not a link or directory.`,
      );
    }
    await readVerifiedSource(expected);
    let output;
    try {
      output = await readFile(path.join(target.outputDirectory, expected.fileName));
    } catch (error) {
      if (hasCode(error, "ENOENT")) return undefined;
      throw error;
    }
    if (output.byteLength !== expected.outputByteLength || sha256Hex(output) !== expected.sha256) {
      return undefined;
    }
    fixtures.push({ ...expected, byteLength: output.byteLength });
  }
  const expectedNames = new Set(expectedGeneratedArchiveFixtures.map((fixture) => fixture.fileName));
  return {
    fixtures,
    unexpectedNames: entries.map((entry) => entry.name).filter((name) => !expectedNames.has(name)),
  };
}

async function publishGeneratedFixtures(target, stagingDirectory, token) {
  const outputStatus = await lstatOrUndefined(target.outputDirectory);
  if (!outputStatus) {
    await assertNoLinksInTree(stagingDirectory);
    return publishFreshFixtureDirectory({
      target,
      stagingDirectory,
      validateExactTree: (cause) => assertExactPublishedFixtureTree(target, cause),
    });
  }
  assertRealDirectory(outputStatus, target.outputDirectory, "output");
  await assertNoLinksInTree(target.outputDirectory);
  for (const expected of expectedGeneratedArchiveFixtures) {
    const destination = path.join(target.outputDirectory, expected.fileName);
    const destinationStatus = await lstatOrUndefined(destination);
    if (destinationStatus?.isSymbolicLink() || (destinationStatus && !destinationStatus.isFile())) {
      throw new Error(`Archive fixture destination ${destination} must be a regular file or absent.`);
    }
    await rename(path.join(stagingDirectory, expected.fileName), destination);
  }
  await removeUnexpectedOutputEntries(
    target,
    (await readdir(target.outputDirectory)).filter(
      (name) => !expectedGeneratedArchiveFixtures.some((expected) => expected.fileName === name),
    ),
  );
  await removeOwnedDirectory(target, stagingDirectory, "staging", token);
}

async function assertExactPublishedFixtureTree(target, cause) {
  const published = await readExistingFixtures(target);
  if (published && published.unexpectedNames.length === 0) return;
  throw new Error(
    `Archive fixture publish to ${target.outputDirectory} did not produce the complete exact fixture tree; preserve and inspect that published output, then regenerate before starting Archive or Studio.`,
    { cause },
  );
}

async function removeUnexpectedOutputEntries(target, names) {
  for (const name of names) {
    const candidate = path.resolve(target.outputDirectory, name);
    if (path.dirname(candidate) !== target.outputDirectory) {
      throw new Error(`Refusing unexpected Archive fixture output entry ${candidate}.`);
    }
    const status = await lstatOrUndefined(candidate);
    if (!status) continue;
    if (status.isSymbolicLink()) {
      throw new Error(`Refusing to delete symbolic link or junction ${candidate}.`);
    }
    if (status.isDirectory()) await assertNoLinksInTree(candidate);
    await rm(candidate, { recursive: status.isDirectory(), force: false });
  }
}

async function removeOwnedDirectory(target, candidate, kind, token) {
  assertOwnedGeneratedDirectory(target, candidate, kind, token);
  const status = await lstatOrUndefined(candidate);
  if (!status) return;
  assertRealDirectory(status, candidate, kind);
  await assertNoLinksInTree(candidate);
  await rm(candidate, { recursive: true, force: false });
}

function assertOwnedGeneratedDirectory(target, candidate, kind, token) {
  const expected =
    kind === "output"
      ? target.outputDirectory
      : kind === "lock"
        ? target.lockDirectory
        : kind === "staging"
          ? stagingPath(target, token)
          : lockTransitionPath(target, kind, token);
  if (path.resolve(candidate) !== path.resolve(expected)) {
    throw new Error(`Refusing generated Archive ${kind} directory ${candidate}; expected ${expected}.`);
  }
}

async function assertNoLinksAlongPath(targetPath) {
  const resolved = path.resolve(targetPath);
  const relative = path.relative(repositoryRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Archive fixture path ${resolved} must remain inside ${repositoryRoot}.`);
  }
  let cursor = repositoryRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const status = await lstatOrUndefined(cursor);
    if (status?.isSymbolicLink()) {
      throw new Error(`Refusing Archive fixture path with symbolic link or junction ancestor ${cursor}.`);
    }
  }
}

async function assertNoLinksInTree(directory) {
  await assertNoLinksAlongPath(directory);
  const status = await lstatOrUndefined(directory);
  if (!status) return;
  assertRealDirectory(status, directory, "directory");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing to traverse symbolic link or junction ${child}.`);
    }
    if (entry.isDirectory()) await assertNoLinksInTree(child);
  }
}

function assertRealDirectory(status, candidate, subject) {
  if (status.isSymbolicLink() || !status.isDirectory()) {
    throw new Error(`Archive fixture ${subject} ${candidate} must be a real directory, not a link or file.`);
  }
}

async function lstatOrUndefined(candidate) {
  try {
    return await lstat(candidate);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

function stagingPath(target, token) {
  return path.join(target.generatedRoot, `.archive-fixtures-stage-${token}`);
}

function lockTransitionPath(target, kind, token) {
  return path.join(target.generatedRoot, `.archive-fixtures-lock-${kind}-${token}`);
}

function lockOwnerPath(directory) {
  return path.join(directory, LOCK_OWNER_FILE);
}

function hasCode(error, code) {
  return error && typeof error === "object" && error.code === code;
}

async function readVerifiedSource(expected) {
  const source = await readFile(path.join(sourceDirectory, expected.sourceFileName));
  const sourceSha256 = sha256Hex(source);
  if (source.byteLength !== expected.sourceByteLength || sourceSha256 !== expected.sourceSha256) {
    throw new Error(
      `${expected.sourceFileName} is ${source.byteLength} bytes with SHA-256 ${sourceSha256}; expected ${expected.sourceByteLength} bytes and ${expected.sourceSha256}. Review the tracked developer source before deriving Archive art.`,
    );
  }
  return source;
}

async function initializeDecoder() {
  if (!decoderReady) {
    decoderReady = (async () => {
      installImageDataForNode();
      const wasmPath = path.join(
        repositoryRoot,
        "node_modules",
        "@jsquash",
        "webp",
        "codec",
        "dec",
        "webp_dec.wasm",
      );
      const wasmModule = await WebAssembly.compile(await readFile(wasmPath));
      await initializeWebpDecoder(wasmModule);
    })();
  }
  await decoderReady;
}

function installImageDataForNode() {
  if (globalThis.ImageData) return;
  Object.defineProperty(globalThis, "ImageData", {
    configurable: true,
    value: class ImageData {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    },
  });
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    const generated = await generateArchiveFixtures();
    process.stdout.write(
      `${generated.map((fixture) => `${fixture.fileName} ${fixture.byteLength} ${fixture.sha256}`).join("\n")}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\nArchive and Studio were not started.\n`,
    );
    process.exitCode = 1;
  }
}
