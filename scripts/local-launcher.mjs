import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, rm } from "node:fs/promises";
import { createServer as createTcpServer } from "node:net";
import path from "node:path";
import process from "node:process";

export const LOOPBACK_HOST = "127.0.0.1";
export const DEFAULT_SITE_PORT = 4173;
export const APP_MARKERS = Object.freeze({
  archive: '<meta name="badge-application" content="archive" />',
  studio: '<meta name="badge-application" content="studio" />',
});

const CONFIG_VERSION = 2;
const FIRST_FALLBACK_PORT = 4180;
const LAST_PORT = 65_535;
const RESERVED_PORTS = new Set([4175, 4176, 5173, 5174]);

function origin(port) {
  return `http://${LOOPBACK_HOST}:${port}`;
}

export function validateSitePort(port, label = "Site port") {
  if (!Number.isSafeInteger(port) || port < 1024 || port > LAST_PORT) {
    throw new Error(`${label} must be an integer from 1024 through ${LAST_PORT}; received ${String(port)}.`);
  }
  if (RESERVED_PORTS.has(port)) {
    throw new Error(
      `${label} uses reserved local port ${port}; choose a port other than companion ports 4175 and 4176 or fixture ports 5173 and 5174`,
    );
  }
  return port;
}

export async function readSitePort(configPath) {
  let source;
  try {
    source = await readFile(configPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw new Error(
      `Badge could not read its remembered local site at ${configPath}. Check that the file is readable, then start again.`,
      { cause: error },
    );
  }

  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("the remembered local site record must be an object");
    }
    if (parsed.version !== CONFIG_VERSION || parsed.host !== LOOPBACK_HOST) {
      throw new Error(`expected version ${CONFIG_VERSION} on host ${LOOPBACK_HOST}`);
    }
    return validateSitePort(parsed.port, "Remembered site port");
  } catch (error) {
    throw new Error(
      `Badge could not read its remembered local site at ${configPath}: ${error instanceof Error ? error.message : String(error)}. Preserve that file and repair it; Badge will not silently choose a new origin.`,
      { cause: error },
    );
  }
}

export async function writeSitePort(configPath, value, options = {}) {
  const port = validateSitePort(value);
  const existing = await readSitePort(configPath);
  if (existing !== null) {
    if (existing === port) return;
    throw new Error(
      `Badge already remembers ${origin(existing)}. It will not replace that browser-local origin with ${origin(port)}.`,
    );
  }

  const directory = path.dirname(configPath);
  const temporaryPath = `${configPath}.${process.pid}.${randomUUID()}.tmp`;
  let handle;
  try {
    await mkdir(directory, { recursive: true });
    handle = await open(temporaryPath, "wx");
    await handle.writeFile(
      `${JSON.stringify({ version: CONFIG_VERSION, host: LOOPBACK_HOST, port }, null, 2)}\n`,
      "utf8",
    );
    await handle.sync();
    await handle.close();
    handle = undefined;
    await options.beforePublish?.();
    await link(temporaryPath, configPath);
  } catch (error) {
    let racedPort = null;
    try {
      racedPort = await readSitePort(configPath);
    } catch {
      // The contextual write error below remains the useful failure surface.
    }
    if (racedPort === port) return;
    throw new Error(
      `Badge could not remember its local site at ${origin(port)} in ${configPath}. Ensure that directory is writable and no other startup is changing the file, then start Badge again.`,
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

async function readIdentityRoute(port, route, options) {
  const response = await options.fetchImpl(`${origin(port)}${route}`, {
    redirect: "manual",
    signal: globalThis.AbortSignal.timeout(options.timeoutMs),
  });
  return { ok: response.ok, body: await response.text() };
}

export async function inspectLocalSite(port, options = {}) {
  validateSitePort(port);
  const requestOptions = {
    timeoutMs: options.timeoutMs ?? 2_000,
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
  };
  try {
    const [archive, studio] = await Promise.all([
      readIdentityRoute(port, "/", requestOptions),
      readIdentityRoute(port, "/studio/", requestOptions),
    ]);
    const archiveIsExclusive =
      archive.ok && archive.body.includes(APP_MARKERS.archive) && !archive.body.includes(APP_MARKERS.studio);
    const studioIsExclusive =
      studio.ok && studio.body.includes(APP_MARKERS.studio) && !studio.body.includes(APP_MARKERS.archive);
    if (archiveIsExclusive && studioIsExclusive) {
      return "badge";
    }
    const hasBadgeMarker = [archive, studio].some(
      (result) => result.ok && Object.values(APP_MARKERS).some((marker) => result.body.includes(marker)),
    );
    return hasBadgeMarker ? "incomplete-badge" : "occupied";
  } catch {
    return (await canBindPort(port)) ? "free" : "unidentified";
  }
}

export async function findAvailablePort(startPort = FIRST_FALLBACK_PORT, options = {}) {
  if (!Number.isSafeInteger(startPort) || startPort < 1024 || startPort > LAST_PORT) {
    throw new Error(
      `Fallback site port must be an integer from 1024 through ${LAST_PORT}; received ${String(startPort)}.`,
    );
  }
  const portAvailable = options.canBindPort ?? canBindPort;
  for (let port = startPort; port <= LAST_PORT; port += 1) {
    if (RESERVED_PORTS.has(port)) continue;
    if (await portAvailable(port)) return port;
  }
  throw new Error(
    `Badge could not find a free loopback port from ${startPort} through ${LAST_PORT}. Close an unused local server, then start Badge again.`,
  );
}

export async function chooseLaunchPlan(options = {}) {
  const configuredPort = options.configuredPort ?? null;
  if (configuredPort !== null) validateSitePort(configuredPort, "Remembered site port");
  const port = configuredPort ?? DEFAULT_SITE_PORT;
  const inspectSite = options.inspectSite ?? inspectLocalSite;
  const findFreePort = options.findFreePort ?? findAvailablePort;
  const state = await inspectSite(port);

  if (state === "badge") return { action: "reuse", port, reason: "existing" };
  if (state === "free") {
    return { action: "launch", port, reason: configuredPort === null ? "preferred" : "configured" };
  }
  if (state === "unidentified") {
    throw new Error(
      `A process is listening at ${origin(port)}, but it did not identify itself as Badge within 2 seconds. If Badge is still starting, wait and run npm start again; otherwise stop that process. Badge will not switch origins while ownership is uncertain.`,
    );
  }
  if (state === "incomplete-badge") {
    throw new Error(
      `${origin(port)} identifies as Badge but does not serve both Archive at / and Studio at /studio/. Stop that incomplete or older Badge server, then start this version again without changing the remembered browser-data origin.`,
    );
  }
  if (state !== "occupied") {
    throw new Error(`Badge received an unknown local-site state ${String(state)} for ${origin(port)}.`);
  }
  if (configuredPort !== null) {
    throw new Error(
      `Badge remembers its local site at ${origin(port)}, but that port is occupied by another process. Stop that process or free port ${port}, then start Badge again. Badge will not switch remembered origins because doing so would hide browser-local data.`,
    );
  }
  return { action: "launch", port: validateSitePort(await findFreePort()), reason: "fallback" };
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

export function localAppUrls(port) {
  const sitePort = validateSitePort(port);
  return {
    archive: `${origin(sitePort)}/`,
    studio: `${origin(sitePort)}/studio/`,
  };
}
