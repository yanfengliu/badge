import { archiveStateSchema, sha256Schema, type ArchiveState } from "@badge/archive-domain";
import { canonicalJsonBytes, sha256Hex } from "@badge/pack-contract";
import { z } from "zod";

import { MAX_ARCHIVE_BACKUP_STATE_BYTES, requiredEarnedSourceHashes } from "./backup-state.js";
import { ArchivePersistenceError } from "./errors.js";
import {
  MAX_ARCHIVE_SOURCE_ASSET_BYTES,
  MAX_ARCHIVE_SOURCE_ASSET_COUNT,
  MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES,
  archiveSourceMimeTypeSchema,
  copySourceAsset,
  preflightSourceAssetInputs,
  validateSourceAssetWithImageBudget,
  type ArchiveSourceAsset,
  type ArchiveSourceAssetInput,
} from "./source-assets.js";

export { MAX_ARCHIVE_BACKUP_STATE_BYTES } from "./backup-state.js";
export {
  archiveRecoveryEvidenceSchema,
  archiveRecoveryReasonCodeSchema,
  createArchiveRecoveryEvidence,
} from "./recovery-evidence.js";
export type { ArchiveRecoveryEvidence, ArchiveRecoveryReasonCode } from "./recovery-evidence.js";

const BACKUP_MAGIC = new TextEncoder().encode("BADGEARCHIVE\u0002");
const MANIFEST_DIGEST_BYTES = 32;
const BACKUP_HEADER_BYTES = BACKUP_MAGIC.byteLength + 4 + MANIFEST_DIGEST_BYTES;
const MAX_BACKUP_MANIFEST_BYTES = 512 * 1024;
// An absolute cap on the summed declared decode size of a backup's sources. It never refuses
// an honestly collected full catalogue — 350 seeded badges at 896×896 RGBA decode to about
// 1,072 MiB — while still bounding the total decode a hostile backup can claim; per-asset
// amplification is separately bounded by the 64 MiB per-image decode cap and the 8192px
// dimension ceiling, not by any per-asset encoded-to-decoded ratio.
export const MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_ARCHIVE_BACKUP_BYTES =
  BACKUP_HEADER_BYTES +
  MAX_BACKUP_MANIFEST_BYTES +
  MAX_ARCHIVE_BACKUP_STATE_BYTES +
  MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES;

const legacyArchiveBackupSchema = z
  .object({
    format: z.literal("badgearchive"),
    backupVersion: z.literal(1),
    exportedAt: z.string().datetime({ offset: true }),
    state: archiveStateSchema,
  })
  .strict();

const backupObjectEntrySchema = z
  .object({
    hash: sha256Schema,
    mimeType: archiveSourceMimeTypeSchema,
    byteLength: z.number().int().positive().max(MAX_ARCHIVE_SOURCE_ASSET_BYTES),
  })
  .strict();

const archiveBackupV2ManifestSchema = z
  .object({
    format: z.literal("badgearchive"),
    backupVersion: z.literal(2),
    exportedAt: z.string().datetime({ offset: true }),
    state: z
      .object({
        byteLength: z.number().int().positive().max(MAX_ARCHIVE_BACKUP_STATE_BYTES),
        sha256: sha256Schema,
      })
      .strict(),
    sourceAssets: z.array(backupObjectEntrySchema).max(MAX_ARCHIVE_SOURCE_ASSET_COUNT),
  })
  .strict()
  .superRefine((manifest, context) => {
    let priorHash = "";
    let totalBytes = 0;
    manifest.sourceAssets.forEach((asset, index) => {
      if (asset.hash <= priorHash) {
        context.addIssue({
          code: "custom",
          path: ["sourceAssets", index, "hash"],
          message: "Source asset hashes must be unique and sorted.",
        });
      }
      priorHash = asset.hash;
      totalBytes += asset.byteLength;
    });
    if (totalBytes > MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES) {
      context.addIssue({
        code: "custom",
        path: ["sourceAssets"],
        message: `Source assets exceed the ${MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES}-byte backup limit.`,
      });
    }
  });

export const archiveBackupSchema = z.union([legacyArchiveBackupSchema, archiveBackupV2ManifestSchema]);
export type ArchiveBackupManifest = z.infer<typeof archiveBackupV2ManifestSchema>;

export interface ArchiveBackup {
  readonly format: "badgearchive";
  readonly backupVersion: 1 | 2;
  readonly exportedAt: string;
  readonly state: ArchiveState;
  readonly sourceAssets: readonly ArchiveSourceAsset[];
}

