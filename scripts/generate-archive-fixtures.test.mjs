import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  rmdir,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { setImmediate } from "node:timers";

import { validateSourceAsset } from "@badge/archive-application";
import { validatePublishedPackPng } from "@badge/pack-contract";
import decodeWebp from "@jsquash/webp/decode.js";
import { unzlibSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  archiveFixtureTestRootDirectory,
  createArchiveFixtureTestTarget,
  expectedGeneratedArchiveFixtures as expectedArchiveFixtures,
  generateArchiveFixtures,
} from "./generate-archive-fixtures.mjs";

const sourceDirectory = path.resolve("packages/catalogue-fixtures/assets");
const STARTUP_VALIDATION_BUDGET_MS = 4_000;
const taskRoots = [];
const taskLinks = [];
let primaryTarget;
let secondFreshTarget;
let primaryTree;

describe.sequential("canonical Archive fixture generation", () => {
  beforeAll(async () => {
    await mkdir(archiveFixtureTestRootDirectory, { recursive: true });
    primaryTarget = await newTarget();
    secondFreshTarget = await newTarget();
  });

  afterAll(async () => {
    for (const link of taskLinks.reverse()) await removeLinkIfPresent(link);
    for (const root of taskRoots.reverse()) await removeTaskRoot(root);
    try {
      await rmdir(archiveFixtureTestRootDirectory);
    } catch (error) {
      if (!hasCode(error, "ENOENT") && !hasCode(error, "ENOTEMPTY")) throw error;
    }
  });

  it("derives offline filter-0 PNGs whose rows exactly equal the decoded developer sources", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error("Archive fixture generation attempted a network fetch");
    };
    try {
      expect(await generateArchiveFixtures(primaryTarget)).toHaveLength(expectedArchiveFixtures.length);
      expect(await generateArchiveFixtures(secondFreshTarget)).toHaveLength(expectedArchiveFixtures.length);
    } finally {
      globalThis.fetch = originalFetch;
    }

    primaryTree = await readFixtureTree(primaryTarget.outputDirectory);
    expect(await readFixtureTree(secondFreshTarget.outputDirectory)).toEqual(primaryTree);

    for (const expected of expectedArchiveFixtures) {
      const png = new Uint8Array(await readFile(path.join(primaryTarget.outputDirectory, expected.fileName)));
      expect(validatePublishedPackPng({ hash: expected.sha256, ...expected }, png)).toEqual({
        width: expected.width,
        height: expected.height,
        decodedByteLength: expected.height * (1 + expected.width * 4),
      });

      const source = await readFile(path.join(sourceDirectory, expected.sourceFileName));
      const decoded = await decodeWebp(
        source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength),
      );
      const scanlines = unzlibSync(concatenatedIdat(png));
      const rowBytes = expected.width * 4;
      expect(scanlines.byteLength).toBe(expected.height * (rowBytes + 1));
      let firstDifferentRow = -1;
      for (let row = 0; row < expected.height; row += 1) {
        const scanlineOffset = row * (rowBytes + 1);
        expect(scanlines[scanlineOffset]).toBe(0);
        const decodedOffset = decoded.data.byteOffset + row * rowBytes;
        const decodedRow = new Uint8Array(decoded.data.buffer, decodedOffset, rowBytes);
        const generatedRow = scanlines.subarray(scanlineOffset + 1, scanlineOffset + 1 + rowBytes);
        if (!generatedRow.every((byte, index) => byte === decodedRow[index])) {
          firstDifferentRow = row;
          break;
        }
      }
      expect(firstDifferentRow).toBe(-1);
    }

    await writeFile(path.join(primaryTarget.outputDirectory, "stale.txt"), "must be removed");
    await generateArchiveFixtures(primaryTarget);
    expect(await readFixtureTree(primaryTarget.outputDirectory)).toEqual(primaryTree);
  }, 60_000);

  it("serializes concurrent callers and keeps the existing public directory present while repairing", async () => {
    await writeFile(path.join(primaryTarget.outputDirectory, expectedArchiveFixtures[0].fileName), "corrupt");
    const firstAcquired = deferred();
    const allowFirst = deferred();
    const contenderObserved = deferred();
    let acquisitionCount = 0;
    let observedContention = false;
    const concurrentTarget = createArchiveFixtureTestTarget(primaryTarget.generatedRoot, {
      async onLockAcquired() {
        acquisitionCount += 1;
        if (acquisitionCount === 1) {
          firstAcquired.resolve();
          await allowFirst.promise;
        }
      },
      onLockExists() {
        observedContention = true;
        contenderObserved.resolve();
      },
    });

    const first = generateArchiveFixtures(concurrentTarget);
    await firstAcquired.promise;
    const second = generateArchiveFixtures(concurrentTarget);
    await contenderObserved.promise;
    let monitor = true;
    let outputWasMissing = false;
    const monitorPromise = (async () => {
      while (monitor) {
        try {
          await lstat(primaryTarget.outputDirectory);
        } catch (error) {
          if (hasCode(error, "ENOENT")) outputWasMissing = true;
          else throw error;
        }
        await new Promise((resolve) => setImmediate(resolve));
      }
    })();
    allowFirst.resolve();
    try {
      const [firstResult, secondResult] = await Promise.all([first, second]);
      expect(firstResult).toEqual(secondResult);
    } finally {
      monitor = false;
      await monitorPromise;
    }

    expect(observedContention).toBe(true);
    expect(acquisitionCount).toBe(2);
    expect(outputWasMissing).toBe(false);
    expect(await readFixtureTree(primaryTarget.outputDirectory)).toEqual(primaryTree);
  }, 60_000);

  it("retries when a lock disappears between EEXIST and inspection", async () => {
    await mkdir(primaryTarget.lockDirectory);
    let removed = false;
    const disappearingLockTarget = createArchiveFixtureTestTarget(primaryTarget.generatedRoot, {
      async onLockExists() {
        if (removed) return;
        removed = true;
        await rmdir(primaryTarget.lockDirectory);
      },
    });

    await expect(generateArchiveFixtures(disappearingLockTarget)).resolves.toHaveLength(
      expectedArchiveFixtures.length,
    );
    expect(removed).toBe(true);
    await expect(lstat(primaryTarget.lockDirectory)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not let an old finally delete a successor lock with another ownership token", async () => {
    const successor = {
      token: randomUUID(),
      pid: process.pid,
      createdAt: new Date().toISOString(),
    };
    let replaced = false;
    const replacementTarget = createArchiveFixtureTestTarget(primaryTarget.generatedRoot, {
      async beforeLockRelease({ lockDirectory }) {
        replaced = true;
        await unlink(path.join(lockDirectory, "owner.json"));
        await rmdir(lockDirectory);
        await mkdir(lockDirectory);
        await writeFile(path.join(lockDirectory, "owner.json"), JSON.stringify(successor), {
          flag: "wx",
        });
      },
    });

    await generateArchiveFixtures(replacementTarget);
    expect(replaced).toBe(true);
    expect(JSON.parse(await readFile(path.join(primaryTarget.lockDirectory, "owner.json"), "utf8"))).toEqual(
      successor,
    );
    await unlink(path.join(primaryTarget.lockDirectory, "owner.json"));
    await rmdir(primaryTarget.lockDirectory);
  });

  it("rejects a junction ancestor without touching its target", async () => {
    const realRoot = await newTaskRoot();
    const marker = path.join(realRoot, "preserve.txt");
    await writeFile(marker, "preserve");
    const linkedRoot = path.join(archiveFixtureTestRootDirectory, `junction-${randomUUID()}`);
    await symlink(realRoot, linkedRoot, "junction");
    taskLinks.push(linkedRoot);
    const linkedTarget = createArchiveFixtureTestTarget(linkedRoot);

    await expect(generateArchiveFixtures(linkedTarget)).rejects.toThrow(/symbolic link|junction/i);
    await expect(readFile(marker, "utf8")).resolves.toBe("preserve");
    await removeLinkIfPresent(linkedRoot);
  });

  it("rejects a junction output target before any recursive cleanup", async () => {
    const target = await newTarget();
    const linkedDirectory = await newTaskRoot();
    const marker = path.join(linkedDirectory, "preserve.txt");
    await writeFile(marker, "preserve");
    await symlink(linkedDirectory, target.outputDirectory, "junction");
    taskLinks.push(target.outputDirectory);

    await expect(generateArchiveFixtures(target)).rejects.toThrow(/link|junction/i);
    await expect(readFile(marker, "utf8")).resolves.toBe("preserve");
    await removeLinkIfPresent(target.outputDirectory);
  });

  it("retries a transient Windows lock-transition denial without leaving a stale lock", async () => {
    let attempts = 0;
    const target = await newTarget({
      beforeLockRenameAttempt() {
        attempts += 1;
        if (attempts === 1) {
          throw Object.assign(new Error("simulated transient directory scanner hold"), {
            code: "EPERM",
          });
        }
      },
    });

    await expect(generateArchiveFixtures(target)).resolves.toHaveLength(expectedArchiveFixtures.length);
    expect(attempts).toBe(2);
    await expect(lstat(target.lockDirectory)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fully validates the complete starter art set without a long opening screen", async () => {
    const sources = await Promise.all(
      expectedArchiveFixtures.map(async (expected) => ({
        hash: expected.sha256,
        mimeType: "image/png",
        bytes: new Uint8Array(await readFile(path.join(primaryTarget.outputDirectory, expected.fileName))),
      })),
    );

    const started = performance.now();
    for (const source of sources) await validateSourceAsset(source);
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(STARTUP_VALIDATION_BUDGET_MS);
  });
});

