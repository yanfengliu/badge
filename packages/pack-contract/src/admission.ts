import { unzipSync } from "fflate";

import { canonicalJsonBytes } from "./canonical-json.ts";
import { sha256Hex } from "./hash.ts";
import { copyingReadonlyMap, deepFreeze } from "./immutable-results.ts";
import { binaryCrc32, validatePublishedPackPng } from "./published-png.ts";
import { packManifestSchema, type PackManifest, type PackObjectEntry, type PackRef } from "./schema.ts";
import { inspectCanonicalZip } from "./zip-structure.ts";

const admittedPackBrand: unique symbol = Symbol("AdmittedPack");

export type PackAdmissionErrorCode =
  "invalid-container" | "invalid-manifest" | "object-mismatch" | "limit-exceeded";

export class PackAdmissionError extends Error {
  readonly code: PackAdmissionErrorCode;

  constructor(code: PackAdmissionErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PackAdmissionError";
    this.code = code;
  }
}

export interface PackAdmissionOptions {
  readonly maxPackBytes?: number;
  readonly maxEntries?: number;
  readonly maxObjectBytes?: number;
  readonly maxTotalObjectBytes?: number;
  readonly maxTotalDecodedImageBytes?: number;
}

export interface AdmittedPack {
  readonly packRef: Readonly<PackRef>;
  readonly manifest: Readonly<PackManifest>;
  readonly objects: ReadonlyMap<string, Uint8Array>;
  readonly [admittedPackBrand]: true;
}

const DEFAULT_MAX_PACK_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_ENTRIES = 1_025;
const DEFAULT_MAX_OBJECT_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_OBJECT_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_DECODED_IMAGE_BYTES = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

export async function admitPack(
  inputBytes: Uint8Array,
  options: PackAdmissionOptions = {},
): Promise<AdmittedPack> {
  const bytes = new Uint8Array(inputBytes);
  const maxPackBytes = options.maxPackBytes ?? DEFAULT_MAX_PACK_BYTES;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const maxObjectBytes = options.maxObjectBytes ?? DEFAULT_MAX_OBJECT_BYTES;
  const maxTotalObjectBytes = options.maxTotalObjectBytes ?? DEFAULT_MAX_TOTAL_OBJECT_BYTES;
  const maxTotalDecodedImageBytes =
    options.maxTotalDecodedImageBytes ?? DEFAULT_MAX_TOTAL_DECODED_IMAGE_BYTES;

  if (!Number.isSafeInteger(maxTotalDecodedImageBytes) || maxTotalDecodedImageBytes <= 0) {
    throw new PackAdmissionError(
      "limit-exceeded",
      `Pack decoded-image aggregate limit ${maxTotalDecodedImageBytes} must be a positive safe integer number of bytes.`,
    );
  }

  if (bytes.byteLength === 0 || bytes.byteLength > maxPackBytes) {
    throw new PackAdmissionError(
      "limit-exceeded",
      `Pack input is ${bytes.byteLength} bytes; provide a non-empty pack no larger than ${maxPackBytes} bytes.`,
    );
  }

  let inspectedEntries;
  try {
    inspectedEntries = inspectCanonicalZip(bytes, {
      maxEntries,
      maxTotalUncompressedBytes: maxTotalObjectBytes + MAX_MANIFEST_BYTES,
    });
  } catch (error) {
    throw new PackAdmissionError(
      "invalid-container",
      `Pack ZIP container is invalid: ${errorMessage(error)}`,
      { cause: error },
    );
  }

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes);
  } catch (error) {
    throw new PackAdmissionError(
      "invalid-container",
      `Pack ZIP entries could not be read: ${errorMessage(error)}`,
      { cause: error },
    );
  }

  const inspectedNames = inspectedEntries.map((entry) => entry.name);
  if (!sameStrings(Object.keys(unzipped), inspectedNames)) {
    throw new PackAdmissionError(
      "invalid-container",
      "Pack ZIP entry table disagrees with the extracted entry set; rebuild the pack.",
    );
  }
  inspectedEntries.forEach((entry) => {
    const entryBytes = unzipped[entry.name];
    if (entryBytes === undefined || binaryCrc32(entryBytes) !== entry.crc32) {
      throw new PackAdmissionError(
        "invalid-container",
        `Pack ZIP entry ${entry.name} has an invalid CRC; rebuild the pack from authoritative bytes.`,
      );
    }
  });

  const manifestBytes = unzipped["manifest.json"];
  if (manifestBytes === undefined || manifestBytes.byteLength > MAX_MANIFEST_BYTES) {
    throw new PackAdmissionError(
      "limit-exceeded",
      `manifest.json is missing or exceeds ${MAX_MANIFEST_BYTES} bytes.`,
    );
  }
  if (manifestBytes[0] === 0xef && manifestBytes[1] === 0xbb && manifestBytes[2] === 0xbf) {
    throw new PackAdmissionError("invalid-manifest", "manifest.json must not contain a UTF-8 BOM.");
  }

  const manifest = parseManifest(manifestBytes);
  const canonicalBytes = canonicalJsonBytes(manifest);
  if (!sameBytes(manifestBytes, canonicalBytes)) {
    throw new PackAdmissionError(
      "invalid-manifest",
      "manifest.json is valid data but not canonical JSON; publish it with the canonical compiler.",
    );
  }

  const expectedObjectPaths = manifest.objects.map((object) => `objects/${object.hash}`);
  if (!sameStrings(inspectedNames.slice(1), expectedObjectPaths)) {
    throw new PackAdmissionError(
      "object-mismatch",
      "Pack object entries do not exactly match the ordered manifest object table.",
    );
  }

  const admittedObjects = new Map<string, Uint8Array>();
  let totalObjectBytes = 0;
  let totalDecodedImageBytes = 0;
  for (const object of manifest.objects) {
    const objectBytes = unzipped[`objects/${object.hash}`];
    if (objectBytes === undefined) {
      throw new PackAdmissionError(
        "object-mismatch",
        `Pack object ${object.hash} is listed in the manifest but missing from the ZIP.`,
      );
    }
    if (objectBytes.byteLength > maxObjectBytes) {
      throw new PackAdmissionError(
        "limit-exceeded",
        `Pack object ${object.hash} is ${objectBytes.byteLength} bytes, above the ${maxObjectBytes}-byte limit.`,
      );
    }

    totalObjectBytes += objectBytes.byteLength;
    if (totalObjectBytes > maxTotalObjectBytes) {
      throw new PackAdmissionError(
        "limit-exceeded",
        `Pack objects total ${totalObjectBytes} bytes, above the ${maxTotalObjectBytes}-byte limit.`,
      );
    }

    const validated = await validateObject(object, objectBytes, {
      maxDecodedBytes: maxTotalDecodedImageBytes - totalDecodedImageBytes,
      aggregateLimit: maxTotalDecodedImageBytes,
    });
    totalDecodedImageBytes += validated.decodedByteLength;
    admittedObjects.set(object.hash, new Uint8Array(objectBytes));
  }

  const packDigest = await sha256Hex(bytes);
  const packRef = Object.freeze({
    packId: manifest.packId,
    version: manifest.version,
    packDigest,
  });

  return {
    packRef,
    manifest: deepFreeze(manifest),
    objects: copyingReadonlyMap(admittedObjects),
    [admittedPackBrand]: true,
  };
}

