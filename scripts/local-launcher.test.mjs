import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { PassThrough } from "node:stream";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  APP_MARKERS,
  chooseLaunchPlan,
  findAvailablePortPair,
  inspectLocalOrigin,
  listenForTerminalStop,
  readPortPair,
  writePortPair,
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

function pair(archivePort = 4173) {
  return { archivePort, studioPort: archivePort + 1 };
}

describe("local Badge launch planning", () => {
  it("reuses a complete Badge pair instead of failing or opening an empty origin", async () => {
    const plan = await chooseLaunchPlan({
      configuredPair: null,
      inspectPair: async () => ({ archive: "badge", studio: "badge" }),
      findFreePair: async () => {
        throw new Error("a fallback must not be selected");
      },
    });

    expect(plan).toEqual({ action: "reuse", pair: pair(), appsToLaunch: [], reason: "existing" });
  });

  it("selects a distinct free pair when the preferred first-run ports belong to other software", async () => {
    const plan = await chooseLaunchPlan({
      configuredPair: null,
      inspectPair: async () => ({ archive: "occupied", studio: "occupied" }),
      findFreePair: async () => pair(4180),
    });

    expect(plan).toEqual({
      action: "launch",
      pair: pair(4180),
      appsToLaunch: ["archive", "studio"],
      reason: "fallback",
    });
  });

  it("starts only the missing app when the companion Badge app is already running", async () => {
    const plan = await chooseLaunchPlan({
      configuredPair: pair(),
      inspectPair: async () => ({ archive: "badge", studio: "free" }),
      findFreePair: async () => pair(4180),
    });

    expect(plan).toEqual({
      action: "launch",
      pair: pair(),
      appsToLaunch: ["studio"],
      reason: "partial",
    });
  });

  it("refuses to abandon a remembered origin when another process takes its port", async () => {
    await expect(
      chooseLaunchPlan({
        configuredPair: pair(4180),
        inspectPair: async () => ({ archive: "occupied", studio: "free" }),
        findFreePair: async () => pair(4190),
      }),
    ).rejects.toThrow(
      "Badge remembers Archive at http://127.0.0.1:4180, but that port is occupied by another process",
    );
  });

  it("does not select a fallback while a listener's Badge identity is unresolved", async () => {
    await expect(
      chooseLaunchPlan({
        configuredPair: null,
        inspectPair: async () => ({ archive: "unidentified", studio: "free" }),
        findFreePair: async () => {
          throw new Error("fallback must not run while ownership is uncertain");
        },
      }),
    ).rejects.toThrow("did not identify itself as Badge");
  });
});

