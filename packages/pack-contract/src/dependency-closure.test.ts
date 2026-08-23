import { zlibSync } from "fflate";
import { describe, expect, it } from "vitest";

import { compilePack, preparePackObject } from "../../pack-compiler/src/index.js";
import { admitPack } from "./admission.js";
import { validatePackDependencyClosure } from "./dependency-closure.js";
import { binaryCrc32 } from "./published-png.js";
import { catalogueManifestFixture, fixtureObjectBytes } from "./test-fixtures.js";

describe("exact pack dependency closure", () => {
  it("accepts visual fallback IDs supplied by the exact admitted theme", async () => {
    const { root, theme } = await compileClosure();

    expect(() => validatePackDependencyClosure(root, [theme])).not.toThrow();
  });

  it("rejects a syntactically valid fallback ID absent from the exact admitted theme", async () => {
    const { root, theme } = await compileClosure({ frontTemplateId: "missing-front" });

    expect(() => validatePackDependencyClosure(root, [theme])).toThrow(
      /missing-front.*front fallback template.*exact theme.*heirloom-front/i,
    );
  });

  it("rejects a visual shape absent from the exact admitted theme", async () => {
    const { root, theme } = await compileClosure({ shape: "square" });

    expect(() => validatePackDependencyClosure(root, [theme])).toThrow(
      /uses shape square.*exact theme.*supports circle/i,
    );
  });

  it("rejects a visual material absent from the exact admitted theme", async () => {
    const { root, theme } = await compileClosure({ material: "wool" });

    expect(() => validatePackDependencyClosure(root, [theme])).toThrow(
      /uses material wool.*exact theme.*supports metal/i,
    );
  });

  it("does not substitute a same-version theme fork for the pinned exact dependency", async () => {
    const { root, theme } = await compileClosure();
    const fork = await compileTheme(17);
    expect(fork.packRef.packId).toBe(theme.packRef.packId);
    expect(fork.packRef.version).toBe(theme.packRef.version);
    expect(fork.packRef.packDigest).not.toBe(theme.packRef.packDigest);

    expect(() => validatePackDependencyClosure(root, [fork])).toThrow(/same-version fork.*exact release/i);
  });

  it("rejects admitted dependency files that are not reachable from the root manifest", async () => {
    const { root, theme } = await compileClosure();
    const extra = await compileTheme(29, "badge.theme.extra");

    expect(() => validatePackDependencyClosure(root, [theme, extra])).toThrow(
      /unreferenced pack.*remove it/i,
    );
  });
});

async function compileClosure(
  overrides: {
    readonly frontTemplateId?: string;
    readonly material?: "metal" | "wool" | "enamel";
    readonly shape?: "circle" | "square" | "rectangle" | "shield";
  } = {},
) {
  const theme = await compileTheme(0);
  const entry = catalogueManifestFixture.entries[0];
  const manifest = {
    ...catalogueManifestFixture,
    dependencies: [theme.packRef],
    themePack: theme.packRef,
    entries: [
      {
        ...entry,
        visual: {
          ...entry.visual,
          renderRecipe: {
            ...entry.visual.renderRecipe,
            material: overrides.material ?? entry.visual.renderRecipe.material,
            shape: overrides.shape ?? entry.visual.renderRecipe.shape,
          },
          fallback: {
            frontTemplateId: overrides.frontTemplateId ?? "heirloom-front",
            edgeTemplateId: "heirloom-edge",
            backTemplateId: "heirloom-back",
          },
        },
      },
    ],
  };
  const compiled = await compilePack({
    manifest,
    objects: [
      {
        hash: catalogueManifestFixture.objects[0].hash,
        bytes: fixtureObjectBytes,
      },
    ],
  });
  return { root: await admitPack(compiled.bytes), theme };
}

async function compileTheme(pixelOffset: number, packId = "badge.theme.heirloom") {
  const specs = [
    { role: "fallback-front" as const, templateId: "heirloom-front", value: 1 + pixelOffset },
    { role: "fallback-edge" as const, templateId: "heirloom-edge", value: 2 + pixelOffset },
    { role: "fallback-back" as const, templateId: "heirloom-back", value: 3 + pixelOffset },
  ];
  const prepared = await Promise.all(
    specs.map(async (spec) => ({
      spec,
      object: await preparePackObject({
        bytes: grayscalePng(spec.value),
        mimeType: "image/png",
        role: spec.role,
        width: 1,
        height: 1,
      }),
    })),
  );
  const ordered = [...prepared].sort((left, right) => left.object.hash.localeCompare(right.object.hash));
  const byRole = new Map(prepared.map((item) => [item.spec.role, item]));
  const fallback = (role: (typeof specs)[number]["role"]) => {
    const item = byRole.get(role);
    if (!item) throw new Error(`Test theme is missing ${role}`);
    return { templateId: item.spec.templateId, objectHash: item.object.hash };
  };
  const compiled = await compilePack({
    manifest: {
      schemaVersion: 1,
      kind: "theme",
      packId,
      version: "1.0.0",
      minimumArchiveVersion: "0.1.0",
      dependencies: [],
      objects: ordered.map((item) => item.object.entry),
      compatibility: { renderRecipeVersions: [1] },
      licenses: [{ id: "fixture", name: "Fixture" }],
      provenance: { source: "curated", summary: "Dependency closure fixture." },
      theme: {
        shapes: ["circle"],
        materials: ["metal"],
        fallbackTemplates: {
          front: fallback("fallback-front"),
          edge: fallback("fallback-edge"),
          back: fallback("fallback-back"),
        },
      },
    },
    objects: ordered.map((item) => item.object),
  });
  return admitPack(compiled.bytes);
}

function grayscalePng(value: number): Uint8Array {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, 1, false);
  view.setUint32(4, 1, false);
  header.set([8, 0, 0, 0, 0], 8);
  return joinBytes([
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlibSync(Uint8Array.from([0, value & 0xff]))),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.byteLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.byteLength, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.byteLength, binaryCrc32(typeBytes, data), false);
  return chunk;
}

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
