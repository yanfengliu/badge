import { useTexture } from "@react-three/drei";
import type { Texture } from "three";

interface TextureReference {
  count: number;
  texture: Texture;
  disposalTimer: ReturnType<typeof globalThis.setTimeout> | null;
}

const references = new Map<string, TextureReference>();

export function retainSourceTexture(url: string, texture: Texture): () => void {
  const current = references.get(url);
  if (current) {
    if (current.disposalTimer !== null) globalThis.clearTimeout(current.disposalTimer);
    current.disposalTimer = null;
    current.count += 1;
  } else {
    references.set(url, { count: 1, texture, disposalTimer: null });
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const retained = references.get(url);
    if (!retained) return;
    retained.count = Math.max(0, retained.count - 1);
    if (retained.count !== 0 || retained.disposalTimer !== null) return;

    retained.disposalTimer = globalThis.setTimeout(() => {
      const latest = references.get(url);
      if (!latest || latest.count !== 0) return;
      useTexture.clear(url);
      latest.texture.dispose();
      references.delete(url);
    }, 0);
  };
}
