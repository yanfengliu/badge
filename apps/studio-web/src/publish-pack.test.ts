import { describe, expect, it, vi } from "vitest";

import { compileHeirloomThemePack } from "./heirloom-theme-pack.js";
import {
  MAX_STUDIO_IMAGE_BYTES,
  MAX_STUDIO_IMAGE_DIMENSION,
  validateImageAssetForPublication,
} from "./image-processing.js";
import { publishYosemitePack } from "./publish-pack.js";

const PNG_BYTES = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181,
  28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102, 0, 0,
  0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);
const SECOND_PNG_BYTES = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21,
  196, 137, 0, 0, 0, 1, 115, 82, 71, 66, 0, 174, 206, 28, 233, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 99, 248,
  207, 192, 240, 31, 0, 5, 0, 1, 255, 86, 199, 47, 13, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

const recipe = {
  version: 1 as const,
  shape: "circle" as const,
  material: "metal" as const,
  borderColor: "#b87333",
  borderWidth: 0.08,
  thickness: 0.1,
  relief: 0.03,
  crop: { x: 0.5, y: 0.5, scale: 1 },
};

const pngAsset = {
  blob: new Blob([PNG_BYTES], { type: "image/png" }),
  bytes: PNG_BYTES,
  hash: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
  mimeType: "image/png" as const,
  width: 1,
  height: 1,
};
const secondPngAsset = {
  ...pngAsset,
  blob: new Blob([SECOND_PNG_BYTES], { type: "image/png" }),
  bytes: SECOND_PNG_BYTES,
  hash: "40608fc14ad54b68b2bff707f844efb5b342f85c51b5438c95b0bc78f06d0fa3",
};

describe("Studio release identity", () => {
  it("builds and independently admits the exact theme dependency bytes", async () => {
    const first = await compileHeirloomThemePack();
    const replay = await compileHeirloomThemePack();

    expect(replay.packRef).toEqual(first.packRef);
    expect(replay.bytes).toEqual(first.bytes);
    expect(first.admitted.packRef).toEqual(first.packRef);
    expect(first.admitted.manifest.kind).toBe("theme");
    expect(first.packRef).toEqual({
      packId: "badge.theme.heirloom",
      version: "1.0.0",
      packDigest: "92ec4fd60efdabbc925e3e1077c4a1f1f05ccfad79466d9f386e027e815ca910",
    });
  });

  it("replays identical content as the same admitted content-addressed prerelease", async () => {
    const input = {
      asset: pngAsset,
      recipe,
      provenance: "generated" as const,
      accessibleDescription: "A crafted Yosemite badge.",
    };

    const first = await publishYosemitePack(input);
    const replay = await publishYosemitePack(input);

    expect(replay.packRef).toEqual(first.packRef);
    expect(replay.bytes).toEqual(first.bytes);
    expect(first.packRef.version).toMatch(/^0\.1\.0-studio\.[0-9a-f]{64}$/);
    expect(first.admitted.packRef).toEqual(first.packRef);
    expect(first.admitted.manifest.dependencies).toEqual([first.themeDependency.packRef]);
    expect(first.themeDependency.admitted.packRef).toEqual(first.themeDependency.packRef);
  });

  it("assigns a different version when frozen visual content changes", async () => {
    const first = await publishYosemitePack({
      asset: pngAsset,
      recipe,
      provenance: "generated",
      accessibleDescription: "A crafted Yosemite badge.",
    });
    const changed = await publishYosemitePack({
      asset: pngAsset,
      recipe: { ...recipe, material: "wool" },
      provenance: "generated",
      accessibleDescription: "A crafted Yosemite badge.",
    });

    expect(changed.packRef.version).not.toBe(first.packRef.version);
    expect(changed.packRef.packDigest).not.toBe(first.packRef.packDigest);
  });

  it("assigns a different immutable release when replacement source pixels change", async () => {
    const first = await publishYosemitePack({
      asset: pngAsset,
      recipe,
      provenance: "uploaded",
      accessibleDescription: "A user-supplied image used as the badge face.",
    });
    const replacement = await publishYosemitePack({
      asset: secondPngAsset,
      recipe,
      provenance: "uploaded",
      accessibleDescription: "A user-supplied image used as the badge face.",
    });

    expect(replacement.packRef.version).not.toBe(first.packRef.version);
    expect(replacement.packRef.packDigest).not.toBe(first.packRef.packDigest);
    expect(replacement.bytes).not.toEqual(first.bytes);
  });

  it("records uploaded artwork honestly in the admitted manifest", async () => {
    const published = await publishYosemitePack({
      asset: pngAsset,
      recipe,
      provenance: "uploaded",
      accessibleDescription: "A personal Yosemite photograph.",
    });

    expect(published.admitted.manifest.provenance.source).toBe("uploaded");
  });

  it("refuses non-PNG publication input before compilation", async () => {
    await expect(
      publishYosemitePack({
        asset: { ...pngAsset, mimeType: "image/webp", blob: new Blob([PNG_BYTES], { type: "image/webp" }) },
        recipe,
        provenance: "generated",
        accessibleDescription: "A crafted Yosemite badge.",
      }),
    ).rejects.toThrow(/normalize.*PNG/i);
  });

  it("refuses unsafe decoded dimensions before publication", async () => {
    await expect(
      publishYosemitePack({
        asset: {
          ...pngAsset,
          width: MAX_STUDIO_IMAGE_DIMENSION,
          height: MAX_STUDIO_IMAGE_DIMENSION,
        },
        recipe,
        provenance: "generated",
        accessibleDescription: "A crafted Yosemite badge.",
      }),
    ).rejects.toThrow(/publication artwork.*pixels.*choose/i);
  });

  it("refuses an oversized publication Blob before rereading or hashing it", async () => {
    const blob = new Blob([PNG_BYTES], { type: "image/png" });
    Object.defineProperty(blob, "size", { value: MAX_STUDIO_IMAGE_BYTES + 1 });
    const read = vi.spyOn(blob, "arrayBuffer");

    await expect(
      publishYosemitePack({
        asset: { ...pngAsset, blob },
        recipe,
        provenance: "generated",
        accessibleDescription: "A crafted Yosemite badge.",
      }),
    ).rejects.toThrow(/publication artwork.*bytes.*choose/i);
    expect(read).not.toHaveBeenCalled();
  });

  it("returns publication bytes detached from the caller's mutable Uint8Array", async () => {
    const callerBytes = new Uint8Array(PNG_BYTES);
    const validated = await validateImageAssetForPublication({
      ...pngAsset,
      bytes: callerBytes,
      blob: new Blob([callerBytes], { type: "image/png" }),
    });

    callerBytes.fill(0);

    expect(validated.bytes).toEqual(PNG_BYTES);
  });

  it("freezes the recipe snapshot before the first asynchronous publication boundary", async () => {
    const mutableRecipe = { ...recipe, crop: { ...recipe.crop } };
    const pending = publishYosemitePack({
      asset: { ...pngAsset, bytes: new Uint8Array(PNG_BYTES) },
      recipe: mutableRecipe,
      provenance: "generated",
      accessibleDescription: "A crafted Yosemite badge.",
    });

    mutableRecipe.crop.x = 0.1;
    const published = await pending;

    expect(published.admitted.manifest.kind).toBe("targeted-visual");
    if (published.admitted.manifest.kind !== "targeted-visual") {
      throw new Error("Published fixture changed pack kind.");
    }
    expect(published.admitted.manifest.visual.renderRecipe.crop.x).toBe(0.5);
  });
});
