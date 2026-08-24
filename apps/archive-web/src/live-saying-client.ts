import { type SayingProvider, type SayingRequest } from "@badge/saying-contract";
import {
  SAYING_DISCLOSURE_HEADER,
  SAYING_DISCLOSURE_PATH,
  SAYING_GENERATION_PATH,
  SAYING_HTTP_SUCCESS_STATUS,
  SAYING_HTTP_STATUS_BY_ERROR,
  SAYING_JSON_MEDIA_TYPE,
  SAYING_ROUTE_RESPONSE_LIMIT_BYTES,
  buildSayingDisclosureReview,
  sayingDisclosureSchema,
  sayingLiveErrorResponseSchema,
  sayingLiveSuccessSchema,
  type SayingDisclosure,
  type SayingLiveErrorCode,
} from "@badge/saying-live-contract";

export const DISCLOSURE_REQUIRED_CLIENT_MESSAGE =
  "Quote provider disclosure changed; review it before regenerating another quote.";

export type SayingFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class SayingLiveClientError extends Error {
  constructor(
    readonly code: SayingLiveErrorCode | "INVALID_RESPONSE" | "DISCLOSURE_NOT_ACKNOWLEDGED",
    message: string,
    readonly status: number | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SayingLiveClientError";
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchSameOrigin(
  fetcher: SayingFetch,
  path: string,
  init: RequestInit,
  surface: string,
): Promise<Response> {
  try {
    return await fetcher(path, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new SayingLiveClientError(
      "INVALID_RESPONSE",
      `${surface} could not reach the same-origin Badge quote service; restart the local Badge site and retry.`,
    );
  }
}

async function cancelBodyBestEffort(body: ReadableStream<Uint8Array> | null): Promise<void> {
  try {
    await body?.cancel();
  } catch {
    // Cancellation is cleanup; it must not replace the stable protocol error.
  }
}

async function cancelReaderBestEffort(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // The bounded response error remains the user-facing failure.
  }
}

async function responseJson(response: Response, surface: string): Promise<unknown> {
  const mediaType = response.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== SAYING_JSON_MEDIA_TYPE) {
    await cancelBodyBestEffort(response.body);
    throw new SayingLiveClientError(
      "INVALID_RESPONSE",
      `${surface} returned ${mediaType ?? "no Content-Type"}; expected ${SAYING_JSON_MEDIA_TYPE}.`,
      response.status,
    );
  }
  const declaredLength = response.headers.get("Content-Length");
  if (declaredLength !== null) {
    const bytes = Number(declaredLength);
    if (Number.isFinite(bytes) && bytes > SAYING_ROUTE_RESPONSE_LIMIT_BYTES) {
      await cancelBodyBestEffort(response.body);
      throw new SayingLiveClientError(
        "INVALID_RESPONSE",
        `${surface} exceeded the ${SAYING_ROUTE_RESPONSE_LIMIT_BYTES}-byte response limit; restart the local Badge site.`,
        response.status,
      );
    }
  }

  try {
    if (!response.body) throw new SyntaxError("Response body is empty.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let byteLength = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        byteLength += value.byteLength;
        if (byteLength > SAYING_ROUTE_RESPONSE_LIMIT_BYTES) {
          await cancelReaderBestEffort(reader);
          throw new SayingLiveClientError(
            "INVALID_RESPONSE",
            `${surface} exceeded the ${SAYING_ROUTE_RESPONSE_LIMIT_BYTES}-byte response limit; restart the local Badge site.`,
            response.status,
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof SayingLiveClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new SayingLiveClientError(
      "INVALID_RESPONSE",
      `${surface} returned unreadable JSON; retry after restarting the local Badge site.`,
      response.status,
    );
  }
}

async function throwResponseError(response: Response, surface: string): Promise<never> {
  const decoded = await responseJson(response, surface);
  const parsed = sayingLiveErrorResponseSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new SayingLiveClientError(
      "INVALID_RESPONSE",
      `${surface} failed with HTTP ${response.status} and an invalid error response; restart the local Badge site.`,
      response.status,
    );
  }
  if (SAYING_HTTP_STATUS_BY_ERROR[parsed.data.error.code] !== response.status) {
    throw new SayingLiveClientError(
      "INVALID_RESPONSE",
      `${surface} returned an error code that does not match HTTP ${response.status}; restart the local Badge site.`,
      response.status,
    );
  }
  if (parsed.data.error.code === "DISCLOSURE_REQUIRED") {
    throw new SayingLiveClientError(
      parsed.data.error.code,
      DISCLOSURE_REQUIRED_CLIENT_MESSAGE,
      response.status,
    );
  }
  throw new SayingLiveClientError(parsed.data.error.code, parsed.data.error.message, response.status);
}

async function requireExactSuccessStatus(response: Response, surface: string): Promise<void> {
  if (response.status === SAYING_HTTP_SUCCESS_STATUS) return;
  await cancelBodyBestEffort(response.body);
  throw new SayingLiveClientError(
    "INVALID_RESPONSE",
    `${surface} returned HTTP ${response.status}; expected HTTP ${SAYING_HTTP_SUCCESS_STATUS} from the same-origin Badge quote service.`,
    response.status,
  );
}

export async function fetchSayingDisclosure(
  signal: AbortSignal,
  fetcher: SayingFetch = fetch,
): Promise<SayingDisclosure> {
  const response = await fetchSameOrigin(
    fetcher,
    SAYING_DISCLOSURE_PATH,
    {
      method: "GET",
      mode: "same-origin",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json" },
      signal,
    },
    "Quote provider disclosure",
  );
  if (!response.ok) await throwResponseError(response, "Quote provider disclosure");
  await requireExactSuccessStatus(response, "Quote provider disclosure");
  const decoded = await responseJson(response, "Quote provider disclosure");
  const parsed = sayingDisclosureSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new SayingLiveClientError(
      "INVALID_RESPONSE",
      "Quote provider disclosure did not match this Badge build; restart Badge before reviewing provider access.",
      response.status,
    );
  }
  return parsed.data;
}

interface LiveSayingProviderOptions {
  readonly acknowledgedFingerprint: () => string | null;
  readonly canonicalUserMessage: (promptInput: SayingRequest) => string | null;
  readonly fetcher?: SayingFetch;
}

export function createLiveSayingProvider({
  acknowledgedFingerprint,
  canonicalUserMessage,
  fetcher = fetch,
}: LiveSayingProviderOptions): SayingProvider {
  return {
    async propose(request) {
      const fingerprint = acknowledgedFingerprint();
      if (!fingerprint) {
        throw new SayingLiveClientError(
          "DISCLOSURE_NOT_ACKNOWLEDGED",
          "Review and approve the quote provider disclosure before regenerating.",
        );
      }
      const body = canonicalUserMessage(request.promptInput);
      if (!body) {
        throw new SayingLiveClientError(
          "DISCLOSURE_NOT_ACKNOWLEDGED",
          "The reviewed quote request is no longer available; review it again before regenerating.",
        );
      }
      if (body !== buildSayingDisclosureReview(request.promptInput).canonicalUserMessage) {
        throw new SayingLiveClientError(
          "DISCLOSURE_NOT_ACKNOWLEDGED",
          "The reviewed quote values changed; review them again before regenerating.",
        );
      }
      const response = await fetchSameOrigin(
        fetcher,
        SAYING_GENERATION_PATH,
        {
          method: "POST",
          mode: "same-origin",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            [SAYING_DISCLOSURE_HEADER]: fingerprint,
          },
          body,
          signal: request.signal,
        },
        "Quote regeneration",
      );
      if (!response.ok) await throwResponseError(response, "Quote regeneration");
      await requireExactSuccessStatus(response, "Quote regeneration");
      const decoded = await responseJson(response, "Quote regeneration");
      const parsed = sayingLiveSuccessSchema.safeParse(decoded);
      if (!parsed.success) {
        throw new SayingLiveClientError(
          "INVALID_RESPONSE",
          "Quote regeneration returned an invalid bounded response; retry after checking Claude Code.",
          response.status,
        );
      }
      return parsed.data;
    },
  };
}

export function isDisclosureRequiredClientMessage(message: string | null): boolean {
  return message === DISCLOSURE_REQUIRED_CLIENT_MESSAGE;
}
