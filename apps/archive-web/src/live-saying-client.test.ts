import { describe, expect, it, vi } from "vitest";
import { SAYING_PROMPT_VERSION } from "@badge/saying-contract";
import {
  SAYING_DISCLOSURE,
  SAYING_DISCLOSURE_FINGERPRINT,
  SAYING_DISCLOSURE_HEADER,
  SAYING_DISCLOSURE_PATH,
  SAYING_GENERATION_PATH,
  SAYING_ROUTE_RESPONSE_LIMIT_BYTES,
  buildSayingDisclosureReview,
} from "@badge/saying-live-contract";

import {
  DISCLOSURE_REQUIRED_CLIENT_MESSAGE,
  createLiveSayingProvider,
  fetchSayingDisclosure,
  type SayingFetch,
} from "./live-saying-client";

const promptInput = {
  title: "Yosemite",
  criterion: "Visit Yosemite National Park",
} as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function successfulLookingResponse(body: unknown, status: 201 | 202 | 204): Response {
  return status === 204
    ? new Response(null, { status, headers: { "Content-Type": "application/json" } })
    : jsonResponse(body, status);
}

function responseWhoseBodyRejectsCancellation(status: number, headers: HeadersInit): Response {
  const privateSentinel = "PRIVATE-BROWSER-CANCEL-DETAIL";
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify(SAYING_DISCLOSURE)));
    },
    cancel() {
      throw new Error(privateSentinel);
    },
  });
  return new Response(body, { status, headers });
}

