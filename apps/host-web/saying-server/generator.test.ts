import path from "node:path";
import process from "node:process";
import { describe, expect, it, vi } from "vitest";
import {
  SAYING_MODEL_ID,
  SAYING_PROVIDER_STDERR_LIMIT_BYTES,
  SAYING_PROVIDER_STDOUT_LIMIT_BYTES,
  SAYING_PROVIDER_TIMEOUT_MS,
} from "@badge/saying-live-contract";
import { SAYING_SYSTEM_PROMPT_V2, buildCanonicalSayingUserMessage } from "@badge/saying-contract";

import {
  ClaudeSayingGenerator,
  FixtureSayingGenerator,
  SayingGenerationFailure,
  absoluteExecutableSearchDirectories,
  boundedClaudeEnvironment,
  type RunSayingChild,
} from "./generator.js";
import { BoundedChildFailure } from "./bounded-child.js";

const input = {
  title: "Yosemite private title",
  criterion: "Visit the granite valley.",
  direction: { themeCues: ["granite"], userDirection: "Keep this private phrase clever." },
};
const taskRoot = { path: "C:\\safe-task", device: 1n, inode: 2n };

function envelope(saying = "Granite keeps the long view."): Buffer {
  return Buffer.from(
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: "",
      modelUsage: {
        [SAYING_MODEL_ID]: { canonicalModel: SAYING_MODEL_ID, provider: "firstParty" },
      },
      structured_output: { kind: "original", saying, quotationId: null },
    }),
  );
}

function harness(stdout = envelope(), exitCode = 0) {
  const runChild = vi.fn<RunSayingChild>(async () => ({
    stdout,
    stderr: Buffer.alloc(0),
    exitCode,
  }));
  const cleanupTaskRoot = vi.fn(async () => undefined);
  const generator = new ClaudeSayingGenerator({
    environment: {
      PATH: "C:\\bin",
      USERPROFILE: "C:\\user",
      ANTHROPIC_API_KEY: "private-api-key",
      ANTHROPIC_BASE_URL: "https://unexpected.invalid",
      CLAUDE_CODE_USE_BEDROCK: "1",
      AWS_SECRET_ACCESS_KEY: "secret",
    },
    now: () => "2026-08-23T12:00:00.000Z",
    resolveExecutable: async () => "C:\\trusted\\claude.exe",
    createTaskRoot: async () => taskRoot,
    cleanupTaskRoot,
    runChild,
  });
  return { cleanupTaskRoot, generator, runChild };
}

