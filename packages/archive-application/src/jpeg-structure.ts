const JPEG_SIGNATURE = Uint8Array.from([0xff, 0xd8, 0xff]);
const MAX_DECODED_BYTES = 64 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 8_192;
const JFIF_IDENTIFIER = Uint8Array.from([0x4a, 0x46, 0x49, 0x46, 0x00]);

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;
const SOF0 = 0xc0;
const DHT = 0xc4;
const DQT = 0xdb;
const DRI = 0xdd;
const APP0 = 0xe0;
const TEM = 0x01;
const RST0 = 0xd0;
const RST7 = 0xd7;

export interface ValidatedJpegDimensions {
  readonly width: number;
  readonly height: number;
  readonly decodedByteLength: number;
}

export interface SourceJpegValidationLimits {
  readonly maxDecodedBytes?: number;
  readonly aggregateLimit?: number;
}

export class SourceJpegValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceJpegValidationError";
  }
}

export function isJpegSignature(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= JPEG_SIGNATURE.byteLength &&
    JPEG_SIGNATURE.every((value, index) => bytes[index] === value)
  );
}

function invalid(hash: string, detail: string): SourceJpegValidationError {
  return new SourceJpegValidationError(`its baseline JPEG structure is invalid: ${detail} (object ${hash})`);
}

function markerName(marker: number): string {
  return `0xff${marker.toString(16).padStart(2, "0")}`;
}

/**
 * Validates the strict normalized-catalogue JPEG shape the Archive admits as a durable source:
 * one SOI, one JFIF APP0, quantization/Huffman/restart-interval tables, one baseline SOF0 frame,
 * one SOS scan whose entropy data runs to a final EOI with no trailing bytes, and no other
 * segment kind — every metadata segment (EXIF, XMP, ICC, comments) is rejected.
 */
