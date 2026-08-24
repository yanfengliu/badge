import { createServer, request as httpRequest, type Server } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SAYING_DISCLOSURE,
  SAYING_DISCLOSURE_FINGERPRINT,
  SAYING_DISCLOSURE_HEADER,
  SAYING_DISCLOSURE_PATH,
  SAYING_GENERATION_PATH,
  SAYING_ROUTE_BODY_LIMIT_BYTES,
} from "@badge/saying-live-contract";
import type { SayingGenerator } from "./generator.js";
import { SayingGenerationFailure } from "./generator.js";
import { SayingServerRuntime } from "./middleware.js";

interface Reply {
  readonly status: number;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: string;
}
const opened: Array<{ runtime: SayingServerRuntime; server: Server }> = [];

const historicalQuotation = {
  id: "muir-yosemite",
  text: "Nature gives more than one seeks.",
  person: "John Muir",
  sourceTitle: "Steep Trails",
  sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
};

async function host(generator: SayingGenerator) {
  const runtime = new SayingServerRuntime(generator);
  const server = createServer((incoming, response) => {
    runtime.middleware(incoming, response, () => {
      response.statusCode = 404;
      response.end("next");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  opened.push({ runtime, server });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test listener has no port");
  return { runtime, port: address.port };
}

function call(
  port: number,
  options: {
    method?: string;
    path?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<Reply> {
  const method = options.method ?? "GET";
  const body = options.body ?? "";
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest(
      {
        host: "127.0.0.1",
        port,
        method,
        path: options.path ?? SAYING_DISCLOSURE_PATH,
        headers: {
          Host: `127.0.0.1:${port}`,
          "Sec-Fetch-Site": "same-origin",
          ...(method === "POST" ? { Origin: `http://127.0.0.1:${port}` } : {}),
          ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}),
          ...options.headers,
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        incoming.on("end", () =>
          resolve({
            status: incoming.statusCode ?? 0,
            headers: incoming.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    outgoing.once("error", reject);
    outgoing.end(body);
  });
}

function successGenerator() {
  return {
    generate: vi.fn<SayingGenerator["generate"]>(async () => ({
      response: {
        kind: "quotation",
        saying: historicalQuotation.text,
        quotation: historicalQuotation,
      },
      provenance: {
        provider: "claude-code",
        model: "claude-sonnet-4-6",
        promptVersion: "v3" as const,
        generatedAt: "2026-08-23T12:00:00.000Z",
      },
    })),
  } satisfies SayingGenerator;
}

const generationHeaders = {
  "Content-Type": "application/json",
  [SAYING_DISCLOSURE_HEADER]: SAYING_DISCLOSURE_FINGERPRINT,
};
const generationRequest = {
  title: "Yosemite",
  criterion: "Visit Yosemite.",
  allowedQuotations: [historicalQuotation],
};
const generationBody = JSON.stringify(generationRequest);
const requiredQuotationCorrection = "provide at least one valid source-checked allowedQuotations entry";

function callGeneration(
  port: number,
  body = generationBody,
  headers: Record<string, string> = generationHeaders,
): Promise<Reply> {
  return call(port, { method: "POST", path: SAYING_GENERATION_PATH, headers, body });
}

afterEach(async () => {
  await Promise.all(
    opened.splice(0).map(async ({ runtime, server }) => {
      await runtime.shutdown().catch(() => undefined);
      server.close();
      await once(server, "close");
    }),
  );
});

describe("same-listener saying routes", () => {
  it("serves exact disclosure to a browser-style same-origin GET without Origin", async () => {
    const generator = successGenerator();
    const { port } = await host(generator);
    const reply = await call(port);
    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toEqual(SAYING_DISCLOSURE);
    expect(reply.headers["access-control-allow-origin"]).toBeUndefined();
    expect(reply.headers["cache-control"]).toBe("no-store");
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("generates once from a closed, normalized request after fingerprint consent", async () => {
    const generator = successGenerator();
    const { port } = await host(generator);
    const reply = await callGeneration(port);
    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body).response.saying).toBe(historicalQuotation.text);
    expect(generator.generate).toHaveBeenCalledOnce();
    expect(generator.generate.mock.calls[0]![0]).toEqual(generationRequest);
  });

  it.each([
    ["pretty-printed bytes", JSON.stringify(generationRequest, null, 2)],
    [
      "reordered keys",
      JSON.stringify({
        allowedQuotations: [historicalQuotation],
        criterion: "Visit Yosemite.",
        title: "Yosemite",
      }),
    ],
    [
      "normalizable field whitespace",
      JSON.stringify({
        title: " Yosemite ",
        criterion: "Visit  Yosemite.",
        allowedQuotations: [historicalQuotation],
      }),
    ],
  ])("rejects %s that differ from the reviewed canonical bytes", async (_label, body) => {
    const generator = successGenerator();
    const { port } = await host(generator);
    const reply = await callGeneration(port, body);
    expect(reply.status).toBe(400);
    expect(JSON.parse(reply.body).error).toMatchObject({ code: "BAD_REQUEST" });
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong host", { Host: "localhost:1" }, 403, "REQUEST_REJECTED"],
    ["wrong fetch site", { "Sec-Fetch-Site": "cross-site" }, 403, "REQUEST_REJECTED"],
    ["missing origin", { Origin: "" }, 403, "REQUEST_REJECTED"],
    ["wrong origin", { Origin: "http://localhost:1" }, 403, "REQUEST_REJECTED"],
    ["compressed", { "Content-Encoding": "gzip" }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    ["wrong media type", { "Content-Type": "text/plain" }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    ["missing disclosure", { [SAYING_DISCLOSURE_HEADER]: "" }, 428, "DISCLOSURE_REQUIRED"],
  ])("rejects %s before provider spawn", async (_label, changed, status, code) => {
    const generator = successGenerator();
    const { port } = await host(generator);
    const reply = await callGeneration(port, generationBody, {
      ...generationHeaders,
      ...(changed as Record<string, string>),
    });
    expect(reply.status).toBe(status);
    expect(JSON.parse(reply.body).error.code).toBe(code);
    expect(generator.generate).not.toHaveBeenCalled();
    expect(reply.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("uses 413 for an over-limit raw body and rejects unknown fields", async () => {
    const generator = successGenerator();
    const { port } = await host(generator);
    const tooLarge = "x".repeat(SAYING_ROUTE_BODY_LIMIT_BYTES + 1);
    const oversized = await call(port, {
      method: "POST",
      path: SAYING_GENERATION_PATH,
      headers: generationHeaders,
      body: tooLarge,
    });
    expect(oversized.status).toBe(413);
    expect(JSON.parse(oversized.body).error.code).toBe("PAYLOAD_TOO_LARGE");

    const extra = await call(port, {
      method: "POST",
      path: SAYING_GENERATION_PATH,
      headers: generationHeaders,
      body: JSON.stringify({ ...generationRequest, note: "private" }),
    });
    expect(extra.status).toBe(400);
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it.each([
    [
      "title",
      "title",
      JSON.stringify({ ...generationRequest, title: "\n" }),
      "provide a non-empty badge title within the supported length",
    ],
    [
      "criterion",
      "criterion",
      JSON.stringify({ ...generationRequest, criterion: "\n" }),
      "provide a non-empty achievement criterion within the supported length",
    ],
    [
      "direction",
      "direction",
      JSON.stringify({ ...generationRequest, direction: {} }),
      "correct or remove the optional direction",
    ],
    [
      "missing allowedQuotations",
      "allowedQuotations",
      JSON.stringify({ title: "Yosemite", criterion: "Visit Yosemite." }),
      requiredQuotationCorrection,
    ],
    [
      "empty allowedQuotations",
      "allowedQuotations",
      JSON.stringify({ ...generationRequest, allowedQuotations: [] }),
      requiredQuotationCorrection,
    ],
    [
      "allowedQuotations source",
      "allowedQuotations",
      JSON.stringify({
        ...generationRequest,
        allowedQuotations: [{ ...historicalQuotation, sourceUrl: "http://example.com/quotation" }],
      }),
      requiredQuotationCorrection,
    ],
  ])("names malformed %s input before provider spawn", async (_label, field, body, correction) => {
    const generator = successGenerator();
    const { port } = await host(generator);

    const reply = await callGeneration(port, body);

    expect(reply.status).toBe(400);
    const sentence = `${correction[0]!.toUpperCase()}${correction.slice(1)}`;
    const message = `The quote-selection request has invalid input in ${field}. ${sentence}, then review and send the updated canonical JSON.`;
    expect(JSON.parse(reply.body).error).toEqual({ code: "BAD_REQUEST", message });
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("rejects queries and OPTIONS without CORS", async () => {
    const generator = successGenerator();
    const { port } = await host(generator);
    const query = await call(port, { path: `${SAYING_DISCLOSURE_PATH}?x=1` });
    expect(query.status).toBe(400);
    const options = await call(port, { method: "OPTIONS", path: SAYING_GENERATION_PATH });
    expect(options.status).toBe(405);
    expect(options.headers.allow).toBe("POST");
    expect(options.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows one provider globally and never queues a second request", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const generator = successGenerator();
    generator.generate.mockImplementationOnce(async () => {
      await gate;
      return {
        response: {
          kind: "quotation",
          saying: historicalQuotation.text,
          quotation: historicalQuotation,
        },
        provenance: {
          provider: "claude-code",
          model: "claude-sonnet-4-6",
          promptVersion: "v3",
          generatedAt: "2026-08-23T12:00:00.000Z",
        },
      };
    });
    const { port } = await host(generator);
    const first = callGeneration(port);
    while (generator.generate.mock.calls.length === 0) await new Promise((resolve) => setImmediate(resolve));
    const second = await callGeneration(port);
    expect(second.status).toBe(429);
    expect(generator.generate).toHaveBeenCalledOnce();
    release();
    expect((await first).status).toBe(200);
  });

  it("aborts and awaits active work during server shutdown", async () => {
    let observedSignal: AbortSignal | undefined;
    const generator: SayingGenerator = {
      generate: vi.fn(async (_input, signal) => {
        observedSignal = signal;
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
        throw new Error("private cancellation detail");
      }),
    };
    const { port, runtime } = await host(generator);
    const pending = callGeneration(port);
    while (!observedSignal) await new Promise((resolve) => setImmediate(resolve));
    await runtime.shutdown();
    expect(observedSignal.aborted).toBe(true);
    expect((await pending).status).toBe(502);
  });

  it("substitutes a bounded sanitized error for oversized provider output", async () => {
    const generator = successGenerator();
    const oversizedText = "x".repeat(20_000);
    generator.generate.mockResolvedValueOnce({
      response: {
        kind: "quotation",
        saying: oversizedText,
        quotation: { ...historicalQuotation, text: oversizedText },
      },
      provenance: {},
    } as never);
    const { port } = await host(generator);
    const reply = await callGeneration(port);
    expect(reply.status).toBe(502);
    expect(Buffer.byteLength(reply.body)).toBeLessThanOrEqual(16 * 1024);
    expect(reply.body).not.toContain("x".repeat(100));
  });

  it("never forwards adapter exception text to the browser", async () => {
    const generator: SayingGenerator = {
      generate: async () => {
        throw new SayingGenerationFailure("failed", "PRIVATE_STDERR_AND_PROMPT_SENTINEL");
      },
    };
    const { port } = await host(generator);
    const reply = await call(port, {
      method: "POST",
      path: SAYING_GENERATION_PATH,
      headers: generationHeaders,
      body: generationBody,
    });
    expect(reply.status).toBe(502);
    expect(reply.body).not.toContain("PRIVATE_STDERR_AND_PROMPT_SENTINEL");
  });

  it("returns fixed actionable 503 remediation for structured authentication failure", async () => {
    const generator: SayingGenerator = {
      generate: async () => {
        throw new SayingGenerationFailure("authentication", "PRIVATE_OAUTH_PROVIDER_RESULT");
      },
    };
    const { port } = await host(generator);
    const reply = await call(port, {
      method: "POST",
      path: SAYING_GENERATION_PATH,
      headers: generationHeaders,
      body: generationBody,
    });
    expect(reply.status).toBe(503);
    expect(JSON.parse(reply.body).error).toEqual({
      code: "PROVIDER_UNAVAILABLE",
      message:
        "Claude Code authentication expired. Run `claude auth login` in a terminal, then retry quote regeneration.",
    });
    expect(reply.body).not.toContain("PRIVATE_OAUTH_PROVIDER_RESULT");
  });

  it.each(["cleanup-only-private-path", "provider-and-cleanup-private-path"])(
    "surfaces fixed cleanup remediation without leaking %s",
    async (privateCause) => {
      const generator: SayingGenerator = {
        generate: async () => {
          throw new SayingGenerationFailure("cleanup-failed", privateCause);
        },
      };
      const { port } = await host(generator);
      const reply = await call(port, {
        method: "POST",
        path: SAYING_GENERATION_PATH,
        headers: generationHeaders,
        body: generationBody,
      });
      expect(reply.status).toBe(502);
      expect(JSON.parse(reply.body).error.message).toContain(
        "remove only confirmed inactive ordinary badge-saying- prefixed task folders",
      );
      expect(reply.body).not.toContain(privateCause);

      const blocked = await call(port);
      expect(blocked.status).toBe(502);
      expect(JSON.parse(blocked.body).error.message).toContain(
        "remove only confirmed inactive ordinary badge-saying- prefixed task folders",
      );
    },
  );

  it("retains and surfaces cleanup failure after a client disconnect", async () => {
    let observedSignal: AbortSignal | undefined;
    const generator: SayingGenerator = {
      generate: async (_input, signal) => {
        observedSignal = signal;
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
        throw new SayingGenerationFailure("cleanup-failed", "PRIVATE_DISCONNECT_PATH");
      },
    };
    const { port, runtime } = await host(generator);
    const outgoing = httpRequest({
      host: "127.0.0.1",
      port,
      method: "POST",
      path: SAYING_GENERATION_PATH,
      headers: {
        Host: `127.0.0.1:${port}`,
        Origin: `http://127.0.0.1:${port}`,
        "Sec-Fetch-Site": "same-origin",
        ...generationHeaders,
        "Content-Length": String(Buffer.byteLength(generationBody)),
      },
    });
    outgoing.on("error", () => undefined);
    outgoing.end(generationBody);
    while (!observedSignal) await new Promise((resolve) => setImmediate(resolve));
    outgoing.destroy();
    while (!observedSignal.aborted) await new Promise((resolve) => setImmediate(resolve));
    await expect(runtime.shutdown()).rejects.toThrow("could not clean its private quote-selection workspace");
  });

  it("propagates cleanup failure caused during server shutdown", async () => {
    let started = false;
    const generator: SayingGenerator = {
      generate: async (_input, signal) => {
        started = true;
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
        throw new SayingGenerationFailure("cleanup-failed", "PRIVATE_SHUTDOWN_PATH");
      },
    };
    const { port, runtime } = await host(generator);
    const pending = call(port, {
      method: "POST",
      path: SAYING_GENERATION_PATH,
      headers: generationHeaders,
      body: generationBody,
    });
    while (!started) await new Promise((resolve) => setImmediate(resolve));
    await expect(runtime.shutdown()).rejects.toThrow("could not clean its private quote-selection workspace");
    expect((await pending).body).not.toContain("PRIVATE_SHUTDOWN_PATH");
  });
});
