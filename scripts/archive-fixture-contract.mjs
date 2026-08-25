import { createHash } from "node:crypto";

import { zlibSync } from "fflate";

export const expectedArchiveFixtures = [
  {
    fileName: "all-parks.png",
    sourceFileName: "all-parks-cut-paper-v2.webp",
    sourceByteLength: 29_356,
    sourceSha256: "f2d99a4f40c2c6f028de2c24af422413bba3ac597468d04437156e2fada4cba8",
    width: 896,
    height: 896,
    outputByteLength: 387_680,
    sha256: "8923a01460dc2f0ce42cc746720c36ca43c7fb8cd6959c8dea749df99095a20e",
  },
  {
    fileName: "bachelors-degree.png",
    sourceFileName: "bachelors-degree-marquetry-v2.webp",
    sourceByteLength: 8_236,
    sourceSha256: "c6e9428ce2bc922076c10b9a6d3134725cde4990ebf1e92c2fbfd47bd9f02e10",
    width: 896,
    height: 896,
    outputByteLength: 105_751,
    sha256: "450f283bfb5f2706ef1b89d6eff82694ea3a92a44f22884a5254ff0a534ba926",
  },
  {
    fileName: "sapiens.png",
    sourceFileName: "sapiens-embroidered-v2.webp",
    sourceByteLength: 19_278,
    sourceSha256: "61b54e073ae0ac972038a88268a876372aadf38c0e0de54f429e52faba3c350c",
    width: 896,
    height: 896,
    outputByteLength: 248_500,
    sha256: "8bc3dd807fe4447bfad073437d00e01738c81248ade14c712af23ee8e5e319e4",
  },
  {
    fileName: "yosemite-literal.png",
    sourceFileName: "yosemite-literal-manufactured-v2.webp",
    sourceByteLength: 21_064,
    sourceSha256: "ca4a1fade0aea9340114978c27c9df8e838568015bcc81e3f0dc02c52e22f907",
    width: 896,
    height: 896,
    outputByteLength: 302_721,
    sha256: "a4fae2312feca2c2da6407eeed7ecda32bccd8936c6b190c1082c4523a12841c",
  },
];

export function encodeCanonicalRgbaPng(pixels, width, height) {
  const rowBytes = width * 4;
  if (pixels.byteLength !== rowBytes * height) {
    throw new Error(
      `Decoded RGBA payload has ${pixels.byteLength} bytes; ${width}x${height} requires ${rowBytes * height}.`,
    );
  }
  const filtered = new Uint8Array(height * (rowBytes + 1));
  for (let row = 0; row < height; row += 1) {
    const sourceOffset = row * rowBytes;
    const outputOffset = row * (rowBytes + 1);
    filtered[outputOffset] = 0;
    filtered.set(pixels.subarray(sourceOffset, sourceOffset + rowBytes), outputOffset + 1);
  }

  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width, false);
  headerView.setUint32(4, height, false);
  header.set([8, 6, 0, 0, 0], 8);
  return concatenate([
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("sRGB", Uint8Array.of(0)),
    pngChunk("IDAT", zlibSync(filtered, { level: 9 })),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

export function exactArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const result = new Uint8Array(12 + data.byteLength);
  const view = new DataView(result.buffer);
  view.setUint32(0, data.byteLength, false);
  result.set(typeBytes, 4);
  result.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(typeBytes, data), false);
  return result;
}

function crc32(...parts) {
  let crc = 0xffffffff;
  for (const part of parts) {
    for (const byte of part) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatenate(parts) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
