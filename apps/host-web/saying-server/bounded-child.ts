import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithStdioTuple,
  type StdioPipe,
} from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export type BoundedChildFailureKind =
  "aborted" | "containment" | "failed" | "stderr-limit" | "stdout-limit" | "timeout" | "unavailable";

export class BoundedChildFailure extends Error {
  constructor(
    readonly kind: BoundedChildFailureKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "BoundedChildFailure";
  }
}

export interface BoundedChildRequest {
  readonly command: string;
  readonly args: readonly string[];
  readonly stdin: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly signal: AbortSignal;
  readonly timeoutMs: number;
  readonly maxStdoutBytes: number;
  readonly maxStderrBytes: number;
}

export interface BoundedChildResult {
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly exitCode: number;
}

export type SpawnChild = (
  command: string,
  args: string[],
  options: SpawnOptionsWithStdioTuple<StdioPipe, StdioPipe, StdioPipe>,
) => ChildProcessWithoutNullStreams;

export type TerminateOwnedTree = (child: ChildProcessWithoutNullStreams) => Promise<void>;
export type ForceOwnedTree = (child: ChildProcessWithoutNullStreams) => Promise<void>;

const WINDOWS_JOB_LAUNCHER = fileURLToPath(new URL("./windows-bounded-child.ps1", import.meta.url));

const nativeSpawnChild: SpawnChild = (command, args, options) => spawn(command, args, options);

function windowsPowerShellPath(): string {
  return path.join(
    process.env.SystemRoot ?? "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

function serializeWindowsLaunchRequest(request: BoundedChildRequest): string {
  return JSON.stringify({
    command: request.command,
    arguments: request.args,
    stdin: request.stdin,
  });
}

function taskkillPath(): string {
  return path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe");
}

async function waitForTaskkill(child: ReturnType<typeof spawn>): Promise<void> {
  await new Promise<void>((resolve) => {
    let settled = false;
    let forceTimeout: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceTimeout) clearTimeout(forceTimeout);
      resolve();
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      forceTimeout = setTimeout(finish, 250);
      forceTimeout.unref?.();
    }, 2_000);
    timeout.unref?.();
    child.once("error", finish);
    child.once("close", finish);
  });
}

export const terminateOwnedProcessTree: TerminateOwnedTree = async (child) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32" && Number.isSafeInteger(child.pid) && (child.pid ?? 0) > 0) {
    const killer = spawn(taskkillPath(), ["/PID", String(child.pid), "/T", "/F"], {
      shell: false,
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForTaskkill(killer);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    return;
  }

  if (Number.isSafeInteger(child.pid) && (child.pid ?? 0) > 0) {
    try {
      process.kill(-(child.pid as number), "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    return;
  }
  child.kill("SIGTERM");
};

async function waitForUnixProcessGroupExit(
  processGroupId: number,
  killProcess: (pid: number, signal: NodeJS.Signals | 0) => boolean,
): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() <= deadline) {
    try {
      killProcess(-processGroupId, 0);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ESRCH") return;
      if (code !== "EPERM") {
        throw new BoundedChildFailure(
          "containment",
          "Badge could not verify that the quote-selection process group stopped.",
          { cause: error },
        );
      }
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 25);
      timer.unref?.();
    });
  }
  throw new BoundedChildFailure(
    "containment",
    "Badge could not verify that the quote-selection process group stopped.",
  );
}

async function forceKillOwnedProcessTree(
  child: ChildProcessWithoutNullStreams,
  platform: NodeJS.Platform = process.platform,
  killProcess: (pid: number, signal: NodeJS.Signals | 0) => boolean = process.kill,
): Promise<void> {
  if (platform !== "win32" && Number.isSafeInteger(child.pid) && (child.pid ?? 0) > 0) {
    const processGroupId = child.pid as number;
    try {
      killProcess(-processGroupId, "SIGKILL");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
      throw new BoundedChildFailure(
        "containment",
        "Badge could not terminate the quote-selection process group.",
        {
          cause: error,
        },
      );
    }
    await waitForUnixProcessGroupExit(processGroupId, killProcess);
    return;
  }
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGKILL");
}

function validatePositiveBound(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new BoundedChildFailure("failed", `${label} must be a positive safe integer.`);
  }
}

