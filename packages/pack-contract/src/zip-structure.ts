const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const STORED_METHOD = 0;
const FIXED_ZIP_VERSION = 20;
const FIXED_DOS_TIME = 0;
const FIXED_DOS_DATE = 33;

export interface ZipInspectionLimits {
  readonly maxEntries: number;
  readonly maxTotalUncompressedBytes: number;
}

export interface InspectedZipEntry {
  readonly name: string;
  readonly crc32: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
}

export function inspectCanonicalZip(
  bytes: Uint8Array,
  limits: ZipInspectionLimits,
): readonly InspectedZipEntry[] {
  if (bytes.byteLength < 22) {
    throw new Error("ZIP container is shorter than its required end record.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = bytes.byteLength - 22;
  requireUint32(view, endOffset, END_OF_CENTRAL_DIRECTORY_SIGNATURE, "ZIP end record");

  const diskNumber = view.getUint16(endOffset + 4, true);
  const centralDisk = view.getUint16(endOffset + 6, true);
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const archiveCommentLength = view.getUint16(endOffset + 20, true);

  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error("ZIP container must use one disk with one complete central directory.");
  }
  if (archiveCommentLength !== 0) {
    throw new Error("ZIP container comments are forbidden.");
  }
  if (entryCount === 0 || entryCount > limits.maxEntries) {
    throw new Error(`ZIP entry count ${entryCount} is outside the supported range.`);
  }
  if (centralOffset + centralSize !== endOffset) {
    throw new Error("ZIP central directory boundaries are inconsistent.");
  }

  const entries: CentralEntry[] = [];
  let centralCursor = centralOffset;
  let totalUncompressedBytes = 0;

  for (let index = 0; index < entryCount; index += 1) {
    assertAvailable(view, centralCursor, 46, "ZIP central directory entry");
    requireUint32(view, centralCursor, CENTRAL_FILE_SIGNATURE, "ZIP central directory entry");

    const versionMadeBy = view.getUint16(centralCursor + 4, true);
    const versionNeeded = view.getUint16(centralCursor + 6, true);
    const flags = view.getUint16(centralCursor + 8, true);
    const method = view.getUint16(centralCursor + 10, true);
    const modifiedTime = view.getUint16(centralCursor + 12, true);
    const modifiedDate = view.getUint16(centralCursor + 14, true);
    const crc32 = view.getUint32(centralCursor + 16, true);
    const compressedSize = view.getUint32(centralCursor + 20, true);
    const uncompressedSize = view.getUint32(centralCursor + 24, true);
    const nameLength = view.getUint16(centralCursor + 28, true);
    const extraLength = view.getUint16(centralCursor + 30, true);
    const commentLength = view.getUint16(centralCursor + 32, true);
    const startingDisk = view.getUint16(centralCursor + 34, true);
    const internalAttributes = view.getUint16(centralCursor + 36, true);
    const externalAttributes = view.getUint32(centralCursor + 38, true);
    const localOffset = view.getUint32(centralCursor + 42, true);
    const entryLength = 46 + nameLength + extraLength + commentLength;
    assertAvailable(view, centralCursor, entryLength, "ZIP central directory entry data");

    const name = decodeEntryName(bytes.subarray(centralCursor + 46, centralCursor + 46 + nameLength));
    validateEntryMetadata({
      name,
      crc32,
      versionMadeBy,
      versionNeeded,
      flags,
      method,
      modifiedTime,
      modifiedDate,
      compressedSize,
      uncompressedSize,
      extraLength,
      commentLength,
      startingDisk,
      internalAttributes,
      externalAttributes,
    });

    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
      throw new Error(`ZIP objects expand to ${totalUncompressedBytes} bytes, above the supported limit.`);
    }

    entries.push({ name, crc32, compressedSize, uncompressedSize, localOffset });
    centralCursor += entryLength;
  }

  if (centralCursor !== endOffset) {
    throw new Error("ZIP central directory contains trailing or unparsed metadata.");
  }

  validateEntryNames(entries.map((entry) => entry.name));
  validateLocalEntries(bytes, view, entries, centralOffset);

  return entries.map(({ name, crc32, compressedSize, uncompressedSize }) => ({
    name,
    crc32,
    compressedSize,
    uncompressedSize,
  }));
}

interface CentralEntry extends InspectedZipEntry {
  readonly localOffset: number;
}

interface EntryMetadata extends InspectedZipEntry {
  readonly versionMadeBy: number;
  readonly versionNeeded: number;
  readonly flags: number;
  readonly method: number;
  readonly modifiedTime: number;
  readonly modifiedDate: number;
  readonly extraLength: number;
  readonly commentLength: number;
  readonly startingDisk: number;
  readonly internalAttributes: number;
  readonly externalAttributes: number;
}