export function validateArchiveSourceJpeg(
  hash: string,
  bytes: Uint8Array,
  limits: SourceJpegValidationLimits = {},
): ValidatedJpegDimensions {
  if (!isJpegSignature(bytes) || bytes[1] !== SOI) {
    throw invalid(hash, "it does not begin with the SOI marker");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 2;
  let sawJfif = false;
  let frame: {
    readonly width: number;
    readonly height: number;
    readonly components: readonly { readonly id: number; readonly quantizationTableId: number }[];
  } | null = null;
  const quantizationTableIds = new Set<number>();
  const huffmanTableIds = new Set<string>();

  while (true) {
    if (cursor + 4 > bytes.byteLength) {
      throw invalid(hash, "a segment header is truncated before the scan begins");
    }
    if (bytes[cursor] !== 0xff) {
      throw invalid(hash, `expected a marker at byte ${cursor} but found ${bytes[cursor]}`);
    }
    const marker = bytes[cursor + 1];
    if (marker === SOS) break;
    if (marker === 0xff || marker === TEM || (marker >= RST0 && marker <= RST7) || marker === EOI) {
      throw invalid(hash, `marker ${markerName(marker)} may not appear before the scan`);
    }
    const segmentLength = view.getUint16(cursor + 2, false);
    const segmentEnd = cursor + 2 + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.byteLength) {
      throw invalid(hash, `segment ${markerName(marker)} declares an out-of-bounds length`);
    }
    if (marker === APP0) {
      if (sawJfif || frame !== null) {
        throw invalid(hash, "APP0 must appear exactly once, before the frame header");
      }
      const identifier = bytes.subarray(cursor + 4, cursor + 4 + JFIF_IDENTIFIER.byteLength);
      if (
        segmentLength < 2 + JFIF_IDENTIFIER.byteLength ||
        !JFIF_IDENTIFIER.every((value, index) => identifier[index] === value)
      ) {
        throw invalid(hash, "APP0 is not a JFIF identifier segment");
      }
      sawJfif = true;
    } else if (marker === SOF0) {
      if (frame !== null) throw invalid(hash, "it contains more than one frame header");
      if (segmentLength < 11) throw invalid(hash, "its SOF0 frame header is shorter than one component");
      const precision = bytes[cursor + 4];
      const height = view.getUint16(cursor + 5, false);
      const width = view.getUint16(cursor + 7, false);
      const components = bytes[cursor + 9];
      if (precision !== 8) {
        throw invalid(hash, `it uses ${precision}-bit samples; only 8-bit baseline JPEG is admitted`);
      }
      if (components !== 1 && components !== 3) {
        throw invalid(hash, `it declares ${components} components; only grayscale or YCbCr is admitted`);
      }
      if (segmentLength !== 8 + components * 3) {
        throw invalid(hash, "its SOF0 length does not match its component count");
      }
      if (width < 1 || height < 1 || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        throw invalid(hash, `dimensions ${width}x${height} exceed the ${MAX_IMAGE_DIMENSION}px limit`);
      }
      const componentEntries: { id: number; quantizationTableId: number }[] = [];
      for (let component = 0; component < components; component += 1) {
        const base = cursor + 10 + component * 3;
        componentEntries.push({ id: bytes[base], quantizationTableId: bytes[base + 2] });
      }
      frame = { width, height, components: componentEntries };
    } else if (marker === DQT) {
      let tableCursor = cursor + 4;
      if (tableCursor >= segmentEnd) throw invalid(hash, "it declares an empty quantization-table segment");
      while (tableCursor < segmentEnd) {
        const precisionAndId = bytes[tableCursor];
        const tablePrecision = precisionAndId >> 4;
        const tableId = precisionAndId & 0x0f;
        if (tablePrecision > 1 || tableId > 3) {
          throw invalid(hash, "it declares an invalid quantization-table precision or identifier");
        }
        const tableBytes = tablePrecision === 0 ? 64 : 128;
        if (tableCursor + 1 + tableBytes > segmentEnd) {
          throw invalid(hash, "a quantization table is truncated inside its segment");
        }
        quantizationTableIds.add(tableId);
        tableCursor += 1 + tableBytes;
      }
    } else if (marker === DHT) {
      let tableCursor = cursor + 4;
      if (tableCursor >= segmentEnd) throw invalid(hash, "it declares an empty Huffman-table segment");
      while (tableCursor < segmentEnd) {
        const classAndId = bytes[tableCursor];
        const tableClass = classAndId >> 4;
        const tableId = classAndId & 0x0f;
        if (tableClass > 1 || tableId > 3) {
          throw invalid(hash, "it declares an invalid Huffman-table class or identifier");
        }
        if (tableCursor + 17 > segmentEnd) {
          throw invalid(hash, "a Huffman table is truncated before its code-length counts");
        }
        let symbolCount = 0;
        for (let lengthIndex = 1; lengthIndex <= 16; lengthIndex += 1) {
          symbolCount += bytes[tableCursor + lengthIndex];
        }
        if (symbolCount === 0 || symbolCount > 256 || tableCursor + 17 + symbolCount > segmentEnd) {
          throw invalid(hash, "a Huffman table declares an empty or out-of-bounds symbol list");
        }
        huffmanTableIds.add(`${tableClass}:${tableId}`);
        tableCursor += 17 + symbolCount;
      }
    } else if (marker === DRI) {
      if (segmentLength !== 4) throw invalid(hash, "its restart-interval segment has the wrong length");
    } else {
      throw invalid(
        hash,
        `segment ${markerName(marker)} is not part of the admitted metadata-free baseline shape`,
      );
    }
    cursor = segmentEnd;
  }

  if (!sawJfif) throw invalid(hash, "it is missing the JFIF APP0 segment");
  if (frame === null) throw invalid(hash, "it is missing the SOF0 baseline frame header");
  if (quantizationTableIds.size === 0 || huffmanTableIds.size === 0) {
    throw invalid(hash, "it is missing its quantization or Huffman tables");
  }
  for (const component of frame.components) {
    if (!quantizationTableIds.has(component.quantizationTableId)) {
      throw invalid(
        hash,
        `frame component ${component.id} references undefined quantization table ${component.quantizationTableId}`,
      );
    }
  }

  const scanLength = view.getUint16(cursor + 2, false);
  const scanEnd = cursor + 2 + scanLength;
  if (scanLength < 2 || scanEnd > bytes.byteLength) {
    throw invalid(hash, "its SOS header declares an out-of-bounds length");
  }
  const scanComponents = bytes[cursor + 4];
  if (scanComponents !== frame.components.length || scanLength !== 6 + scanComponents * 2) {
    throw invalid(hash, "its SOS header does not cover exactly the frame's components in one scan");
  }
  for (let component = 0; component < scanComponents; component += 1) {
    const base = cursor + 5 + component * 2;
    const tables = bytes[base + 1];
    const dcTable = tables >> 4;
    const acTable = tables & 0x0f;
    if (!huffmanTableIds.has(`0:${dcTable}`) || !huffmanTableIds.has(`1:${acTable}`)) {
      throw invalid(
        hash,
        `scan component ${bytes[base]} references undefined Huffman tables ${dcTable}/${acTable}`,
      );
    }
  }
  if (scanEnd + 2 >= bytes.byteLength) {
    throw invalid(hash, "its scan carries no entropy-coded data before the EOI marker");
  }
  cursor = scanEnd;
  let sawEnd = false;
  while (cursor + 1 < bytes.byteLength) {
    if (bytes[cursor] !== 0xff) {
      cursor += 1;
      continue;
    }
    const marker = bytes[cursor + 1];
    if (marker === 0x00 || (marker >= RST0 && marker <= RST7)) {
      cursor += 2;
      continue;
    }
    if (marker === EOI) {
      if (cursor + 2 !== bytes.byteLength) {
        throw invalid(hash, `it carries ${bytes.byteLength - cursor - 2} trailing bytes after EOI`);
      }
      sawEnd = true;
      break;
    }
    throw invalid(hash, `entropy-coded data is interrupted by marker ${markerName(marker)}`);
  }
  if (!sawEnd) throw invalid(hash, "its scan does not end with the EOI marker");

  const decodedByteLength = frame.width * frame.height * 4;
  if (!Number.isSafeInteger(decodedByteLength) || decodedByteLength > MAX_DECODED_BYTES) {
    throw invalid(hash, "decoded runtime pixels exceed the 64 MiB admission limit");
  }
  if (limits.maxDecodedBytes !== undefined && decodedByteLength > limits.maxDecodedBytes) {
    const aggregateLimit = limits.aggregateLimit ?? limits.maxDecodedBytes;
    throw invalid(
      hash,
      `decoded image data would exceed the aggregate ${aggregateLimit}-byte limit; it was rejected before decoding`,
    );
  }
  return { width: frame.width, height: frame.height, decodedByteLength };
}
