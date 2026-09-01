import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { TextDecoder } from "node:util";

import { catalogueQuotationBanksByDefinitionId } from "@badge/catalogue-quotation-data";

export const DEFAULT_QUOTATION_SOURCE_CACHE_DIRECTORY = path.resolve("tmp/catalogue-quotation-source-cache");
export const DEFAULT_QUOTATION_SOURCE_TIMEOUT_MS = 30_000;
export const MAX_QUOTATION_SOURCE_BYTES = 16 * 1024 * 1024;

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function normalizeQuotationSourceText(value) {
  return value
    .replace(/^\uFEFF/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function quotationSourceCachePath(cacheDirectory, sourceUrl, sourceSha256) {
  const urlDigest = sha256Hex(Buffer.from(sourceUrl, "utf8")).slice(0, 16);
  return path.join(cacheDirectory, `${urlDigest}-${sourceSha256}.source`);
}

function requiredString(record, field, location) {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${location} has no nonempty ${field}; repair the tracked quotation record.`);
  }
  return value;
}

function exactHttpsUrl(value, location) {
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`${location} is not a valid URL: ${JSON.stringify(value)}.`, { cause: error });
  }
  if (url.protocol !== "https:") {
    throw new Error(`${location} must use HTTPS; found ${value}.`);
  }
}

export function groupQuotationSources(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Quotation source audit requires at least one tracked quotation record.");
  }

  const groups = new Map();
  for (const [index, record] of records.entries()) {
    const location = `Quotation record ${index + 1}`;
    if (typeof record !== "object" || record === null || Array.isArray(record)) {
      throw new Error(`${location} must be an object.`);
    }
    const definitionId = requiredString(record, "definitionId", location);
    const quotationId = requiredString(record, "quotationId", location);
    const text = requiredString(record, "text", location);
    if (record.slot !== 1 && record.slot !== 2) {
      throw new Error(`${location} (${quotationId}) must identify numeric slot 1 or 2.`);
    }
    const sourceUrl = requiredString(record, "sourceUrl", location);
    const sourceSha256 = requiredString(record, "sourceSha256", location);
    exactHttpsUrl(sourceUrl, `${location} sourceUrl`);
    if (!/^[a-f0-9]{64}$/u.test(sourceSha256)) {
      throw new Error(
        `${location} (${quotationId}) has invalid sourceSha256 ${JSON.stringify(sourceSha256)}; expected 64 lowercase hexadecimal characters.`,
      );
    }

    const previous = groups.get(sourceUrl);
    if (previous && previous.sourceSha256 !== sourceSha256) {
      throw new Error(
        `Quotation source ${sourceUrl} is pinned to both ${previous.sourceSha256} and ${sourceSha256}; make every associated record name one exact byte stream.`,
      );
    }
    const group = previous ?? { sourceUrl, sourceSha256, quotations: [] };
    group.quotations.push({ definitionId, quotationId, slot: record.slot, text });
    groups.set(sourceUrl, group);
  }

  return [...groups.values()].sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function readCachedSource(cachePath, expectedHash, sourceUrl) {
  let bytes;
  try {
    bytes = await readFile(cachePath);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return { kind: "miss" };
    throw new Error(
      `Could not read quotation source cache ${cachePath} for ${sourceUrl}: ${errorMessage(error)}. Repair its permissions or choose another --cache-dir.`,
      { cause: error },
    );
  }
  const actualHash = sha256Hex(bytes);
  if (actualHash === expectedHash) return { kind: "hit", bytes };
  return { kind: "corrupt", actualHash };
}

async function downloadSource(sourceUrl, expectedHash, fetchImpl, timeoutMs, maxSourceBytes) {
  let response;
  try {
    response = await fetchImpl(sourceUrl, {
      headers: {
        accept: "text/plain,text/html;q=0.9,*/*;q=0.1",
        "accept-encoding": "identity",
        "user-agent": "Badge quotation provenance auditor/1.0",
      },
      redirect: "follow",
      signal: globalThis.AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(
      `Could not download quotation source ${sourceUrl}: ${errorMessage(error)}. Restore its cache or retry when the source is reachable.`,
      { cause: error },
    );
  }
  if (!response || response.ok !== true || typeof response.arrayBuffer !== "function") {
    const status =
      response && Number.isInteger(response.status) ? `HTTP ${response.status}` : "an invalid response";
    const statusText = response && typeof response.statusText === "string" ? ` ${response.statusText}` : "";
    throw new Error(
      `Downloading quotation source ${sourceUrl} returned ${status}${statusText}; restore its cache or correct the tracked sourceUrl.`,
    );
  }
  if (typeof response.url === "string" && response.url !== "") {
    exactHttpsUrl(response.url, `Final quotation source URL for ${sourceUrl}`);
  }
  const declaredLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxSourceBytes) {
    throw new Error(
      `Quotation source ${sourceUrl} declares ${declaredLength} bytes, above the ${maxSourceBytes}-byte audit ceiling; review the source before raising the bound.`,
    );
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > maxSourceBytes) {
    throw new Error(
      `Quotation source ${sourceUrl} downloaded ${bytes.byteLength} bytes, above the ${maxSourceBytes}-byte audit ceiling; review the source before raising the bound.`,
    );
  }
  const actualHash = sha256Hex(bytes);
  if (actualHash !== expectedHash) {
    throw new Error(
      `Downloaded quotation source ${sourceUrl} hashes to ${actualHash}, not tracked ${expectedHash}. The upstream bytes changed; re-curate every associated quotation before updating the pin.`,
    );
  }
  return bytes;
}

async function sourceBytes(group, options) {
  const cachePath = quotationSourceCachePath(options.cacheDirectory, group.sourceUrl, group.sourceSha256);
  const cached = await readCachedSource(cachePath, group.sourceSha256, group.sourceUrl);
  if (cached.kind === "hit") return { bytes: cached.bytes, origin: "cache", cachePath };
  if (!options.allowNetwork) {
    if (cached.kind === "corrupt") {
      throw new Error(
        `Cached quotation source ${cachePath} hashes to ${cached.actualHash}, not tracked ${group.sourceSha256} for ${group.sourceUrl}. Delete or repair that cache entry, or rerun without --offline to refresh it.`,
      );
    }
    throw new Error(
      `Quotation source ${group.sourceUrl} is missing from ${cachePath}, and --offline forbids download. Populate the cache with a network-enabled audit first.`,
    );
  }

  let bytes;
  try {
    bytes = await downloadSource(
      group.sourceUrl,
      group.sourceSha256,
      options.fetchImpl,
      options.timeoutMs,
      options.maxSourceBytes,
    );
  } catch (error) {
    if (cached.kind !== "corrupt") throw error;
    throw new Error(
      `Cached quotation source ${cachePath} hashes to ${cached.actualHash}, not tracked ${group.sourceSha256}; its network refresh also failed. ${errorMessage(error)}`,
      { cause: error },
    );
  }
  try {
    await mkdir(options.cacheDirectory, { recursive: true });
    await writeFile(cachePath, bytes);
  } catch (error) {
    throw new Error(
      `Verified quotation source ${group.sourceUrl}, but could not write ignored cache ${cachePath}: ${errorMessage(error)}. Repair the cache directory or choose another --cache-dir.`,
      { cause: error },
    );
  }
  return {
    bytes,
    origin: cached.kind === "corrupt" ? "network-refresh" : "network",
    cachePath,
  };
}

function decodedSource(bytes, sourceUrl) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(
      `Quotation source ${sourceUrl} is not valid UTF-8; choose an exact UTF-8 source before auditing containment.`,
      { cause: error },
    );
  }
}

export async function auditQuotationSourceRecords(records, options = {}) {
  const cacheDirectory = path.resolve(options.cacheDirectory ?? DEFAULT_QUOTATION_SOURCE_CACHE_DIRECTORY);
  const allowNetwork = options.allowNetwork ?? true;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_QUOTATION_SOURCE_TIMEOUT_MS;
  const maxSourceBytes = options.maxSourceBytes ?? MAX_QUOTATION_SOURCE_BYTES;
  if (allowNetwork && typeof fetchImpl !== "function") {
    throw new Error("Quotation source audit needs a fetch implementation when network fallback is enabled.");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Quotation source timeout must be a positive integer; found ${timeoutMs}.`);
  }
  if (!Number.isInteger(maxSourceBytes) || maxSourceBytes <= 0) {
    throw new Error(`Quotation source byte ceiling must be a positive integer; found ${maxSourceBytes}.`);
  }

  const groups = groupQuotationSources(records);
  const summary = {
    sourceCount: groups.length,
    quotationCount: 0,
    cacheHits: 0,
    downloads: 0,
    cacheRefreshes: 0,
    cacheDirectory,
  };
  for (const group of groups) {
    const resolved = await sourceBytes(group, {
      allowNetwork,
      cacheDirectory,
      fetchImpl,
      maxSourceBytes,
      timeoutMs,
    });
    if (resolved.origin === "cache") summary.cacheHits += 1;
    else summary.downloads += 1;
    if (resolved.origin === "network-refresh") summary.cacheRefreshes += 1;
    options.onSource?.({
      sourceUrl: group.sourceUrl,
      sourceSha256: group.sourceSha256,
      quotationCount: group.quotations.length,
      origin: resolved.origin,
      cachePath: resolved.cachePath,
    });

    const normalizedSource = normalizeQuotationSourceText(decodedSource(resolved.bytes, group.sourceUrl));
    for (const quotation of group.quotations) {
      const normalizedQuotation = normalizeQuotationSourceText(quotation.text);
      if (!normalizedSource.includes(normalizedQuotation)) {
        throw new Error(
          `Quotation ${quotation.quotationId} for ${quotation.definitionId} slot ${quotation.slot} is absent from exact source ${group.sourceUrl} after whitespace-only normalization. Expected: ${JSON.stringify(normalizedQuotation)}. Re-curate the text, source URL, or source hash.`,
        );
      }
      summary.quotationCount += 1;
    }
  }
  return summary;
}

