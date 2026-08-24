import type { IncomingMessage, ServerResponse } from "node:http";
import { TextDecoder } from "node:util";
import { buildCanonicalSayingUserMessage } from "@badge/saying-contract";
import {
  SAYING_DISCLOSURE,
  SAYING_DISCLOSURE_FINGERPRINT,
  SAYING_DISCLOSURE_HEADER,
  SAYING_DISCLOSURE_PATH,
  SAYING_GENERATION_PATH,
  SAYING_HTTP_SUCCESS_STATUS,
  SAYING_HTTP_STATUS_BY_ERROR,
  SAYING_ROUTE_BODY_LIMIT_BYTES,
  SAYING_ROUTE_RESPONSE_LIMIT_BYTES,
  sayingLiveErrorResponseSchema,
  sayingLiveRequestSchema,
  sayingLiveSuccessSchema,
  type SayingLiveErrorCode,
  type SayingLiveErrorResponse,
} from "@badge/saying-live-contract";

import { SayingGenerationFailure, type SayingGenerator } from "./generator.js";

export type SayingMiddleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => void;

interface ActiveRequest {
  readonly controller: AbortController;
  readonly done: Promise<void>;
}

interface RouteFailure {
  readonly status: number;
  readonly code: SayingLiveErrorCode;
  readonly message: string;
}

type RequestValidationIssue = { readonly path: readonly PropertyKey[] };
type SayingRequestField = "title" | "criterion" | "direction" | "allowedQuotations";

const sayingRequestFieldOrder: readonly SayingRequestField[] = [
  "title",
  "criterion",
  "direction",
  "allowedQuotations",
];

const sayingRequestFieldCorrections: Readonly<Record<SayingRequestField, string>> = {
  title: "provide a non-empty badge title within the supported length",
  criterion: "provide a non-empty achievement criterion within the supported length",
  direction: "correct or remove the optional direction",
  allowedQuotations: "provide at least one valid source-checked allowedQuotations entry",
};

const fatalUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const CLEANUP_FAILURE_MESSAGE =
  "Badge could not clean its private quote-selection workspace. Close every Badge process, then inspect your system temporary directory and remove only confirmed inactive ordinary badge-saying- prefixed task folders before trying again.";

function publicFailure(code: SayingLiveErrorCode, message: string): RouteFailure {
  return { status: SAYING_HTTP_STATUS_BY_ERROR[code], code, message };
}

function joinList(values: readonly string[], separator: string): string {
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(separator)}${separator}and ${values.at(-1)}`;
}

function invalidRequestMessage(issues: readonly RequestValidationIssue[]): string {
  const issueRoots = new Set(issues.map((issue) => issue.path[0]));
  const fields = sayingRequestFieldOrder.filter((field) => issueRoots.has(field));
  if (fields.length === 0) {
    return "The quote-selection request fields are invalid. Send only title, criterion, required allowedQuotations, and optional direction after reviewing the updated canonical JSON.";
  }
  const fieldList = joinList(fields, ", ");
  const corrections = joinList(
    fields.map((field) => sayingRequestFieldCorrections[field]),
    "; ",
  );
  return `The quote-selection request has invalid input in ${fieldList}. ${corrections[0]!.toUpperCase()}${corrections.slice(1)}, then review and send the updated canonical JSON.`;
}

function headerValue(request: IncomingMessage, name: string): string | null {
  const value = request.headers[name.toLowerCase()];
  return typeof value === "string" ? value : null;
}

function expectedAuthority(request: IncomingMessage): string | null {
  const localAddress = request.socket.localAddress;
  const localPort = request.socket.localPort;
  if (localAddress !== "127.0.0.1" || !Number.isSafeInteger(localPort) || (localPort ?? 0) < 1) {
    return null;
  }
  return `127.0.0.1:${localPort}`;
}

function validateRequestBoundary(request: IncomingMessage): RouteFailure | null {
  const authority = expectedAuthority(request);
  const host = headerValue(request, "host");
  const fetchSite = headerValue(request, "sec-fetch-site");
  if (!authority || host !== authority || fetchSite !== "same-origin") {
    return publicFailure(
      "REQUEST_REJECTED",
      "Quote-selection requests must come from this exact local Badge site.",
    );
  }
  if (request.method === "POST" && headerValue(request, "origin") !== `http://${authority}`) {
    return publicFailure(
      "REQUEST_REJECTED",
      "Quote regeneration must come from this exact local Badge site origin.",
    );
  }
  if (headerValue(request, "content-encoding") !== null) {
    return publicFailure(
      "UNSUPPORTED_MEDIA_TYPE",
      "Compressed quote-selection requests are not accepted; send an unencoded JSON body.",
    );
  }
  return null;
}

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const parts = value.split(";").map((part) => part.trim().toLowerCase());
  if (parts[0] !== "application/json") return false;
  return parts.slice(1).every((part) => part === "charset=utf-8");
}