const textDecoder = new TextDecoder("utf-8", { fatal: true });

function invalidBackup(message: string, cause?: unknown): ArchivePersistenceError {
  return new ArchivePersistenceError(
    "BACKUP_INVALID",
    `${message} No Archive data was changed.`,
    cause === undefined ? undefined : { cause },
  );
}

function assertBackupClosure(state: ArchiveState, sourceAssets: readonly { readonly hash: string }[]): void {
  const required = requiredEarnedSourceHashes(state);
  const supplied = sourceAssets.map((asset) => asset.hash).sort();
  const missing = required.find((hash) => !supplied.includes(hash));
  if (missing) {
    throw new ArchivePersistenceError(
      "BACKUP_INCOMPLETE",
      `Archive backup is missing source ${missing} required by an earned record; export again from an Archive that can render that memory. No Archive data was changed.`,
    );
  }
  const extra = supplied.find((hash) => !required.includes(hash));
  if (extra) {
    throw new ArchivePersistenceError(
      "BACKUP_INVALID",
      `Archive backup contains unreferenced source ${extra}; export a closed backup containing only earned visual sources. No Archive data was changed.`,
    );
  }
  if (new Set(supplied).size !== supplied.length) {
    throw invalidBackup("Archive backup repeats a source hash; export it again.");
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

function concatenate(parts: readonly Uint8Array[], totalBytes: number): Uint8Array {
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function digestBytes(digest: string): Uint8Array {
  return Uint8Array.from({ length: MANIFEST_DIGEST_BYTES }, (_, index) =>
    Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16),
  );
}

function digestHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function createArchiveBackup(
  untrustedState: ArchiveState,
  untrustedSourceAssets: readonly ArchiveSourceAssetInput[],
  exportedAt: string,
): Promise<Uint8Array> {
  const state = archiveStateSchema.parse(untrustedState);
  const preflightedAssets = preflightSourceAssetInputs(untrustedSourceAssets, {
    code: "BACKUP_TOO_LARGE",
    subject: "Archive backup",
    guidance: "No image was decoded or hashed and no Archive data was changed.",
  });
  assertBackupClosure(state, preflightedAssets);
  const validatedAssets: ArchiveSourceAsset[] = [];
  let totalDecodedImageBytes = 0;
  for (const asset of preflightedAssets) {
    const validated = await validateSourceAssetWithImageBudget(asset, {
      maxDecodedBytes: MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES - totalDecodedImageBytes,
      aggregateLimit: MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES,
    });
    validatedAssets.push(validated.sourceAsset);
    totalDecodedImageBytes += validated.decodedByteLength;
  }
  validatedAssets.sort((left, right) => (left.hash < right.hash ? -1 : left.hash > right.hash ? 1 : 0));
  assertBackupClosure(state, validatedAssets);

  const stateBytes = canonicalJsonBytes(state);
  if (stateBytes.byteLength === 0 || stateBytes.byteLength > MAX_ARCHIVE_BACKUP_STATE_BYTES) {
    throw new ArchivePersistenceError(
      "BACKUP_TOO_LARGE",
      `Archive state is ${stateBytes.byteLength} bytes; reduce it below ${MAX_ARCHIVE_BACKUP_STATE_BYTES} bytes before exporting.`,
    );
  }
  const manifest = archiveBackupV2ManifestSchema.parse({
    format: "badgearchive",
    backupVersion: 2,
    exportedAt,
    state: { byteLength: stateBytes.byteLength, sha256: await sha256Hex(stateBytes) },
    sourceAssets: validatedAssets.map((asset) => ({
      hash: asset.hash,
      mimeType: asset.mimeType,
      byteLength: asset.bytes.byteLength,
    })),
  });
  const manifestBytes = canonicalJsonBytes(manifest);
  if (manifestBytes.byteLength > MAX_BACKUP_MANIFEST_BYTES) {
    throw new ArchivePersistenceError(
      "BACKUP_TOO_LARGE",
      `Archive backup manifest is ${manifestBytes.byteLength} bytes; keep it below ${MAX_BACKUP_MANIFEST_BYTES} bytes.`,
    );
  }

  const totalBytes =
    BACKUP_HEADER_BYTES +
    manifestBytes.byteLength +
    stateBytes.byteLength +
    validatedAssets.reduce((total, asset) => total + asset.bytes.byteLength, 0);
  if (totalBytes > MAX_ARCHIVE_BACKUP_BYTES) {
    throw new ArchivePersistenceError(
      "BACKUP_TOO_LARGE",
      `Archive backup is ${totalBytes} bytes; keep it below ${MAX_ARCHIVE_BACKUP_BYTES} bytes.`,
    );
  }
  const header = new Uint8Array(BACKUP_HEADER_BYTES);
  header.set(BACKUP_MAGIC);
  new DataView(header.buffer).setUint32(BACKUP_MAGIC.byteLength, manifestBytes.byteLength, true);
  header.set(digestBytes(await sha256Hex(manifestBytes)), BACKUP_MAGIC.byteLength + 4);
  return concatenate(
    [header, manifestBytes, stateBytes, ...validatedAssets.map((asset) => asset.bytes)],
    totalBytes,
  );
}

function parseJson(bytes: Uint8Array, subject: string): unknown {
  let decoded: string;
  try {
    decoded = textDecoder.decode(bytes);
  } catch (error) {
    throw new ArchivePersistenceError(
      "BACKUP_INVALID_JSON",
      `${subject} is not valid UTF-8 JSON; choose an intact .badgearchive file.`,
      { cause: error },
    );
  }
  try {
    return JSON.parse(decoded);
  } catch (error) {
    throw new ArchivePersistenceError(
      "BACKUP_INVALID_JSON",
      `${subject} is not valid JSON; choose an intact .badgearchive file.`,
      { cause: error },
    );
  }
}

function canonicalArchiveStateBytes(rawState: unknown, state: ArchiveState): Uint8Array {
  const rawRecords =
    typeof rawState === "object" &&
    rawState !== null &&
    "records" in rawState &&
    Array.isArray(rawState.records)
      ? rawState.records
      : [];
  const isTokenlessLegacyState =
    rawRecords.length === state.records.length &&
    rawRecords.every(
      (record) =>
        typeof record === "object" &&
        record !== null &&
        !Object.prototype.hasOwnProperty.call(record, "quotationRevision"),
    );
  if (!isTokenlessLegacyState) return canonicalJsonBytes(state);
  return canonicalJsonBytes({
    ...state,
    records: state.records.map((record) =>
      Object.fromEntries(Object.entries(record).filter(([key]) => key !== "quotationRevision")),
    ),
  });
}

function parseLegacyBackup(bytes: Uint8Array): ArchiveBackup {
  const parsed = legacyArchiveBackupSchema.safeParse(parseJson(bytes, "Archive backup"));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw invalidBackup(
      `Archive backup is incompatible at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "validation failed"}.`,
      parsed.error,
    );
  }
  if (requiredEarnedSourceHashes(parsed.data.state).length > 0) {
    throw new ArchivePersistenceError(
      "BACKUP_INCOMPLETE",
      "Archive backup version 1 contains earned records but no immutable source bytes; use the original Archive to export a version 2 backup before restoring. No Archive data was changed.",
    );
  }
  return { ...parsed.data, sourceAssets: [] };
}

function hasBinaryMagic(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= BACKUP_MAGIC.byteLength &&
    BACKUP_MAGIC.every((value, index) => bytes[index] === value)
  );
}