export function trackedCatalogueQuotationRecords() {
  return Object.entries(catalogueQuotationBanksByDefinitionId).flatMap(([definitionId, bank]) =>
    bank.map((quotation) => ({ definitionId, ...quotation })),
  );
}

export async function auditTrackedCatalogueQuotationSources(options = {}) {
  return auditQuotationSourceRecords(trackedCatalogueQuotationRecords(), options);
}

function parseArguments(args) {
  let cacheDirectory = DEFAULT_QUOTATION_SOURCE_CACHE_DIRECTORY;
  let allowNetwork = true;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--offline") {
      allowNetwork = false;
      continue;
    }
    if (argument === "--cache-dir") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--cache-dir requires a directory path.");
      }
      cacheDirectory = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--help") return { help: true };
    throw new Error(`Unknown argument ${JSON.stringify(argument)}; use --help for supported options.`);
  }
  return { allowNetwork, cacheDirectory, help: false };
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.help) {
    console.log(
      "Usage: npm run audit:quotation-sources -- [--offline] [--cache-dir <path>]\n\nVerifies exact source bytes and whitespace-normalized quotation containment. Cache misses download by default; --offline requires a complete valid cache.",
    );
    return;
  }
  const summary = await auditTrackedCatalogueQuotationSources({
    allowNetwork: arguments_.allowNetwork,
    cacheDirectory: arguments_.cacheDirectory,
    onSource: ({ origin, quotationCount, sourceUrl }) => {
      console.log(`${origin.padEnd(15)} ${String(quotationCount).padStart(3)} quotation(s)  ${sourceUrl}`);
    },
  });
  console.log(
    `PASS quotation source audit: ${summary.quotationCount} quotations in ${summary.sourceCount} exact sources; ${summary.cacheHits} cache hit(s), ${summary.downloads} download(s), ${summary.cacheRefreshes} repaired cache entr${summary.cacheRefreshes === 1 ? "y" : "ies"}.`,
  );
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Quotation source audit failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}
