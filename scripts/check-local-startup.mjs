import { rm } from "node:fs/promises";
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
  console.log(
    `Local startup passed on one task-owned listener: Archive ${first.urls.archive} and Studio ${first.urls.studio}.`,
  );
} finally {
  await second?.close().catch(() => undefined);
  await first?.close().catch(() => undefined);
  await rm(targetPaths.cleanupDirectory, { recursive: true, force: true });
  await rm(verificationRoot).catch(() => undefined);
}