function parseManifest(bytes: Uint8Array): PackManifest {
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new PackAdmissionError(
      "invalid-manifest",
      "manifest.json is not valid UTF-8; re-export it from Badge Studio.",
      { cause: error },
    );
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(decoded) as unknown;
  } catch (error) {
    throw new PackAdmissionError(
      "invalid-manifest",
      `manifest.json is not valid JSON: ${errorMessage(error)}`,
      { cause: error },
    );
  }

  const parsed = packManifestSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const location = issue.path.length > 0 ? issue.path.join(".") : "manifest";
    const rejectedValue = valueAtPath(candidate, issue.path);
    if (issue.path.at(-1) === "mimeType" && typeof rejectedValue === "string") {
      throw new PackAdmissionError(
        "invalid-manifest",
        `manifest.json failed the closed schema at ${location}: published object MIME ${rejectedValue} is not admitted; normalize the selected pixels to metadata-free PNG (image/png) before publication.`,
        { cause: parsed.error },
      );
    }
    throw new PackAdmissionError(
      "invalid-manifest",
      `manifest.json failed the closed schema at ${location}: ${issue.message}`,
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

function valueAtPath(root: unknown, path: readonly PropertyKey[]): unknown {
  let value = root;
  for (const key of path) {
    if (value === null || typeof value !== "object") {
      return undefined;
    }
    value = (value as Record<PropertyKey, unknown>)[key];
  }
  return value;
}

async function validateObject(
  entry: PackObjectEntry,
  bytes: Uint8Array,
  limits: { readonly maxDecodedBytes: number; readonly aggregateLimit: number },
): Promise<{ readonly decodedByteLength: number }> {
  if (bytes.byteLength !== entry.byteLength) {
    throw new PackAdmissionError(
      "object-mismatch",
      `Pack object ${entry.hash} is ${bytes.byteLength} bytes but manifest.json declares ${entry.byteLength}.`,
    );
  }
  const actualHash = await sha256Hex(bytes);
  if (actualHash !== entry.hash) {
    throw new PackAdmissionError(
      "object-mismatch",
      `Pack object ${entry.hash} has digest ${actualHash}; rebuild the pack with the selected source bytes.`,
    );
  }
  try {
    return validatePublishedPackPng(entry, bytes, limits);
  } catch (error) {
    throw new PackAdmissionError("object-mismatch", errorMessage(error), { cause: error });
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  return left.every((byte, index) => byte === right[index]);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
