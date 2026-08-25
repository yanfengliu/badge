import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readSitePort, writeSitePort } from "./local-launcher.mjs";
import {
  createCanonicalRuntimeTarget,
  createVerificationRuntimeTarget,
  runtimeTargetPaths,
} from "./local-runtime-target.mjs";
import { startLocalSite } from "./local-site-runner.mjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

async function temporaryRepository() {
  const directory = await mkdtemp(path.join(tmpdir(), "badge-local-runner-"));
  temporaryDirectories.push(directory);
  return directory;
}

function fakeViteServer(options = {}) {
  let closeCount = 0;
  let idleWaitCount = 0;
  const server = {
    async listen() {
      if (options.listenError) throw options.listenError;
    },
    async waitForRequestsIdle() {
      options.events?.push("idle");
      idleWaitCount += 1;
      if (options.idleWaitError) throw options.idleWaitError;
      if (options.neverIdle) return new Promise(() => undefined);
    },
    async close() {
      options.events?.push("close");
      closeCount += 1;
      if (options.closeError) throw options.closeError;
    },
  };
  if (options.shutdown) {
    server[Symbol.for("badge.saying-server.shutdown.v1")] = async () => {
      options.events?.push("sayings");
      await options.shutdown();
    };
  }
  return {
    server,
    closeCount: () => closeCount,
    idleWaitCount: () => idleWaitCount,
  };
}