export async function parseArchiveBackup(bytes: Uint8Array | string): Promise<ArchiveBackup> {
  const input = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  if (input.byteLength === 0 || input.byteLength > MAX_ARCHIVE_BACKUP_BYTES) {
    throw new ArchivePersistenceError(
      "BACKUP_TOO_LARGE",
      `Archive backup is ${input.byteLength} bytes; choose a non-empty file no larger than ${MAX_ARCHIVE_BACKUP_BYTES} bytes. No Archive data was changed.`,
    );
  }
  if (!hasBinaryMagic(input)) {
    if (input.byteLength > MAX_ARCHIVE_BACKUP_STATE_BYTES) {
      throw new ArchivePersistenceError(
        "BACKUP_TOO_LARGE",
        `Legacy Archive backup is ${input.byteLength} bytes; choose a state-only version 1 file no larger than ${MAX_ARCHIVE_BACKUP_STATE_BYTES} bytes. It was not decoded as JSON and no Archive data was changed.`,
      );
    }
    return parseLegacyBackup(input);
  }
  if (input.byteLength < BACKUP_HEADER_BYTES) throw invalidBackup("Archive backup header is truncated.");

  const manifestLength = new DataView(input.buffer, input.byteOffset, input.byteLength).getUint32(
    BACKUP_MAGIC.byteLength,
    true,
  );
  if (manifestLength === 0 || manifestLength > MAX_BACKUP_MANIFEST_BYTES) {
    throw invalidBackup(
      `Archive backup manifest is ${manifestLength} bytes; expected 1–${MAX_BACKUP_MANIFEST_BYTES} bytes.`,
    );
  }
  const manifestEnd = BACKUP_HEADER_BYTES + manifestLength;
  if (manifestEnd > input.byteLength) throw invalidBackup("Archive backup manifest is truncated.");
  const manifestBytes = input.slice(BACKUP_HEADER_BYTES, manifestEnd);
  const expectedManifestDigest = digestHex(input.slice(BACKUP_MAGIC.byteLength + 4, BACKUP_HEADER_BYTES));
  const actualManifestDigest = await sha256Hex(manifestBytes);
  if (actualManifestDigest !== expectedManifestDigest) {
    throw new ArchivePersistenceError(
      "BACKUP_CHECKSUM_MISMATCH",
      `Archive backup manifest hashes to ${actualManifestDigest}, not ${expectedManifestDigest}; choose an intact .badgearchive file. No Archive data was changed.`,
    );
  }
  const manifestResult = archiveBackupV2ManifestSchema.safeParse(
    parseJson(manifestBytes, "Archive backup manifest"),
  );
  if (!manifestResult.success) {
    const issue = manifestResult.error.issues[0];
    throw invalidBackup(
      `Archive backup manifest is incompatible at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "validation failed"}.`,
      manifestResult.error,
    );
  }
  const manifest = manifestResult.data;
  if (!sameBytes(manifestBytes, canonicalJsonBytes(manifest))) {
    throw invalidBackup("Archive backup manifest is not canonical; export it again from Badge Archive.");
  }

  const stateEnd = manifestEnd + manifest.state.byteLength;
  if (stateEnd > input.byteLength) throw invalidBackup("Archive backup state payload is truncated.");
  const stateBytes = input.slice(manifestEnd, stateEnd);
  if ((await sha256Hex(stateBytes)) !== manifest.state.sha256) {
    throw new ArchivePersistenceError(
      "BACKUP_CHECKSUM_MISMATCH",
      `Archive backup state checksum does not match ${manifest.state.sha256}; choose an intact .badgearchive file. No Archive data was changed.`,
    );
  }
  const rawState = parseJson(stateBytes, "Archive backup state");
  const stateResult = archiveStateSchema.safeParse(rawState);
  if (!stateResult.success) {
    const issue = stateResult.error.issues[0];
    throw invalidBackup(
      `Archive backup state is incompatible at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "validation failed"}.`,
      stateResult.error,
    );
  }
  if (!sameBytes(stateBytes, canonicalArchiveStateBytes(rawState, stateResult.data))) {
    throw invalidBackup("Archive backup state is not canonical; export it again from Badge Archive.");
  }

  assertBackupClosure(stateResult.data, manifest.sourceAssets);

  let offset = stateEnd;
  const sourceAssets: ArchiveSourceAsset[] = [];
  let totalDecodedImageBytes = 0;
  for (const entry of manifest.sourceAssets) {
    const end = offset + entry.byteLength;
    if (end > input.byteLength) throw invalidBackup(`Archive source ${entry.hash} is truncated.`);
    const sourceBytes = input.slice(offset, end);
    const actualHash = await sha256Hex(sourceBytes);
    if (actualHash !== entry.hash) {
      throw new ArchivePersistenceError(
        "BACKUP_CHECKSUM_MISMATCH",
        `Archive source ${entry.hash} hashes to ${actualHash}; choose an intact .badgearchive file. No Archive data was changed.`,
      );
    }
    try {
      const validated = await validateSourceAssetWithImageBudget(
        {
          hash: entry.hash,
          mimeType: entry.mimeType,
          bytes: sourceBytes,
        },
        {
          maxDecodedBytes: MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES - totalDecodedImageBytes,
          aggregateLimit: MAX_ARCHIVE_BACKUP_TOTAL_DECODED_IMAGE_BYTES,
        },
      );
      sourceAssets.push(validated.sourceAsset);
      totalDecodedImageBytes += validated.decodedByteLength;
    } catch (error) {
      if (!(error instanceof ArchivePersistenceError)) throw error;
      const detail = error.message.replace("the pack aggregate", "the Archive backup aggregate");
      throw invalidBackup(
        `Archive backup source ${entry.hash} failed durable image validation: ${detail}`,
        error,
      );
    }
    offset = end;
  }
  if (offset !== input.byteLength) throw invalidBackup("Archive backup has undeclared trailing bytes.");
  assertBackupClosure(stateResult.data, sourceAssets);
  return {
    format: "badgearchive",
    backupVersion: 2,
    exportedAt: manifest.exportedAt,
    state: stateResult.data,
    sourceAssets: sourceAssets.map(copySourceAsset),
  };
}