describe("Claude saying generator", () => {
  it("passes only the exact bounded prompt on stdin and locks down Claude", async () => {
    const { cleanupTaskRoot, generator, runChild } = harness();
    const result = await generator.generate(input, new AbortController().signal);

    expect(result).toEqual({
      response: { kind: "original", saying: "Granite keeps the long view." },
      provenance: {
        provider: "claude-code",
        model: SAYING_MODEL_ID,
        promptVersion: "v2",
        generatedAt: "2026-08-23T12:00:00.000Z",
      },
    });
    expect(runChild).toHaveBeenCalledOnce();
    const call = runChild.mock.calls[0]![0];
    expect(call).toMatchObject({
      command: "C:\\trusted\\claude.exe",
      cwd: taskRoot.path,
      stdin: buildCanonicalSayingUserMessage(input),
      timeoutMs: SAYING_PROVIDER_TIMEOUT_MS,
      maxStdoutBytes: SAYING_PROVIDER_STDOUT_LIMIT_BYTES,
      maxStderrBytes: SAYING_PROVIDER_STDERR_LIMIT_BYTES,
    });
    expect(call.args).toEqual(
      expect.arrayContaining([
        "--model",
        SAYING_MODEL_ID,
        "--system-prompt",
        SAYING_SYSTEM_PROMPT_V2,
        "--json-schema",
        '{"type":"object","additionalProperties":false,"properties":{"kind":{"type":"string","enum":["original","quotation"]},"saying":{"type":["string","null"]},"quotationId":{"type":["string","null"]}},"required":["kind","saying","quotationId"]}',
        "--tools=",
        "--permission-mode",
        "plan",
        "--setting-sources=",
        "--disable-slash-commands",
        "--strict-mcp-config",
        "--safe-mode",
        "--no-session-persistence",
        "--no-chrome",
        "--exclude-dynamic-system-prompt-sections",
      ]),
    );
    expect(call.args.join(" ")).not.toContain(input.title);
    expect(call.args.join(" ")).not.toContain(input.direction.userDirection);
    expect(call.env).toEqual({
      USERPROFILE: "C:\\user",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    });
    expect(cleanupTaskRoot).toHaveBeenCalledOnce();
  });

  it("rejects bare result fallback, extra structured fields, and unproved models", async () => {
    const cases = [
      {
        is_error: false,
        modelUsage: { [SAYING_MODEL_ID]: { canonicalModel: SAYING_MODEL_ID, provider: "firstParty" } },
        result: '{"kind":"original","saying":"leak","quotationId":null}',
      },
      {
        is_error: false,
        modelUsage: { [SAYING_MODEL_ID]: { canonicalModel: SAYING_MODEL_ID, provider: "firstParty" } },
        structured_output: { kind: "original", saying: "Fine", quotationId: null, extra: "no" },
      },
      {
        is_error: false,
        modelUsage: { other: { canonicalModel: "other", provider: "firstParty" } },
        structured_output: { kind: "original", saying: "Fine", quotationId: null },
      },
    ];
    for (const value of cases) {
      const { generator, runChild } = harness(Buffer.from(JSON.stringify(value)));
      await expect(generator.generate(input, new AbortController().signal)).rejects.toMatchObject({
        name: "SayingGenerationFailure",
        kind: "failed",
      });
      expect(runChild).toHaveBeenCalledOnce();
    }
  });

  it("never leaks provider output and never retries a failed call", async () => {
    const privateOutput = "VERY_PRIVATE_PROVIDER_OUTPUT";
    const { generator, runChild } = harness(Buffer.from(privateOutput));
    let received: unknown;
    try {
      await generator.generate(input, new AbortController().signal);
    } catch (error) {
      received = error;
    }
    expect(received).toBeInstanceOf(SayingGenerationFailure);
    expect(String(received)).not.toContain(privateOutput);
    expect(runChild).toHaveBeenCalledOnce();
  });

  it("classifies only a structured numeric 401 API failure as expired authentication", async () => {
    const privateResult = "OAuth token expired: PRIVATE_PROVIDER_DETAIL";
    const stdout = Buffer.from(
      JSON.stringify({
        type: "result",
        subtype: "error_during_execution",
        is_error: true,
        api_error_status: 401,
        result: privateResult,
      }),
    );
    const { generator, runChild } = harness(stdout, 1);
    let received: unknown;
    try {
      await generator.generate(input, new AbortController().signal);
    } catch (error) {
      received = error;
    }
    expect(received).toMatchObject({
      name: "SayingGenerationFailure",
      kind: "authentication",
    });
    expect(String(received)).not.toContain(privateResult);
    expect(runChild).toHaveBeenCalledOnce();
  });

  it.each([
    ["malformed JSON", Buffer.from('{"is_error":true')],
    [
      "non-401 API failure",
      Buffer.from(
        JSON.stringify({
          is_error: true,
          api_error_status: 500,
          result: "PRIVATE_NON_AUTH_PROVIDER_DETAIL",
        }),
      ),
    ],
    [
      "string-shaped 401",
      Buffer.from(
        JSON.stringify({
          is_error: true,
          api_error_status: "401",
          result: "PRIVATE_MALFORMED_AUTH_DETAIL",
        }),
      ),
    ],
  ])("keeps %s under the generic provider-failure classification", async (_label, stdout) => {
    const { generator } = harness(stdout, 1);
    let received: unknown;
    try {
      await generator.generate(input, new AbortController().signal);
    } catch (error) {
      received = error;
    }
    expect(received).toMatchObject({ kind: "failed" });
    expect(String(received)).not.toContain("PRIVATE_");
  });

  it("rejects structured output whose canonical JSON exceeds the bounded response boundary", async () => {
    const saying = `A${"\t".repeat(8_190)}B`;
    const { generator } = harness(envelope(saying));
    await expect(generator.generate(input, new AbortController().signal)).rejects.toMatchObject({
      kind: "failed",
    });
  });

  it("hydrates an exact supplied historical quotation without trusting Claude for its words", async () => {
    const quotation = {
      id: "john-muir-every-walk-nature",
      text: "But in every walk with Nature one receives far more than he seeks.",
      person: "John Muir",
      sourceTitle: "Steep Trails",
      sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
    };
    const quotedEnvelope = Buffer.from(
      JSON.stringify({
        is_error: false,
        modelUsage: {
          [SAYING_MODEL_ID]: { canonicalModel: SAYING_MODEL_ID, provider: "firstParty" },
        },
        structured_output: {
          kind: "quotation",
          saying: null,
          quotationId: quotation.id,
        },
      }),
    );
    const { generator } = harness(quotedEnvelope);

    await expect(
      generator.generate({ ...input, allowedQuotations: [quotation] }, new AbortController().signal),
    ).resolves.toMatchObject({
      response: { kind: "quotation", saying: quotation.text, quotation },
    });
    await expect(generator.generate(input, new AbortController().signal)).rejects.toMatchObject({
      kind: "failed",
    });
  });

  it("withholds success when private task-root cleanup fails", async () => {
    const { generator } = harness();
    const cleanupFailure = new Error("private cleanup details");
    const failing = new ClaudeSayingGenerator({
      environment: {},
      resolveExecutable: async () => "C:\\trusted\\claude.exe",
      createTaskRoot: async () => taskRoot,
      cleanupTaskRoot: async () => {
        throw cleanupFailure;
      },
      runChild: async () => ({ stdout: envelope(), stderr: Buffer.alloc(0), exitCode: 0 }),
    });
    expect(generator).toBeDefined();
    await expect(failing.generate(input, new AbortController().signal)).rejects.toMatchObject({
      kind: "cleanup-failed",
      message: "The saying was withheld because its private temporary workspace could not be cleaned.",
    });
  });

  it("preserves cleanup remediation when provider work and cleanup both fail", async () => {
    const failing = new ClaudeSayingGenerator({
      environment: {},
      resolveExecutable: async () => "C:\\trusted\\claude.exe",
      createTaskRoot: async () => taskRoot,
      cleanupTaskRoot: async () => {
        throw new Error("PRIVATE_CLEANUP_PATH");
      },
      runChild: async () => {
        throw new Error("PRIVATE_PROVIDER_OUTPUT");
      },
    });
    await expect(failing.generate(input, new AbortController().signal)).rejects.toMatchObject({
      kind: "cleanup-failed",
      message: "The saying request failed and its private temporary workspace could not be cleaned.",
    });
  });

  it("preserves the task root when process-tree containment cannot be proved", async () => {
    const cleanupTaskRoot = vi.fn(async () => undefined);
    const failing = new ClaudeSayingGenerator({
      environment: {},
      resolveExecutable: async () => "C:\\trusted\\claude.exe",
      createTaskRoot: async () => taskRoot,
      cleanupTaskRoot,
      runChild: async () => {
        throw new BoundedChildFailure("containment", "PRIVATE_PROCESS_DETAIL");
      },
    });
    await expect(failing.generate(input, new AbortController().signal)).rejects.toMatchObject({
      kind: "cleanup-failed",
    });
    expect(cleanupTaskRoot).not.toHaveBeenCalled();
  });
});

