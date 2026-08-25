import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  APP_MARKERS,
  BADGE_ROOT_ENTRY_PATH,
  BADGE_ROOT_ENTRY_SCRIPT,
  DEFAULT_SITE_PORT,
  chooseLaunchPlan,
  findAvailablePort,
  formatLocalSiteAnnouncement,
  inspectLocalSite,
  listenForTerminalStop,
  localAppUrls,
  readSitePort,
  writeSitePort,
} from "./local-launcher.mjs";

const openedServers = [];
const temporaryDirectories = [];
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

afterEach(async () => {
  await Promise.all(
    openedServers
      .splice(0)
      .map(
        (server) =>
          new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
      ),
  );
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("local Badge launch planning", () => {
  it("reuses a complete Badge site instead of launching another listener", async () => {
    const plan = await chooseLaunchPlan({
      configuredPort: null,
      inspectSite: async () => "badge",
      findFreePort: async () => {
        throw new Error("a fallback must not be selected");
      },
    });

    expect(plan).toEqual({ action: "reuse", port: DEFAULT_SITE_PORT, reason: "existing" });
  });

  it("selects one free port when the preferred first-run port belongs to other software", async () => {
    const plan = await chooseLaunchPlan({
      configuredPort: null,
      inspectSite: async () => "occupied",
      findFreePort: async () => 4180,
    });

    expect(plan).toEqual({ action: "launch", port: 4180, reason: "fallback" });
  });

  it("refuses to abandon a remembered origin when another process takes its port", async () => {
    await expect(
      chooseLaunchPlan({
        configuredPort: 4180,
        inspectSite: async () => "occupied",
        findFreePort: async () => 4190,
      }),
    ).rejects.toThrow("Badge remembers its local site at http://127.0.0.1:4180, but that port is occupied");
  });

  it("does not select a fallback while a listener's identity is unresolved", async () => {
    await expect(
      chooseLaunchPlan({
        configuredPort: null,
        inspectSite: async () => "unidentified",
        findFreePort: async () => {
          throw new Error("fallback must not run while ownership is uncertain");
        },
      }),
    ).rejects.toThrow("did not identify itself as Badge");
  });

  it("does not reuse an outdated or incomplete Badge site", async () => {
    const result = await chooseLaunchPlan({
      configuredPort: null,
      inspectSite: async () => "incomplete-badge",
      findFreePort: async () => {
        throw new Error("fallback must not hide an incomplete Badge site");
      },
    }).catch((error) => error);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain("identifies as an outdated or incomplete Badge site at /");
    expect(result.message).not.toContain("/studio/");
  });

  it("reports the remembered root once when an outdated site owns that origin", async () => {
    const result = await chooseLaunchPlan({
      configuredPort: 4180,
      inspectSite: async () => "incomplete-badge",
      findFreePort: async () => {
        throw new Error("fallback must not replace the remembered origin");
      },
    }).catch((error) => error);

    expect(result).toBeInstanceOf(Error);
    expect(result.message.match(/http:\/\/127\.0\.0\.1:4180/g)).toHaveLength(1);
    expect(result.message).not.toContain("/studio/");
  });
});

describe("local Badge site inspection", () => {
  async function listen(respond) {
    const server = createServer((request, response) => {
      const result = respond(request.url ?? "/");
      const descriptor =
        typeof result === "string"
          ? { body: result, headers: { "content-type": "text/html" }, status: 200 }
          : result;
      response.writeHead(descriptor.status ?? 200, descriptor.headers ?? {});
      response.end(descriptor.body ?? "");
    });
    openedServers.push(server);
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server did not expose a TCP port");
    return address.port;
  }

  function currentBadgeResponse(url, entryPath = BADGE_ROOT_ENTRY_PATH) {
    if (url === "/") {
      const entryScript = `<script type="module" src="${entryPath}"></script>`;
      return `<html><head>${APP_MARKERS.badge}</head><body><div id="root"></div>${entryScript}</body></html>`;
    }
    if (url === entryPath) {
      return {
        body: "export {};",
        headers: { "content-type": "text/javascript" },
        status: 200,
      };
    }
    if (url === "/studio") {
      return { headers: { location: "/#studio" }, status: 308 };
    }
    return { body: "not found", headers: { "content-type": "text/plain" }, status: 404 };
  }

  it("requires the current root marker, usable host entry, and legacy-route redirect", async () => {
    const requestedRoutes = [];
    const badgePort = await listen((url) => {
      requestedRoutes.push(url);
      return currentBadgeResponse(url);
    });
    const foreignPort = await listen(() => "<html><head><title>Something else</title></head></html>");

    expect(await inspectLocalSite(badgePort)).toBe("badge");
    expect(requestedRoutes).toEqual(["/", BADGE_ROOT_ENTRY_PATH, "/studio"]);
    expect(await inspectLocalSite(foreignPort)).toBe("occupied");
  });

  it("treats an unrelated production Vite entry without a Badge marker as occupied", async () => {
    const requestedRoutes = [];
    const unrelatedVitePort = await listen((url) => {
      requestedRoutes.push(url);
      return '<html><body><div id="root"></div><script type="module" src="/assets/index-BbfosaDH.js"></script></body></html>';
    });

    expect(await inspectLocalSite(unrelatedVitePort)).toBe("occupied");
    expect(requestedRoutes).toEqual(["/"]);
  });

  it("refuses a marker-only root as incomplete", async () => {
    const markerOnlyPort = await listen(() => `<html><head>${APP_MARKERS.badge}</head></html>`);

    expect(await inspectLocalSite(markerOnlyPort)).toBe("incomplete-badge");
  });

  it("accepts the single same-origin module emitted by a current Vite preview build", async () => {
    const previewEntry = "/assets/index-B7xYz_19.js";
    const requestedRoutes = [];
    const previewPort = await listen((url) => {
      requestedRoutes.push(url);
      return currentBadgeResponse(url, previewEntry);
    });

    expect(await inspectLocalSite(previewPort)).toBe("badge");
    expect(requestedRoutes).toEqual(["/", previewEntry, "/studio"]);
  });

  it("selects one cache-busted app entry from current Vite development infrastructure", async () => {
    const liveEntry = `${BADGE_ROOT_ENTRY_PATH}?t=1787690953330`;
    const requestedRoutes = [];
    const livePort = await listen((url) => {
      requestedRoutes.push(url);
      if (url === "/") {
        return `<html><head>${APP_MARKERS.badge}<script type="module" src="/@vite/client"></script><script type="module">import RefreshRuntime from "/@react-refresh";</script></head><body><div id="root"></div><script type="module" src="${liveEntry}"></script></body></html>`;
      }
      return currentBadgeResponse(url, liveEntry);
    });

    expect(await inspectLocalSite(livePort)).toBe("badge");
    expect(requestedRoutes).toEqual(["/", liveEntry, "/studio"]);
  });

  it("refuses a current marker and app entry without the root mount", async () => {
    const missingRootPort = await listen((url) => {
      if (url === "/") {
        return `<html><head>${APP_MARKERS.badge}</head><body>${BADGE_ROOT_ENTRY_SCRIPT}</body></html>`;
      }
      return currentBadgeResponse(url);
    });

    expect(await inspectLocalSite(missingRootPort)).toBe("incomplete-badge");
  });

  it.each([
    ["missing module", { body: "not found", headers: { "content-type": "text/plain" }, status: 404 }],
    ["HTML fallback", "<html><body>not JavaScript</body></html>"],
  ])("refuses a current root whose expected entry is a broken %s response", async (_label, entryResponse) => {
    const brokenEntryPort = await listen((url) =>
      url === BADGE_ROOT_ENTRY_PATH ? entryResponse : currentBadgeResponse(url),
    );

    expect(await inspectLocalSite(brokenEntryPort)).toBe("incomplete-badge");
  });

  it.each([
    ["path drift", "/@badge-host/old-main.tsx"],
    ["unsupported query", `${BADGE_ROOT_ENTRY_PATH}?version=1`],
    ["fragment", `${BADGE_ROOT_ENTRY_PATH}?t=1787690953330#stale`],
  ])("refuses a current marker with root entry %s", async (_label, source) => {
    const wrongEntryPort = await listen(
      () =>
        `<html><head>${APP_MARKERS.badge}</head><body><div id="root"></div><script type="module" src="${source}"></script></body></html>`,
    );

    expect(await inspectLocalSite(wrongEntryPort)).toBe("incomplete-badge");
  });

  it.each([
    ["external", '<script type="module" src="https://example.com/index-current.js"></script>'],
    ["malformed", '<script type="module" src="//[invalid"></script>'],
    ["multiple", `${BADGE_ROOT_ENTRY_SCRIPT}<script type="module" src="/assets/index-extra.js"></script>`],
  ])("refuses a current marker with %s module scripts", async (_label, scripts) => {
    const invalidScriptsPort = await listen(
      () => `<html><head>${APP_MARKERS.badge}</head><body><div id="root"></div>${scripts}</body></html>`,
    );

    expect(await inspectLocalSite(invalidScriptsPort)).toBe("incomplete-badge");
  });

  it("refuses a hybrid site that still serves a Studio document", async () => {
    const hybridPort = await listen((url) =>
      url === "/studio"
        ? "<html><head><title>Legacy Studio</title></head></html>"
        : currentBadgeResponse(url),
    );

    expect(await inspectLocalSite(hybridPort)).toBe("incomplete-badge");
  });

  it.each([APP_MARKERS.legacyBadge, APP_MARKERS.archive, APP_MARKERS.studio])(
    "classifies a listener with legacy marker %s as incomplete instead of reusable",
    async (legacyMarker) => {
      const partialPort = await listen(() => `<html><head>${legacyMarker}</head></html>`);

      expect(await inspectLocalSite(partialPort)).toBe("incomplete-badge");
    },
  );

  it("refuses a listener that mixes the complete and legacy application markers", async () => {
    const ambiguousPort = await listen(
      () =>
        `<html><head>${APP_MARKERS.badge}${APP_MARKERS.archive}</head><body><div id="root"></div>${BADGE_ROOT_ENTRY_SCRIPT}</body></html>`,
    );

    expect(await inspectLocalSite(ambiguousPort)).toBe("incomplete-badge");
  });

  it("distinguishes an unused port", async () => {
    const closedServer = createServer();
    await new Promise((resolve, reject) => {
      closedServer.once("error", reject);
      closedServer.listen(0, "127.0.0.1", resolve);
    });
    const address = closedServer.address();
    if (!address || typeof address === "string") throw new Error("test port was unavailable");
    const unusedPort = address.port;
    await new Promise((resolve, reject) =>
      closedServer.close((error) => (error ? reject(error) : resolve())),
    );

    expect(await inspectLocalSite(unusedPort)).toBe("free");
  });

  it("keeps a silent listener unidentified instead of claiming it is unrelated software", async () => {
    const silentPort = await listen(() => "");
    openedServers.at(-1).removeAllListeners("request");

    expect(await inspectLocalSite(silentPort, { timeoutMs: 25 })).toBe("unidentified");
  });

  it("waits long enough for a starting Badge site to return its root marker", async () => {
    const server = createServer((request, response) => {
      const send = () => {
        const result = currentBadgeResponse(request.url ?? "/");
        const descriptor =
          typeof result === "string"
            ? { body: result, headers: { "content-type": "text/html" }, status: 200 }
            : result;
        response.writeHead(descriptor.status ?? 200, descriptor.headers ?? {});
        response.end(descriptor.body ?? "");
      };
      if (request.url === "/") setTimeout(send, 1_000);
      else send();
    });
    openedServers.push(server);
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server did not expose a TCP port");

    expect(await inspectLocalSite(address.port)).toBe("badge");
  });

  it("binds identity checks to the marker shipped by the root host entry point", async () => {
    const rootEntry = await readFile(path.join(repositoryRoot, "apps/host-web/index.html"), "utf8");

    expect(rootEntry).toContain(APP_MARKERS.badge);
    expect(rootEntry).toContain(BADGE_ROOT_ENTRY_SCRIPT);
    expect(rootEntry).not.toContain(APP_MARKERS.legacyBadge);
    expect(rootEntry).not.toContain(APP_MARKERS.archive);
    expect(rootEntry).not.toContain(APP_MARKERS.studio);
  });
});

describe("free local port search", () => {
  it("checks every eligible port", async () => {
    const checked = [];
    const result = await findAvailablePort(4180, {
      canBindPort: async (candidate) => {
        checked.push(candidate);
        return candidate === 4182;
      },
    });

    expect(checked).toEqual([4180, 4181, 4182]);
    expect(result).toBe(4182);
  });

  it("never offers companion or fixture ports", async () => {
    const checked = [];
    const result = await findAvailablePort(4175, {
      canBindPort: async (candidate) => {
        checked.push(candidate);
        return true;
      },
    });

    expect(checked).toEqual([4177]);
    expect(result).toBe(4177);
  });

  it("allows ordinary port 4174", async () => {
    const checked = [];
    const result = await findAvailablePort(4174, {
      canBindPort: async (candidate) => {
        checked.push(candidate);
        return true;
      },
    });

    expect(checked).toEqual([4174]);
    expect(result).toBe(4174);
  });
});

describe("local launcher terminal ownership", () => {
  it("handles Ctrl+C bytes and removes its input listener during cleanup", () => {
    const input = new PassThrough();
    const exitCodes = [];
    expect(input.readableFlowing).toBeNull();
    const dispose = listenForTerminalStop(input, (exitCode) => exitCodes.push(exitCode));

    input.write("before\u0003after");
    expect(exitCodes).toEqual([130]);

    dispose();
    expect(input.readableFlowing).toBe(false);
    input.write("\u0003");
    expect(exitCodes).toEqual([130]);
  });
});

describe("remembered local site origin", () => {
  it("reads the one-site record format already published on main", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");
    const publishedRecord = '{"version":2,"host":"127.0.0.1","port":4180}\n';
    await writeFile(configPath, publishedRecord, "utf8");

    expect(await readSitePort(configPath)).toBe(4180);
    expect(await readFile(configPath, "utf8")).toBe(publishedRecord);
  });

  it("writes and reads one port outside application data", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");

    await writeSitePort(configPath, 4180);

    expect(await readSitePort(configPath)).toBe(4180);
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      version: 2,
      host: "127.0.0.1",
      port: 4180,
    });
  });

  it("preserves malformed configuration instead of silently choosing a new origin", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");
    await writeFile(configPath, "not json", "utf8");

    await expect(readSitePort(configPath)).rejects.toThrow("could not read its remembered local site");
    expect(await readFile(configPath, "utf8")).toBe("not json");
  });

  it("allows only one different port to win concurrent first-launch recording", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");

    const results = await Promise.allSettled([
      writeSitePort(configPath, 4180),
      writeSitePort(configPath, 4190),
    ]);
    const recorded = await readSitePort(configPath);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect([4180, 4190]).toContain(recorded);
  });

  it("treats concurrent recording of the same port as idempotent", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");

    await expect(
      Promise.all([writeSitePort(configPath, 4180), writeSitePort(configPath, 4180)]),
    ).resolves.toEqual([undefined, undefined]);
    expect(await readSitePort(configPath)).toBe(4180);
  });

  it("keeps a fully written candidate invisible until atomic publication", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");
    let releasePublish;
    let reportReady;
    const ready = new Promise((resolve) => {
      reportReady = resolve;
    });
    const writer = writeSitePort(configPath, 4180, {
      beforePublish: () =>
        new Promise((resolve) => {
          releasePublish = resolve;
          reportReady();
        }),
    });

    await ready;
    expect(await readSitePort(configPath)).toBeNull();
    releasePublish();
    await writer;
    expect(await readSitePort(configPath)).toBe(4180);
  });

  it("leaves no malformed final record when publication preparation fails", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");

    await expect(
      writeSitePort(configPath, 4180, {
        beforePublish: () => {
          throw new Error("injected interruption");
        },
      }),
    ).rejects.toThrow("Badge could not remember its local site");
    expect(await readSitePort(configPath)).toBeNull();
  });

  it("preserves and refuses a record that uses a reserved port", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");
    const reservedRecord = `${JSON.stringify({ version: 2, host: "127.0.0.1", port: 5173 })}\n`;
    await writeFile(configPath, reservedRecord, "utf8");

    await expect(readSitePort(configPath)).rejects.toThrow("reserved local port");
    expect(await readFile(configPath, "utf8")).toBe(reservedRecord);
  });
});

describe("single-root application URLs", () => {
  it("keeps every compatibility URL at the Badge root", () => {
    expect(localAppUrls(4180)).toEqual({
      app: "http://127.0.0.1:4180/",
      archive: "http://127.0.0.1:4180/",
      studio: "http://127.0.0.1:4180/",
    });
  });

  it("formats exactly one labeled Badge root URL for terminal announcements", () => {
    const announcement = formatLocalSiteAnnouncement(4180, "Badge is ready:");

    expect(announcement).toBe("\nBadge is ready:\n  Badge  http://127.0.0.1:4180/\n");
    expect(announcement.match(/http:\/\/127\.0\.0\.1:4180\//g)).toHaveLength(1);
    expect(announcement).not.toContain("Studio");
    expect(announcement).not.toContain("/studio/");
  });
});
