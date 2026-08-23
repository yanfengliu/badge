import { createHash } from "node:crypto";

import { zipSync, zlibSync } from "fflate";

const FIXED_ZIP_OPTIONS = Object.freeze({
  level: 0,
  mtime: new Date(1980, 0, 1, 0, 0, 0, 0),
  os: 0,
  attrs: 0,
});
const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const encoder = new TextEncoder();
const EXPECTED_THEME_PACK_DIGEST = "92ec4fd60efdabbc925e3e1077c4a1f1f05ccfad79466d9f386e027e815ca910";
const EXPECTED_STARTER_PACK_DIGEST = "5b7135a70477130907050a9921da342e927980838ee9b1ae03a4d41809c6ffe3";

export const starterPackFixtureMetadata = Object.freeze({
  packId: "badge.catalogue.starter",
  version: "1.0.0-alpha.3",
  badges: [
    {
      definitionId: "visited-yosemite",
      collectionId: "us-national-parks",
      fileName: "yosemite-literal.png",
      title: "Yosemite",
      criterion: "Visit Yosemite National Park",
      description: "Granite, river, and wonder—kept as one honest memory.",
      accessibleDescription: "An engraved Yosemite valley with El Capitan and a turquoise river.",
      visualEditionId: "visual.yosemite.literal.png.v1",
      sourceAssetHash: "21173941d3ad44ff0f245dcef0f1bbf2606b39163442afcc24777d442dda2ece",
      renderRecipe: {
        version: 1,
        shape: "circle",
        material: "metal",
        borderColor: "#8f806c",
        borderWidth: 0.075,
        thickness: 0.13,
        relief: 0.032,
        crop: { x: 0.5, y: 0.5, scale: 1.03 },
      },
    },
    {
      definitionId: "read-sapiens",
      collectionId: "books-read",
      fileName: "sapiens.png",
      title: "Read Sapiens",
      criterion: "Finish reading Sapiens",
      description: "A long view of the stories people build together.",
      accessibleDescription: "Layered human silhouettes and paths flowing toward a distant horizon.",
      visualEditionId: "visual.sapiens.journey.png.v1",
      sourceAssetHash: "296c08b967b50dfbefdb8c8187f48943c11b3d3976d4d724fd248be335431729",
      renderRecipe: {
        version: 1,
        shape: "rectangle",
        material: "wool",
        borderColor: "#a65c3e",
        borderWidth: 0.055,
        thickness: 0.075,
        relief: 0.018,
        crop: { x: 0.5, y: 0.52, scale: 1.05 },
      },
    },
    {
      definitionId: "finished-bachelors-degree",
      collectionId: "life-milestones",
      fileName: "bachelors-degree.png",
      title: "Bachelor's degree",
      criterion: "Complete a bachelor's degree",
      description: "Years of patient work resolving into an open threshold.",
      accessibleDescription: "Ascending stone planes lead to a bright open doorway.",
      visualEditionId: "visual.degree.threshold.png.v1",
      sourceAssetHash: "2af87c6a64740642f85ae37bc702a206c8c817531acb9d5aaf44269c5369a737",
      renderRecipe: {
        version: 1,
        shape: "shield",
        material: "enamel",
        borderColor: "#b8aa8e",
        borderWidth: 0.065,
        thickness: 0.11,
        relief: 0.026,
        crop: { x: 0.5, y: 0.48, scale: 1.08 },
      },
    },
    {
      definitionId: "visited-all-us-national-parks",
      collectionId: "us-national-parks",
      fileName: "all-parks.png",
      title: "Every national park",
      criterion: "Visit every park in the active U.S. National Parks catalogue",
      description: "A composite journey whose final picture was published before the last activation.",
      accessibleDescription:
        "Many American landscapes connected by one fine trail across a topographic field.",
      visualEditionId: "visual.all-parks.constellation.png.v1",
      sourceAssetHash: "0b2ec88a2ee72eb85de9525020bfdc419fada5f1dfc6a6ea381df3ff32fa3c6c",
      renderRecipe: {
        version: 1,
        shape: "circle",
        material: "enamel",
        borderColor: "#6f6657",
        borderWidth: 0.09,
        thickness: 0.14,
        relief: 0.035,
        crop: { x: 0.5, y: 0.5, scale: 1.02 },
      },
    },
  ],
});

const fallbackSpecs = [
  { role: "fallback-front", templateId: "heirloom-front", rgba: [176, 135, 78, 255] },
  { role: "fallback-edge", templateId: "heirloom-edge", rgba: [72, 61, 48, 255] },
  { role: "fallback-back", templateId: "heirloom-back", rgba: [38, 45, 43, 255] },
];

