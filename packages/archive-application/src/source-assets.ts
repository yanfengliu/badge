import { sha256Schema } from "@badge/archive-domain";
import { sha256Hex } from "@badge/pack-contract";
import { z } from "zod";

import { ArchivePersistenceError, type ArchivePersistenceErrorCode } from "./errors.js";
import {
  assertStructurallyValidImage,
  SourceImageValidationError,
  type SourceImageValidationLimits,
} from "./image-structure.js";

export const MAX_ARCHIVE_SOURCE_ASSET_BYTES = 16 * 1024 * 1024;
export const MAX_ARCHIVE_SOURCE_ASSET_COUNT = 1_024;
export const MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES = 64 * 1024 * 1024;

export const archiveSourceMimeTypeSchema = z.literal("image/png", {
  error: "Durable Archive sources must use image/png.",
});
export type ArchiveSourceMimeType = z.infer<typeof archiveSourceMimeTypeSchema>;

export interface ArchiveSourceAssetInput {
  readonly hash: string;
  readonly mimeType: ArchiveSourceMimeType;
  readonly bytes: Uint8Array;
}

export interface ArchiveSourceAsset {
  readonly hash: string;
  readonly mimeType: ArchiveSourceMimeType;
  readonly bytes: Uint8Array;
}

export interface ValidatedArchiveSourceAsset {
  readonly sourceAsset: ArchiveSourceAsset;
  readonly decodedByteLength: number;
}

const archiveSourceAssetShapeSchema = z
  .object({
    hash: sha256Schema,
    mimeType: archiveSourceMimeTypeSchema,
    bytes: z.instanceof(Uint8Array),
  })
  .strict()
  .superRefine((asset, context) => {
    if (asset.bytes.byteLength === 0 || asset.bytes.byteLength > MAX_ARCHIVE_SOURCE_ASSET_BYTES) {
      context.addIssue({
        code: "custom",
        path: ["bytes"],
        message: `Source bytes must be non-empty and no larger than ${MAX_ARCHIVE_SOURCE_ASSET_BYTES} bytes.`,
      });
    }
  });

function shapeError(untrusted: unknown, storedHash?: string): ArchivePersistenceError {
  const parsed = archiveSourceAssetShapeSchema.safeParse(untrusted);
  const issue = parsed.success ? undefined : parsed.error.issues[0];
  const subject = storedHash ? `Stored Archive source ${storedHash}` : "Archive source input";
  return new ArchivePersistenceError(
    storedHash ? "VISUAL_SOURCE_UNREADABLE" : "VISUAL_SOURCE_INVALID",
    `${subject} is invalid at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "check its hash, MIME type, and bytes"}. The existing Archive data was preserved.`,
    parsed.success ? undefined : { cause: parsed.error },
  );
}

export function parseSourceAssetShape(untrusted: unknown, storedHash?: string): ArchiveSourceAsset {
  const parsed = archiveSourceAssetShapeSchema.safeParse(untrusted);
  if (!parsed.success) throw shapeError(untrusted, storedHash);
  if (storedHash !== undefined && parsed.data.hash !== storedHash) {
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_UNREADABLE",
      `Stored Archive source row ${storedHash} declares hash ${parsed.data.hash}; preserve the row and recover from an intact .badgearchive file.`,
    );
  }
  return {
    hash: parsed.data.hash,
    mimeType: parsed.data.mimeType,
    bytes: parsed.data.bytes.slice(),
  };
}

export function assertSourceAssetInputShape(untrusted: unknown): ArchiveSourceAssetInput {
  const parsed = archiveSourceAssetShapeSchema.safeParse(untrusted);
  if (!parsed.success) throw shapeError(untrusted);
  return parsed.data;
}