export function runBoundedChild(
  request: BoundedChildRequest,
  spawnChild: SpawnChild = nativeSpawnChild,
  terminateTree: TerminateOwnedTree = terminateOwnedProcessTree,
  forceTree: ForceOwnedTree = forceKillOwnedProcessTree,
): Promise<BoundedChildResult> {
  validatePositiveBound(request.timeoutMs, "Child timeout");
  validatePositiveBound(request.maxStdoutBytes, "Child stdout limit");
  validatePositiveBound(request.maxStderrBytes, "Child stderr limit");
  if (request.signal.aborted) {
    return Promise.reject(new BoundedChildFailure("aborted", "The quote-selection request was cancelled."));
  }

  return new Promise((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    const windowsJobWrapped = process.platform === "win32" && spawnChild === nativeSpawnChild;
    try {
      child = spawnChild(
        windowsJobWrapped ? windowsPowerShellPath() : request.command,
        windowsJobWrapped
          ? [
              "-NoLogo",
              "-NoProfile",
              "-NonInteractive",
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              WINDOWS_JOB_LAUNCHER,
            ]
          : [...request.args],
        {
          cwd: request.cwd,
          detached: process.platform !== "win32",
          env: request.env,
          shell: false,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        },
      );
    } catch (cause) {
      reject(new BoundedChildFailure("unavailable", "Claude Code could not be started.", { cause }));
      return;
    }

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let failure: BoundedChildFailure | null = null;
    let settled = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    let termination: Promise<void> = Promise.resolve();

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      if (forceTimer) clearTimeout(forceTimer);
      request.signal.removeEventListener("abort", onAbort);
    };
    const finishFailure = (nextFailure: BoundedChildFailure) => {
      if (failure || settled) return;
      failure = nextFailure;
      termination = terminateTree(child).catch(() => forceTree(child));
      forceTimer = setTimeout(() => {
        if (settled) return;
        void forceTree(child).catch(() => undefined);
      }, 2_000);
      forceTimer.unref?.();
    };
    const onAbort = () =>
      finishFailure(new BoundedChildFailure("aborted", "The quote-selection request was cancelled."));
    const timeoutTimer = setTimeout(
      () =>
        finishFailure(
          new BoundedChildFailure(
            "timeout",
            `Claude Code exceeded the ${request.timeoutMs} ms quotation-selection limit.`,
          ),
        ),
      request.timeoutMs,
    );
    timeoutTimer.unref?.();
    request.signal.addEventListener("abort", onAbort, { once: true });

    child.stdout.on("data", (chunk: Buffer | string) => {
      if (failure) return;
      const bytes = Buffer.from(chunk);
      stdoutBytes += bytes.length;
      if (stdoutBytes > request.maxStdoutBytes) {
        finishFailure(
          new BoundedChildFailure(
            "stdout-limit",
            `Claude Code exceeded the ${request.maxStdoutBytes}-byte stdout limit.`,
          ),
        );
        return;
      }
      stdout.push(bytes);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      if (failure) return;
      const bytes = Buffer.from(chunk);
      stderrBytes += bytes.length;
      if (stderrBytes > request.maxStderrBytes) {
        finishFailure(
          new BoundedChildFailure(
            "stderr-limit",
            `Claude Code exceeded the ${request.maxStderrBytes}-byte stderr limit.`,
          ),
        );
        return;
      }
      stderr.push(bytes);
    });
    child.stdin.on("error", (cause) => {
      finishFailure(
        new BoundedChildFailure("failed", "Claude Code could not receive the quotation-selection request.", {
          cause,
        }),
      );
    });
    child.once("error", (cause) => {
      finishFailure(
        failure ?? new BoundedChildFailure("unavailable", "Claude Code could not be started.", { cause }),
      );
    });
    child.once("close", (code) => {
      if (settled) return;
      if (failure) {
        const heldFailure = failure;
        void (async () => {
          if (settled) return;
          try {
            await termination;
            await forceTree(child);
            settled = true;
            cleanup();
            reject(heldFailure);
          } catch (cause) {
            settled = true;
            cleanup();
            reject(
              cause instanceof BoundedChildFailure
                ? cause
                : new BoundedChildFailure(
                    "containment",
                    "Badge could not verify that the quote-selection process tree stopped.",
                    { cause },
                  ),
            );
          }
        })();
        return;
      }
      void forceTree(child).then(
        () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({
            stdout: Buffer.concat(stdout),
            stderr: Buffer.concat(stderr),
            exitCode: code ?? -1,
          });
        },
        (cause) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(
            cause instanceof BoundedChildFailure
              ? cause
              : new BoundedChildFailure(
                  "containment",
                  "Badge could not verify that the quote-selection process tree stopped.",
                  { cause },
                ),
          );
        },
      );
    });

    child.stdin.end(windowsJobWrapped ? serializeWindowsLaunchRequest(request) : request.stdin, "utf8");
  });
}

export const __testOnly = Object.freeze({
  forceKillOwnedProcessTree,
  serializeWindowsLaunchRequest,
  windowsPowerShellPath,
});
