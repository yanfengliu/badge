import { admitPack } from "@badge/pack-contract";
import { compilePack, preparePackObject } from "@badge/pack-compiler";
import { zlibSync } from "fflate";

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const textEncoder = new TextEncoder();
const EXPECTED_THEME_PACK_DIGEST = "92ec4fd60efdabbc925e3e1077c4a1f1f05ccfad79466d9f386e027e815ca910";

const fallbackSpecs = [
  { role: "fallback-front" as const, templateId: "heirloom-front", rgba: [176, 135, 78, 255] },
  { role: "fallback-edge" as const, templateId: "heirloom-edge", rgba: [72, 61, 48, 255] },
  { role: "fallback-back" as const, templateId: "heirloom-back", rgba: [38, 45, 43, 255] },
] as const;

function crc32(...parts: readonly Uint8Array[]): number {
  let crc = 0xffffffff;
  for (const part of parts) {
    for (const byte of part) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = textEncoder.encode(type);
  const chunk = new Uint8Array(12 + data.byteLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.byteLength, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(typeBytes, data), false);
  return chunk;
}

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }
  return joined;
}

function solidFallbackPng(rgba: readonly number[]): Uint8Array {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, 1, false);
  view.setUint32(4, 1, false);
  header.set([8, 6, 0, 0, 0], 8);
  return joinBytes([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlibSync(Uint8Array.from([0, ...rgba]), { level: 9 })),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

export async function compileHeirloomThemePack() {
  const prepared = await Promise.all(
    fallbackSpecs.map(async (spec) => ({
      spec,
      object: await preparePackObject({
        bytes: solidFallbackPng(spec.rgba),
        mimeType: "image/png",
        role: spec.role,
        width: 1,
        height: 1,
      }),
    })),
  );
  const ordered = [...prepared].sort((left, right) => left.object.hash.localeCompare(right.object.hash));
  const byRole = new Map(prepared.map((item) => [item.spec.role, item]));
  const fallback = (role: (typeof fallbackSpecs)[number]["role"]) => {
    const item = byRole.get(role);
    if (!item) throw new Error(`Heirloom theme is missing ${role}.`);
    return { templateId: item.spec.templateId, objectHash: item.object.hash };
  };
  const manifest = {
    schemaVersion: 1,
    kind: "theme",
    packId: "badge.theme.heirloom",
    version: "1.0.0",
    minimumArchiveVersion: "0.1.0",
    dependencies: [],
    objects: ordered.map((item) => item.object.entry),
    compatibility: { renderRecipeVersions: [1] },
    licenses: [{ id: "badge-fixture", name: "Badge fixture assets" }],
    provenance: { source: "curated", summary: "Deterministic built-in fallback templates." },
    theme: {
      shapes: ["circle", "square", "rectangle", "shield"],
      materials: ["metal", "wool", "enamel"],
      fallbackTemplates: {
        front: fallback("fallback-front"),
        edge: fallback("fallback-edge"),
        back: fallback("fallback-back"),
      },
    },
  } as const;
  const compiled = await compilePack({ manifest, objects: ordered.map((item) => item.object) });
  if (compiled.packRef.packDigest !== EXPECTED_THEME_PACK_DIGEST) {
    throw new Error(
      `Heirloom theme ${manifest.packId}@${manifest.version} compiled as ${compiled.packRef.packDigest}, not pinned ${EXPECTED_THEME_PACK_DIGEST}; bump the theme version and its reviewed digest instead of creating a same-version fork.`,
    );
  }
  const admitted = await admitPack(compiled.bytes);
  return { ...compiled, admitted };
}
