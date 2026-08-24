import { rm, rmdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { inspectLocalSite } from "./local-launcher.mjs";
import { createVerificationRuntimeTarget, runtimeTargetPaths } from "./local-runtime-target.mjs";
import { startLocalSite } from "./local-site-runner.mjs";

const repositoryRoot = path.resolve(process.cwd());
const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot);
const targetPaths = runtimeTargetPaths(runtimeTarget);
const verificationRoot = path.join(repositoryRoot, "tmp", "local-startup");
const relativeCleanup = path.relative(verificationRoot, targetPaths.cleanupDirectory);

async function removeVerificationRoot() {
  try {
    await rmdir(verificationRoot);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return;
    throw new Error(
      `Local-startup verification removed its task record but could not remove the now-empty ${verificationRoot} directory. Ensure no other Badge startup verification is running and that the directory is writable, then retry.`,
      { cause: error },
    );
  }
}

if (
  !relativeCleanup ||
  relativeCleanup === ".." ||
  relativeCleanup.startsWith(`..${path.sep}`) ||
  path.isAbsolute(relativeCleanup)
) {
  throw new Error(
    `Local-startup verification refused cleanup outside ${verificationRoot}: ${targetPaths.cleanupDirectory}`,
  );
}

let first;
let second;
let verificationError;
let successMessage;
try {
  first = await startLocalSite({ runtimeTarget });
  if (!first.ownsServer) {
    throw new Error("Local-startup verification did not create its isolated task-owned server.");
  }
  if ((await inspectLocalSite(first.port)) !== "badge") {
    throw new Error(
      `Local-startup verification could not identify Archive and Studio on ${first.urls.archive}.`,
    );
  }

  second = await startLocalSite({ runtimeTarget });
  if (second.ownsServer || second.action !== "reuse" || second.port !== first.port) {
    throw new Error("A repeated local startup did not reuse the exact isolated Badge site.");
  }
  successMessage = `Local startup passed on one task-owned listener: Archive ${first.urls.archive} and Studio ${first.urls.studio}.`;
} catch (error) {
  verificationError = error;
}

const cleanupErrors = [];
for (const cleanup of [
  () => second?.close(),
  () => first?.close(),
  () => rm(targetPaths.cleanupDirectory, { recursive: true, force: true }),
  () => removeVerificationRoot(),
]) {
  try {
    await cleanup();
  } catch (error) {
    cleanupErrors.push(error);
  }
}

if (verificationError && cleanupErrors.length > 0) {
  throw new AggregateError(
    [verificationError, ...cleanupErrors],
    "Local-startup verification failed and could not release every task-owned resource. Resolve the reported verification error, ensure no other Badge startup verification is running, then retry.",
  );
}
if (verificationError) throw verificationError;
if (cleanupErrors.length > 0) {
  throw new AggregateError(
    cleanupErrors,
    "Local-startup verification completed its route and reuse checks but could not release every task-owned resource. Ensure no other Badge startup verification is running, then retry.",
  );
}

console.log(successMessage);
