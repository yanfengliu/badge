const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195,
  227, 258,
];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097,
  6145, 8193, 12_289, 16_385, 24_577,
];
const DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];

interface HuffmanTree {
  readonly codesByLength: readonly (ReadonlyMap<number, number> | undefined)[];
  readonly maxLength: number;
}

export function assertExactDeflatePayload(payload: Uint8Array, expectedDecodedLength: number): void {
  const reader = new BitReader(payload);
  let decodedLength = 0;
  let isFinal = false;

  while (!isFinal) {
    isFinal = reader.readBits(1, "final-block flag") === 1;
    const blockType = reader.readBits(2, "block type");
    if (blockType === 0) {
      reader.alignToByte();
      const length = reader.readBits(16, "stored-block length");
      const complement = reader.readBits(16, "stored-block length complement");
      if ((length ^ 0xffff) !== complement) {
        throw new Error("DEFLATE stored block has a mismatched length complement");
      }
      reader.skipBytes(length, "stored-block bytes");
      decodedLength = addDecodedLength(decodedLength, length, expectedDecodedLength);
    } else if (blockType === 1) {
      decodedLength = decodeCompressedBlock(
        reader,
        fixedLiteralTree,
        fixedDistanceTree,
        decodedLength,
        expectedDecodedLength,
      );
    } else if (blockType === 2) {
      const trees = readDynamicTrees(reader);
      decodedLength = decodeCompressedBlock(
        reader,
        trees.literal,
        trees.distance,
        decodedLength,
        expectedDecodedLength,
      );
    } else {
      throw new Error("DEFLATE block uses the reserved block type");
    }
  }

  if (reader.consumedByteLength !== payload.byteLength) {
    throw new Error("Compressed image data contains trailing bytes after the final DEFLATE block");
  }
  if (decodedLength !== expectedDecodedLength) {
    throw new Error("Decoded pixel length does not match the PNG dimensions");
  }
}

class BitReader {
  private bitOffset = 0;
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  get consumedByteLength(): number {
    return Math.ceil(this.bitOffset / 8);
  }

  readBits(count: number, subject: string): number {
    if (count < 0 || count > 24 || this.bitOffset + count > this.bytes.byteLength * 8) {
      throw new Error(`DEFLATE ${subject} is truncated`);
    }
    let value = 0;
    for (let index = 0; index < count; index += 1) {
      const bit = (this.bytes[this.bitOffset >>> 3] >>> (this.bitOffset & 7)) & 1;
      value |= bit << index;
      this.bitOffset += 1;
    }
    return value >>> 0;
  }

  alignToByte(): void {
    this.bitOffset = (this.bitOffset + 7) & ~7;
  }

  skipBytes(count: number, subject: string): void {
    if ((this.bitOffset & 7) !== 0 || count < 0 || this.bitOffset + count * 8 > this.bytes.byteLength * 8) {
      throw new Error(`DEFLATE ${subject} are truncated`);
    }
    this.bitOffset += count * 8;
  }
}

function decodeCompressedBlock(
  reader: BitReader,
  literalTree: HuffmanTree,
  distanceTree: HuffmanTree | undefined,
  startingLength: number,
  expectedLength: number,
): number {
  let decodedLength = startingLength;
  while (true) {
    const symbol = decodeSymbol(reader, literalTree, "literal/length code");
    if (symbol < 256) {
      decodedLength = addDecodedLength(decodedLength, 1, expectedLength);
      continue;
    }
    if (symbol === 256) return decodedLength;
    if (symbol < 257 || symbol > 285) {
      throw new Error(`DEFLATE literal/length symbol ${symbol} is reserved`);
    }

    const lengthIndex = symbol - 257;
    const matchLength =
      LENGTH_BASE[lengthIndex] +
      reader.readBits(LENGTH_EXTRA[lengthIndex], `length extra bits for symbol ${symbol}`);
    if (!distanceTree) {
      throw new Error("DEFLATE match length is present without a distance tree");
    }
    const distanceSymbol = decodeSymbol(reader, distanceTree, "distance code");
    if (distanceSymbol > 29) {
      throw new Error(`DEFLATE distance symbol ${distanceSymbol} is reserved`);
    }
    const distance =
      DISTANCE_BASE[distanceSymbol] +
      reader.readBits(DISTANCE_EXTRA[distanceSymbol], `distance extra bits for symbol ${distanceSymbol}`);
    if (distance > decodedLength) {
      throw new Error(`DEFLATE match distance ${distance} exceeds the ${decodedLength} decoded bytes`);
    }
    decodedLength = addDecodedLength(decodedLength, matchLength, expectedLength);
  }
}

