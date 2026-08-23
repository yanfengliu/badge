import { Unzlib } from "fflate";

import { assertExactDeflatePayload } from "./deflate-framing.ts";
import type { PackObjectEntry } from "./schema.ts";

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_DECODED_BYTES = 64 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 8_192;
const INFLATE_INPUT_CHUNK_BYTES = 64 * 1024;
const ADLER_MODULUS = 65_521;

type PngValidationEntry = Pick<PackObjectEntry, "hash"> | Pick<PackObjectEntry, "hash" | "width" | "height">;

export interface ValidatedPngDimensions {
  readonly width: number;
  readonly height: number;
  readonly decodedByteLength: number;
}

export interface PublishedPngValidationLimits {
  readonly maxDecodedBytes?: number;
  readonly aggregateLimit?: number;
}

export function validatePublishedPackPng(
  entry: PngValidationEntry,
  bytes: Uint8Array,
  limits: PublishedPngValidationLimits = {},
): ValidatedPngDimensions {
  if (!sameBytes(bytes.subarray(0, PNG_SIGNATURE.byteLength), PNG_SIGNATURE)) {
    const detectedMimeType = detectImageMimeType(bytes);
    throw new Error(
      `Published pack object ${entry.hash} declares image/png but its bytes are ${detectedMimeType}; normalize the selected pixels to metadata-free PNG before publication.`,
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const idatParts: Uint8Array[] = [];
  let cursor = PNG_SIGNATURE.byteLength;
  let width = 0;
  let height = 0;
  let bytesPerPixel = 0;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;
  let sawSrgb = false;

  while (cursor < bytes.byteLength) {
    if (cursor + 12 > bytes.byteLength) {
      throw invalidPng(entry, "contains a truncated chunk header");
    }
    const dataLength = view.getUint32(cursor, false);
    const dataStart = cursor + 8;
    const dataEnd = dataStart + dataLength;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataStart || chunkEnd > bytes.byteLength) {
      throw invalidPng(entry, "contains a chunk outside the object boundaries");
    }

    const typeBytes = bytes.subarray(cursor + 4, cursor + 8);
    const type = ascii(typeBytes);
    const data = bytes.subarray(dataStart, dataEnd);
    const declaredCrc = view.getUint32(dataEnd, false);
    if (binaryCrc32(typeBytes, data) !== declaredCrc) {
      throw invalidPng(entry, `contains a ${type} chunk with an invalid CRC`);
    }

    if (type === "IHDR") {
      if (sawHeader || cursor !== PNG_SIGNATURE.byteLength || dataLength !== 13) {
        throw invalidPng(entry, "must contain one 13-byte IHDR as its first chunk");
      }
      width = view.getUint32(dataStart, false);
      height = view.getUint32(dataStart + 4, false);
      if (width < 1 || height < 1 || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        throw invalidPng(entry, `dimensions ${width}x${height} exceed the ${MAX_IMAGE_DIMENSION}px limit`);
      }
      const bitDepth = bytes[dataStart + 8];
      const colorType = bytes[dataStart + 9];
      if (
        bitDepth !== 8 ||
        ![0, 2, 4, 6].includes(colorType) ||
        bytes[dataStart + 10] !== 0 ||
        bytes[dataStart + 11] !== 0 ||
        bytes[dataStart + 12] !== 0
      ) {
        throw invalidPng(
          entry,
          "must use 8-bit non-interlaced grayscale, RGB, grayscale-alpha, or RGBA pixels",
        );
      }
      bytesPerPixel = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
      sawHeader = true;
    } else if (type === "IDAT") {
      if (!sawHeader || sawEnd) {
        throw invalidPng(entry, "contains IDAT outside the image-data sequence");
      }
      idatParts.push(data);
      sawImageData = true;
    } else if (type === "sRGB") {
      if (!sawHeader || sawImageData || sawSrgb || dataLength !== 1 || data[0] > 3) {
        throw invalidPng(entry, "contains an invalid or misplaced sRGB declaration");
      }
      sawSrgb = true;
    } else if (type === "IEND") {
      if (!sawImageData || sawEnd || dataLength !== 0 || chunkEnd !== bytes.byteLength) {
        throw invalidPng(entry, "must end with one empty IEND after image data");
      }
      sawEnd = true;
    } else {
      throw invalidPng(entry, `contains forbidden metadata or unsupported chunk ${type}`);
    }

    cursor = chunkEnd;
  }

  const expectedWidth = "width" in entry ? entry.width : undefined;
  const expectedHeight = "height" in entry ? entry.height : undefined;
  if (
    !sawHeader ||
    !sawImageData ||
    !sawEnd ||
    (expectedWidth !== undefined && width !== expectedWidth) ||
    (expectedHeight !== undefined && height !== expectedHeight)
  ) {
    throw new Error(
      `PNG object ${entry.hash} is incomplete or decodes as ${width}x${height}, not declared ${expectedWidth ?? "unknown"}x${expectedHeight ?? "unknown"}.`,
    );
  }

  const expectedScanlineLength = height * (1 + width * bytesPerPixel);
  const runtimeRgbaLength = width * height * 4;
  const decodedByteLength = Math.max(expectedScanlineLength, runtimeRgbaLength);
  if (
    !Number.isSafeInteger(expectedScanlineLength) ||
    !Number.isSafeInteger(runtimeRgbaLength) ||
    !Number.isSafeInteger(decodedByteLength) ||
    decodedByteLength > MAX_DECODED_BYTES
  ) {
    throw invalidPng(entry, "decoded runtime pixels exceed the 64 MiB admission limit");
  }
  if (limits.maxDecodedBytes !== undefined && decodedByteLength > limits.maxDecodedBytes) {
    const aggregateLimit = limits.aggregateLimit ?? limits.maxDecodedBytes;
    throw invalidPng(
      entry,
      `decoded image data would exceed the pack aggregate ${aggregateLimit}-byte limit; it was rejected before inflation`,
    );
  }

  const decoded = inflateExactly(entry, concatenate(idatParts), expectedScanlineLength);
  const rowLength = 1 + width * bytesPerPixel;
  for (let row = 0; row < height; row += 1) {
    if (decoded[row * rowLength] > 4) {
      throw invalidPng(entry, `row ${row} uses an unsupported PNG filter`);
    }
  }
  return { width, height, decodedByteLength };
}

export function binaryCrc32(...parts: readonly Uint8Array[]): number {
  let crc = 0xffffffff;
  parts.forEach((part) => {
    part.forEach((byte) => {
      crc = PNG_CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    });
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function inflateExactly(
  entry: Pick<PackObjectEntry, "hash">,
  compressed: Uint8Array,
  expectedLength: number,
): Uint8Array {
  if (compressed.byteLength < 6) {
    throw invalidPng(entry, "image data is shorter than a zlib stream");
  }
  const declaredAdler = new DataView(
    compressed.buffer,
    compressed.byteOffset + compressed.byteLength - 4,
    4,
  ).getUint32(0, false);
  validateZlibHeader(entry, compressed);
  try {
    assertExactDeflatePayload(compressed.subarray(2, -4), expectedLength);
  } catch (error) {
    throw invalidPng(entry, errorMessage(error));
  }
  const output = new Uint8Array(expectedLength);
  let outputOffset = 0;
  let adlerA = 1;
  let adlerB = 0;

  const decoder = new Unzlib((chunk) => {
    if (outputOffset + chunk.byteLength > expectedLength) {
      throw invalidPng(entry, "decoded pixel length does not match its dimensions");
    }
    output.set(chunk, outputOffset);
    outputOffset += chunk.byteLength;

    let cursor = 0;
    while (cursor < chunk.byteLength) {
      const end = Math.min(cursor + 5_552, chunk.byteLength);
      for (; cursor < end; cursor += 1) {
        adlerA += chunk[cursor];
        adlerB += adlerA;
      }
      adlerA %= ADLER_MODULUS;
      adlerB %= ADLER_MODULUS;
    }
  });

  try {
    for (let cursor = 0; cursor < compressed.byteLength; cursor += INFLATE_INPUT_CHUNK_BYTES) {
      const end = Math.min(cursor + INFLATE_INPUT_CHUNK_BYTES, compressed.byteLength);
      decoder.push(compressed.subarray(cursor, end), end === compressed.byteLength);
    }
  } catch (error) {
    throw new Error(`PNG object ${entry.hash} image data cannot be decoded: ${errorMessage(error)}`, {
      cause: error,
    });
  }

  if (outputOffset !== expectedLength) {
    throw invalidPng(entry, "decoded pixel length does not match its dimensions");
  }
  const actualAdler = ((adlerB << 16) | adlerA) >>> 0;
  if (actualAdler !== declaredAdler) {
    throw invalidPng(
      entry,
      `image data has invalid Adler-32 ${hex(actualAdler)}; the stream declares ${hex(declaredAdler)}`,
    );
  }
  return output;
}

function validateZlibHeader(entry: Pick<PackObjectEntry, "hash">, compressed: Uint8Array): void {
  const compressionMethod = compressed[0] & 15;
  const windowSize = compressed[0] >>> 4;
  const header = (compressed[0] << 8) | compressed[1];
  if (compressionMethod !== 8 || windowSize > 7 || header % 31 !== 0) {
    throw invalidPng(entry, "image data has an invalid zlib header");
  }
  if ((compressed[1] & 32) !== 0) {
    throw invalidPng(entry, "image data uses a forbidden preset zlib dictionary");
  }
}

function detectImageMimeType(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (ascii(bytes.subarray(0, 4)) === "RIFF" && ascii(bytes.subarray(8, 12)) === "WEBP") {
    return "image/webp";
  }
  return "unrecognized non-PNG data";
}

function invalidPng(entry: Pick<PackObjectEntry, "hash">, detail: string): Error {
  return new Error(`PNG object ${entry.hash} ${detail}.`);
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.byteLength;
  });
  return result;
}

const PNG_CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function ascii(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function hex(value: number): string {
  return `0x${value.toString(16).padStart(8, "0")}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
