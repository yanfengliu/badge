import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm } from "node:fs/promises";
import { createServer as createTcpServer } from "node:net";
import path from "node:path";
import process from "node:process";

import { APP_MARKERS, LOOPBACK_HOST } from "./local-launcher.mjs";

const LAST_PORT = 65_535;
const LEGACY_RESERVED_PORTS = new Set([4175, 4176, 5173, 5174]);
const applicationOrder = ["archive", "studio"];

function appName(app) {
  return app === "archive" ? "Archive" : "Studio";
}

function appPort(pair, app) {
  return app === "archive" ? pair.archivePort : pair.studioPort;
}

function validateLegacyPort(port, label) {
  if (!Number.isSafeInteger(port) || port < 1024 || port > LAST_PORT) {
    throw new Error(`${label} must be an integer from 1024 through ${LAST_PORT}; received ${String(port)}.`);
  }
  if (LEGACY_RESERVED_PORTS.has(port)) {
    throw new Error(`${label} uses reserved local port ${port}, which the original launcher never admitted.`);
  }
  return port;
}

export function validateLegacyOriginPair(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("the legacy local-address record must be an object");
  }
  if (value.version !== 1 || value.host !== LOOPBACK_HOST) {
    throw new Error(`expected legacy version 1 on host ${LOOPBACK_HOST}`);
  }
  const pair = {
    archivePort: validateLegacyPort(value.archivePort, "Legacy Archive port"),
    studioPort: validateLegacyPort(value.studioPort, "Legacy Studio port"),
  };
  if (pair.studioPort !== pair.archivePort + 1) {
    throw new Error("the legacy Studio port must immediately follow the legacy Archive port");
  }
  return pair;
}

export async function readLegacyOriginPair(configPath) {
  let source;
  try {
    source = await readFile(configPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      throw new Error(
        `No legacy Badge origin record exists at ${configPath}. This command only reopens origins recorded by the superseded two-port launcher.`,
        { cause: error },
      );
    }
    throw new Error(
      `Badge could not read its legacy local-address record at ${configPath}. Make that path readable without deleting or replacing it, then run legacy recovery again.`,
      { cause: error },
    );
  }

  try {
    return validateLegacyOriginPair(JSON.parse(source));
  } catch (error) {
    throw new Error(
      `Badge could not use its legacy local-address record at ${configPath}: ${error instanceof Error ? error.message : String(error)}. Preserve the file and repair it before retrying recovery.`,
      { cause: error },
    );
  }
}

function origin(port) {
  return `http://${LOOPBACK_HOST}:${port}/`;
}

export function legacyAppUrls(value) {
  const pair = validateLegacyOriginPair({ ...value, version: 1, host: LOOPBACK_HOST });
  return { archive: origin(pair.archivePort), studio: origin(pair.studioPort) };
}

async function canBindPort(port) {
  const server = createTcpServer();
  server.unref();
  return new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen({ host: LOOPBACK_HOST, port, exclusive: true }, () => {
      server.close((error) => resolve(!error));
    });
  });
}

export async function inspectLegacyOrigin(port, app, options = {}) {
  validateLegacyPort(port, `Legacy ${appName(app)} port`);
  if (!applicationOrder.includes(app)) throw new Error(`Unknown legacy Badge application ${String(app)}.`);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  try {
    const response = await fetchImpl(origin(port), {
      redirect: "manual",
      signal: globalThis.AbortSignal.timeout(options.timeoutMs ?? 2_000),
    });
    const body = await response.text();
    const expectedMarker = APP_MARKERS[app];
    const otherMarker = APP_MARKERS[app === "archive" ? "studio" : "archive"];
    if (response.ok && body.includes(expectedMarker) && !body.includes(otherMarker)) {
      if (app === "archive") {
        const studioResponse = await fetchImpl(`${origin(port)}studio/`, {
          redirect: "manual",
          signal: globalThis.AbortSignal.timeout(options.timeoutMs ?? 2_000),
        });
        const studioBody = await studioResponse.text();
        if (
          studioResponse.ok &&
          studioBody.includes(APP_MARKERS.studio) &&
          !studioBody.includes(APP_MARKERS.archive)
        ) {
          return "unified-badge";
        }
      }
      return "badge";
    }
    if (response.ok && Object.values(APP_MARKERS).some((marker) => body.includes(marker))) {
      return "wrong-badge-app";
    }
    return "occupied";
  } catch {
    return (await (options.canBindPort ?? canBindPort)(port)) ? "free" : "unidentified";
  }
}

