import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  acquireLegacyRecoveryStartupLock,
  chooseLegacyRecoveryPlan,
  inspectLegacyOrigin,
  legacyAppUrls,
  readLegacyOriginPair,
  startLegacyRecovery,
  startLegacyRecoveryWithLock,
  validateLegacyOriginPair,
} from "./local-legacy-recovery.mjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

async function temporaryRepository() {
  const directory = await mkdtemp(path.join(tmpdir(), "badge-legacy-recovery-"));
  temporaryDirectories.push(directory);
  return directory;
}

function fakeServer(options = {}) {
  let closeCount = 0;
  return {
    async listen() {
      if (options.listenError) throw options.listenError;
    },
    async close() {
      closeCount += 1;
      if (options.closeError) throw options.closeError;
    },
    closeCount: () => closeCount,
  };
}

describe("legacy origin record recovery", () => {
  it("reads and preserves the exact version-one origin pair", async () => {
    const repositoryRoot = await temporaryRepository();
    const configPath = path.join(repositoryRoot, ".badge-local", "ports.json");
    const source =
      '{\n  "version": 1,\n  "host": "127.0.0.1",\n  "archivePort": 4180,\n  "studioPort": 4181\n}\n';
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, source, "utf8");

    await expect(readLegacyOriginPair(configPath)).resolves.toEqual({ archivePort: 4180, studioPort: 4181 });
    expect(await readFile(configPath, "utf8")).toBe(source);
  });

  it("explains when there is no legacy record to recover", async () => {
    const repositoryRoot = await temporaryRepository();

    await expect(
      readLegacyOriginPair(path.join(repositoryRoot, ".badge-local", "ports.json")),
    ).rejects.toThrow("No legacy Badge origin record exists");
  });

  it("refuses port pairs excluded by the original launcher", () => {
    expect(() =>
      validateLegacyOriginPair({
        version: 1,
        host: "127.0.0.1",
        archivePort: 4174,
        studioPort: 4175,
      }),
    ).toThrow("reserved local port 4175");
    expect(() =>
      validateLegacyOriginPair({
        version: 1,
        host: "127.0.0.1",
        archivePort: 5173,
        studioPort: 5174,
      }),
    ).toThrow("reserved local port 5173");
  });

  it("reuses one identified legacy application and launches only the missing one", async () => {
    const pair = { archivePort: 4180, studioPort: 4181 };
    const plan = await chooseLegacyRecoveryPlan({
      pair,
      inspectOrigin: async (_port, app) => (app === "archive" ? "badge" : "free"),
    });

    expect(plan).toEqual({
      pair,
      states: { archive: "badge", studio: "free" },
      appsToLaunch: ["studio"],
    });
  });

  it("refuses to replace unrelated software on either preserved origin", async () => {
    await expect(
      chooseLegacyRecoveryPlan({
        pair: { archivePort: 4180, studioPort: 4181 },
        inspectOrigin: async (_port, app) => (app === "studio" ? "occupied" : "free"),
      }),
    ).rejects.toThrow("legacy Studio origin at http://127.0.0.1:4181/");
  });

  it("refuses to reuse a one-site host as the separate legacy Archive", async () => {
    const result = await inspectLegacyOrigin(4180, "archive", {
      fetchImpl: async (url) => ({
        ok: true,
        text: async () =>
          url.endsWith("/studio/")
            ? '<meta name="badge-application" content="studio" />'
            : '<meta name="badge-application" content="archive" />',
      }),
    });

    expect(result).toBe("unified-badge");
    await expect(
      chooseLegacyRecoveryPlan({
        pair: { archivePort: 4180, studioPort: 4181 },
        inspectOrigin: async (_port, app) => (app === "archive" ? "unified-badge" : "free"),
      }),
    ).rejects.toThrow("one-site Badge host");
  });

  it("starts the separate Archive and Studio builds at the preserved exact origins", async () => {
    const repositoryRoot = await temporaryRepository();
    const created = [];
    const instance = await startLegacyRecovery({
      repositoryRoot,
      pair: { archivePort: 4180, studioPort: 4181 },
      inspectOrigin: async () => "free",
      createViteServer: async (options) => {
        const server = fakeServer();
        created.push({ options, server });
        return server;
      },
    });

    expect(created.map(({ options }) => options)).toEqual([
      {
        configFile: path.join(repositoryRoot, "apps", "archive-web", "vite.config.ts"),
        define: { __BADGE_LEGACY_COMPANION_ORIGIN__: JSON.stringify("http://127.0.0.1:4181/") },
        server: { host: "127.0.0.1", port: 4180, strictPort: true },
      },
      {
        configFile: path.join(repositoryRoot, "apps", "studio-web", "vite.config.ts"),
        define: { __BADGE_LEGACY_COMPANION_ORIGIN__: JSON.stringify("http://127.0.0.1:4180/") },
        server: { host: "127.0.0.1", port: 4181, strictPort: true },
      },
    ]);
    expect(instance.urls).toEqual(legacyAppUrls({ archivePort: 4180, studioPort: 4181 }));
    expect(instance.ownedApps).toEqual(["archive", "studio"]);

    await instance.close();
    await instance.close();
    expect(created.map(({ server }) => server.closeCount())).toEqual([1, 1]);
  });

  it("closes the first owned server if the second preserved origin cannot start", async () => {
    const repositoryRoot = await temporaryRepository();
    const archive = fakeServer();
    const studio = fakeServer({ listenError: new Error("injected Studio listen failure") });
    const servers = [archive, studio];

    await expect(
      startLegacyRecovery({
        repositoryRoot,
        pair: { archivePort: 4180, studioPort: 4181 },
        inspectOrigin: async () => "free",
        createViteServer: async () => servers.shift(),
      }),
    ).rejects.toThrow("injected Studio listen failure");
    expect(archive.closeCount()).toBe(1);
    expect(studio.closeCount()).toBe(1);
  });

  it("attempts every owned close and surfaces any listener cleanup failure", async () => {
    const repositoryRoot = await temporaryRepository();
    const archive = fakeServer({ closeError: new Error("injected Archive close failure") });
    const studio = fakeServer();
    const servers = [archive, studio];
    const instance = await startLegacyRecovery({
      repositoryRoot,
      pair: { archivePort: 4180, studioPort: 4181 },
      inspectOrigin: async () => "free",
      createViteServer: async () => servers.shift(),
    });

    await expect(instance.close()).rejects.toThrow("could not close its owned legacy Archive listener");
    expect(archive.closeCount()).toBe(1);
    expect(studio.closeCount()).toBe(1);
  });

  it("serializes startup for one legacy record and removes only its owned lock", async () => {
    const repositoryRoot = await temporaryRepository();
    const lockPath = path.join(repositoryRoot, ".badge-local", "legacy-recovery.lock");
    const releaseFirst = await acquireLegacyRecoveryStartupLock(lockPath);

    await expect(acquireLegacyRecoveryStartupLock(lockPath)).rejects.toThrow(
      "Another Badge legacy recovery is already starting",
    );
    await releaseFirst();
    await expect(access(lockPath)).rejects.toMatchObject({ code: "ENOENT" });

    const releaseSecond = await acquireLegacyRecoveryStartupLock(lockPath);
    await releaseSecond();
  });

  it("removes its own partial startup lock when publication fails", async () => {
    const repositoryRoot = await temporaryRepository();
    const lockPath = path.join(repositoryRoot, ".badge-local", "legacy-recovery.lock");

    await expect(
      acquireLegacyRecoveryStartupLock(lockPath, {
        afterCreate: async () => {
          throw new Error("injected lock publication failure");
        },
      }),
    ).rejects.toThrow("injected lock publication failure");
    await expect(access(lockPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("blocks a competing recovery before it can inspect or launch either origin", async () => {
    const repositoryRoot = await temporaryRepository();
    const lockPath = path.join(repositoryRoot, ".badge-local", "legacy-recovery.lock");
    const releaseFirst = await acquireLegacyRecoveryStartupLock(lockPath);
    let inspected = false;

    await expect(
      startLegacyRecoveryWithLock({
        repositoryRoot,
        startupLockPath: lockPath,
        pair: { archivePort: 4180, studioPort: 4181 },
        inspectOrigin: async () => {
          inspected = true;
          return "free";
        },
      }),
    ).rejects.toThrow("Another Badge legacy recovery is already starting");
    expect(inspected).toBe(false);
    await releaseFirst();
  });

  it("keeps the recovery command on the legacy record and away from the new site record", async () => {
    const source = await readFile(path.resolve("scripts/run-legacy-local.mjs"), "utf8");

    expect(source).toContain(".badge-local/ports.json");
    expect(source).not.toContain("site.json");
    expect(source).toContain("startLegacyRecoveryWithLock");
  });
});
