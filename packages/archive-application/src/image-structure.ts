import { validatePublishedPackPng } from "@badge/pack-contract";

import { isJpegSignature, SourceJpegValidationError, validateArchiveSourceJpeg } from "./jpeg-structure.js";
import type { ArchiveSourceMimeType } from "./source-assets.js";

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

export interface SourceImageDimensions {
  readonly width: number;
  readonly height: number;
  readonly decodedByteLength: number;
}

export interface SourceImageValidationLimits {
  readonly maxDecodedBytes?: number;
  readonly aggregateLimit?: number;
}

export class SourceImageValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SourceImageValidationError";
  }
}

export function assertStructurallyValidImage(
  mimeType: ArchiveSourceMimeType,
  bytes: Uint8Array,
  hash: string,
  limits: SourceImageValidationLimits = {},
): SourceImageDimensions {
  const detected = detectImageMimeType(bytes);
  if (detected === undefined) {
    throw invalid("its bytes are unrecognized non-PNG, non-JPEG data");
  }
  if (detected !== mimeType) {
    throw invalid(`its signature is ${detected}`);
  }
  if (detected === "image/jpeg") {
    try {
      return validateArchiveSourceJpeg(hash, bytes, limits);
    } catch (error) {
      if (!(error instanceof SourceJpegValidationError)) throw error;
      throw invalid(error.message, error);
    }
  }
  try {
    return validatePublishedPackPng({ hash }, bytes, limits);
  } catch (error) {
    throw invalid(errorMessage(error), error);
  }
}

function detectImageMimeType(bytes: Uint8Array): ArchiveSourceMimeType | undefined {
  if (samePrefix(bytes, PNG_SIGNATURE)) return "image/png";
  if (isJpegSignature(bytes)) return "image/jpeg";
  return undefined;
}

function samePrefix(bytes: Uint8Array, prefix: Uint8Array): boolean {
  return bytes.byteLength >= prefix.byteLength && prefix.every((value, index) => bytes[index] === value);
}

function invalid(message: string, cause?: unknown): SourceImageValidationError {
  return new SourceImageValidationError(message, cause === undefined ? undefined : { cause });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