describe("single-site runner", () => {
  it("starts one Vite server and writes only its branded verification record", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "start-success");
    const paths = runtimeTargetPaths(runtimeTarget);
    const fake = fakeViteServer();
    let receivedOptions;

    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async (options) => {
        receivedOptions = options;
        return fake.server;
      },
    });

    expect(instance).toMatchObject({ action: "launch", port: 4180, ownsServer: true });
    expect(receivedOptions).toEqual({
      configFile: path.join(repositoryRoot, "apps", "host-web", "vite.config.ts"),
      mode: "fixture",
      server: { host: "127.0.0.1", port: 4180, strictPort: true },
    });
    expect(await readSitePort(paths.configPath)).toBe(4180);
    expect(paths.configPath).not.toContain(`${path.sep}.badge-local${path.sep}`);

    await instance.close();
    await instance.close();
    expect(fake.closeCount()).toBe(1);
    expect(fake.idleWaitCount()).toBe(1);
  });

  it("uses Vite's supported live development mode for normal startup", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createCanonicalRuntimeTarget(repositoryRoot);
    const fake = fakeViteServer();
    let receivedOptions;

    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async (options) => {
        receivedOptions = options;
        return fake.server;
      },
    });

    expect(receivedOptions.mode).toBe("development");
    await instance.close();
  });

  it("aborts and awaits saying work before Vite request-idle and listener close", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "saying-shutdown-order");
    const events = [];
    const fake = fakeViteServer({ events, shutdown: async () => undefined });
    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async () => fake.server,
    });

    await instance.close();
    expect(events).toEqual(["sayings", "idle", "close"]);
  });

  it("surfaces a saying cleanup incident after still closing its owned listener", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "saying-cleanup-failure");
    const events = [];
    const fake = fakeViteServer({
      events,
      shutdown: async () => {
        throw new Error("fixed private-workspace remediation");
      },
    });
    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async () => fake.server,
    });

    await expect(instance.close()).rejects.toThrow("could not stop active saying work cleanly");
    expect(events).toEqual(["sayings", "idle", "close"]);
  });

  it("reuses an identified site without creating another Vite server", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "reuse");
    const paths = runtimeTargetPaths(runtimeTarget);
    await writeSitePort(paths.configPath, 4180);

    const instance = await startLocalSite({
      runtimeTarget,
      inspectSite: async () => "badge",
      createViteServer: async () => {
        throw new Error("reuse must not create a server");
      },
    });

    expect(instance).toMatchObject({ action: "reuse", port: 4180, ownsServer: false });
  });

  it("still closes its owned listener when the request-idle barrier rejects", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "idle-rejection");
    const fake = fakeViteServer({ idleWaitError: new Error("injected idle failure") });
    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async () => fake.server,
    });

    await expect(instance.close()).rejects.toThrow("closed its owned local listener");
    expect(fake.idleWaitCount()).toBe(1);
    expect(fake.closeCount()).toBe(1);
  });

  it("aggregates request-idle and listener-close failures", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "idle-and-close-rejection");
    const idleWaitError = new Error("injected idle failure");
    const closeError = new Error("injected close failure");
    const fake = fakeViteServer({ idleWaitError, closeError });
    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async () => fake.server,
    });

    let received;
    try {
      await instance.close();
    } catch (error) {
      received = error;
    }
    expect(received).toBeInstanceOf(AggregateError);
    expect(received.errors).toEqual([idleWaitError, closeError]);
    expect(fake.idleWaitCount()).toBe(1);
    expect(fake.closeCount()).toBe(1);
  });

  it("bounds the request-idle barrier before closing its owned listener", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "idle-timeout");
    const fake = fakeViteServer({ neverIdle: true });
    const instance = await startLocalSite({
      runtimeTarget,
      requestIdleTimeoutMs: 5,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async () => fake.server,
    });

    await expect(instance.close()).rejects.toThrow("within 5 ms");
    expect(fake.idleWaitCount()).toBe(1);
    expect(fake.closeCount()).toBe(1);
  });

  it("closes a partially created server when listening fails", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "listen-failure");
    const fake = fakeViteServer({ listenError: new Error("injected listen failure") });

    await expect(
      startLocalSite({
        runtimeTarget,
        findFreePort: async () => 4180,
        inspectSite: async () => "free",
        createViteServer: async () => fake.server,
      }),
    ).rejects.toThrow("injected listen failure");
    expect(fake.closeCount()).toBe(1);
  });

  it("surfaces listener cleanup failure alongside the startup failure", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "listen-cleanup-failure");
    const fake = fakeViteServer({
      listenError: new Error("injected listen failure"),
      closeError: new Error("injected close failure"),
    });

    await expect(
      startLocalSite({
        runtimeTarget,
        findFreePort: async () => 4180,
        inspectSite: async () => "free",
        createViteServer: async () => fake.server,
      }),
    ).rejects.toThrow("Listener cleanup also failed");
    expect(fake.closeCount()).toBe(1);
  });

  it("uses site.json as its only startup record", async () => {
    const repositoryRoot = await temporaryRepository();
    const runtimeTarget = createCanonicalRuntimeTarget(repositoryRoot);
    const paths = runtimeTargetPaths(runtimeTarget);
    const unrelatedPath = path.join(path.dirname(paths.configPath), "ports.json");
    const unrelatedContents = '{"version":1,"archivePort":4173,"studioPort":4174}\n';
    await mkdir(path.dirname(unrelatedPath), { recursive: true });
    await writeFile(unrelatedPath, unrelatedContents, "utf8");
    const fake = fakeViteServer();

    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async () => fake.server,
    });

    expect(instance).toMatchObject({ action: "launch", port: 4173, ownsServer: true });
    expect(await readFile(unrelatedPath, "utf8")).toBe(unrelatedContents);
    await instance.close();
  });
});