describe("local Badge origin inspection", () => {
  async function listen(body) {
    const server = createServer((_request, response) => {
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

  it("distinguishes Badge, unrelated HTTP, and unused ports", async () => {
    const badgePort = await listen(`<html><head>${APP_MARKERS.archive}</head></html>`);
    const foreignPort = await listen("<html><head><title>Something else</title></head></html>");

    expect(await inspectLocalOrigin(badgePort, "archive")).toBe("badge");
    expect(await inspectLocalOrigin(badgePort, "studio")).toBe("wrong-badge-app");
    expect(await inspectLocalOrigin(foreignPort, "archive")).toBe("occupied");

    const closedServer = createServer();
    await new Promise((resolve, reject) => {
      closedServer.once("error", reject);
      closedServer.listen(0, "127.0.0.1", resolve);
    });
    const closedAddress = closedServer.address();
    if (!closedAddress || typeof closedAddress === "string") throw new Error("test port was unavailable");
    const unusedPort = closedAddress.port;
    await new Promise((resolve, reject) =>
      closedServer.close((error) => (error ? reject(error) : resolve())),
    );
    expect(await inspectLocalOrigin(unusedPort, "studio")).toBe("free");
  });

  it("keeps a silent listener unidentified instead of claiming it is unrelated software", async () => {
    const silentPort = await listen("");
    const silentServer = openedServers.at(-1);
    silentServer.removeAllListeners("request");

    expect(await inspectLocalOrigin(silentPort, "archive", { timeoutMs: 25 })).toBe("unidentified");
  });

  it("waits long enough for a starting Badge server to return its marker", async () => {
    const server = createServer((_request, response) => {
      setTimeout(() => {
        response.writeHead(200, { "content-type": "text/html" });
        response.end(`<html><head>${APP_MARKERS.archive}</head></html>`);
      }, 1_000);
    });
    openedServers.push(server);
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server did not expose a TCP port");

    expect(await inspectLocalOrigin(address.port, "archive")).toBe("badge");
  });

  it("binds launcher identity checks to the markers shipped by both real entry points", async () => {
    const [archiveEntry, studioEntry] = await Promise.all([
      readFile(path.join(repositoryRoot, "apps/archive-web/index.html"), "utf8"),
      readFile(path.join(repositoryRoot, "apps/studio-web/index.html"), "utf8"),
    ]);

    expect(archiveEntry).toContain(APP_MARKERS.archive);
    expect(archiveEntry).not.toContain(APP_MARKERS.studio);
    expect(studioEntry).toContain(APP_MARKERS.studio);
    expect(studioEntry).not.toContain(APP_MARKERS.archive);
  });
});

describe("free adjacent port search", () => {
  it("checks odd-start pairs instead of skipping half the available range", async () => {
    const checked = [];
    const result = await findAvailablePortPair(4180, {
      canBindPair: async (candidate) => {
        checked.push(candidate);
        return candidate.archivePort === 4181;
      },
    });

    expect(checked).toEqual([pair(4180), pair(4181)]);
    expect(result).toEqual(pair(4181));
  });

  it("never offers pairs containing reserved companion or fixture ports", async () => {
    const checked = [];
    const result = await findAvailablePortPair(4174, {
      canBindPair: async (candidate) => {
        checked.push(candidate);
        return true;
      },
    });

    expect(checked).toEqual([pair(4177)]);
    expect(result).toEqual(pair(4177));
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

describe("remembered local origins", () => {
  it("writes and reads one adjacent port pair outside application data", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "ports.json");

    await writePortPair(configPath, pair(4180));

    expect(await readPortPair(configPath)).toEqual(pair(4180));
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      version: 1,
      host: "127.0.0.1",
      archivePort: 4180,
      studioPort: 4181,
    });
  });

  it("preserves malformed configuration instead of silently choosing a new origin", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "ports.json");
    await writePortPair(configPath, pair(4180));
    const valid = await readFile(configPath, "utf8");
    await writeFile(configPath, "not json", "utf8");

    await expect(readPortPair(configPath)).rejects.toThrow("could not read its remembered local addresses");
    expect(await readFile(configPath, "utf8")).toBe("not json");
    expect(valid).toContain('"archivePort": 4180');
  });

  it("allows only one different pair to win concurrent first-launch recording", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "ports.json");

    const results = await Promise.allSettled([
      writePortPair(configPath, pair(4180)),
      writePortPair(configPath, pair(4190)),
    ]);
    const recorded = await readPortPair(configPath);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect([pair(4180), pair(4190)]).toContainEqual(recorded);
  });

  it("treats concurrent recording of the same pair as idempotent", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "ports.json");

    await expect(
      Promise.all([writePortPair(configPath, pair(4180)), writePortPair(configPath, pair(4180))]),
    ).resolves.toEqual([undefined, undefined]);
    expect(await readPortPair(configPath)).toEqual(pair(4180));
  });

  it("keeps a fully written candidate invisible until atomic publication", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "ports.json");
    let releasePublish;
    let reportReady;
    const ready = new Promise((resolve) => {
      reportReady = resolve;
    });
    const writer = writePortPair(configPath, pair(4180), {
      beforePublish: () =>
        new Promise((resolve) => {
          releasePublish = resolve;
          reportReady();
        }),
    });

    await ready;
    expect(await readPortPair(configPath)).toBeNull();
    releasePublish();
    await writer;
    expect(await readPortPair(configPath)).toEqual(pair(4180));
  });

  it("leaves no malformed final record when publication preparation fails", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "ports.json");

    await expect(
      writePortPair(configPath, pair(4180), {
        beforePublish: () => {
          throw new Error("injected interruption");
        },
      }),
    ).rejects.toThrow("Badge could not remember Archive");
    expect(await readPortPair(configPath)).toBeNull();
  });

  it("preserves and refuses a record that assigns applications to reserved ports", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "badge-launcher-"));
    temporaryDirectories.push(directory);
    const configPath = path.join(directory, "ports.json");
    const reservedRecord = `${JSON.stringify({
      version: 1,
      host: "127.0.0.1",
      archivePort: 5173,
      studioPort: 5174,
    })}\n`;
    await writeFile(configPath, reservedRecord, "utf8");

    await expect(readPortPair(configPath)).rejects.toThrow("reserved local port");
    expect(await readFile(configPath, "utf8")).toBe(reservedRecord);
  });
});