export async function chooseLegacyRecoveryPlan(options) {
  const pair = validateLegacyOriginPair({ ...options.pair, version: 1, host: LOOPBACK_HOST });
  const inspectOrigin = options.inspectOrigin ?? inspectLegacyOrigin;
  const [archive, studio] = await Promise.all(
    applicationOrder.map((app) => inspectOrigin(appPort(pair, app), app)),
  );
  const states = { archive, studio };

  for (const app of applicationOrder) {
    const state = states[app];
    if (state === "badge" || state === "free") continue;
    const url = origin(appPort(pair, app));
    if (state === "unidentified") {
      throw new Error(
        `A process is listening at the legacy ${appName(app)} origin ${url}, but it did not identify itself within 2 seconds. Wait for it to finish starting or stop it, then run npm run recover:legacy again.`,
      );
    }
    if (state === "wrong-badge-app") {
      throw new Error(
        `The legacy ${appName(app)} origin at ${url} is serving the wrong Badge application. Stop that server, then run npm run recover:legacy again; recovery will not swap preserved browser-data origins.`,
      );
    }
    if (state === "occupied") {
      throw new Error(
        `Badge cannot recover its legacy ${appName(app)} origin at ${url} because another process owns that port. Stop that process, then run npm run recover:legacy again; recovery will not choose a new origin and hide old browser-local data.`,
      );
    }
    if (state === "unified-badge") {
      throw new Error(
        `The legacy Archive origin at ${url} is serving a one-site Badge host whose Studio route uses the Archive origin. Stop that server, then run npm run recover:legacy so Studio opens only on its recorded legacy origin.`,
      );
    }
    throw new Error(`Badge received unknown legacy ${appName(app)} state ${String(state)} at ${url}.`);
  }

  return {
    pair,
    states,
    appsToLaunch: applicationOrder.filter((app) => states[app] === "free"),
  };
}

async function closeOwnedServers(owned, urls) {
  const results = await Promise.allSettled(owned.map(({ server }) => server.close()));
  const failures = results.flatMap((result, index) =>
    result.status === "rejected" ? [{ app: owned[index].app, error: result.reason }] : [],
  );
  if (failures.length === 0) return;
  const labels = failures.map(({ app }) => appName(app)).join(" and ");
  const locations = failures.map(({ app }) => urls[app]).join(" and ");
  throw new AggregateError(
    failures.map(({ error }) => error),
    `Badge could not close its owned legacy ${labels} listener${failures.length === 1 ? "" : "s"} at ${locations}. Stop only those exact recovery processes or ports before starting Badge again.`,
  );
}

