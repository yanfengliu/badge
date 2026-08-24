import path from "node:path";
import { clearTimeout, setTimeout } from "node:timers";

import {
  LOOPBACK_HOST,
  chooseLaunchPlan,
  findAvailablePort,
  localAppUrls,
  readSitePort,
  writeSitePort,
} from "./local-launcher.mjs";
import { runtimeTargetPaths } from "./local-runtime-target.mjs";

const DEFAULT_REQUEST_IDLE_TIMEOUT_MS = 5_000;
const SAYING_SERVER_SHUTDOWN = Symbol.for("badge.saying-server.shutdown.v1");

async function waitForRequestsIdle(server, timeoutMs) {
  if (typeof server.waitForRequestsIdle !== "function") return;
  let timeout;
  try {
    await Promise.race([
      server.waitForRequestsIdle(),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Vite did not report idle within ${timeoutMs} ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function closeOwnedServer(server, url, timeoutMs) {
  const errors = [];
  const shutdownSayings = server[SAYING_SERVER_SHUTDOWN];
  if (typeof shutdownSayings === "function") {
    try {
      await shutdownSayings();
    } catch (error) {
      errors.push(error);
    }
  }

  let idleError;
  try {
    await waitForRequestsIdle(server, timeoutMs);
  } catch (error) {
    idleError = error;
    errors.push(error);
  }

  let closeError;
  try {
    await server.close();
  } catch (error) {
    closeError = error;
    errors.push(error);
  }

  if (errors.length > 1) {
    throw new AggregateError(
      errors,
      `Badge could not stop active saying work, finish active requests, or close its owned local listener at ${url}. Stop only the process still listening there, then start Badge again.`,
    );
  }
  if (closeError) {
    throw new Error(
      `Badge could not close its owned local listener at ${url}. Stop only the process still listening there, then start Badge again. ${closeError instanceof Error ? closeError.message : String(closeError)}`,
      { cause: closeError },
    );
  }
  if (idleError) {
    throw new Error(
      `Badge closed its owned local listener at ${url}, but could not confirm active request work became idle before shutdown: ${idleError instanceof Error ? idleError.message : String(idleError)}. Start Badge again if you still need it.`,
      { cause: idleError },
    );
  }
  if (errors.length === 1) {
    const shutdownError = errors[0];
    throw new Error(
      `Badge closed its owned local listener at ${url}, but could not stop active saying work cleanly: ${shutdownError instanceof Error ? shutdownError.message : String(shutdownError)}. Start Badge again if you still need it.`,
      { cause: shutdownError },
    );
  }
}

export async function startLocalSite(options) {
  const target = runtimeTargetPaths(options.runtimeTarget);
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
      mode: target.kind === "verification" ? "fixture" : "development",
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
  const requestIdleTimeoutMs =
    Number.isSafeInteger(options.requestIdleTimeoutMs) && options.requestIdleTimeoutMs > 0
      ? options.requestIdleTimeoutMs
      : DEFAULT_REQUEST_IDLE_TIMEOUT_MS;
  return {
    action: "launch",
    reason: plan.reason,
    port: plan.port,
    urls,
    ownsServer: true,
    close: async () => {
      if (closed) return;
      closed = true;
      await closeOwnedServer(server, urls.archive, requestIdleTimeoutMs);
    },
  };
}