async function newTarget(testHooks) {
  return createArchiveFixtureTestTarget(await newTaskRoot(), testHooks);
}

async function newTaskRoot() {
  const root = await mkdtemp(path.join(archiveFixtureTestRootDirectory, `vitest-${process.pid}-`));
  taskRoots.push(root);
  return root;
}

async function removeTaskRoot(root) {
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(archiveFixtureTestRootDirectory)) {
    throw new Error(`Refusing to clean unexpected Archive fixture test root ${resolved}.`);
  }
  const status = await lstatOrUndefined(resolved);
  if (!status) return;
  if (status.isSymbolicLink()) {
    throw new Error(`Refusing recursive cleanup of linked Archive fixture test root ${resolved}.`);
  }
  await rm(resolved, { recursive: true, force: false });
}

async function removeLinkIfPresent(link) {
  const status = await lstatOrUndefined(link);
  if (!status) return;
  if (!status.isSymbolicLink()) throw new Error(`Expected task-owned junction at ${link}.`);
  try {
    await unlink(link);
  } catch (error) {
    if (!hasCode(error, "EPERM") && !hasCode(error, "EISDIR")) throw error;
    await rmdir(link);
  }
}

async function readFixtureTree(outputDirectory) {
  const names = (await readdir(outputDirectory)).sort();
  return Promise.all(
    names.map(async (name) => {
      const bytes = await readFile(path.join(outputDirectory, name));
      return {
        name,
        byteLength: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  );
}

function concatenatedIdat(png) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks = [];
  let cursor = 8;
  while (cursor < png.byteLength) {
    const length = view.getUint32(cursor, false);
    const type = String.fromCharCode(...png.subarray(cursor + 4, cursor + 8));
    if (type === "IDAT") chunks.push(png.subarray(cursor + 8, cursor + 8 + length));
    cursor += 12 + length;
  }
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function lstatOrUndefined(candidate) {
  try {
    return await lstat(candidate);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

function hasCode(error, code) {
  return error && typeof error === "object" && error.code === code;
}
