import { access } from "node:fs/promises";
import path from "node:path";

import {
  LOOPBACK_HOST,
  chooseLaunchPlan,
  findAvailablePort,
  localAppUrls,
  readSitePort,
  writeSitePort,
} from "./local-launcher.mjs";
import { runtimeTargetPaths } from "./local-runtime-target.mjs";

async function exists(filePath, accessFile = access) {
  try {
    await accessFile(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw new Error(
      `Badge could not inspect its legacy local-address record at ${filePath}. Make that path readable without deleting or replacing it, then start Badge again.`,
      { cause: error },
    );
  }
}

export async function startLocalSite(options) {
  const target = runtimeTargetPaths(options.runtimeTarget);
  if (target.legacyConfigPath && (await exists(target.legacyConfigPath, options.accessFile))) {
    throw new Error(
      `Badge found a legacy two-origin record at ${target.legacyConfigPath}. It was preserved. Run npm run recover:legacy to reopen the exact old Archive and Studio origins without changing this record. Archive can then export a backup; Studio backup is not implemented yet, so keep using recovery mode for Studio work you still need. This one-site launcher will not overwrite or guess across browser origins.`,
    );
  }

  const recordedPort = await readSitePort(target.configPath);
  const findFreePort = options.findFreePort ?? findAvailablePort;
  const configuredPort = recordedPort ?? (target.kind === "verification" ? await findFreePort() : null);
  const plan = await chooseLaunchPlan({
    configuredPort,
    inspectSite: options.inspectSite,
    findFreePort,
  });
  const urls = localAppUrls(plan.port);

  if (plan.action === "reuse") {
    await writeSitePort(target.configPath, plan.port);
    return {
      action: "reuse",
      reason: plan.reason,
      port: plan.port,
      urls,
      ownsServer: false,
      close: async () => undefined,
    };
  }

  const createViteServer = options.createViteServer ?? (await import("vite")).createServer;
  let server;
  try {
    server = await createViteServer({
      configFile: path.join(target.repositoryRoot, "apps", "host-web", "vite.config.ts"),
      server: { host: LOOPBACK_HOST, port: plan.port, strictPort: true },
    });
    await server.listen();
    await writeSitePort(target.configPath, plan.port);
  } catch (error) {
    const launchMessage = `Badge could not start its local site at ${urls.archive}. Ensure the port is free and the Vite configuration is valid, then start Badge again. ${error instanceof Error ? error.message : String(error)}`;
    try {
      await server?.close();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `${launchMessage} Listener cleanup also failed. Stop only the process still listening at ${urls.archive} before retrying. ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        { cause: cleanupError },
      );
    }
    throw new Error(launchMessage, { cause: error });
  }

  let closed = false;
  return {
    action: "launch",
    reason: plan.reason,
    port: plan.port,
    urls,
    ownsServer: true,
    close: async () => {
      if (closed) return;
      closed = true;
      await server.close();
    },
  };
}
