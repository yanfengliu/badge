import {
  DataTexture,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
} from "three";

export const WOOL_WEAVE_SIZE = 64;

export function createWoolWeavePixels(size = WOOL_WEAVE_SIZE): Uint8Array {
  if (!Number.isInteger(size) || size < 16) {
    throw new RangeError("Wool weave size must be an integer of at least 16 pixels.");
  }

  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const warp = Math.cos((x / 4) * Math.PI) * 18;
      const weft = Math.cos((y / 4) * Math.PI) * 16;
      const overUnder = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? 14 : -12;
      const fiber = Math.sin((x * 13 + y * 7) * 0.37) * 5;
      const value = Math.round(Math.min(246, Math.max(156, 210 + warp + weft + overUnder + fiber)));
      const offset = (y * size + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

export function createWoolWeaveTexture(): DataTexture {
  const texture = new DataTexture(
    createWoolWeavePixels(),
    WOOL_WEAVE_SIZE,
    WOOL_WEAVE_SIZE,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.name = "badge-wool-weave-v1";
  texture.colorSpace = NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