describe("launcher verification state isolation", () => {
  it("leaves an absent canonical site record absent after verification starts", async () => {
    const repositoryRoot = await temporaryRepository();
    const canonicalPaths = runtimeTargetPaths(createCanonicalRuntimeTarget(repositoryRoot));
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "canonical-absent");
    const fake = fakeViteServer();

    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async () => fake.server,
    });

    await expect(access(canonicalPaths.configPath)).rejects.toMatchObject({ code: "ENOENT" });
    await instance.close();
  });

  it("preserves a canonical site record byte-for-byte during successful verification", async () => {
    const repositoryRoot = await temporaryRepository();
    const canonicalPaths = runtimeTargetPaths(createCanonicalRuntimeTarget(repositoryRoot));
    const sentinel = '{\n  "version": 2,\n  "host": "127.0.0.1",\n  "port": 4190\n}\n';
    await mkdir(path.dirname(canonicalPaths.configPath), { recursive: true });
    await writeFile(canonicalPaths.configPath, sentinel, "utf8");
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "canonical-sentinel-success");
    const fake = fakeViteServer();

    const instance = await startLocalSite({
      runtimeTarget,
      findFreePort: async () => 4180,
      inspectSite: async () => "free",
      createViteServer: async () => fake.server,
    });

    expect(await readFile(canonicalPaths.configPath, "utf8")).toBe(sentinel);
    await instance.close();
  });

  it("preserves a canonical site record byte-for-byte when verification startup fails", async () => {
    const repositoryRoot = await temporaryRepository();
    const canonicalPaths = runtimeTargetPaths(createCanonicalRuntimeTarget(repositoryRoot));
    const sentinel = '{"version":2,"host":"127.0.0.1","port":4190}\n';
    await mkdir(path.dirname(canonicalPaths.configPath), { recursive: true });
    await writeFile(canonicalPaths.configPath, sentinel, "utf8");
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "canonical-sentinel-failure");
    const fake = fakeViteServer({ listenError: new Error("injected verification failure") });

    await expect(
      startLocalSite({
        runtimeTarget,
        findFreePort: async () => 4180,
        inspectSite: async () => "free",
        createViteServer: async () => fake.server,
      }),
    ).rejects.toThrow("injected verification failure");

    expect(await readFile(canonicalPaths.configPath, "utf8")).toBe(sentinel);
    expect(fake.closeCount()).toBe(1);
  });

  it("leaves an absent canonical site record absent when verification startup fails", async () => {
    const repositoryRoot = await temporaryRepository();
    const canonicalPaths = runtimeTargetPaths(createCanonicalRuntimeTarget(repositoryRoot));
    const runtimeTarget = createVerificationRuntimeTarget(repositoryRoot, "canonical-absent-failure");
    const fake = fakeViteServer({ listenError: new Error("injected absent-state failure") });

    await expect(
      startLocalSite({
        runtimeTarget,
        findFreePort: async () => 4180,
        inspectSite: async () => "free",
        createViteServer: async () => fake.server,
      }),
    ).rejects.toThrow("injected absent-state failure");

    await expect(access(canonicalPaths.configPath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(fake.closeCount()).toBe(1);
  });

  it("keeps the canonical state factory out of executable verification", async () => {
    const [interactive, verification] = await Promise.all([
      readFile(path.resolve("scripts/run-local.mjs"), "utf8"),
      readFile(path.resolve("scripts/check-local-startup.mjs"), "utf8"),
    ]);

    expect(interactive).toContain("createCanonicalRuntimeTarget");
    expect(interactive).not.toContain("createVerificationRuntimeTarget");
    expect(interactive).toContain("Badge could not complete this local run.");
    expect(interactive).not.toContain("Badge did not start.");
    expect(interactive).toContain("formatLocalSiteAnnouncement(instance.port");
    expect(interactive).not.toMatch(/instance\.urls\.(?:archive|studio)/);
    expect(interactive).not.toContain("/studio/");
    expect(verification).toContain("createVerificationRuntimeTarget");
    expect(verification).not.toContain("createCanonicalRuntimeTarget");
    expect(verification).not.toContain(".badge-local");
    expect(verification).toContain("first.urls.app");
    expect(verification).not.toMatch(/first\.urls\.(?:archive|studio)/);
    expect(verification).not.toContain("/studio/");
  });

  it("offers only unified local-site start, dev, and preview commands", async () => {
    const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));

    for (const alias of [
      "prestart:archive",
      "start:archive",
      "prestart:studio",
      "start:studio",
      "recover:legacy",
      "prerecover:legacy",
      "dev:archive",
      "dev:studio",
      "preview:archive",
      "preview:studio",
    ]) {
      expect(packageJson.scripts).not.toHaveProperty(alias);
    }
  });
});
