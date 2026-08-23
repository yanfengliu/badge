import process from "node:process";

import { listenForTerminalStop } from "./local-launcher.mjs";
import { createCanonicalRuntimeTarget } from "./local-runtime-target.mjs";
import { startLocalSite } from "./local-site-runner.mjs";

function printUrls(instance, message) {
  console.log(`\n${message}`);
  console.log(`  Archive  ${instance.urls.archive}`);
  console.log(`  Studio   ${instance.urls.studio}\n`);
}

async function run() {
  const runtimeTarget = createCanonicalRuntimeTarget();
  let instance;
  let requestedExitCode = 0;
  let stopping = false;
  let releaseStop;
  const stopRequested = new Promise((resolve) => {
    releaseStop = resolve;
  });
  let disposeTerminal = () => undefined;
  const requestStop = (exitCode) => {
    if (stopping) return;
    stopping = true;
    requestedExitCode = exitCode;
    disposeTerminal();
    releaseStop();
  };
  const onInterrupt = () => requestStop(130);
  const onTerminate = () => requestStop(143);
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  disposeTerminal = listenForTerminalStop(process.stdin, requestStop);

  try {
    instance = await startLocalSite({ runtimeTarget });
    if (instance.action === "reuse") {
      printUrls(instance, "Badge is already running. Reusing its stable local site:");
      return;
    }
    if (instance.reason === "fallback") {
      console.log(
        `\nPreferred port 4173 is occupied by other software. Badge selected ${instance.port} and will remember it. Existing browser data at an older Badge origin remains there; restore a backup before treating a new origin as authoritative.`,
      );
    }
    printUrls(instance, "Badge is ready on one stable local site:");
    if (!stopping) await stopRequested;
  } finally {
    disposeTerminal();
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
    await instance?.close();
  }

  process.exitCode = requestedExitCode;
}

try {
  await run();
} catch (error) {
  console.error(
    `\nBadge could not complete this local run.\n${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
