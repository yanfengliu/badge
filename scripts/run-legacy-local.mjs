import path from "node:path";
import process from "node:process";

import { readLegacyOriginPair, startLegacyRecoveryWithLock } from "./local-legacy-recovery.mjs";
import { listenForTerminalStop } from "./local-launcher.mjs";

async function run() {
  const configPath = path.resolve(".badge-local/ports.json");
  const pair = await readLegacyOriginPair(configPath);
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
    instance = await startLegacyRecoveryWithLock({
      repositoryRoot: process.cwd(),
      pair,
      startupLockPath: path.resolve(".badge-local/legacy-recovery.lock"),
    });
    console.log("\nBadge legacy recovery is serving the exact preserved browser-data origins:");
    console.log(`  Archive  ${instance.urls.archive}`);
    console.log(`  Studio   ${instance.urls.studio}`);
    console.log(
      "\nThis is recovery mode, not the new one-site address. Archive can export a backup. Studio backup is not implemented yet, so keep .badge-local/ports.json and use this command for Studio work that still matters.\n",
    );
    if (instance.ownedApps.length === 0) return;
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
    `\nBadge legacy recovery did not start.\n${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
