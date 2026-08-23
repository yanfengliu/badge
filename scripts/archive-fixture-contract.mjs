import { createHash } from "node:crypto";

import { zlibSync } from "fflate";

export const expectedArchiveFixtures = [
  {
    fileName: "all-parks.png",
    sourceFileName: "all-parks.webp",
    sourceByteLength: 194_576,
    sourceSha256: "186a202cc84020994f56982532341b8a8936e3f3d00e23a3f9764fb02c3e7e10",
    width: 896,
    height: 896,
    outputByteLength: 1_661_713,
    sha256: "0b2ec88a2ee72eb85de9525020bfdc419fada5f1dfc6a6ea381df3ff32fa3c6c",
  },
  {
    fileName: "bachelors-degree.png",
    sourceFileName: "bachelors-degree.webp",
    sourceByteLength: 191_654,
    sourceSha256: "0de7489e5c93b86367e35bde5e95a3107d67f959505232184e9d1abe855f1274",
    width: 896,
    height: 896,
    outputByteLength: 1_686_065,
    sha256: "2af87c6a64740642f85ae37bc702a206c8c817531acb9d5aaf44269c5369a737",
  },
  {
    fileName: "sapiens.png",
    sourceFileName: "sapiens.webp",
    sourceByteLength: 232_792,
    sourceSha256: "8b8af7f0e18bd7427f30a7d1aad5260fd8b8c05a87dcf09eb532e81b24d86149",
    width: 896,
    height: 896,
    outputByteLength: 1_979_258,
    sha256: "296c08b967b50dfbefdb8c8187f48943c11b3d3976d4d724fd248be335431729",
  },
  {
    fileName: "yosemite-literal.png",
    sourceFileName: "yosemite-literal.webp",
    sourceByteLength: 255_720,
    sourceSha256: "66ff0b12c95341493dd674f77b427be0c8de81350e7e20286d1984e20722a35b",
    width: 896,
    height: 896,
    outputByteLength: 1_624_730,
    sha256: "21173941d3ad44ff0f245dcef0f1bbf2606b39163442afcc24777d442dda2ece",
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
