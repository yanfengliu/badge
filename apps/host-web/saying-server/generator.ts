import { access, lstat, mkdtemp, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { TextDecoder } from "node:util";
import {
  buildCanonicalSayingUserMessage,
  SAYING_PROMPT_VERSION,
  SAYING_SYSTEM_PROMPT_V1,
  parseSayingResponseMessage,
  sayingProviderResultSchema,
  sayingRequestSchema,
  type SayingProviderResult,
  type SayingRequest,
} from "@badge/saying-contract";
import {
  CLAUDE_SAYING_JSON_SCHEMA,
  SAYING_MODEL_ID,
  SAYING_PROVIDER_ID,
  SAYING_PROVIDER_STDERR_LIMIT_BYTES,
  SAYING_PROVIDER_STDOUT_LIMIT_BYTES,
  SAYING_PROVIDER_TIMEOUT_MS,
} from "@badge/saying-live-contract";

import {
  BoundedChildFailure,
  runBoundedChild,
  type BoundedChildRequest,
  type BoundedChildResult,
} from "./bounded-child.js";

export type SayingGenerationFailureKind =
  "aborted" | "authentication" | "cleanup-failed" | "failed" | "timeout" | "unavailable";

export class SayingGenerationFailure extends Error {
  constructor(
    readonly kind: SayingGenerationFailureKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "SayingGenerationFailure";
  }
}

export interface SayingGenerator {
  generate(input: SayingRequest, signal: AbortSignal): Promise<SayingProviderResult>;
}

export type RunSayingChild = (request: BoundedChildRequest) => Promise<BoundedChildResult>;

export interface ClaudeSayingGeneratorOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly now?: () => string;
  readonly resolveExecutable?: (environment: NodeJS.ProcessEnv) => Promise<string>;
  readonly runChild?: RunSayingChild;
  readonly createTaskRoot?: () => Promise<TaskRoot>;
  readonly cleanupTaskRoot?: (taskRoot: TaskRoot) => Promise<void>;
}

interface TaskRoot {
  readonly path: string;
  readonly device: bigint;
  readonly inode: bigint;
}

const fatalUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const environmentAllowlist = Object.freeze([
  "ALL_PROXY",
  "APPDATA",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CONFIG_DIR",
  "HOME",
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "LANG",
  "LC_ALL",
  "LOCALAPPDATA",
  "NODE_EXTRA_CA_CERTS",
  "NO_PROXY",
  "SSL_CERT_DIR",
  "SSL_CERT_FILE",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "WINDIR",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
]);

export function boundedClaudeEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const bounded: NodeJS.ProcessEnv = Object.create(null) as NodeJS.ProcessEnv;
  for (const key of environmentAllowlist) {
    const value = source[key];
    if (typeof value === "string" && value.length <= 32_768 && !value.includes("\0")) {
      bounded[key] = value;
    }
  }
  bounded.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  return bounded;
}

export function absoluteExecutableSearchDirectories(pathValue: string): readonly string[] {
  return pathValue
    .split(path.delimiter)
    .slice(0, 256)
    .map((entry) =>
      entry.length >= 2 && entry.startsWith('"') && entry.endsWith('"') ? entry.slice(1, -1) : entry,
    )
    .filter((entry) => entry.length > 0 && !entry.includes("\0") && path.isAbsolute(entry));
}

async function ordinaryExecutable(candidate: string): Promise<string | null> {
  try {
    const stats = await lstat(candidate, { bigint: true });
    if (!stats.isFile() || stats.isSymbolicLink()) return null;
    await access(candidate, process.platform === "win32" ? fsConstants.F_OK : fsConstants.X_OK);
    return path.resolve(candidate);
  } catch {
    return null;
  }
}

export async function resolveClaudeExecutable(environment: NodeJS.ProcessEnv): Promise<string> {
  const override = environment.CLAUDE_CLI;
  if (override) {
    if (!path.isAbsolute(override) || override.includes("\0")) {
      throw new SayingGenerationFailure(
        "unavailable",
        "CLAUDE_CLI must name one absolute native Claude executable.",
      );
    }
    const executable = await ordinaryExecutable(override);
    if (executable) return executable;
    throw new SayingGenerationFailure("unavailable", "The configured Claude Code executable is unavailable.");
  }

  const pathValue = environment.PATH;
  if (!pathValue || pathValue.length > 32_768) {
    throw new SayingGenerationFailure(
      "unavailable",
      "Claude Code was not found. Install and sign in to Claude Code, then restart Badge.",
    );
  }
  const directories = absoluteExecutableSearchDirectories(pathValue);
  const names = process.platform === "win32" ? ["claude.exe"] : ["claude"];
  for (const directory of directories) {
    for (const name of names) {
      const executable = await ordinaryExecutable(path.join(directory, name));
      if (executable) return executable;
    }
  }
  throw new SayingGenerationFailure(
    "unavailable",
    "Claude Code was not found. Install and sign in to Claude Code, then restart Badge.",
  );
}

