import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  APP_MARKERS,
  DEFAULT_SITE_PORT,
  chooseLaunchPlan,
  findAvailablePort,
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

  it("does not reuse a partial Badge site with a missing Studio route", async () => {
    await expect(
      chooseLaunchPlan({
        configuredPort: null,
        inspectSite: async () => "incomplete-badge",
        findFreePort: async () => {
          throw new Error("fallback must not hide an incomplete Badge site");
        },
      }),
    ).rejects.toThrow("does not serve both Archive at / and Studio at /studio/");
  });
});

describe("local Badge site inspection", () => {
  async function listen(respond) {
    const server = createServer((request, response) => {
      const body = respond(request.url ?? "/");
      response.writeHead(200, { "content-type": "text/html" });
      response.end(body);
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

  it("requires the Archive and Studio markers at their routes on one listener", async () => {
    const badgePort = await listen((url) =>
      url.startsWith("/studio/")
        ? `<html><head>${APP_MARKERS.studio}</head></html>`
        : `<html><head>${APP_MARKERS.archive}</head></html>`,
    );
    const foreignPort = await listen(() => "<html><head><title>Something else</title></head></html>");

    expect(await inspectLocalSite(badgePort)).toBe("badge");
    expect(await inspectLocalSite(foreignPort)).toBe("occupied");
  });

  it("classifies a one-route Badge listener as incomplete instead of reusable", async () => {
    const partialPort = await listen((url) =>
      url.startsWith("/studio/")
        ? "<html><head><title>Missing Studio</title></head></html>"
        : `<html><head>${APP_MARKERS.archive}</head></html>`,
    );

    expect(await inspectLocalSite(partialPort)).toBe("incomplete-badge");
  });

  it("refuses a listener that puts both application markers on both routes", async () => {
    const ambiguousPort = await listen(
      () => `<html><head>${APP_MARKERS.archive}${APP_MARKERS.studio}</head></html>`,
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

  it("waits long enough for a starting Badge site to return both markers", async () => {
    const server = createServer((request, response) => {
      setTimeout(() => {
        response.writeHead(200, { "content-type": "text/html" });
        response.end(
          request.url?.startsWith("/studio/")
            ? `<html><head>${APP_MARKERS.studio}</head></html>`
            : `<html><head>${APP_MARKERS.archive}</head></html>`,
        );
      }, 1_000);
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

  it("binds identity checks to the markers shipped by both host entry points", async () => {
    const [archiveEntry, studioEntry] = await Promise.all([
      readFile(path.join(repositoryRoot, "apps/host-web/index.html"), "utf8"),
      readFile(path.join(repositoryRoot, "apps/host-web/studio/index.html"), "utf8"),
    ]);

    expect(archiveEntry).toContain(APP_MARKERS.archive);
    expect(archiveEntry).not.toContain(APP_MARKERS.studio);
    expect(studioEntry).toContain(APP_MARKERS.studio);
    expect(studioEntry).not.toContain(APP_MARKERS.archive);
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

  it("never offers legacy, companion, or fixture ports", async () => {
    const checked = [];
    const result = await findAvailablePort(4174, {
      canBindPort: async (candidate) => {
        checked.push(candidate);
        return true;
      },
    });

    expect(checked).toEqual([4177]);
    expect(result).toBe(4177);
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

  it("preserves and refuses a legacy two-origin record", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "site.json");
    const legacy = `${JSON.stringify({
      version: 1,
      host: "127.0.0.1",
      archivePort: 4173,
      studioPort: 4174,
    })}\n`;
    await writeFile(configPath, legacy, "utf8");

    await expect(readSitePort(configPath)).rejects.toThrow("legacy two-origin");
    expect(await readFile(configPath, "utf8")).toBe(legacy);
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

describe("same-origin application URLs", () => {
  it("keeps Archive and Studio on one origin", () => {
    expect(localAppUrls(4180)).toEqual({
      archive: "http://127.0.0.1:4180/",
      studio: "http://127.0.0.1:4180/studio/",
    });
  });
});
