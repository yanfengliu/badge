import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, rm } from "node:fs/promises";
import { createServer as createTcpServer } from "node:net";
import path from "node:path";
import process from "node:process";

export const LOOPBACK_HOST = "127.0.0.1";
export const DEFAULT_PORT_PAIR = Object.freeze({ archivePort: 4173, studioPort: 4174 });
export const APP_MARKERS = Object.freeze({
  archive: '<meta name="badge-application" content="archive" />',
  studio: '<meta name="badge-application" content="studio" />',
});

const CONFIG_VERSION = 1;
const FIRST_FALLBACK_PORT = 4180;
const LAST_PORT = 65_535;
const RESERVED_PORTS = new Set([4175, 4176, 5173, 5174]);

function appName(app) {
  return app === "archive" ? "Archive" : "Studio";
}

function appPort(pair, app) {
  return app === "archive" ? pair.archivePort : pair.studioPort;
}

function origin(port) {
  return `http://${LOOPBACK_HOST}:${port}`;
}

function validatePort(port, label) {
  if (!Number.isSafeInteger(port) || port < 1024 || port > LAST_PORT) {
    throw new Error(`${label} must be an integer from 1024 through ${LAST_PORT}; received ${String(port)}.`);
  }
}

export function validatePortPair(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("the remembered local address record must be an object");
  }
  const pair = { archivePort: value.archivePort, studioPort: value.studioPort };
  validatePort(pair.archivePort, "Archive port");
  validatePort(pair.studioPort, "Studio port");
  if (pair.studioPort !== pair.archivePort + 1) {
    throw new Error("the remembered Studio port must immediately follow the Archive port");
  }
  const reservedPort = [pair.archivePort, pair.studioPort].find((port) => RESERVED_PORTS.has(port));
  if (reservedPort !== undefined) {
    throw new Error(
      `the remembered port pair uses reserved local port ${reservedPort}; choose an adjacent pair that excludes 4175, 4176, 5173, and 5174`,
    );
  }
  return pair;
}

