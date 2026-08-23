import { sha256Hex } from "@badge/pack-contract";

export const STUDIO_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_STUDIO_IMAGE_BYTES = 16 * 1024 * 1024;
export const MAX_STUDIO_IMAGE_DIMENSION = 8_192;
export const MAX_STUDIO_IMAGE_PIXELS = 16 * 1024 * 1024;

export type StudioImageMimeType = (typeof STUDIO_IMAGE_MIME_TYPES)[number];

export interface ImageAsset {
  blob: Blob;
  bytes: Uint8Array;
  hash: string;
  mimeType: StudioImageMimeType;
  width: number;
  height: number;
}

export type StudioImageSafetyErrorCode =
  | "BYTE_LIMIT_EXCEEDED"
  | "DECODE_FAILED"
  | "DIMENSIONS_UNSAFE"
  | "IMAGE_DATA_MISMATCH"
  | "READ_FAILED"
  | "UNSUPPORTED_MIME";

export class StudioImageSafetyError extends Error {
  constructor(
    readonly code: StudioImageSafetyErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "StudioImageSafetyError";
  }
}

export function assertStudioImageBlobPreflight(blob: Blob, label: string): StudioImageMimeType {
  if (!(blob instanceof Blob)) {
    throw new StudioImageSafetyError(
      "READ_FAILED",
      `${label} is not readable image data; choose the PNG, JPEG, or WebP file again. Nothing was decoded, read, or hashed.`,
    );
  }
  if (blob.size < 1 || blob.size > MAX_STUDIO_IMAGE_BYTES) {
    throw new StudioImageSafetyError(
      "BYTE_LIMIT_EXCEEDED",
      `${label} is ${blob.size} bytes; choose a non-empty PNG, JPEG, or WebP image no larger than ${MAX_STUDIO_IMAGE_BYTES} bytes. Nothing was decoded, read, or hashed.`,
    );
  }
  if (!STUDIO_IMAGE_MIME_TYPES.includes(blob.type as StudioImageMimeType)) {
    throw new StudioImageSafetyError(
      "UNSUPPORTED_MIME",
      `${label} declares MIME type ${blob.type || "unknown"}; choose a PNG, JPEG, or WebP file. Nothing was decoded, read, or hashed.`,
    );
  }
  return blob.type as StudioImageMimeType;
}

export function assertStudioImageDimensions(width: number, height: number, label: string): void {
  const validNumbers = Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0;
  const pixels = validNumbers ? width * height : Number.NaN;
  if (
    !validNumbers ||
    width > MAX_STUDIO_IMAGE_DIMENSION ||
    height > MAX_STUDIO_IMAGE_DIMENSION ||
    !Number.isSafeInteger(pixels) ||
    pixels > MAX_STUDIO_IMAGE_PIXELS
  ) {
    throw new StudioImageSafetyError(
      "DIMENSIONS_UNSAFE",
      `${label} declares ${String(width)}x${String(height)} (${String(pixels)} pixels); choose an image no larger than ${MAX_STUDIO_IMAGE_DIMENSION}px on either side and ${MAX_STUDIO_IMAGE_PIXELS} total pixels. It was rejected before hashing, saving, or publishing.`,
    );
  }
}

function sourceLabel(source: Blob | string): string {
  if (typeof source === "string") return `Studio image from ${source}`;
  if (typeof File !== "undefined" && source instanceof File && source.name.trim()) {
    return `Studio image ${JSON.stringify(source.name)}`;
  }
  return "Selected Studio image";
}

async function sourceBlob(source: Blob | string, label: string): Promise<Blob> {
  if (typeof source !== "string") return source;
  try {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    throw new StudioImageSafetyError(
      "READ_FAILED",
      `${label} could not be fetched (${errorMessage(error)}); reload the Studio fixture or choose the image again. Nothing was decoded, read, or hashed.`,
      { cause: error },
    );
  }
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface BoundedImageBytes extends ImageDimensions {
  bytes: Uint8Array;
}

async function readBoundedImageBytes(
  blob: Blob,
  mimeType: StudioImageMimeType,
  label: string,
): Promise<BoundedImageBytes> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await blob.arrayBuffer());
  } catch (error) {
    throw new StudioImageSafetyError(
      "READ_FAILED",
      `${label} bytes could not be read for bounded header inspection; choose the image again. It was not decoded, hashed, saved, or published.`,
      { cause: error },
    );
  }
  let dimensions: ImageDimensions;
  try {
    dimensions = imageDimensionsFromBytes(bytes, mimeType);
  } catch (error) {
    throw new StudioImageSafetyError(
      "DECODE_FAILED",
      `${label} does not contain a supported ${mimeType} header (${errorMessage(error)}); choose an intact PNG, JPEG, or WebP file. It was not decoded, hashed, saved, or published.`,
      { cause: error },
    );
  }
  assertStudioImageDimensions(dimensions.width, dimensions.height, label);
  return { bytes, ...dimensions };
}

