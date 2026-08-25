import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { inflateSync } from "node:zlib";

import encodeWebp, { init as initializeWebpEncoder } from "@jsquash/webp/encode.js";

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAXIMUM_INPUT_BYTES = 16 * 1024 * 1024;
const MAXIMUM_SOURCE_AXIS = 4096;
const MAXIMUM_OUTPUT_BYTES = 256 * 1024;

export function decodeGeneratedRgbPng(bytes) {
  if (bytes.byteLength > MAXIMUM_INPUT_BYTES) {
    throw new Error(
      `Generated PNG is ${bytes.byteLength} bytes; normalize an input at or below ${MAXIMUM_INPUT_BYTES} bytes.`,
    );
  }
  if (!sameBytes(bytes.subarray(0, PNG_SIGNATURE.byteLength), PNG_SIGNATURE)) {
    throw new Error("Generated art input is not a PNG image.");
  }

  let cursor = PNG_SIGNATURE.byteLength;
  let width;
  let height;
  let sawEnd = false;
  const compressedParts = [];
  while (cursor < bytes.byteLength) {
    if (cursor + 12 > bytes.byteLength) throw new Error("Generated PNG has a truncated chunk.");
    const length = readUint32(bytes, cursor);
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8));
    const dataStart = cursor + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.byteLength) throw new Error(`Generated PNG ${type} chunk is truncated.`);
    const data = bytes.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      if (width !== undefined || length !== 13) throw new Error("Generated PNG has an invalid IHDR.");
      width = readUint32(data, 0);
      height = readUint32(data, 4);
      if (width < 1 || height < 1 || width > MAXIMUM_SOURCE_AXIS || height > MAXIMUM_SOURCE_AXIS) {
        throw new Error(
          `Generated PNG declares ${width} by ${height}; each axis must be 1-${MAXIMUM_SOURCE_AXIS}.`,
        );
      }
      if (data[8] !== 8 || data[9] !== 2 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error(
          "Generated PNG must be non-interlaced 8-bit RGB with standard compression and filtering.",
        );
      }
    } else if (type === "IDAT") {
      compressedParts.push(data);
    } else if (type === "IEND") {
      sawEnd = true;
      cursor = dataEnd + 4;
      break;
    }
    cursor = dataEnd + 4;
  }
  if (width === undefined || height === undefined || compressedParts.length === 0 || !sawEnd) {
    throw new Error("Generated PNG is missing IHDR, IDAT, or IEND data.");
  }
  if (cursor !== bytes.byteLength) throw new Error("Generated PNG contains bytes after IEND.");

  const rowBytes = width * 3;
  const inflated = new Uint8Array(inflateSync(concatenate(compressedParts)));
  if (inflated.byteLength !== height * (rowBytes + 1)) {
    throw new Error(
      `Generated PNG inflated to ${inflated.byteLength} bytes; ${width} by ${height} RGB requires ${height * (rowBytes + 1)}.`,
    );
  }
  const rgb = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[y * (rowBytes + 1)];
    if (filter > 4) throw new Error(`Generated PNG row ${y} uses unsupported filter ${filter}.`);
    const sourceOffset = y * (rowBytes + 1) + 1;
    const rowOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = inflated[sourceOffset + x];
      const left = x >= 3 ? rgb[rowOffset + x - 3] : 0;
      const up = y > 0 ? rgb[rowOffset + x - rowBytes] : 0;
      const upperLeft = y > 0 && x >= 3 ? rgb[rowOffset + x - rowBytes - 3] : 0;
      rgb[rowOffset + x] = unfilterByte(filter, raw, left, up, upperLeft);
    }
  }

  const data = new Uint8ClampedArray(width * height * 4);
  for (let source = 0, target = 0; source < rgb.byteLength; source += 3, target += 4) {
    data[target] = rgb[source];
    data[target + 1] = rgb[source + 1];
    data[target + 2] = rgb[source + 2];
    data[target + 3] = 255;
  }
  return { data, width, height };
}