function writeJson(response: ServerResponse, status: number, value: unknown, allow?: string): void {
  if (response.destroyed || response.writableEnded) return;
  let body = JSON.stringify(value);
  if (Buffer.byteLength(body) > SAYING_ROUTE_RESPONSE_LIMIT_BYTES) {
    status = SAYING_HTTP_STATUS_BY_ERROR.PROVIDER_FAILED;
    body = JSON.stringify({
      error: {
        code: "PROVIDER_FAILED",
        message: "The quote response exceeded Badge's safety limit; the current quote was unchanged.",
      },
    } satisfies SayingLiveErrorResponse);
  }
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (allow) response.setHeader("Allow", allow);
  response.end(body);
}

function writeFailure(response: ServerResponse, failure: RouteFailure, allow?: string): void {
  const body: SayingLiveErrorResponse = sayingLiveErrorResponseSchema.parse({
    error: { code: failure.code, message: failure.message },
  });
  writeJson(response, failure.status, body, allow);
}

function readBoundedBody(request: IncomingMessage, signal: AbortSignal): Promise<Buffer> {
  const lengthHeader = headerValue(request, "content-length");
  if (lengthHeader !== null) {
    if (!/^\d+$/u.test(lengthHeader)) {
      request.resume();
      return Promise.reject(
        publicFailure(
          "BAD_REQUEST",
          "Quote-selection request Content-Length must be one non-negative decimal integer.",
        ),
      );
    }
    if (Number(lengthHeader) > SAYING_ROUTE_BODY_LIMIT_BYTES) {
      request.resume();
      return Promise.reject(
        publicFailure(
          "PAYLOAD_TOO_LARGE",
          `Quote-selection request bodies must be at most ${SAYING_ROUTE_BODY_LIMIT_BYTES} bytes.`,
        ),
      );
    }
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let overLimit = false;
    let settled = false;
    const cleanup = () => {
      request.removeListener("data", onData);
      request.removeListener("end", onEnd);
      request.removeListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const settleReject = (failure: RouteFailure) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(failure);
    };
    const onData = (chunk: Buffer | string) => {
      const held = Buffer.from(chunk);
      bytes += held.length;
      if (bytes > SAYING_ROUTE_BODY_LIMIT_BYTES) {
        overLimit = true;
        chunks.length = 0;
        return;
      }
      chunks.push(held);
    };
    const onEnd = () => {
      if (settled) return;
      if (overLimit) {
        settleReject(
          publicFailure(
            "PAYLOAD_TOO_LARGE",
            `Quote-selection request bodies must be at most ${SAYING_ROUTE_BODY_LIMIT_BYTES} bytes.`,
          ),
        );
        return;
      }
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks));
    };
    const onError = () =>
      settleReject(publicFailure("BAD_REQUEST", "The quote-selection request body could not be read."));
    const onAbort = () =>
      settleReject(publicFailure("BAD_REQUEST", "The quote regeneration request was cancelled."));
    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function parseRequestBody(bytes: Buffer): ReturnType<typeof sayingLiveRequestSchema.parse> {
  let text: string;
  try {
    text = fatalUtf8.decode(bytes);
  } catch {
    throw publicFailure("BAD_REQUEST", "The quote-selection request body must be exact UTF-8 JSON.");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    throw publicFailure("BAD_REQUEST", "The quote-selection request body must be one JSON object.");
  }
  const parsed = sayingLiveRequestSchema.safeParse(decoded);
  if (!parsed.success) {
    throw publicFailure("BAD_REQUEST", invalidRequestMessage(parsed.error.issues));
  }
  let canonical: string;
  try {
    canonical = buildCanonicalSayingUserMessage(parsed.data);
  } catch {
    throw publicFailure(
      "BAD_REQUEST",
      "The quote-selection request is too large after canonical validation; shorten its fields.",
    );
  }
  if (text !== canonical) {
    throw publicFailure(
      "BAD_REQUEST",
      "The quote-selection request body must exactly match the canonical JSON reviewed for this request.",
    );
  }
  return parsed.data;
}

function providerFailure(error: unknown): RouteFailure {
  if (!(error instanceof SayingGenerationFailure)) {
    return publicFailure(
      "PROVIDER_FAILED",
      "The quote provider returned an invalid result; the current quote was unchanged.",
    );
  }
  if (error.kind === "timeout") {
    return publicFailure(
      "PROVIDER_TIMEOUT",
      "Claude Code did not finish within 60 seconds; try again when it is responsive.",
    );
  }
  if (error.kind === "unavailable") {
    return publicFailure(
      "PROVIDER_UNAVAILABLE",
      "Claude Code is unavailable. Install and sign in to Claude Code, then restart Badge.",
    );
  }
  if (error.kind === "authentication") {
    return publicFailure(
      "PROVIDER_UNAVAILABLE",
      "Claude Code authentication expired. Run `claude auth login` in a terminal, then retry quote regeneration.",
    );
  }
  if (error.kind === "cleanup-failed") {
    return publicFailure("PROVIDER_FAILED", CLEANUP_FAILURE_MESSAGE);
  }
  return publicFailure(
    "PROVIDER_FAILED",
    error.kind === "aborted"
      ? "The quote regeneration request was cancelled; the current quote was unchanged."
      : "Claude Code could not complete quote regeneration; the current quote was unchanged.",
  );
}