export async function readPortPair(configPath) {
  let source;
  try {
    source = await readFile(configPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw new Error(
      `Badge could not read its remembered local addresses at ${configPath}. Check that the file is readable, then start again.`,
      { cause: error },
    );
  }

  try {
    const parsed = JSON.parse(source);
    if (parsed.version !== CONFIG_VERSION || parsed.host !== LOOPBACK_HOST) {
      throw new Error(`expected version ${CONFIG_VERSION} on host ${LOOPBACK_HOST}`);
    }
    return validatePortPair(parsed);
  } catch (error) {
    throw new Error(
      `Badge could not read its remembered local addresses at ${configPath}: ${error instanceof Error ? error.message : String(error)}. Preserve that file and repair it or restore the recorded ports; Badge will not silently choose a new origin.`,
      { cause: error },
    );
  }
}

export async function writePortPair(configPath, value, options = {}) {
  const pair = validatePortPair(value);
  const existing = await readPortPair(configPath);
  if (existing) {
    if (existing.archivePort === pair.archivePort && existing.studioPort === pair.studioPort) return;
    throw new Error(
      `Badge already remembers ${origin(existing.archivePort)} and ${origin(existing.studioPort)}. It will not replace those browser-local origins with ${origin(pair.archivePort)} and ${origin(pair.studioPort)}.`,
    );
  }

  const directory = path.dirname(configPath);
  const temporaryPath = `${configPath}.${process.pid}.${randomUUID()}.tmp`;
  let handle;
  try {
    await mkdir(directory, { recursive: true });
    handle = await open(temporaryPath, "wx");
    await handle.writeFile(
      `${JSON.stringify(
        {
          version: CONFIG_VERSION,
          host: LOOPBACK_HOST,
          archivePort: pair.archivePort,
          studioPort: pair.studioPort,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await handle.sync();
    await handle.close();
    handle = undefined;
    await options.beforePublish?.();
    await link(temporaryPath, configPath);
  } catch (error) {
    let racedPair = null;
    try {
      racedPair = await readPortPair(configPath);
    } catch {
      // The contextual write error below remains the useful failure surface.
    }
    if (racedPair && racedPair.archivePort === pair.archivePort && racedPair.studioPort === pair.studioPort) {
      return;
    }
    throw new Error(
      `Badge could not remember Archive at ${origin(pair.archivePort)} and Studio at ${origin(pair.studioPort)} in ${configPath}. Ensure that directory is writable and no other startup is changing the file, then start Badge again.`,
      { cause: error },
    );
  } finally {
    await handle?.close().catch(() => undefined);
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
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

export async function inspectLocalOrigin(port, expectedApp, options = {}) {
  validatePort(port, `${appName(expectedApp)} port`);
  const timeoutMs = options.timeoutMs ?? 2_000;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  try {
    const response = await fetchImpl(`${origin(port)}/`, {
      redirect: "manual",
      signal: globalThis.AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    if (response.ok && body.includes(APP_MARKERS[expectedApp])) return "badge";
    if (response.ok && Object.values(APP_MARKERS).some((marker) => body.includes(marker))) {
      return "wrong-badge-app";
    }
    return "occupied";
  } catch {
    return (await canBindPort(port)) ? "free" : "unidentified";
  }
}

export async function inspectPortPair(pair) {
  const validated = validatePortPair(pair);
  const [archive, studio] = await Promise.all([
    inspectLocalOrigin(validated.archivePort, "archive"),
    inspectLocalOrigin(validated.studioPort, "studio"),
  ]);
  return { archive, studio };
}

async function canBindPair(pair) {
  const servers = [];
  try {
    for (const port of [pair.archivePort, pair.studioPort]) {
      const server = createTcpServer();
      server.unref();
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen({ host: LOOPBACK_HOST, port, exclusive: true }, resolve);
      });
      servers.push(server);
    }
    return true;
  } catch {
    return false;
  } finally {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(() => resolve()))));
  }
}

export async function findAvailablePortPair(startPort = FIRST_FALLBACK_PORT, options = {}) {
  validatePort(startPort, "Fallback Archive port");
  const pairAvailable = options.canBindPair ?? canBindPair;
  for (let archivePort = startPort; archivePort < LAST_PORT; archivePort += 1) {
    const pair = { archivePort, studioPort: archivePort + 1 };
    if (RESERVED_PORTS.has(pair.archivePort) || RESERVED_PORTS.has(pair.studioPort)) continue;
    if (await pairAvailable(pair)) return pair;
  }
  throw new Error(
    `Badge could not find two adjacent free loopback ports from ${startPort} through ${LAST_PORT}. Close unused local servers, then start Badge again.`,
  );
}

function occupiedConfiguredOriginError(pair, app) {
  const port = appPort(pair, app);
  return new Error(
    `Badge remembers ${appName(app)} at ${origin(port)}, but that port is occupied by another process. Stop that process or free port ${port}, then start Badge again. Badge will not switch remembered origins because doing so would hide browser-local data.`,
  );
}

export async function chooseLaunchPlan(options = {}) {
  const configuredPair = options.configuredPair ? validatePortPair(options.configuredPair) : null;
  const pair = configuredPair ?? DEFAULT_PORT_PAIR;
  const inspectPair = options.inspectPair ?? inspectPortPair;
  const findFreePair = options.findFreePair ?? findAvailablePortPair;
  const state = await inspectPair(pair);

  for (const app of ["archive", "studio"]) {
    if (state[app] === "unidentified") {
      const port = appPort(pair, app);
      throw new Error(
        `A process is listening at ${origin(port)}, but it did not identify itself as Badge within 2 seconds. If Badge is still starting, wait and run npm start again; otherwise stop the process using port ${port}. Badge will not switch origins while ownership is uncertain.`,
      );
    }
    if (state[app] === "wrong-badge-app") {
      const port = appPort(pair, app);
      throw new Error(
        `${origin(port)} is serving the wrong Badge application for the remembered ${appName(app)} origin. Stop that server and run npm start again so Archive and Studio keep their assigned data origins.`,
      );
    }
  }

  if (state.archive === "badge" && state.studio === "badge") {
    return { action: "reuse", pair, appsToLaunch: [], reason: "existing" };
  }
  if (state.archive === "badge" && state.studio === "free") {
    return { action: "launch", pair, appsToLaunch: ["studio"], reason: "partial" };
  }
  if (state.archive === "free" && state.studio === "badge") {
    return { action: "launch", pair, appsToLaunch: ["archive"], reason: "partial" };
  }
  if (state.archive === "free" && state.studio === "free") {
    return {
      action: "launch",
      pair,
      appsToLaunch: ["archive", "studio"],
      reason: configuredPair ? "configured" : "preferred",
    };
  }

  if (configuredPair) {
    if (state.archive === "occupied") throw occupiedConfiguredOriginError(pair, "archive");
    if (state.studio === "occupied") throw occupiedConfiguredOriginError(pair, "studio");
  }

  if (state.archive === "badge" || state.studio === "badge") {
    const runningApp = state.archive === "badge" ? "Archive" : "Studio";
    const blockedApp = state.archive === "occupied" ? "Archive" : "Studio";
    throw new Error(
      `${runningApp} is already running on its expected Badge origin, but ${blockedApp}'s companion port belongs to another process. Stop the unrelated process and start Badge again; the launcher will not split one data pair across unrelated origins.`,
    );
  }

  return {
    action: "launch",
    pair: validatePortPair(await findFreePair()),
    appsToLaunch: ["archive", "studio"],
    reason: "fallback",
  };
}

export function listenForTerminalStop(input, onStop) {
  const wasFlowing = input.readableFlowing;
  let changedRawMode = false;
  let disposed = false;
  const onData = (chunk) => {
    if (String(chunk).includes("\u0003")) onStop(130);
  };

  try {
    if (input.isTTY && typeof input.setRawMode === "function" && !input.isRaw) {
      input.setRawMode(true);
      changedRawMode = true;
    }
  } catch {
    // OS signal handlers remain the fallback when a terminal cannot enter raw mode.
  }
  input.on("data", onData);
  input.resume?.();

  return () => {
    if (disposed) return;
    disposed = true;
    input.removeListener("data", onData);
    if (changedRawMode) {
      try {
        input.setRawMode(false);
      } catch {
        // The process is already stopping; terminal teardown may have won the race.
      }
    }
    if (wasFlowing !== true) input.pause?.();
  };
}

export function localAppUrls(pair) {
  const validated = validatePortPair(pair);
  return {
    archive: `${origin(validated.archivePort)}/`,
    studio: `${origin(validated.studioPort)}/`,
  };
}
