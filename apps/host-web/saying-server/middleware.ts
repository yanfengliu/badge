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

const fatalUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const CLEANUP_FAILURE_MESSAGE =
  "Badge could not clean its private saying workspace. Close every Badge process, then inspect your system temporary directory and remove only confirmed inactive ordinary badge-saying- prefixed task folders before trying again.";

function publicFailure(code: SayingLiveErrorCode, message: string): RouteFailure {
  return { status: SAYING_HTTP_STATUS_BY_ERROR[code], code, message };
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
    return publicFailure("REQUEST_REJECTED", "Saying requests must come from this exact local Badge site.");
  }
  if (request.method === "POST" && headerValue(request, "origin") !== `http://${authority}`) {
    return publicFailure(
      "REQUEST_REJECTED",
      "Saying generation must come from this exact local Badge site origin.",
    );
  }
  if (headerValue(request, "content-encoding") !== null) {
    return publicFailure(
      "UNSUPPORTED_MEDIA_TYPE",
      "Compressed saying requests are not accepted; send an unencoded JSON body.",
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
        message: "The saying response exceeded Badge's safety limit; nothing was accepted.",
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
          "Saying request Content-Length must be one non-negative decimal integer.",
        ),
      );
    }
    if (Number(lengthHeader) > SAYING_ROUTE_BODY_LIMIT_BYTES) {
      request.resume();
      return Promise.reject(
        publicFailure(
          "PAYLOAD_TOO_LARGE",
          `Saying request bodies must be at most ${SAYING_ROUTE_BODY_LIMIT_BYTES} bytes.`,
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
            `Saying request bodies must be at most ${SAYING_ROUTE_BODY_LIMIT_BYTES} bytes.`,
          ),
        );
        return;
      }
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks));
    };
    const onError = () =>
      settleReject(publicFailure("BAD_REQUEST", "The saying request body could not be read."));
    const onAbort = () => settleReject(publicFailure("BAD_REQUEST", "The saying request was cancelled."));
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
    throw publicFailure("BAD_REQUEST", "The saying request body must be exact UTF-8 JSON.");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    throw publicFailure("BAD_REQUEST", "The saying request body must be one JSON object.");
  }
  const parsed = sayingLiveRequestSchema.safeParse(decoded);
  if (!parsed.success) {
    throw publicFailure(
      "BAD_REQUEST",
      "The saying request must contain only a valid title, criterion, and optional direction.",
    );
  }
  let canonical: string;
  try {
    canonical = buildCanonicalSayingUserMessage(parsed.data);
  } catch {
    throw publicFailure(
      "BAD_REQUEST",
      "The saying request is too large after canonical validation; shorten its fields.",
    );
  }
  if (text !== canonical) {
    throw publicFailure(
      "BAD_REQUEST",
      "The saying request body must exactly match the canonical JSON reviewed for this request.",
    );
  }
  return parsed.data;
}

function providerFailure(error: unknown): RouteFailure {
  if (!(error instanceof SayingGenerationFailure)) {
    return publicFailure(
      "PROVIDER_FAILED",
      "The saying provider returned an invalid result; nothing was accepted.",
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
      "Claude Code authentication expired. Run `claude auth login` in a terminal, then retry this saying.",
    );
  }
  if (error.kind === "cleanup-failed") {
    return publicFailure("PROVIDER_FAILED", CLEANUP_FAILURE_MESSAGE);
  }
  return publicFailure(
    "PROVIDER_FAILED",
    error.kind === "aborted"
      ? "The saying request was cancelled; nothing was accepted."
      : "Claude Code could not complete the saying request; nothing was accepted.",
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
        publicFailure("BAD_REQUEST", "Saying API routes do not accept query parameters."),
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
          publicFailure("METHOD_NOT_ALLOWED", "Use GET to review saying disclosure."),
          "GET",
        );
        return;
      }
      writeJson(response, SAYING_HTTP_SUCCESS_STATUS, SAYING_DISCLOSURE);
      return;
    }
    if (request.method !== "POST") {
      request.resume();
      writeFailure(response, publicFailure("METHOD_NOT_ALLOWED", "Use POST to generate a saying."), "POST");
      return;
    }
    if (!isJsonContentType(headerValue(request, "content-type"))) {
      request.resume();
      writeFailure(
        response,
        publicFailure("UNSUPPORTED_MEDIA_TYPE", "Saying generation accepts application/json only."),
      );
      return;
    }
    if (headerValue(request, SAYING_DISCLOSURE_HEADER) !== SAYING_DISCLOSURE_FINGERPRINT) {
      request.resume();
      writeFailure(
        response,
        publicFailure(
          "DISCLOSURE_REQUIRED",
          "Review and acknowledge the current saying provider, prompt, and outbound fields first.",
        ),
      );
      return;
    }
    if (this.closed) {
      request.resume();
      writeFailure(
        response,
        publicFailure("PROVIDER_UNAVAILABLE", "Badge is shutting down; start it again to generate."),
      );
      return;
    }
    if (this.active) {
      request.resume();
      writeFailure(
        response,
        publicFailure("PROVIDER_BUSY", "Another saying is being generated; wait or cancel it first."),
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
