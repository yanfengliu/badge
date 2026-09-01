import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  auditQuotationSourceRecords,
  groupQuotationSources,
  normalizeQuotationSourceText,
  quotationSourceCachePath,
} from "./audit-catalogue-quotation-sources.mjs";

const temporaryRoots = [];

async function temporaryCache() {
  const root = await mkdtemp(path.join(tmpdir(), "badge-quotation-source-audit-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function record({
  definitionId = "visited-example",
  quotationId = "historic-quotation/example",
  slot = 1,
  sourceSha256,
  sourceUrl = "https://example.com/source.txt",
  text = "Exact words survive across whitespace.",
} = {}) {
  return { definitionId, quotationId, slot, sourceSha256, sourceUrl, text };
}

describe("catalogue quotation source auditor", () => {
  it("normalizes only a leading BOM and whitespace for exact containment", () => {
    expect(normalizeQuotationSourceText("\uFEFF  Exact\r\n words\t survive.  ")).toBe("Exact words survive.");
    expect(normalizeQuotationSourceText("EXACT words survive.")).not.toBe(
      normalizeQuotationSourceText("Exact words survive."),
    );
    expect(normalizeQuotationSourceText("Exact words survive!")).not.toBe(
      normalizeQuotationSourceText("Exact words survive."),
    );
  });

  it("downloads each unique source once, writes an ignored cache entry, and replays offline", async () => {
    const cacheDirectory = await temporaryCache();
    const bytes = Buffer.from(
      "\uFEFFHeading\nExact words survive across whitespace.\nA second quotation is here.",
      "utf8",
    );
    const sourceSha256 = sha256(bytes);
    const records = [
      record({ sourceSha256 }),
      record({
        definitionId: "read-example",
        quotationId: "historic-quotation/second",
        slot: 2,
        sourceSha256,
        text: "A second quotation is here.",
      }),
    ];
    const fetchImpl = vi.fn(async () => new globalThis.Response(bytes, { status: 200 }));

    const first = await auditQuotationSourceRecords(records, { cacheDirectory, fetchImpl });
    expect(first).toMatchObject({
      sourceCount: 1,
      quotationCount: 2,
      cacheHits: 0,
      downloads: 1,
      cacheRefreshes: 0,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const cachePath = quotationSourceCachePath(cacheDirectory, records[0].sourceUrl, sourceSha256);
    expect(await readFile(cachePath)).toEqual(bytes);

    const second = await auditQuotationSourceRecords(records, {
      allowNetwork: false,
      cacheDirectory,
      fetchImpl: vi.fn(() => {
        throw new Error("offline audit must not fetch");
      }),
    });
    expect(second).toMatchObject({
      sourceCount: 1,
      quotationCount: 2,
      cacheHits: 1,
      downloads: 0,
      cacheRefreshes: 0,
    });
  });

  it("repairs a corrupt cache only from a hash-matching network response", async () => {
    const cacheDirectory = await temporaryCache();
    const bytes = Buffer.from("Exact words survive across whitespace.", "utf8");
    const sourceSha256 = sha256(bytes);
    const input = record({ sourceSha256 });
    const cachePath = quotationSourceCachePath(cacheDirectory, input.sourceUrl, sourceSha256);
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(cachePath, "corrupt cache bytes", "utf8");

    const summary = await auditQuotationSourceRecords([input], {
      cacheDirectory,
      fetchImpl: vi.fn(async () => new globalThis.Response(bytes, { status: 200 })),
    });

    expect(summary).toMatchObject({ cacheHits: 0, downloads: 1, cacheRefreshes: 1 });
    expect(await readFile(cachePath)).toEqual(bytes);
  });

  it("fails actionably when downloaded bytes do not match the tracked hash", async () => {
    const cacheDirectory = await temporaryCache();
    const expected = Buffer.from("Exact words survive across whitespace.", "utf8");
    const changed = Buffer.from("Upstream text changed.", "utf8");
    const sourceSha256 = sha256(expected);

    await expect(
      auditQuotationSourceRecords([record({ sourceSha256 })], {
        cacheDirectory,
        fetchImpl: vi.fn(async () => new globalThis.Response(changed, { status: 200 })),
      }),
    ).rejects.toThrow(
      `hashes to ${sha256(changed)}, not tracked ${sourceSha256}. The upstream bytes changed; re-curate every associated quotation`,
    );
  });

  it("fails actionably when exact text is absent after whitespace normalization", async () => {
    const cacheDirectory = await temporaryCache();
    const bytes = Buffer.from("This source contains different punctuation!", "utf8");
    const sourceSha256 = sha256(bytes);

    await expect(
      auditQuotationSourceRecords([record({ sourceSha256 })], {
        cacheDirectory,
        fetchImpl: vi.fn(async () => new globalThis.Response(bytes, { status: 200 })),
      }),
    ).rejects.toThrow(
      "Quotation historic-quotation/example for visited-example slot 1 is absent from exact source https://example.com/source.txt after whitespace-only normalization",
    );
  });

  it("rejects conflicting byte pins for one source URL before reading or downloading", () => {
    const firstHash = "a".repeat(64);
    const secondHash = "b".repeat(64);
    expect(() =>
      groupQuotationSources([
        record({ sourceSha256: firstHash }),
        record({
          definitionId: "read-example",
          quotationId: "historic-quotation/second",
          slot: 2,
          sourceSha256: secondHash,
        }),
      ]),
    ).toThrow(`is pinned to both ${firstHash} and ${secondHash}`);
  });

  it("explains how an offline caller can repair a missing or corrupt cache", async () => {
    const cacheDirectory = await temporaryCache();
    const bytes = Buffer.from("Exact words survive across whitespace.", "utf8");
    const sourceSha256 = sha256(bytes);
    const input = record({ sourceSha256 });

    await expect(
      auditQuotationSourceRecords([input], { allowNetwork: false, cacheDirectory }),
    ).rejects.toThrow("--offline forbids download. Populate the cache with a network-enabled audit first.");

    const cachePath = quotationSourceCachePath(cacheDirectory, input.sourceUrl, sourceSha256);
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(cachePath, "corrupt", "utf8");
    await expect(
      auditQuotationSourceRecords([input], { allowNetwork: false, cacheDirectory }),
    ).rejects.toThrow("Delete or repair that cache entry, or rerun without --offline to refresh it.");
  });

  it("rejects an HTTPS source that redirects to an insecure final URL", async () => {
    const cacheDirectory = await temporaryCache();
    const bytes = Buffer.from("Exact words survive across whitespace.", "utf8");
    const sourceSha256 = sha256(bytes);
    const response = {
      arrayBuffer: async () => bytes,
      headers: new globalThis.Headers(),
      ok: true,
      status: 200,
      statusText: "OK",
      url: "http://example.com/source.txt",
    };

    await expect(
      auditQuotationSourceRecords([record({ sourceSha256 })], {
        cacheDirectory,
        fetchImpl: vi.fn(async () => response),
      }),
    ).rejects.toThrow("Final quotation source URL for https://example.com/source.txt must use HTTPS");
  });

  it("rejects hash-matching source bytes that are not valid UTF-8", async () => {
    const cacheDirectory = await temporaryCache();
    const bytes = Buffer.from([0xff, 0xfe, 0xfd]);
    const sourceSha256 = sha256(bytes);

    await expect(
      auditQuotationSourceRecords([record({ sourceSha256 })], {
        cacheDirectory,
        fetchImpl: vi.fn(async () => new globalThis.Response(bytes, { status: 200 })),
      }),
    ).rejects.toThrow(
      "Quotation source https://example.com/source.txt is not valid UTF-8; choose an exact UTF-8 source before auditing containment.",
    );
  });

  it("rejects a source that exceeds the configured byte ceiling", async () => {
    const cacheDirectory = await temporaryCache();
    const bytes = Buffer.from("Exact words survive across whitespace.", "utf8");
    const sourceSha256 = sha256(bytes);

    await expect(
      auditQuotationSourceRecords([record({ sourceSha256 })], {
        cacheDirectory,
        fetchImpl: vi.fn(
          async () =>
            new globalThis.Response(bytes, {
              headers: { "content-length": String(bytes.byteLength) },
              status: 200,
            }),
        ),
        maxSourceBytes: bytes.byteLength - 1,
      }),
    ).rejects.toThrow(
      `declares ${bytes.byteLength} bytes, above the ${bytes.byteLength - 1}-byte audit ceiling`,
    );
  });
});