function validateEntryMetadata(metadata: EntryMetadata): void {
  if (metadata.versionMadeBy !== FIXED_ZIP_VERSION) {
    throw new Error(
      `ZIP entry ${metadata.name} uses version-made-by ${metadata.versionMadeBy}, not canonical version ${FIXED_ZIP_VERSION}.`,
    );
  }
  if (metadata.versionNeeded !== FIXED_ZIP_VERSION) {
    throw new Error(
      `ZIP entry ${metadata.name} uses version-needed ${metadata.versionNeeded}, not canonical version ${FIXED_ZIP_VERSION}.`,
    );
  }
  if (metadata.flags !== 0) {
    throw new Error(`ZIP entry ${metadata.name} uses unsupported flags ${metadata.flags}.`);
  }
  if (metadata.method !== STORED_METHOD || metadata.compressedSize !== metadata.uncompressedSize) {
    throw new Error(`ZIP entry ${metadata.name} must be stored without compression.`);
  }
  if (metadata.modifiedTime !== FIXED_DOS_TIME || metadata.modifiedDate !== FIXED_DOS_DATE) {
    throw new Error(`ZIP entry ${metadata.name} does not use the fixed 1980-01-01 timestamp.`);
  }
  if (metadata.extraLength !== 0 || metadata.commentLength !== 0) {
    throw new Error(`ZIP entry ${metadata.name} contains forbidden extra fields or comments.`);
  }
  if (metadata.startingDisk !== 0 || metadata.internalAttributes !== 0 || metadata.externalAttributes !== 0) {
    throw new Error(`ZIP entry ${metadata.name} contains noncanonical attributes.`);
  }
}

function validateEntryNames(names: readonly string[]): void {
  const expected = [...names].sort(compareUtf8);
  const seen = new Set<string>();

  names.forEach((name, index) => {
    if (name !== name.normalize("NFC") || name.includes("\\") || name.includes("\0")) {
      throw new Error(`ZIP entry name ${JSON.stringify(name)} is not normalized and portable.`);
    }
    if (name === "manifest.json") {
      // The single manifest is the only non-object entry.
    } else if (!/^objects\/[0-9a-f]{64}$/.test(name)) {
      throw new Error(`ZIP entry ${name} is outside the closed pack layout.`);
    }
    if (seen.has(name)) {
      throw new Error(`ZIP entry ${name} is duplicated.`);
    }
    if (name !== expected[index]) {
      throw new Error("ZIP entries must be ordered by their UTF-8 names.");
    }
    seen.add(name);
  });

  if (names[0] !== "manifest.json" || names.filter((name) => name === "manifest.json").length !== 1) {
    throw new Error("ZIP container must contain exactly one first manifest.json entry.");
  }
}

function validateLocalEntries(
  bytes: Uint8Array,
  view: DataView,
  entries: readonly CentralEntry[],
  centralOffset: number,
): void {
  let expectedOffset = 0;

  entries.forEach((entry) => {
    if (entry.localOffset !== expectedOffset) {
      throw new Error(`ZIP entry ${entry.name} has a noncanonical local-header offset.`);
    }
    assertAvailable(view, entry.localOffset, 30, `ZIP local header for ${entry.name}`);
    requireUint32(view, entry.localOffset, LOCAL_FILE_SIGNATURE, `ZIP local header for ${entry.name}`);

    const versionNeeded = view.getUint16(entry.localOffset + 4, true);
    const flags = view.getUint16(entry.localOffset + 6, true);
    const method = view.getUint16(entry.localOffset + 8, true);
    const modifiedTime = view.getUint16(entry.localOffset + 10, true);
    const modifiedDate = view.getUint16(entry.localOffset + 12, true);
    const crc32 = view.getUint32(entry.localOffset + 14, true);
    const compressedSize = view.getUint32(entry.localOffset + 18, true);
    const uncompressedSize = view.getUint32(entry.localOffset + 22, true);
    const nameLength = view.getUint16(entry.localOffset + 26, true);
    const extraLength = view.getUint16(entry.localOffset + 28, true);
    const headerLength = 30 + nameLength + extraLength;
    assertAvailable(view, entry.localOffset, headerLength + compressedSize, `ZIP data for ${entry.name}`);

    const localName = decodeEntryName(
      bytes.subarray(entry.localOffset + 30, entry.localOffset + 30 + nameLength),
    );
    if (versionNeeded !== FIXED_ZIP_VERSION) {
      throw new Error(
        `ZIP local header for ${entry.name} uses version-needed ${versionNeeded}, not canonical version ${FIXED_ZIP_VERSION}.`,
      );
    }
    if (
      localName !== entry.name ||
      flags !== 0 ||
      method !== STORED_METHOD ||
      modifiedTime !== FIXED_DOS_TIME ||
      modifiedDate !== FIXED_DOS_DATE ||
      crc32 !== entry.crc32 ||
      compressedSize !== entry.compressedSize ||
      uncompressedSize !== entry.uncompressedSize ||
      extraLength !== 0
    ) {
      throw new Error(`ZIP local header for ${entry.name} differs from its canonical metadata.`);
    }

    expectedOffset = entry.localOffset + headerLength + compressedSize;
  });

  if (expectedOffset !== centralOffset) {
    throw new Error("ZIP local entries contain gaps or trailing bytes.");
  }
}

function decodeEntryName(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("ZIP entry name is not valid UTF-8.");
  }
}

function compareUtf8(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index] - rightBytes[index];
    if (difference !== 0) {
      return difference;
    }
  }
  return leftBytes.length - rightBytes.length;
}

function assertAvailable(view: DataView, offset: number, length: number, label: string): void {
  if (offset < 0 || length < 0 || offset + length > view.byteLength) {
    throw new Error(`${label} exceeds the ZIP container boundaries.`);
  }
}

function requireUint32(view: DataView, offset: number, expected: number, label: string): void {
  assertAvailable(view, offset, 4, label);
  if (view.getUint32(offset, true) !== expected) {
    throw new Error(`${label} signature is missing or corrupt.`);
  }
}