async function decodeBoundedImage(
  blob: Blob,
  label: string,
  expected: ImageDimensions,
): Promise<ImageBitmap> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await globalThis.createImageBitmap(blob);
  } catch (error) {
    throw new StudioImageSafetyError(
      "DECODE_FAILED",
      `${label} passed bounded header inspection but could not be decoded as its declared image type; choose an intact PNG, JPEG, or WebP file. It was not hashed, saved, or published.`,
      { cause: error },
    );
  }
  try {
    assertStudioImageDimensions(bitmap.width, bitmap.height, label);
    const dimensionsMatch =
      (bitmap.width === expected.width && bitmap.height === expected.height) ||
      (bitmap.width === expected.height && bitmap.height === expected.width);
    if (!dimensionsMatch) {
      throw new StudioImageSafetyError(
        "IMAGE_DATA_MISMATCH",
        `${label} decoded as ${bitmap.width}x${bitmap.height}, not the inspected ${expected.width}x${expected.height} header; choose an intact image. It was not hashed, saved, or published.`,
      );
    }
    return bitmap;
  } catch (error) {
    bitmap.close();
    throw error;
  }
}

export async function readImageAsset(source: Blob | string): Promise<ImageAsset> {
  const label = sourceLabel(source);
  const blob = await sourceBlob(source, label);
  const mimeType = assertStudioImageBlobPreflight(blob, label);
  const inspected = await readBoundedImageBytes(blob, mimeType, label);
  const bitmap = await decodeBoundedImage(blob, label, inspected);
  try {
    let hash: string;
    try {
      hash = await sha256Hex(inspected.bytes);
    } catch (error) {
      throw new StudioImageSafetyError(
        "READ_FAILED",
        `${label} could not be hashed; choose the image again. It was not saved or published.`,
        { cause: error },
      );
    }
    return {
      blob,
      bytes: inspected.bytes,
      hash,
      mimeType,
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

export async function createStudioTreatment(source: Blob | string): Promise<ImageAsset> {
  const original = await readImageAsset(source);
  const bitmap = await decodeBoundedImage(original.blob, "Selected Studio treatment source", original);
  try {
    const longestEdge = Math.min(1800, Math.max(bitmap.width, bitmap.height));
    const scale = longestEdge / Math.max(bitmap.width, bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    assertStudioImageDimensions(width, height, "Studio treatment output");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "The browser could not open the Studio treatment canvas; the selected original was preserved. Retry in a compatible browser.",
      );
    context.filter = "contrast(1.08) saturate(0.88) sepia(0.05)";
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(
                new Error(
                  "The Studio treatment output could not be encoded; the selected original was preserved. Retry or choose another image.",
                ),
              ),
        "image/png",
      );
    });
    return readImageAsset(blob);
  } finally {
    bitmap.close();
  }
}

export async function normalizeStudioAssetForPublication(source: Blob | string): Promise<ImageAsset> {
  const original = await readImageAsset(source);
  const bitmap = await decodeBoundedImage(original.blob, "Selected publication source", original);
  try {
    const longestEdge = Math.min(2048, Math.max(bitmap.width, bitmap.height));
    const scale = longestEdge / Math.max(bitmap.width, bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    assertStudioImageDimensions(width, height, "Publication PNG output");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(
        "The browser could not open the publication canvas; the Studio draft and original artwork were preserved. Retry in a compatible browser.",
      );
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(
                new Error(
                  "The publication PNG could not be encoded; the Studio draft and original artwork were preserved. Retry or choose another image.",
                ),
              ),
        "image/png",
      );
    });
    return readImageAsset(blob);
  } finally {
    bitmap.close();
  }
}