describe("provider boundary helpers", () => {
  it("drops API-key and cloud-provider selection variables", () => {
    const bounded = boundedClaudeEnvironment({
      HOME: "/home/person",
      PATH: "/bin",
      ANTHROPIC_API_KEY: "secret",
      ANTHROPIC_BASE_URL: "https://proxy.invalid",
      CLAUDE_CODE_USE_BEDROCK: "1",
      CLAUDE_CODE_USE_VERTEX: "1",
      CLAUDE_CODE_USE_FOUNDRY: "1",
      AWS_ACCESS_KEY_ID: "secret",
      GOOGLE_APPLICATION_CREDENTIALS: "secret",
    });
    expect(bounded).toEqual({
      HOME: "/home/person",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    });
  });

  it("never searches the repository or any other relative PATH entry", () => {
    const absolute = process.platform === "win32" ? "C:\\trusted" : "/trusted";
    const value = [".", "relative-bin", absolute].join(path.delimiter);
    expect(absoluteExecutableSearchDirectories(value)).toEqual([absolute]);
  });

  it("fixture mode is deterministic and needs no executable", async () => {
    const fixture = new FixtureSayingGenerator(() => "2026-08-23T12:00:00.000Z");
    const first = await fixture.generate(
      { title: "Yosemite", criterion: "Visit it." },
      new AbortController().signal,
    );
    const second = await fixture.generate(
      { title: "Yosemite", criterion: "Visit it." },
      new AbortController().signal,
    );
    expect(first).toEqual(second);
    expect(first.response.kind).toBe("original");
    expect(first.response.saying).toBe("Granite keeps the long view.");
  });
});
