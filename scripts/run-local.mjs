import path from "node:path";
import process from "node:process";

import {
  LOOPBACK_HOST,
  chooseLaunchPlan,
  listenForTerminalStop,
  localAppUrls,
  readPortPair,
  writePortPair,
} from "./local-launcher.mjs";

const targetDefinitions = {
  archive: { configFile: "apps/archive-web/vite.config.ts", portKey: "archivePort" },
  studio: { configFile: "apps/studio-web/vite.config.ts", portKey: "studioPort" },
};

function selectedApp() {
  const onlyIndex = process.argv.indexOf("--only");
  if (onlyIndex === -1) return null;
  const app = process.argv[onlyIndex + 1];
  if (app !== "archive" && app !== "studio") {
    throw new Error('The --only option requires either "archive" or "studio".');
  }
  return app;
}

function printUrls(pair, message, runningApps = ["archive", "studio"]) {
  const urls = localAppUrls(pair);
  console.log(`\n${message}`);
  console.log(
    `  Archive  ${urls.archive}${runningApps.includes("archive") ? "" : "  (reserved, not started)"}`,
  );
  console.log(
    `  Studio   ${urls.studio}${runningApps.includes("studio") ? "" : "  (reserved, not started)"}\n`,
  );
}

async function run() {
  const configPath = path.resolve(".badge-local/ports.json");
  const configuredPair = await readPortPair(configPath);
  const plan = await chooseLaunchPlan({ configuredPair });
  const only = selectedApp();
  const appsToLaunch = only ? plan.appsToLaunch.filter((app) => app === only) : plan.appsToLaunch;

  if (plan.reason === "fallback") {
    const preferred = localAppUrls({ archivePort: 4173, studioPort: 4174 });
    printUrls(
      plan.pair,
      `Preferred ports ${preferred.archive} and ${preferred.studio} are occupied by other software. Badge selected and will remember this free pair. Existing browser data at an older Badge address remains there; restore a backup before treating a new origin as authoritative.`,
    );
  }

  if (plan.action === "reuse" || appsToLaunch.length === 0) {
    await writePortPair(configPath, plan.pair);
    const runningApps = ["archive", "studio"].filter((app) => !plan.appsToLaunch.includes(app));
    printUrls(
      plan.pair,
      runningApps.length === 2
        ? "Badge is already running. Reusing its stable local addresses:"
        : `${only === "archive" ? "Archive" : "Studio"} is already running. Reusing its stable local address:`,
      runningApps,
    );
    return;
  }

  const { createServer } = await import("vite");
  const ownedServers = [];
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
    for (const app of appsToLaunch) {
      const target = targetDefinitions[app];
      let server;
      try {
        server = await createServer({
          configFile: path.resolve(target.configFile),
          server: {
            host: LOOPBACK_HOST,
            port: plan.pair[target.portKey],
            strictPort: true,
          },
        });
        await server.listen();
      } catch (error) {
        if (server) await server.close().catch(() => undefined);
        throw new Error(
          `Badge could not start ${app === "archive" ? "Archive" : "Studio"} at ${localAppUrls(plan.pair)[app]}. Ensure the port is free and the Vite configuration is valid, then start Badge again. ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      ownedServers.push(server);
    }

    await writePortPair(configPath, plan.pair);
    const runningApps = ["archive", "studio"].filter(
      (app) => !plan.appsToLaunch.includes(app) || appsToLaunch.includes(app),
    );
    printUrls(
      plan.pair,
      plan.reason === "partial"
        ? "Badge reused the running app and started its missing companion:"
        : "Badge is ready at these stable local addresses:",
      runningApps,
    );
    await stopRequested;
  } finally {
    disposeTerminal();
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
    await Promise.allSettled(ownedServers.map((server) => server.close()));
  }

  process.exitCode = requestedExitCode;
}

try {
  await run();
} catch (error) {
  console.error(`\nBadge did not start.\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