export function compileHeirloomThemeFixture() {
  const objects = fallbackSpecs
    .map((spec) => {
      const bytes = solidFallbackPng(spec.rgba);
      const hash = sha256Hex(bytes);
      return {
        spec,
        hash,
        bytes,
        entry: {
          hash,
          mimeType: "image/png",
          byteLength: bytes.byteLength,
          role: spec.role,
          width: 1,
          height: 1,
        },
      };
    })
    .sort((left, right) => left.hash.localeCompare(right.hash));
  const byRole = new Map(objects.map((object) => [object.spec.role, object]));
  const fallback = (role) => ({
    templateId: byRole.get(role).spec.templateId,
    objectHash: byRole.get(role).hash,
  });
  const manifest = {
    schemaVersion: 1,
    kind: "theme",
    packId: "badge.theme.heirloom",
    version: "1.0.0",
    minimumArchiveVersion: "0.1.0",
    dependencies: [],
    objects: objects.map((object) => object.entry),
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
  };
  const compiled = compileCanonicalPack(manifest, objects);
  if (compiled.packRef.packDigest !== EXPECTED_THEME_PACK_DIGEST) {
    throw new Error(
      `Heirloom theme ${manifest.packId}@${manifest.version} compiled as ${compiled.packRef.packDigest}, not pinned ${EXPECTED_THEME_PACK_DIGEST}; bump the theme version and reviewed digest instead of creating a same-version fork.`,
    );
  }
  return compiled;
}

export function compileStarterCatalogueFixture(pngByFileName) {
  const theme = compileHeirloomThemeFixture();
  const objects = starterPackFixtureMetadata.badges
    .map((badge) => {
      const bytes = pngByFileName.get(badge.fileName);
      if (!(bytes instanceof Uint8Array)) {
        throw new Error(`Starter pack input ${badge.fileName} is missing; generate Archive fixtures first.`);
      }
      const hash = sha256Hex(bytes);
      if (hash !== badge.sourceAssetHash) {
        throw new Error(
          `Starter pack input ${badge.fileName} hashes to ${hash}, not published source ${badge.sourceAssetHash}.`,
        );
      }
      return {
        hash,
        bytes,
        entry: {
          hash,
          mimeType: "image/png",
          byteLength: bytes.byteLength,
          role: "source-art",
          width: 896,
          height: 896,
        },
      };
    })
    .sort((left, right) => left.hash.localeCompare(right.hash));
  const collections = [
    {
      collectionId: "us-national-parks",
      title: "U.S. National Parks",
      description: "Places remembered honestly, one visit at a time.",
      definitionIds: ["visited-yosemite", "visited-all-us-national-parks"],
    },
    {
      collectionId: "books-read",
      title: "Books read",
      description: "Books finished and worth remembering.",
      definitionIds: ["read-sapiens"],
    },
    {
      collectionId: "life-milestones",
      title: "Life milestones",
      description: "Long efforts that changed the shape of a life.",
      definitionIds: ["finished-bachelors-degree"],
    },
  ];
  const manifest = {
    schemaVersion: 1,
    kind: "catalogue",
    packId: starterPackFixtureMetadata.packId,
    version: starterPackFixtureMetadata.version,
    minimumArchiveVersion: "0.1.0",
    dependencies: [theme.packRef],
    objects: objects.map((object) => object.entry),
    compatibility: { renderRecipeVersions: [1] },
    licenses: [{ id: "badge-fixture", name: "Badge generated fixture art" }],
    provenance: { source: "generated", summary: "Curated local starter catalogue fixture." },
    themePack: theme.packRef,
    collections,
    entries: starterPackFixtureMetadata.badges.map((badge) => ({
      definition: {
        definitionId: badge.definitionId,
        semanticRevision: 1,
        title: badge.title,
        criterion: badge.criterion,
        description: badge.description,
        collectionIds: [badge.collectionId],
      },
      visual: {
        visualEditionId: badge.visualEditionId,
        version: starterPackFixtureMetadata.version,
        sourceArtHash: badge.sourceAssetHash,
        renderRecipe: badge.renderRecipe,
        fallback: {
          frontTemplateId: "heirloom-front",
          edgeTemplateId: "heirloom-edge",
          backTemplateId: "heirloom-back",
        },
        accessibleDescription: badge.accessibleDescription,
      },
    })),
  };
  const compiled = compileCanonicalPack(manifest, objects);
  if (compiled.packRef.packDigest !== EXPECTED_STARTER_PACK_DIGEST) {
    throw new Error(
      `Starter catalogue ${manifest.packId}@${manifest.version} compiled as ${compiled.packRef.packDigest}, not pinned ${EXPECTED_STARTER_PACK_DIGEST}; bump the catalogue version and reviewed digest instead of creating a same-version fork.`,
    );
  }
  return { ...compiled, theme };
}

function compileCanonicalPack(manifest, objects) {
  const entries = { "manifest.json": [encoder.encode(canonicalJson(manifest)), FIXED_ZIP_OPTIONS] };
  for (const object of objects) {
    entries[`objects/${object.hash}`] = [object.bytes, FIXED_ZIP_OPTIONS];
  }
  const bytes = zipSync(entries, FIXED_ZIP_OPTIONS);
  return {
    bytes,
    manifest,
    packRef: { packId: manifest.packId, version: manifest.version, packDigest: sha256Hex(bytes) },
  };
}

function solidFallbackPng(rgba) {
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

function pngChunk(type, data) {
  const typeBytes = encoder.encode(type);
  const chunk = new Uint8Array(12 + data.byteLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.byteLength, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(typeBytes, data), false);
  return chunk;
}

function crc32(...parts) {
  let crc = 0xffffffff;
  for (const part of parts) {
    for (const byte of part) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function joinBytes(parts) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function canonicalJson(value) {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Pack fixture canonical JSON received an unsupported value.");
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