export async function validateImageAssetForPublication(
  asset: ImageAsset,
): Promise<ImageAsset & { mimeType: "image/png" }> {
  const label = "Selected publication artwork";
  const inputBlob = asset.blob;
  const inputBytes = asset.bytes;
  const inputMimeType = asset.mimeType;
  const inputHash = asset.hash;
  const inputWidth = asset.width;
  const inputHeight = asset.height;
  const suppliedMimeType = assertStudioImageBlobPreflight(inputBlob, label);
  assertStudioImageDimensions(inputWidth, inputHeight, label);
  if (inputMimeType !== "image/png" || suppliedMimeType !== "image/png") {
    throw new StudioImageSafetyError(
      "UNSUPPORTED_MIME",
      `${label} declares ${inputMimeType} with Blob type ${suppliedMimeType}; normalize the selected artwork to metadata-free PNG before publishing.`,
    );
  }
  if (!(inputBytes instanceof Uint8Array) || inputBytes.byteLength !== inputBlob.size) {
    throw new StudioImageSafetyError(
      "IMAGE_DATA_MISMATCH",
      `${label} has inconsistent Blob and byte lengths; normalize the selected source again before publishing. No pack was created.`,
    );
  }
  const snapshot = {
    blob: Blob.prototype.slice.call(inputBlob, 0, inputBlob.size, suppliedMimeType),
    bytes: new Uint8Array(inputBytes),
    hash: inputHash,
    mimeType: inputMimeType,
    width: inputWidth,
    height: inputHeight,
  };
  const blobMimeType = assertStudioImageBlobPreflight(snapshot.blob, label);
  if (blobMimeType !== "image/png") {
    throw new StudioImageSafetyError(
      "UNSUPPORTED_MIME",
      `${label} declares ${snapshot.mimeType} with Blob type ${blobMimeType}; normalize the selected artwork to metadata-free PNG before publishing.`,
    );
  }
  const inspected = await readBoundedImageBytes(snapshot.blob, "image/png", label);
  if (!bytesEqual(inspected.bytes, snapshot.bytes)) {
    throw new StudioImageSafetyError(
      "IMAGE_DATA_MISMATCH",
      `${label} preview Blob differs from its publication bytes; normalize the selected source again before publishing. No pack was created.`,
    );
  }
  if (inspected.width !== snapshot.width || inspected.height !== snapshot.height) {
    throw new StudioImageSafetyError(
      "IMAGE_DATA_MISMATCH",
      `${label} PNG header is ${inspected.width}x${inspected.height}, not recorded ${snapshot.width}x${snapshot.height}; normalize the source again before publishing. No pack was created.`,
    );
  }
  let actualHash: string;
  try {
    actualHash = await sha256Hex(snapshot.bytes);
  } catch (error) {
    throw new StudioImageSafetyError(
      "READ_FAILED",
      `${label} could not be hashed; normalize the selected source again before publishing. No pack was created.`,
      { cause: error },
    );
  }
  if (actualHash !== snapshot.hash) {
    throw new StudioImageSafetyError(
      "IMAGE_DATA_MISMATCH",
      `${label} hashes to ${actualHash}, not ${snapshot.hash}; normalize the selected source again before publishing. No pack was created.`,
    );
  }
  const retainedBytes = snapshot.bytes;
  return Object.freeze({
    ...snapshot,
    get bytes(): Uint8Array {
      return new Uint8Array(retainedBytes);
    },
    mimeType: "image/png" as const,
  });
}

function imageDimensionsFromBytes(bytes: Uint8Array, mimeType: StudioImageMimeType): ImageDimensions {
  if (mimeType === "image/png") return pngDimensions(bytes);
  if (mimeType === "image/jpeg") return jpegDimensions(bytes);
  return webpDimensions(bytes);
}

function pngDimensions(bytes: Uint8Array): ImageDimensions {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.byteLength < 24 ||
    !signature.every((value, index) => bytes[index] === value) ||
    String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR"
  ) {
    throw new Error("PNG signature or IHDR is missing");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

function jpegDimensions(bytes: Uint8Array): ImageDimensions {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("JPEG start-of-image marker is missing");
  }
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let cursor = 2;
  while (cursor < bytes.byteLength) {
    if (bytes[cursor] !== 0xff) throw new Error("JPEG segment marker is malformed");
    while (bytes[cursor] === 0xff) cursor += 1;
    if (cursor >= bytes.byteLength) break;
    const marker = bytes[cursor];
    cursor += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (cursor + 2 > bytes.byteLength) throw new Error("JPEG segment length is truncated");
    const length = (bytes[cursor] << 8) | bytes[cursor + 1];
    if (length < 2 || cursor + length > bytes.byteLength) {
      throw new Error("JPEG segment extends outside the file");
    }
    if (startOfFrameMarkers.has(marker)) {
      if (length < 7) throw new Error("JPEG start-of-frame segment is truncated");
      return {
        height: (bytes[cursor + 3] << 8) | bytes[cursor + 4],
        width: (bytes[cursor + 5] << 8) | bytes[cursor + 6],
      };
    }
    cursor += length;
  }
  throw new Error("JPEG dimensions were not found before scan data");
}

function webpDimensions(bytes: Uint8Array): ImageDimensions {
  if (
    bytes.byteLength < 20 ||
    String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.subarray(8, 12)) !== "WEBP"
  ) {
    throw new Error("WebP RIFF signature is missing");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declaredEnd = view.getUint32(4, true) + 8;
  if (declaredEnd > bytes.byteLength) throw new Error("WebP RIFF payload is truncated");
  let cursor = 12;
  while (cursor + 8 <= declaredEnd) {
    const kind = String.fromCharCode(...bytes.subarray(cursor, cursor + 4));
    const size = view.getUint32(cursor + 4, true);
    const data = cursor + 8;
    if (data + size > declaredEnd) throw new Error(`WebP ${kind} chunk is truncated`);
    if (kind === "VP8X" && size >= 10) {
      return {
        width: 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16),
        height: 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16),
      };
    }
    if (kind === "VP8L" && size >= 5 && bytes[data] === 0x2f) {
      const bits = view.getUint32(data + 1, true);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    if (
      kind === "VP8 " &&
      size >= 10 &&
      bytes[data + 3] === 0x9d &&
      bytes[data + 4] === 0x01 &&
      bytes[data + 5] === 0x2a
    ) {
      return {
        width: view.getUint16(data + 6, true) & 0x3fff,
        height: view.getUint16(data + 8, true) & 0x3fff,
      };
    }
    cursor = data + size + (size % 2);
  }
  throw new Error("WebP dimensions were not found in VP8X, VP8L, or VP8 data");
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
