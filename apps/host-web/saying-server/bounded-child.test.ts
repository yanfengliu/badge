import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { PassThrough } from "node:stream";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { describe, expect, it, vi } from "vitest";

import {
  __testOnly,
  runBoundedChild,
  type BoundedChildFailure,
  type BoundedChildRequest,
  type SpawnChild,
  type TerminateOwnedTree,
} from "./bounded-child.js";

function childHarness(pid = 321) {
  const emitter = new EventEmitter() as ChildProcessWithoutNullStreams;
  Object.assign(emitter, {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    pid,
    exitCode: null,
    signalCode: null,
    kill: vi.fn(() => true),
  });
  return emitter;
}

function request(signal = new AbortController().signal): BoundedChildRequest {
  return {
    command: "C:\\trusted\\claude.exe",
    args: ["-p"],
    stdin: "exact private bytes",
    cwd: "C:\\task",
    env: { USERPROFILE: "C:\\user" },
    signal,
    timeoutMs: 50,
    maxStdoutBytes: 8,
    maxStderrBytes: 8,
  };
}

async function tick() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("bounded child lifecycle", () => {
  it("does not spawn an already-aborted request", async () => {
    const controller = new AbortController();
    controller.abort();
    const spawn = vi.fn<SpawnChild>();
    await expect(runBoundedChild(request(controller.signal), spawn)).rejects.toMatchObject({
      kind: "aborted",
    });
    expect(spawn).not.toHaveBeenCalled();
  });

  it("preserves stdin/stdout/stderr bytes and hardened spawn options", async () => {
    const child = childHarness();
    let stdin = Buffer.alloc(0);
    child.stdin.on("data", (chunk) => {
      stdin = Buffer.concat([stdin, Buffer.from(chunk)]);
    });
    const spawn = vi.fn<SpawnChild>(() => child);
    const forceTree = vi.fn(async () => undefined);
    const promise = runBoundedChild(request(), spawn, async () => undefined, forceTree);
    (child.stdout as PassThrough).write(Buffer.from([0x61, 0x62]));
    (child.stderr as PassThrough).write(Buffer.from([0x63]));
    child.emit("close", 0, null);
    await expect(promise).resolves.toEqual({
      stdout: Buffer.from("ab"),
      stderr: Buffer.from("c"),
      exitCode: 0,
    });
    expect(stdin.toString("utf8")).toBe("exact private bytes");
    expect(spawn.mock.calls[0]![2]).toMatchObject({
      cwd: "C:\\task",
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    expect(forceTree).toHaveBeenCalledOnce();
  });

  it.each([
    ["abort", "aborted"],
    ["stdout", "stdout-limit"],
    ["stderr", "stderr-limit"],
    ["error", "unavailable"],
  ] as const)("terminates once and waits for close after %s failure", async (kind, expected) => {
    const controller = new AbortController();
    const child = childHarness();
    const spawn = vi.fn<SpawnChild>(() => child);
    const terminate = vi.fn<TerminateOwnedTree>(async () => undefined);
    let settled = false;
    const promise = runBoundedChild(request(controller.signal), spawn, terminate).finally(() => {
      settled = true;
    });
    if (kind === "abort") controller.abort();
    if (kind === "stdout") (child.stdout as PassThrough).write("123456789");
    if (kind === "stderr") (child.stderr as PassThrough).write("123456789");
    if (kind === "error") child.emit("error", new Error("private spawn detail"));
    await tick();
    expect(terminate).toHaveBeenCalledOnce();
    expect(settled).toBe(false);
    child.emit("close", null, "SIGTERM");
    await expect(promise).rejects.toMatchObject({ kind: expected });
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("times out, terminates, and settles only after close", async () => {
    const child = childHarness();
    const terminate = vi.fn<TerminateOwnedTree>(async () => undefined);
    const promise = runBoundedChild({ ...request(), timeoutMs: 5 }, () => child, terminate);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(terminate).toHaveBeenCalledOnce();
    child.emit("close", null, "SIGTERM");
    await expect(promise).rejects.toEqual(
      expect.objectContaining<Partial<BoundedChildFailure>>({
        kind: "timeout",
      }),
    );
  });

  it("ignores late duplicate failure events after one settlement", async () => {
    const child = childHarness();
    const terminate = vi.fn<TerminateOwnedTree>(async () => undefined);
    const controller = new AbortController();
    const promise = runBoundedChild(request(controller.signal), () => child, terminate);
    controller.abort();
    (child.stdout as PassThrough).write("123456789");
    child.emit("close", null, "SIGTERM");
    await expect(promise).rejects.toMatchObject({ kind: "aborted" });
    child.emit("close", null, "SIGKILL");
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("withholds a successful child result when the tree-exit barrier cannot be proved", async () => {
    const child = childHarness();
    const promise = runBoundedChild(
      request(),
      () => child,
      async () => undefined,
      async () => {
        throw new Error("PRIVATE_TREE_DETAIL");
      },
    );
    child.emit("close", 0, null);
    await expect(promise).rejects.toMatchObject({ kind: "containment" });
  });

  it("force-escalates and observes exit of the Unix process group after its leader closes", async () => {
    const child = childHarness(456);
    Object.assign(child, { exitCode: 0 });
    const killProcess = vi.fn((_pid: number, signal: NodeJS.Signals | 0) => {
      if (signal === 0) throw Object.assign(new Error("gone"), { code: "ESRCH" });
      return true;
    });
    await __testOnly.forceKillOwnedProcessTree(child, "linux", killProcess);
    expect(killProcess).toHaveBeenCalledWith(-456, "SIGKILL");
    expect(child.kill).not.toHaveBeenCalled();
  });

  it.runIf(process.platform === "win32")(
    "atomically contains a native child and kills its detached descendant on normal success",
    async () => {
      const root = await mkdtemp(path.join(tmpdir(), "badge-job-object-test-"));
      const marker = path.join(root, "escaped-descendant.txt");
      const controlMarker = path.join(root, "uncontained-descendant.txt");
      const privateInput = "private Unicode stdin: Yosemite 🏔️";
      const expectedHash = createHash("sha256").update(privateInput).digest("hex");
      const descendant =
        "setTimeout(() => require('node:fs').writeFileSync(process.argv[1], 'escaped'), 750);";
      const leader = [
        "let input = '';",
        "process.stdin.setEncoding('utf8');",
        "process.stdin.on('data', (chunk) => { input += chunk; });",
        "process.stdin.on('end', () => {",
        "  const { createHash } = require('node:crypto');",
        "  const { spawn } = require('node:child_process');",
        "  process.stdout.write(createHash('sha256').update(input).digest('hex'));",
        "  spawn(process.execPath, ['-e', process.argv[1], process.argv[2]],",
        "    { detached: true, stdio: 'ignore' }).unref();",
        "});",
      ].join("\n");
      try {
        const control = await runBoundedChild(
          {
            command: process.execPath,
            args: ["-e", leader, descendant, controlMarker],
            stdin: privateInput,
            cwd: root,
            env: process.env,
            signal: new AbortController().signal,
            timeoutMs: 15_000,
            maxStdoutBytes: 1_024,
            maxStderrBytes: 8_192,
          },
          (command, args, options) => spawn(command, args, options),
        );
        expect(control.exitCode, control.stderr.toString("utf8")).toBe(0);
        await new Promise((resolve) => setTimeout(resolve, 1_100));
        await expect(readFile(controlMarker, "utf8")).resolves.toBe("escaped");

        const result = await runBoundedChild({
          command: process.execPath,
          args: ["-e", leader, descendant, marker],
          stdin: privateInput,
          cwd: root,
          env: {
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            USERPROFILE: process.env.USERPROFILE,
          },
          signal: new AbortController().signal,
          timeoutMs: 15_000,
          maxStdoutBytes: 1_024,
          maxStderrBytes: 8_192,
        });
        expect(result.exitCode, result.stderr.toString("utf8")).toBe(0);
        expect(result.stdout.toString("utf8")).toBe(expectedHash);
        await new Promise((resolve) => setTimeout(resolve, 1_100));
        await expect(readFile(marker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    30_000,
  );

  it.runIf(process.platform !== "win32")(
    "waits for the owned Unix process group before settling and cleaning its workspace",
    async () => {
      const root = await mkdtemp(path.join(tmpdir(), "badge-process-group-test-"));
      const controlMarker = path.join(root, "uncontained-descendant.txt");
      const containedMarker = path.join(root, "contained-descendant.txt");
      const privateInput = "private process-group stdin";
      const expectedHash = createHash("sha256").update(privateInput).digest("hex");
      const descendant =
        "setTimeout(() => require('node:fs').writeFileSync(process.argv[1], 'escaped'), 750);";
      const leader = [
        "let input = '';",
        "process.stdin.setEncoding('utf8');",
        "process.stdin.on('data', (chunk) => { input += chunk; });",
        "process.stdin.on('end', () => {",
        "  const { createHash } = require('node:crypto');",
        "  const { spawn } = require('node:child_process');",
        "  process.stdout.write(createHash('sha256').update(input).digest('hex'));",
        "  spawn(process.execPath, ['-e', process.argv[1], process.argv[2]],",
        "    { detached: false, stdio: 'ignore' }).unref();",
        "});",
      ].join("\n");
      const makeRequest = (marker: string): BoundedChildRequest => ({
        command: process.execPath,
        args: ["-e", leader, descendant, marker],
        stdin: privateInput,
        cwd: root,
        env: process.env,
        signal: new AbortController().signal,
        timeoutMs: 15_000,
        maxStdoutBytes: 1_024,
        maxStderrBytes: 8_192,
      });
      try {
        const control = await runBoundedChild(
          makeRequest(controlMarker),
          (command, args, options) => spawn(command, args, options),
          async () => undefined,
          async () => undefined,
        );
        expect(control.exitCode).toBe(0);
        await new Promise((resolve) => setTimeout(resolve, 1_100));
        await expect(readFile(controlMarker, "utf8")).resolves.toBe("escaped");

        const contained = await runBoundedChild(makeRequest(containedMarker));
        expect(contained.exitCode).toBe(0);
        expect(contained.stdout.toString("utf8")).toBe(expectedHash);
        await new Promise((resolve) => setTimeout(resolve, 1_100));
        await expect(readFile(containedMarker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