export async function acquireLegacyRecoveryStartupLock(lockPath, options = {}) {
  const resolvedPath = path.resolve(lockPath);
  if (
    path.basename(resolvedPath).toLowerCase() !== "legacy-recovery.lock" ||
    path.basename(path.dirname(resolvedPath)).toLowerCase() !== ".badge-local"
  ) {
    throw new Error(
      `Badge legacy recovery requires its startup lock at an exact .badge-local/legacy-recovery.lock path; received ${resolvedPath}.`,
    );
  }

  const token = randomUUID();
  let handle;
  let ownsFile = false;
  try {
    await mkdir(path.dirname(resolvedPath), { recursive: true });
    handle = await open(resolvedPath, "wx");
    ownsFile = true;
    await options.afterCreate?.();
    await handle.writeFile(
      `${JSON.stringify({ version: 1, pid: process.pid, token, createdAt: new Date().toISOString() })}\n`,
      "utf8",
    );
    await handle.sync();
    await handle.close();
    handle = undefined;
  } catch (error) {
    const cleanupErrors = [];
    try {
      await handle?.close();
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
    }
    if (ownsFile) {
      try {
        await rm(resolvedPath);
      } catch (cleanupError) {
        if (!cleanupError || typeof cleanupError !== "object" || cleanupError.code !== "ENOENT") {
          cleanupErrors.push(cleanupError);
        }
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        `Badge could not publish its legacy-recovery startup lock at ${resolvedPath}, and cleanup of its own partial lock also failed. Preserve both address records, stop this recovery process, and inspect only that exact lock before retrying. Primary failure: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (error && typeof error === "object" && error.code === "EEXIST") {
      throw new Error(
        `Another Badge legacy recovery is already starting according to ${resolvedPath}. Wait for it to print both old origins, then retry. If no recovery process remains, inspect that exact lock before removing it; Badge will not guess that a lock is stale.`,
        { cause: error },
      );
    }
    throw new Error(
      `Badge could not create its legacy-recovery startup lock at ${resolvedPath}. Make the .badge-local directory writable without deleting its address records, then retry. ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  let released = false;
  return async () => {
    if (released) return;
    let current;
    try {
      current = JSON.parse(await readFile(resolvedPath, "utf8"));
    } catch (error) {
      throw new Error(
        `Badge could not verify its owned legacy-recovery startup lock at ${resolvedPath}. Stop only this recovery process and inspect that exact file before retrying.`,
        { cause: error },
      );
    }
    if (!current || current.version !== 1 || current.pid !== process.pid || current.token !== token) {
      throw new Error(
        `Badge refused to remove the legacy-recovery startup lock at ${resolvedPath} because its ownership changed. Stop only this recovery process and inspect that exact file before retrying.`,
      );
    }
    try {
      await rm(resolvedPath);
      released = true;
    } catch (error) {
      throw new Error(
        `Badge could not remove its owned legacy-recovery startup lock at ${resolvedPath}. Stop only this recovery process and remove that exact lock after confirming no recovery startup remains.`,
        { cause: error },
      );
    }
  };
}

export async function startLegacyRecovery(options) {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const plan = await chooseLegacyRecoveryPlan(options);
  const urls = legacyAppUrls(plan.pair);
  const owned = [];
  let activeApp = null;

  try {
    if (plan.appsToLaunch.length > 0) {
      activeApp = plan.appsToLaunch[0];
      const createViteServer = options.createViteServer ?? (await import("vite")).createServer;
      for (const app of plan.appsToLaunch) {
        activeApp = app;
        const server = await createViteServer({
          configFile: path.join(repositoryRoot, "apps", `${app}-web`, "vite.config.ts"),
          define: {
            __BADGE_LEGACY_COMPANION_ORIGIN__: JSON.stringify(urls[app === "archive" ? "studio" : "archive"]),
          },
          server: { host: LOOPBACK_HOST, port: appPort(plan.pair, app), strictPort: true },
        });
        owned.push({ app, server });
        await server.listen();
      }
    }
  } catch (error) {
    const launchMessage = `Badge could not reopen its legacy ${appName(activeApp)} origin at ${urls[activeApp]}. Keep the legacy record and free that exact port before retrying. ${error instanceof Error ? error.message : String(error)}`;
    try {
      await closeOwnedServers(owned, urls);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `${launchMessage} Cleanup also failed. ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        { cause: cleanupError },
      );
    }
    throw new Error(launchMessage, { cause: error });
  }

  let closePromise;
  return {
    pair: plan.pair,
    states: plan.states,
    urls,
    ownedApps: owned.map(({ app }) => app),
    close: async () => {
      closePromise ??= closeOwnedServers(owned, urls);
      await closePromise;
    },
  };
}

export async function startLegacyRecoveryWithLock(options) {
  const releaseLock = await acquireLegacyRecoveryStartupLock(options.startupLockPath);
  let instance;
  try {
    instance = await startLegacyRecovery(options);
  } catch (startupError) {
    try {
      await releaseLock();
    } catch (lockError) {
      throw new AggregateError(
        [startupError, lockError],
        `${startupError instanceof Error ? startupError.message : String(startupError)} Startup-lock cleanup also failed. ${lockError instanceof Error ? lockError.message : String(lockError)}`,
        { cause: lockError },
      );
    }
    throw startupError;
  }

  try {
    await releaseLock();
  } catch (lockError) {
    try {
      await instance.close();
    } catch (listenerError) {
      throw new AggregateError(
        [lockError, listenerError],
        `${lockError instanceof Error ? lockError.message : String(lockError)} Listener cleanup also failed. ${listenerError instanceof Error ? listenerError.message : String(listenerError)}`,
        { cause: listenerError },
      );
    }
    throw lockError;
  }
  return instance;
}
