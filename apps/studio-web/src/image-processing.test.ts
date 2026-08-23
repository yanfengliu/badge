import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_STUDIO_IMAGE_BYTES,
  MAX_STUDIO_IMAGE_DIMENSION,
  createStudioTreatment,
  readImageAsset,
} from "./image-processing.js";

function pngHeader(width = 1, height = 1): Uint8Array {
  const bytes = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  return bytes;
}

function imageBlob(bytes = pngHeader()): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}

function bitmap(width: number, height: number, close = vi.fn()): ImageBitmap {
  return { width, height, close } as unknown as ImageBitmap;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Studio image ingress safety", () => {
  it("rejects an oversized Blob before decode, byte read, or hashing", async () => {
    const source = imageBlob();
    Object.defineProperty(source, "size", { value: MAX_STUDIO_IMAGE_BYTES + 1 });
    const read = vi.spyOn(source, "arrayBuffer");
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);

    await expect(readImageAsset(source)).rejects.toThrow(
      new RegExp(`Selected Studio image.*${MAX_STUDIO_IMAGE_BYTES + 1} bytes.*choose`, "i"),
    );

    expect(decode).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("rejects an unsupported MIME label before decode, byte read, or hashing", async () => {
    const source = new Blob([Uint8Array.of(1, 2, 3)], { type: "image/svg+xml" });
    const read = vi.spyOn(source, "arrayBuffer");
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);

    await expect(readImageAsset(source)).rejects.toThrow(/MIME type image\/svg\+xml.*choose/i);

    expect(decode).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("rejects extreme declared dimensions before native decode, hashing, or canvas allocation", async () => {
    const source = imageBlob(pngHeader(MAX_STUDIO_IMAGE_DIMENSION, MAX_STUDIO_IMAGE_DIMENSION));
    const read = vi.spyOn(source, "arrayBuffer");
    const decode = vi.fn();
    const createElement = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    vi.stubGlobal("document", { createElement });

    await expect(createStudioTreatment(source)).rejects.toThrow(
      new RegExp(`${MAX_STUDIO_IMAGE_DIMENSION}x${MAX_STUDIO_IMAGE_DIMENSION}.*pixels.*choose`, "i"),
    );

    expect(read).toHaveBeenCalledTimes(1);
    expect(decode).not.toHaveBeenCalled();
    expect(createElement).not.toHaveBeenCalled();
  });

  it("also rejects unsafe dimensions returned by native decode and closes its bitmap", async () => {
    const source = imageBlob();
    const close = vi.fn();
    const decode = vi.fn(async () => bitmap(MAX_STUDIO_IMAGE_DIMENSION, MAX_STUDIO_IMAGE_DIMENSION, close));
    vi.stubGlobal("createImageBitmap", decode);

    await expect(readImageAsset(source)).rejects.toThrow(/declares.*pixels.*choose/i);

    expect(decode).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      label: "JPEG",
      blob: () => {
        const bytes = new Uint8Array(21);
        bytes.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x20, 0, 0x20, 0, 3]);
        return new Blob([bytes], { type: "image/jpeg" });
      },
    },
    {
      label: "WebP",
      blob: () => {
        const bytes = new Uint8Array(30);
        bytes.set(new TextEncoder().encode("RIFF"), 0);
        new DataView(bytes.buffer).setUint32(4, 22, true);
        bytes.set(new TextEncoder().encode("WEBPVP8X"), 8);
        new DataView(bytes.buffer).setUint32(16, 10, true);
        bytes.set([0xff, 0x1f, 0, 0xff, 0x1f, 0], 24);
        return new Blob([bytes], { type: "image/webp" });
      },
    },
  ])("rejects extreme $label header dimensions before native decode", async ({ blob }) => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);

    await expect(readImageAsset(blob())).rejects.toThrow(/8192x8192.*pixels.*choose/i);

    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects MIME-spoofed bytes before native decode", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);

    await expect(
      readImageAsset(new Blob([new Uint8Array(pngHeader())], { type: "image/jpeg" })),
    ).rejects.toThrow(/JPEG start-of-image marker is missing/i);

    expect(decode).not.toHaveBeenCalled();
  });
});