describe("live saying HTTP client", () => {
  it("loads and strictly parses disclosure through a same-origin GET", async () => {
    const fetcher = vi.fn<SayingFetch>(async () => jsonResponse(SAYING_DISCLOSURE));
    const signal = new AbortController().signal;

    await expect(fetchSayingDisclosure(signal, fetcher)).resolves.toEqual(SAYING_DISCLOSURE);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      SAYING_DISCLOSURE_PATH,
      expect.objectContaining({
        method: "GET",
        mode: "same-origin",
        credentials: "same-origin",
        redirect: "error",
        signal,
      }),
    );
  });

  it.each([201, 202, 204] as const)(
    "rejects disclosure body under non-contract success status %i",
    async (status) => {
      const fetcher = vi.fn<SayingFetch>(async () => successfulLookingResponse(SAYING_DISCLOSURE, status));

      await expect(fetchSayingDisclosure(new AbortController().signal, fetcher)).rejects.toThrow(
        `returned HTTP ${status}; expected HTTP 200`,
      );
    },
  );

  it.each([
    {
      label: "non-contract success status",
      status: 201,
      headers: { "Content-Type": "application/json", "Content-Length": "1" },
      expected: "returned HTTP 201; expected HTTP 200",
    },
    {
      label: "wrong media type",
      status: 200,
      headers: { "Content-Type": "text/plain", "Content-Length": "1" },
      expected: "expected application/json",
    },
    {
      label: "overdeclared response length",
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(SAYING_ROUTE_RESPONSE_LIMIT_BYTES + 1),
      },
      expected: `${SAYING_ROUTE_RESPONSE_LIMIT_BYTES}-byte response limit`,
    },
  ])("keeps the fixed $label error when body cancellation rejects", async ({ status, headers, expected }) => {
    const fetcher = vi.fn<SayingFetch>(async () => responseWhoseBodyRejectsCancellation(status, headers));

    let visible = "";
    try {
      await fetchSayingDisclosure(new AbortController().signal, fetcher);
    } catch (error) {
      visible = error instanceof Error ? error.message : String(error);
    }
    expect(visible).toContain(expected);
    expect(visible).not.toContain("PRIVATE-BROWSER-CANCEL-DETAIL");
  });

  it("sends exactly one canonical POST with the acknowledged fingerprint and controller signal", async () => {
    const review = buildSayingDisclosureReview(promptInput);
    const fetcher = vi.fn<SayingFetch>(async () =>
      jsonResponse({
        response: { saying: "Worth every switchback." },
        provenance: {
          provider: "claude-code",
          model: "claude-sonnet-4-6",
          promptVersion: SAYING_PROMPT_VERSION,
          generatedAt: "2026-08-23T22:00:00.000Z",
        },
      }),
    );
    const signal = new AbortController().signal;
    const provider = createLiveSayingProvider({
      acknowledgedFingerprint: () => SAYING_DISCLOSURE_FINGERPRINT,
      canonicalUserMessage: () => review.canonicalUserMessage,
      fetcher,
    });

    await expect(provider.propose({ requestId: 1, promptInput, signal })).resolves.toMatchObject({
      response: { saying: "Worth every switchback." },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [path, init] = fetcher.mock.calls[0]!;
    expect(path).toBe(SAYING_GENERATION_PATH);
    expect(init).toMatchObject({
      method: "POST",
      mode: "same-origin",
      credentials: "same-origin",
      redirect: "error",
      body: review.canonicalUserMessage,
      signal,
    });
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      [SAYING_DISCLOSURE_HEADER]: SAYING_DISCLOSURE_FINGERPRINT,
    });
  });

  it.each([201, 202, 204] as const)(
    "rejects generation body under non-contract success status %i",
    async (status) => {
      const fetcher = vi.fn<SayingFetch>(async () =>
        successfulLookingResponse(
          {
            response: { saying: "Worth every switchback." },
            provenance: {
              provider: "claude-code",
              model: "claude-sonnet-4-6",
              promptVersion: SAYING_PROMPT_VERSION,
              generatedAt: "2026-08-23T22:00:00.000Z",
            },
          },
          status,
        ),
      );
      const provider = createLiveSayingProvider({
        acknowledgedFingerprint: () => SAYING_DISCLOSURE_FINGERPRINT,
        canonicalUserMessage: () => buildSayingDisclosureReview(promptInput).canonicalUserMessage,
        fetcher,
      });

      await expect(
        provider.propose({ requestId: status, promptInput, signal: new AbortController().signal }),
      ).rejects.toThrow(`returned HTTP ${status}; expected HTTP 200`);
    },
  );

  it("makes no HTTP call when no disclosure fingerprint is acknowledged", async () => {
    const fetcher = vi.fn<SayingFetch>();
    const provider = createLiveSayingProvider({
      acknowledgedFingerprint: () => null,
      canonicalUserMessage: () => null,
      fetcher,
    });

    await expect(
      provider.propose({ requestId: 1, promptInput, signal: new AbortController().signal }),
    ).rejects.toThrow("Review and approve");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces fingerprint mismatch as the stable re-review signal", async () => {
    const fetcher = vi.fn<SayingFetch>(async () =>
      jsonResponse(
        {
          error: {
            code: "DISCLOSURE_REQUIRED",
            message: "The disclosure fingerprint changed.",
          },
        },
        428,
      ),
    );
    const provider = createLiveSayingProvider({
      acknowledgedFingerprint: () => "sha256:old-fingerprint",
      canonicalUserMessage: () => buildSayingDisclosureReview(promptInput).canonicalUserMessage,
      fetcher,
    });

    await expect(
      provider.propose({ requestId: 2, promptInput, signal: new AbortController().signal }),
    ).rejects.toThrow(DISCLOSURE_REQUIRED_CLIENT_MESSAGE);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed success data without exposing it or falling back", async () => {
    const privateSentinel = "PRIVATE-PROVIDER-OUTPUT";
    const fetcher = vi.fn<SayingFetch>(
      async () =>
        new Response(`${privateSentinel} not json`, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const provider = createLiveSayingProvider({
      acknowledgedFingerprint: () => SAYING_DISCLOSURE_FINGERPRINT,
      canonicalUserMessage: () => buildSayingDisclosureReview(promptInput).canonicalUserMessage,
      fetcher,
    });

    let visible = "";
    try {
      await provider.propose({ requestId: 3, promptInput, signal: new AbortController().signal });
    } catch (error) {
      visible = error instanceof Error ? error.message : String(error);
    }
    expect(visible).toContain("unreadable JSON");
    expect(visible).not.toContain(privateSentinel);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("streams and rejects oversized GET responses before parsing JSON", async () => {
    const fetcher = vi.fn<SayingFetch>(
      async () =>
        new Response("x".repeat(SAYING_ROUTE_RESPONSE_LIMIT_BYTES + 1), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await expect(fetchSayingDisclosure(new AbortController().signal, fetcher)).rejects.toThrow(
      `${SAYING_ROUTE_RESPONSE_LIMIT_BYTES}-byte response limit`,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("streams and rejects oversized POST responses without exposing provider output", async () => {
    const privateSentinel = "PRIVATE-OVERSIZED-PROVIDER-OUTPUT";
    const fetcher = vi.fn<SayingFetch>(
      async () =>
        new Response(privateSentinel.padEnd(SAYING_ROUTE_RESPONSE_LIMIT_BYTES + 1, "x"), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const provider = createLiveSayingProvider({
      acknowledgedFingerprint: () => SAYING_DISCLOSURE_FINGERPRINT,
      canonicalUserMessage: () => buildSayingDisclosureReview(promptInput).canonicalUserMessage,
      fetcher,
    });

    let visible = "";
    try {
      await provider.propose({ requestId: 4, promptInput, signal: new AbortController().signal });
    } catch (error) {
      visible = error instanceof Error ? error.message : String(error);
    }
    expect(visible).toContain(`${SAYING_ROUTE_RESPONSE_LIMIT_BYTES}-byte response limit`);
    expect(visible).not.toContain(privateSentinel);
  });

  it("requires the JSON media type before inspecting a live response", async () => {
    const fetcher = vi.fn<SayingFetch>(
      async () =>
        new Response(JSON.stringify(SAYING_DISCLOSURE), {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
    );

    await expect(fetchSayingDisclosure(new AbortController().signal, fetcher)).rejects.toThrow(
      "expected application/json",
    );
  });

  it("translates disclosure network and redirect failures into a stable same-origin error", async () => {
    const privateSentinel = "browser-specific disclosure failure";
    const fetcher = vi.fn<SayingFetch>(async () => {
      throw new TypeError(privateSentinel);
    });

    let visible = "";
    try {
      await fetchSayingDisclosure(new AbortController().signal, fetcher);
    } catch (error) {
      visible = error instanceof Error ? error.message : String(error);
    }
    expect(visible).toBe(
      "Saying disclosure could not reach the same-origin Badge saying service; restart the local Badge site and retry.",
    );
    expect(visible).not.toContain(privateSentinel);
  });

  it("translates generation network and redirect failures without exposing engine details", async () => {
    const privateSentinel = "redirect blocked by browser engine";
    const fetcher = vi.fn<SayingFetch>(async () => {
      throw new TypeError(privateSentinel);
    });
    const provider = createLiveSayingProvider({
      acknowledgedFingerprint: () => SAYING_DISCLOSURE_FINGERPRINT,
      canonicalUserMessage: () => buildSayingDisclosureReview(promptInput).canonicalUserMessage,
      fetcher,
    });

    let visible = "";
    try {
      await provider.propose({ requestId: 5, promptInput, signal: new AbortController().signal });
    } catch (error) {
      visible = error instanceof Error ? error.message : String(error);
    }
    expect(visible).toBe(
      "Saying generation could not reach the same-origin Badge saying service; restart the local Badge site and retry.",
    );
    expect(visible).not.toContain(privateSentinel);
  });

  it("rejects an error code whose protocol status does not match", async () => {
    const fetcher = vi.fn<SayingFetch>(async () =>
      jsonResponse({ error: { code: "PROVIDER_UNAVAILABLE", message: "Claude Code is unavailable." } }, 502),
    );
    const provider = createLiveSayingProvider({
      acknowledgedFingerprint: () => SAYING_DISCLOSURE_FINGERPRINT,
      canonicalUserMessage: () => buildSayingDisclosureReview(promptInput).canonicalUserMessage,
      fetcher,
    });

    await expect(
      provider.propose({ requestId: 7, promptInput, signal: new AbortController().signal }),
    ).rejects.toThrow("does not match HTTP 502");
  });

  it("rejects provenance that is not pinned to the disclosed Claude provider and model", async () => {
    const fetcher = vi.fn<SayingFetch>(async () =>
      jsonResponse({
        response: { saying: "Worth every switchback." },
        provenance: {
          provider: "another-provider",
          model: "another-model",
          promptVersion: SAYING_PROMPT_VERSION,
          generatedAt: "2026-08-23T22:00:00.000Z",
        },
      }),
    );
    const provider = createLiveSayingProvider({
      acknowledgedFingerprint: () => SAYING_DISCLOSURE_FINGERPRINT,
      canonicalUserMessage: () => buildSayingDisclosureReview(promptInput).canonicalUserMessage,
      fetcher,
    });

    await expect(
      provider.propose({ requestId: 8, promptInput, signal: new AbortController().signal }),
    ).rejects.toThrow("invalid bounded response");
  });
});