function readDynamicTrees(reader: BitReader): {
  readonly literal: HuffmanTree;
  readonly distance: HuffmanTree | undefined;
} {
  const hlit = reader.readBits(5, "HLIT");
  if (hlit > 29) throw new Error(`DEFLATE HLIT ${hlit} is reserved`);
  const literalCount = hlit + 257;
  const distanceCount = reader.readBits(5, "HDIST") + 1;
  const codeLengthCount = reader.readBits(4, "HCLEN") + 4;
  const codeLengthLengths = new Array<number>(19).fill(0);
  for (let index = 0; index < codeLengthCount; index += 1) {
    codeLengthLengths[CODE_LENGTH_ORDER[index]] = reader.readBits(3, "code-length code");
  }
  const codeLengthTree = createHuffmanTree(codeLengthLengths, "code-length tree");
  const lengths: number[] = [];
  const requiredLengthCount = literalCount + distanceCount;

  while (lengths.length < requiredLengthCount) {
    const symbol = decodeSymbol(reader, codeLengthTree, "code-length symbol");
    if (symbol <= 15) {
      lengths.push(symbol);
    } else if (symbol === 16) {
      const previous = lengths.at(-1);
      if (previous === undefined) throw new Error("DEFLATE repeat code has no previous code length");
      appendRepeated(lengths, previous, reader.readBits(2, "repeat count") + 3, requiredLengthCount);
    } else if (symbol === 17) {
      appendRepeated(lengths, 0, reader.readBits(3, "zero repeat count") + 3, requiredLengthCount);
    } else if (symbol === 18) {
      appendRepeated(lengths, 0, reader.readBits(7, "long zero repeat count") + 11, requiredLengthCount);
    } else {
      throw new Error(`DEFLATE code-length symbol ${symbol} is invalid`);
    }
  }

  const literalLengths = lengths.slice(0, literalCount);
  if (literalLengths[256] === 0) {
    throw new Error("DEFLATE literal tree does not contain an end-of-block code");
  }
  const distanceLengths = lengths.slice(literalCount);
  return {
    literal: createHuffmanTree(literalLengths, "literal/length tree"),
    distance: distanceLengths.some((length) => length !== 0)
      ? createHuffmanTree(distanceLengths, "distance tree")
      : undefined,
  };
}

function createHuffmanTree(lengths: readonly number[], subject: string): HuffmanTree {
  const counts = new Array<number>(16).fill(0);
  for (const length of lengths) {
    if (!Number.isInteger(length) || length < 0 || length > 15) {
      throw new Error(`DEFLATE ${subject} contains invalid code length ${length}`);
    }
    if (length > 0) counts[length] += 1;
  }
  let maxLength = 15;
  while (maxLength > 0 && counts[maxLength] === 0) maxLength -= 1;
  if (maxLength < 1) throw new Error(`DEFLATE ${subject} is empty`);

  let availableCodes = 1;
  for (let length = 1; length <= 15; length += 1) {
    availableCodes = availableCodes * 2 - counts[length];
    if (availableCodes < 0) throw new Error(`DEFLATE ${subject} is oversubscribed`);
  }

  const nextCode = new Array<number>(16).fill(0);
  let code = 0;
  for (let length = 1; length <= 15; length += 1) {
    code = (code + counts[length - 1]) << 1;
    nextCode[length] = code;
  }
  const codesByLength: (Map<number, number> | undefined)[] = new Array(16).fill(undefined);
  lengths.forEach((length, symbol) => {
    if (length === 0) return;
    const codes = (codesByLength[length] ??= new Map());
    codes.set(reverseBits(nextCode[length], length), symbol);
    nextCode[length] += 1;
  });
  return { codesByLength, maxLength };
}

function reverseBits(value: number, length: number): number {
  let reversed = 0;
  for (let index = 0; index < length; index += 1) {
    reversed = (reversed << 1) | ((value >>> index) & 1);
  }
  return reversed >>> 0;
}

function decodeSymbol(reader: BitReader, tree: HuffmanTree, subject: string): number {
  let code = 0;
  for (let length = 1; length <= tree.maxLength; length += 1) {
    code |= reader.readBits(1, subject) << (length - 1);
    const symbol = tree.codesByLength[length]?.get(code);
    if (symbol !== undefined) return symbol;
  }
  throw new Error(`DEFLATE ${subject} does not match its Huffman tree`);
}

function appendRepeated(lengths: number[], value: number, count: number, requiredLength: number): void {
  if (lengths.length + count > requiredLength) {
    throw new Error("DEFLATE repeated code lengths exceed the declared tree sizes");
  }
  for (let index = 0; index < count; index += 1) lengths.push(value);
}

function addDecodedLength(current: number, added: number, expected: number): number {
  const next = current + added;
  if (!Number.isSafeInteger(next) || next > expected) {
    throw new Error("Decoded pixel length does not match the PNG dimensions");
  }
  return next;
}

const fixedLiteralLengths = Array.from({ length: 288 }, (_, symbol) =>
  symbol <= 143 ? 8 : symbol <= 255 ? 9 : symbol <= 279 ? 7 : 8,
);
const fixedLiteralTree = createHuffmanTree(fixedLiteralLengths, "fixed literal/length tree");
const fixedDistanceTree = createHuffmanTree(new Array<number>(32).fill(5), "fixed distance tree");