export function resizeRgbaBilinear(image, targetWidth, targetHeight = targetWidth) {
  if (!Number.isInteger(targetWidth) || !Number.isInteger(targetHeight)) {
    throw new Error("Normalized fixture dimensions must be integers.");
  }
  if (targetWidth < 48 || targetHeight < 48 || targetWidth > 2048 || targetHeight > 2048) {
    throw new Error("Normalized fixture dimensions must stay between 48 and 2048 pixels per axis.");
  }
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const xScale = image.width / targetWidth;
  const yScale = image.height / targetHeight;
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.max(0, Math.min(image.height - 1, (y + 0.5) * yScale - 0.5));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const yWeight = sourceY - y0;
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.max(0, Math.min(image.width - 1, (x + 0.5) * xScale - 0.5));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const xWeight = sourceX - x0;
      const target = (y * targetWidth + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const top =
          image.data[(y0 * image.width + x0) * 4 + channel] * (1 - xWeight) +
          image.data[(y0 * image.width + x1) * 4 + channel] * xWeight;
        const bottom =
          image.data[(y1 * image.width + x0) * 4 + channel] * (1 - xWeight) +
          image.data[(y1 * image.width + x1) * 4 + channel] * xWeight;
        output[target + channel] = Math.round(top * (1 - yWeight) + bottom * yWeight);
      }
    }
  }
  return { data: output, width: targetWidth, height: targetHeight };
}

export function measureMiniatureResidual(image, proofSize = 48) {
  const proof = resizeRgbaBilinear(image, proofSize);
  const reconstructed = resizeRgbaBilinear(proof, image.width, image.height);
  let absoluteRgbError = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    absoluteRgbError += Math.abs(image.data[index] - reconstructed.data[index]);
    absoluteRgbError += Math.abs(image.data[index + 1] - reconstructed.data[index + 1]);
    absoluteRgbError += Math.abs(image.data[index + 2] - reconstructed.data[index + 2]);
  }
  return absoluteRgbError / (image.width * image.height * 3 * 255);
}

export async function normalizeGeneratedFixtureArt({ sourcePath, outputPath, size = 896, quality = 78 }) {
  const source = new Uint8Array(await readFile(sourcePath));
  const decoded = decodeGeneratedRgbPng(source);
  if (decoded.width !== decoded.height) {
    throw new Error(
      `Generated fixture input is ${decoded.width} by ${decoded.height}; provide square source art before normalization.`,
    );
  }
  const resized = resizeRgbaBilinear(decoded, size);
  await initializeEncoder();
  const encoded = new Uint8Array(
    await encodeWebp(resized, {
      quality,
      method: 6,
      pass: 8,
      segments: 4,
      sns_strength: 35,
      filter_strength: 25,
      filter_sharpness: 2,
      autofilter: 1,
      use_sharp_yuv: 1,
    }),
  );
  if (encoded.byteLength > MAXIMUM_OUTPUT_BYTES) {
    throw new Error(
      `Normalized fixture is ${encoded.byteLength} bytes; lower quality or simplify the source to stay at or below ${MAXIMUM_OUTPUT_BYTES} bytes.`,
    );
  }
  await writeFile(outputPath, encoded, { flag: "wx" });
  return { width: size, height: size, byteLength: encoded.byteLength };
}

let encoderReady;
async function initializeEncoder() {
  if (!encoderReady) {
    encoderReady = (async () => {
      const wasmPath = path.resolve("node_modules/@jsquash/webp/codec/enc/webp_enc_simd.wasm");
      await initializeWebpEncoder(await WebAssembly.compile(await readFile(wasmPath)));
    })();
  }
  return encoderReady;
}

function unfilterByte(filter, raw, left, up, upperLeft) {
  if (filter === 0) return raw;
  if (filter === 1) return (raw + left) & 255;
  if (filter === 2) return (raw + up) & 255;
  if (filter === 3) return (raw + Math.floor((left + up) / 2)) & 255;
  return (raw + paeth(left, up, upperLeft)) & 255;
}

function paeth(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
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

function sameBytes(left, right) {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(import.meta.filename)) {
  const [sourcePath, outputPath, sizeArgument, qualityArgument] = process.argv.slice(2);
  if (!sourcePath || !outputPath) {
    process.stderr.write(
      "Usage: node scripts/normalize-generated-fixture-art.mjs <source.png> <output.webp> [size] [quality]\n",
    );
    process.exitCode = 1;
  } else {
    try {
      const result = await normalizeGeneratedFixtureArt({
        sourcePath,
        outputPath,
        size: sizeArgument === undefined ? 896 : Number(sizeArgument),
        quality: qualityArgument === undefined ? 78 : Number(qualityArgument),
      });
      process.stdout.write(`${outputPath} ${result.width}x${result.height} ${result.byteLength} bytes\n`);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  }
}