async function createTaskRoot(): Promise<TaskRoot> {
  const root = await mkdtemp(path.join(tmpdir(), "badge-saying-"));
  const stats = await lstat(root, { bigint: true });
  if (!stats.isDirectory() || stats.isSymbolicLink() || stats.ino <= 0n) {
    throw new SayingGenerationFailure("failed", "The saying task directory could not be secured.");
  }
  return { path: root, device: stats.dev, inode: stats.ino };
}

async function cleanupTaskRoot(taskRoot: TaskRoot): Promise<void> {
  const temporaryRoot = path.resolve(tmpdir());
  const target = path.resolve(taskRoot.path);
  const relative = path.relative(temporaryRoot, target);
  if (
    !path.basename(target).startsWith("badge-saying-") ||
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new SayingGenerationFailure("failed", "The saying task directory failed its cleanup boundary.");
  }
  try {
    const stats = await lstat(target, { bigint: true });
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      stats.dev !== taskRoot.device ||
      stats.ino !== taskRoot.inode
    ) {
      throw new SayingGenerationFailure("failed", "The saying task directory changed before cleanup.");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  await rm(target, { recursive: true, force: true });
}

function claudeArguments(): readonly string[] {
  return [
    "-p",
    "--input-format",
    "text",
    "--output-format",
    "json",
    "--model",
    SAYING_MODEL_ID,
    "--effort",
    "low",
    "--system-prompt",
    SAYING_SYSTEM_PROMPT_V1,
    "--json-schema",
    JSON.stringify(CLAUDE_SAYING_JSON_SCHEMA),
    "--tools=",
    "--permission-mode",
    "plan",
    "--setting-sources=",
    "--disable-slash-commands",
    "--strict-mcp-config",
    "--safe-mode",
    "--no-session-persistence",
    "--no-chrome",
    "--prompt-suggestions",
    "false",
    "--exclude-dynamic-system-prompt-sections",
    "--max-budget-usd",
    "0.100000",
  ];
}

function isOrdinaryObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function claudeApiErrorStatus(bytes: Buffer): number | null {
  try {
    const envelope: unknown = JSON.parse(fatalUtf8.decode(bytes));
    if (
      !isOrdinaryObject(envelope) ||
      envelope.is_error !== true ||
      !Number.isSafeInteger(envelope.api_error_status)
    ) {
      return null;
    }
    return envelope.api_error_status as number;
  } catch {
    return null;
  }
}

function parseClaudeEnvelope(bytes: Buffer): SayingProviderResult["response"] {
  let decoded: string;
  try {
    decoded = fatalUtf8.decode(bytes);
  } catch (cause) {
    throw new SayingGenerationFailure("failed", "Claude Code returned malformed UTF-8.", { cause });
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(decoded);
  } catch (cause) {
    throw new SayingGenerationFailure("failed", "Claude Code returned an invalid result envelope.", {
      cause,
    });
  }
  if (!isOrdinaryObject(envelope) || envelope.is_error !== false) {
    throw new SayingGenerationFailure("failed", "Claude Code did not return a successful result.");
  }
  const modelUsage = envelope.modelUsage;
  if (!isOrdinaryObject(modelUsage) || Object.keys(modelUsage).length !== 1) {
    throw new SayingGenerationFailure("failed", "Claude Code did not prove the requested model.");
  }
  const usage = modelUsage[SAYING_MODEL_ID];
  if (
    !isOrdinaryObject(usage) ||
    usage.canonicalModel !== SAYING_MODEL_ID ||
    usage.provider !== "firstParty"
  ) {
    throw new SayingGenerationFailure("failed", "Claude Code did not prove the requested model.");
  }
  try {
    const canonicalResponse = JSON.stringify(envelope.structured_output);
    if (typeof canonicalResponse !== "string") throw new TypeError("Missing structured output.");
    return parseSayingResponseMessage(canonicalResponse);
  } catch (cause) {
    throw new SayingGenerationFailure("failed", "Claude Code returned an invalid saying.", { cause });
  }
}

function translateChildFailure(error: unknown): SayingGenerationFailure {
  if (error instanceof SayingGenerationFailure) return error;
  if (!(error instanceof BoundedChildFailure)) {
    return new SayingGenerationFailure("failed", "Claude Code could not complete the saying request.", {
      cause: error,
    });
  }
  if (error.kind === "aborted") {
    return new SayingGenerationFailure("aborted", "The saying request was cancelled.", { cause: error });
  }
  if (error.kind === "timeout") {
    return new SayingGenerationFailure(
      "timeout",
      "Claude Code took longer than 60 seconds; try again when it is responsive.",
      { cause: error },
    );
  }
  if (error.kind === "unavailable") {
    return new SayingGenerationFailure(
      "unavailable",
      "Claude Code is unavailable. Install and sign in to Claude Code, then restart Badge.",
      { cause: error },
    );
  }
  return new SayingGenerationFailure(
    "failed",
    "Claude Code could not complete the request. Confirm it is signed in, then try again.",
    { cause: error },
  );
}

export class ClaudeSayingGenerator implements SayingGenerator {
  private readonly environment: NodeJS.ProcessEnv;
  private readonly now: () => string;
  private readonly resolveExecutable: (environment: NodeJS.ProcessEnv) => Promise<string>;
  private readonly runChild: RunSayingChild;
  private readonly makeRoot: () => Promise<TaskRoot>;
  private readonly removeRoot: (taskRoot: TaskRoot) => Promise<void>;

  constructor(options: ClaudeSayingGeneratorOptions = {}) {
    this.environment = options.environment ?? process.env;
    this.now = options.now ?? (() => new Date().toISOString());
    this.resolveExecutable = options.resolveExecutable ?? resolveClaudeExecutable;
    this.runChild = options.runChild ?? runBoundedChild;
    this.makeRoot = options.createTaskRoot ?? createTaskRoot;
    this.removeRoot = options.cleanupTaskRoot ?? cleanupTaskRoot;
  }

  async generate(input: SayingRequest, signal: AbortSignal): Promise<SayingProviderResult> {
    const validated = sayingRequestSchema.parse(input);
    const canonicalUserMessage = buildCanonicalSayingUserMessage(validated);
    if (signal.aborted) throw new SayingGenerationFailure("aborted", "The saying request was cancelled.");

    let taskRoot: TaskRoot | undefined;
    let result: SayingProviderResult | undefined;
    let failure: unknown;
    let preserveTaskRoot = false;
    try {
      const executable = await this.resolveExecutable(this.environment);
      taskRoot = await this.makeRoot();
      const run = await this.runChild({
        command: executable,
        args: claudeArguments(),
        stdin: canonicalUserMessage,
        cwd: taskRoot.path,
        env: boundedClaudeEnvironment(this.environment),
        signal,
        timeoutMs: SAYING_PROVIDER_TIMEOUT_MS,
        maxStdoutBytes: SAYING_PROVIDER_STDOUT_LIMIT_BYTES,
        maxStderrBytes: SAYING_PROVIDER_STDERR_LIMIT_BYTES,
      });
      if (claudeApiErrorStatus(run.stdout) === 401) {
        throw new SayingGenerationFailure(
          "authentication",
          "Claude Code authentication expired. Run claude auth login, then retry.",
        );
      }
      if (run.exitCode !== 0) {
        throw new SayingGenerationFailure(
          "failed",
          "Claude Code could not complete the request. Confirm it is signed in, then try again.",
        );
      }
      result = sayingProviderResultSchema.parse({
        response: parseClaudeEnvelope(run.stdout),
        provenance: {
          provider: SAYING_PROVIDER_ID,
          model: SAYING_MODEL_ID,
          promptVersion: SAYING_PROMPT_VERSION,
          generatedAt: this.now(),
        },
      });
    } catch (error) {
      preserveTaskRoot = error instanceof BoundedChildFailure && error.kind === "containment";
      failure = translateChildFailure(error);
    }

    let cleanupFailure: unknown;
    if (taskRoot && !preserveTaskRoot) {
      try {
        await this.removeRoot(taskRoot);
      } catch (error) {
        cleanupFailure = error;
      }
    }
    if (preserveTaskRoot) {
      throw new SayingGenerationFailure(
        "cleanup-failed",
        "Badge could not prove its saying process tree stopped, so its private temporary workspace was preserved.",
        { cause: failure },
      );
    }
    if (failure && cleanupFailure) {
      throw new SayingGenerationFailure(
        "cleanup-failed",
        "The saying request failed and its private temporary workspace could not be cleaned.",
        { cause: new AggregateError([failure, cleanupFailure]) },
      );
    }
    if (failure) throw failure;
    if (cleanupFailure) {
      throw new SayingGenerationFailure(
        "cleanup-failed",
        "The saying was withheld because its private temporary workspace could not be cleaned.",
        { cause: cleanupFailure },
      );
    }
    if (!result) throw new SayingGenerationFailure("failed", "Claude Code returned no saying.");
    return result;
  }
}

export class FixtureSayingGenerator implements SayingGenerator {
  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  async generate(input: SayingRequest, signal: AbortSignal): Promise<SayingProviderResult> {
    const validated = sayingRequestSchema.parse(input);
    if (signal.aborted) throw new SayingGenerationFailure("aborted", "The saying request was cancelled.");
    const sayings: Record<string, string> = {
      Yosemite: "Granite keeps the long view.",
      Sapiens: "A whole species between two covers.",
      "Bachelor's degree": "The tassel was worth the tangle.",
    };
    return sayingProviderResultSchema.parse({
      response: { saying: sayings[validated.title] ?? "A fine chapter, honestly earned." },
      provenance: {
        provider: "fixture-local-preview",
        model: "curated-fixture-v1",
        promptVersion: SAYING_PROMPT_VERSION,
        generatedAt: this.now(),
      },
    });
  }
}

export const __testOnly = Object.freeze({
  claudeApiErrorStatus,
  claudeArguments,
  cleanupTaskRoot,
  parseClaudeEnvelope,
});