export class SayingServerRuntime {
  readonly middleware: SayingMiddleware;
  private active: ActiveRequest | null = null;
  private closed = false;
  private cleanupIncident = false;

  constructor(private readonly generator: SayingGenerator) {
    this.middleware = (request, response, next) => {
      void this.route(request, response, next);
    };
  }

  async shutdown(): Promise<void> {
    this.closed = true;
    const active = this.active;
    if (active) {
      active.controller.abort();
      await active.done;
    }
    if (this.cleanupIncident) throw new Error(CLEANUP_FAILURE_MESSAGE);
  }

  private async route(request: IncomingMessage, response: ServerResponse, next: () => void) {
    const rawUrl = request.url ?? "";
    const exactDisclosure = rawUrl === SAYING_DISCLOSURE_PATH;
    const exactGeneration = rawUrl === SAYING_GENERATION_PATH;
    const resemblesRoute =
      rawUrl.startsWith(`${SAYING_DISCLOSURE_PATH}?`) || rawUrl.startsWith(`${SAYING_GENERATION_PATH}?`);
    if (!exactDisclosure && !exactGeneration && !resemblesRoute) {
      next();
      return;
    }

    const boundaryFailure = validateRequestBoundary(request);
    if (boundaryFailure) {
      request.resume();
      writeFailure(response, boundaryFailure);
      return;
    }
    if (resemblesRoute) {
      request.resume();
      writeFailure(
        response,
        publicFailure("BAD_REQUEST", "Quote-selection API routes do not accept query parameters."),
      );
      return;
    }
    if (this.cleanupIncident) {
      request.resume();
      writeFailure(response, publicFailure("PROVIDER_FAILED", CLEANUP_FAILURE_MESSAGE));
      return;
    }
    if (exactDisclosure) {
      if (request.method !== "GET") {
        request.resume();
        writeFailure(
          response,
          publicFailure("METHOD_NOT_ALLOWED", "Use GET to review quote disclosure."),
          "GET",
        );
        return;
      }
      writeJson(response, SAYING_HTTP_SUCCESS_STATUS, SAYING_DISCLOSURE);
      return;
    }
    if (request.method !== "POST") {
      request.resume();
      writeFailure(response, publicFailure("METHOD_NOT_ALLOWED", "Use POST to regenerate a quote."), "POST");
      return;
    }
    if (!isJsonContentType(headerValue(request, "content-type"))) {
      request.resume();
      writeFailure(
        response,
        publicFailure("UNSUPPORTED_MEDIA_TYPE", "Quote regeneration accepts application/json only."),
      );
      return;
    }
    if (headerValue(request, SAYING_DISCLOSURE_HEADER) !== SAYING_DISCLOSURE_FINGERPRINT) {
      request.resume();
      writeFailure(
        response,
        publicFailure(
          "DISCLOSURE_REQUIRED",
          "Review and acknowledge the current quote provider, prompt, and outbound fields first.",
        ),
      );
      return;
    }
    if (this.closed) {
      request.resume();
      writeFailure(
        response,
        publicFailure(
          "PROVIDER_UNAVAILABLE",
          "Badge is shutting down; start it again to regenerate a quote.",
        ),
      );
      return;
    }
    if (this.active) {
      request.resume();
      writeFailure(
        response,
        publicFailure(
          "PROVIDER_BUSY",
          "Another quote regeneration is still running; wait for it to finish, then retry.",
        ),
      );
      return;
    }

    const controller = new AbortController();
    const abortOnDisconnect = () => {
      if (!response.writableEnded) controller.abort();
    };
    request.once("aborted", abortOnDisconnect);
    response.once("close", abortOnDisconnect);
    let releaseDone!: () => void;
    let rejectDone!: (error: Error) => void;
    const done = new Promise<void>((resolve, reject) => {
      releaseDone = resolve;
      rejectDone = reject;
    });
    void done.catch(() => undefined);
    this.active = { controller, done };
    let cleanupFailure: Error | null = null;
    try {
      const body = await readBoundedBody(request, controller.signal);
      const promptInput = parseRequestBody(body);
      const result = sayingLiveSuccessSchema.parse(
        await this.generator.generate(promptInput, controller.signal),
      );
      writeJson(response, SAYING_HTTP_SUCCESS_STATUS, result);
    } catch (error) {
      if (error instanceof SayingGenerationFailure && error.kind === "cleanup-failed") {
        this.cleanupIncident = true;
        cleanupFailure = new Error(CLEANUP_FAILURE_MESSAGE);
      }
      if (!response.destroyed && !response.writableEnded) {
        const failure =
          typeof error === "object" && error !== null && "status" in error
            ? (error as RouteFailure)
            : providerFailure(error);
        writeFailure(response, failure);
      }
    } finally {
      request.removeListener("aborted", abortOnDisconnect);
      response.removeListener("close", abortOnDisconnect);
      if (this.active?.controller === controller) this.active = null;
      if (cleanupFailure) rejectDone(cleanupFailure);
      else releaseDone();
    }
  }
}

export const __testOnly = Object.freeze({
  expectedAuthority,
  isJsonContentType,
  parseRequestBody,
  validateRequestBoundary,
});