export function preflightSourceAssetInputs(
  untrusted: unknown,
  options: {
    readonly code: Extract<ArchivePersistenceErrorCode, "BACKUP_TOO_LARGE" | "VISUAL_SOURCE_INVALID">;
    readonly subject: string;
    readonly guidance: string;
  },
): readonly ArchiveSourceAssetInput[] {
  if (!Array.isArray(untrusted)) {
    throw new ArchivePersistenceError(
      options.code,
      `${options.subject} sources must be an array. ${options.guidance}`,
    );
  }
  if (untrusted.length > MAX_ARCHIVE_SOURCE_ASSET_COUNT) {
    throw new ArchivePersistenceError(
      options.code,
      `${options.subject} contains ${untrusted.length} source assets; keep the count at or below ${MAX_ARCHIVE_SOURCE_ASSET_COUNT}. ${options.guidance}`,
    );
  }
  let totalBytes = 0;
  const inputs: ArchiveSourceAssetInput[] = [];
  for (const candidate of untrusted) {
    const input = assertSourceAssetInputShape(candidate);
    totalBytes += input.bytes.byteLength;
    if (totalBytes > MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES) {
      throw new ArchivePersistenceError(
        options.code,
        `${options.subject} source assets total ${totalBytes} bytes; keep them at or below ${MAX_ARCHIVE_SOURCE_ASSET_TOTAL_BYTES} bytes. ${options.guidance}`,
      );
    }
    inputs.push(input);
  }
  return inputs;
}

export async function validateSourceAsset(
  untrusted: ArchiveSourceAssetInput,
  expectedHash?: string,
): Promise<ArchiveSourceAsset> {
  return (await validateSourceAssetWithImageBudget(untrusted, {}, expectedHash)).sourceAsset;
}

export async function validateSourceAssetWithImageBudget(
  untrusted: ArchiveSourceAssetInput,
  limits: SourceImageValidationLimits,
  expectedHash?: string,
): Promise<ValidatedArchiveSourceAsset> {
  const asset = parseSourceAssetShape(untrusted);
  let decodedByteLength: number;
  try {
    decodedByteLength = assertStructurallyValidImage(
      asset.mimeType,
      asset.bytes,
      asset.hash,
      limits,
    ).decodedByteLength;
  } catch (error) {
    if (!(error instanceof SourceImageValidationError)) throw error;
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_INVALID",
      `Archive source ${asset.hash} declares ${asset.mimeType}, but ${error.message}; use the exact admitted image bytes with their matching MIME label and retry. The existing Archive data was preserved.`,
      { cause: error },
    );
  }
  let actualHash: string;
  try {
    actualHash = await sha256Hex(asset.bytes);
  } catch (error) {
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_INVALID",
      `Archive source ${asset.hash} could not be hashed; use an intact admitted source image and retry.`,
      { cause: error },
    );
  }
  if (actualHash !== asset.hash || (expectedHash !== undefined && asset.hash !== expectedHash)) {
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_HASH_MISMATCH",
      `Archive source bytes hash to ${actualHash}, but activation requires ${expectedHash ?? asset.hash}; reopen the badge from its admitted visual and retry.`,
    );
  }
  return { sourceAsset: asset, decodedByteLength };
}

export async function validateStoredSourceAsset(
  untrusted: unknown,
  expectedHash: string,
): Promise<ArchiveSourceAsset> {
  const asset = parseSourceAssetShape(untrusted, expectedHash);
  try {
    assertStructurallyValidImage(asset.mimeType, asset.bytes, asset.hash);
  } catch (error) {
    if (!(error instanceof SourceImageValidationError)) throw error;
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_UNREADABLE",
      `Stored Archive source ${expectedHash} declares ${asset.mimeType}, but is not a fully valid decodable image: ${error.message}. The row was preserved; restore an intact .badgearchive backup or reinstall the exact admitted pack.`,
      { cause: error },
    );
  }
  let actualHash: string;
  try {
    actualHash = await sha256Hex(asset.bytes);
  } catch (error) {
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_UNREADABLE",
      `Stored Archive source ${expectedHash} could not be hashed; the row was preserved. Restore an intact .badgearchive backup.`,
      { cause: error },
    );
  }
  if (actualHash !== expectedHash) {
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_UNREADABLE",
      `Stored Archive source ${expectedHash} hashes to ${actualHash}; the row was preserved. Restore an intact .badgearchive backup.`,
    );
  }
  return asset;
}

export function sourceAssetsEqual(left: ArchiveSourceAsset, right: ArchiveSourceAsset): boolean {
  if (
    left.hash !== right.hash ||
    left.mimeType !== right.mimeType ||
    left.bytes.byteLength !== right.bytes.byteLength
  ) {
    return false;
  }
  return left.bytes.every((value, index) => value === right.bytes[index]);
}

export function copySourceAsset(asset: ArchiveSourceAsset): ArchiveSourceAsset {
  return { hash: asset.hash, mimeType: asset.mimeType, bytes: asset.bytes.slice() };
}
