import {
  canonicalJsonBytes,
  packManifestSchema,
  packObjectEntrySchema,
  sha256Hex,
  validatePublishedPackPng,
  type PackManifest,
  type PackObjectEntry,
  type PackObjectMimeType,
  type PackObjectRole,
  type PackRef,
  type Sha256Digest,
} from "@badge/pack-contract";
import { zipSync, type Zippable } from "fflate";

export interface CompilePackObject {
  readonly hash: Sha256Digest | string;
  readonly bytes: Uint8Array;
}

export interface CompilePackInput {
  readonly manifest: unknown;
  readonly objects: readonly CompilePackObject[];
}

export interface CompiledPack {
  readonly bytes: Uint8Array;
  readonly packRef: Readonly<PackRef>;
  readonly manifest: Readonly<PackManifest>;
}

export interface PreparePackObjectInput {
  readonly bytes: Uint8Array;
  readonly mimeType: PackObjectMimeType;
  readonly role: PackObjectRole;
  readonly width: number;
  readonly height: number;
}

export interface PreparedPackObject extends CompilePackObject {
  readonly hash: Sha256Digest;
  readonly entry: Readonly<PackObjectEntry>;
}

const FIXED_ZIP_DATE = new Date(1980, 0, 1, 0, 0, 0, 0);
const FIXED_ZIP_OPTIONS = Object.freeze({
  level: 0 as const,
  mtime: FIXED_ZIP_DATE,
  os: 0,
  attrs: 0,
});

export async function preparePackObject(input: PreparePackObjectInput): Promise<PreparedPackObject> {
  const retainedBytes = new Uint8Array(input.bytes);
  const hash = await sha256Hex(retainedBytes);
  const entry = Object.freeze(
    packObjectEntrySchema.parse({
      hash,
      mimeType: input.mimeType,
      byteLength: retainedBytes.byteLength,
      role: input.role,
      width: input.width,
      height: input.height,
    }),
  );
  validatePublishedPackPng(entry, retainedBytes);
  return Object.freeze({
    hash,
    get bytes(): Uint8Array {
      return new Uint8Array(retainedBytes);
    },
    entry,
  });
}

export async function compilePack(input: CompilePackInput): Promise<CompiledPack> {
  const manifest = packManifestSchema.parse(input.manifest);
  const providedObjects = new Map<string, Uint8Array>();

  for (const object of input.objects) {
    if (providedObjects.has(object.hash)) {
      throw new Error(`Pack compiler received object ${object.hash} more than once.`);
    }
    providedObjects.set(object.hash, new Uint8Array(object.bytes));
  }

  if (providedObjects.size !== manifest.objects.length) {
    throw new Error(
      `Pack compiler received ${providedObjects.size} objects but manifest.json declares ${manifest.objects.length}.`,
    );
  }

  const zipEntries: Zippable = {};
  zipEntries["manifest.json"] = [canonicalJsonBytes(manifest), FIXED_ZIP_OPTIONS];

  for (const entry of manifest.objects) {
    const bytes = providedObjects.get(entry.hash);
    if (bytes === undefined) {
      throw new Error(`Pack compiler is missing declared object ${entry.hash}.`);
    }
    if (bytes.byteLength !== entry.byteLength) {
      throw new Error(
        `Pack object ${entry.hash} is ${bytes.byteLength} bytes, not declared ${entry.byteLength}.`,
      );
    }
    const actualHash = await sha256Hex(bytes);
    if (actualHash !== entry.hash) {
      throw new Error(
        `Pack object hash mismatch: manifest declares ${entry.hash}, but the bytes hash to ${actualHash}.`,
      );
    }
    validatePublishedPackPng(entry, bytes);
    zipEntries[`objects/${entry.hash}`] = [bytes, FIXED_ZIP_OPTIONS];
  }

  const retainedBytes = zipSync(zipEntries, FIXED_ZIP_OPTIONS);
  const packDigest = await sha256Hex(retainedBytes);
  const packRef = Object.freeze({
    packId: manifest.packId,
    version: manifest.version,
    packDigest,
  });

  return Object.freeze({
    get bytes(): Uint8Array {
      return new Uint8Array(retainedBytes);
    },
    packRef,
    manifest: deepFreeze(manifest),
  });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}
