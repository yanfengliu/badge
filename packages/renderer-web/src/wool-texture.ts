import {
  DataTexture,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
} from "three";

export const WOOL_WEAVE_SIZE = 64;

const WOOL_TEXTURE_ANISOTROPY_CAP = 8;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function wrappedIndex(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function stampFiber(field: Float32Array, size: number, x: number, y: number, amount: number): void {
  const left = Math.floor(x);
  const top = Math.floor(y);
  const fractionX = x - left;
  const fractionY = y - top;

  for (let offsetY = 0; offsetY <= 1; offsetY += 1) {
    for (let offsetX = 0; offsetX <= 1; offsetX += 1) {
      const weight =
        (offsetX === 0 ? 1 - fractionX : fractionX) * (offsetY === 0 ? 1 - fractionY : fractionY);
      const targetX = wrappedIndex(left + offsetX, size);
      const targetY = wrappedIndex(top + offsetY, size);
      field[targetY * size + targetX] += amount * weight;
    }
  }
}

export function createWoolWeavePixels(size = WOOL_WEAVE_SIZE): Uint8Array {
  if (!Number.isInteger(size) || size < 16) {
    throw new RangeError("Wool weave size must be an integer of at least 16 pixels.");
  }

  const random = seededRandom(0x5f17_a11c ^ size);
  const field = new Float32Array(size * size);
  field.fill(210);

  const fiberCount = size * 7;
  for (let fiber = 0; fiber < fiberCount; fiber += 1) {
    const centerX = random() * size;
    const centerY = random() * size;
    const angle = random() * Math.PI;
    const tangentX = Math.cos(angle);
    const tangentY = Math.sin(angle);
    const normalX = -tangentY;
    const normalY = tangentX;
    const length = 2.5 + random() * 7.5;
    const strength = (random() < 0.5 ? -1 : 1) * (4 + random() * 7);
    const steps = Math.ceil(length * 2);

    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps - 0.5;
      const taper = Math.sin((step / steps) * Math.PI);
      const x = centerX + tangentX * length * progress;
      const y = centerY + tangentY * length * progress;
      stampFiber(field, size, x, y, strength * taper);
      stampFiber(field, size, x + normalX * 0.72, y + normalY * 0.72, -strength * taper * 0.46);
    }
  }

  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = (random() - 0.5) * 5;
      const value = Math.round(Math.min(240, Math.max(178, field[y * size + x] + grain)));
      const offset = (y * size + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

export function createWoolWeaveTexture(maxAnisotropy: number): DataTexture {
  const texture = new DataTexture(
    createWoolWeavePixels(),
    WOOL_WEAVE_SIZE,
    WOOL_WEAVE_SIZE,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.name = "badge-wool-fibers-v2";
  texture.colorSpace = NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.minFilter = LinearMipmapLinearFilter;
  const availableAnisotropy = Number.isNaN(maxAnisotropy) ? 1 : maxAnisotropy;
  texture.anisotropy = Math.max(1, Math.min(WOOL_TEXTURE_ANISOTROPY_CAP, Math.floor(availableAnisotropy)));
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
