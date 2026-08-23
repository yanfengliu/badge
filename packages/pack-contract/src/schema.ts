import { badgeMaterialSchema, badgeShapeSchema, renderRecipeSchema } from "@badge/render-recipe";
import { z } from "zod";

import { sha256DigestSchema } from "./hash.ts";

export const stableIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, "must be a lowercase stable identifier");

export const semanticVersionSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
    "must be a semantic version",
  );

export const packRefSchema = z
  .object({
    packId: stableIdSchema,
    version: semanticVersionSchema,
    packDigest: sha256DigestSchema,
  })
  .strict();
export type PackRef = z.infer<typeof packRefSchema>;

export const packObjectRoleSchema = z.enum([
  "source-art",
  "normal-map",
  "roughness-map",
  "height-map",
  "mask",
  "fallback-front",
  "fallback-edge",
  "fallback-back",
]);
export type PackObjectRole = z.infer<typeof packObjectRoleSchema>;

export const packObjectMimeTypeSchema = z.literal("image/png", {
  error:
    "Published pack objects must use image/png; normalize selected pixels to metadata-free PNG before publication.",
});
export type PackObjectMimeType = z.infer<typeof packObjectMimeTypeSchema>;

export const packObjectEntrySchema = z
  .object({
    hash: sha256DigestSchema,
    mimeType: packObjectMimeTypeSchema,
    byteLength: z
      .number()
      .int()
      .positive()
      .max(16 * 1024 * 1024),
    role: packObjectRoleSchema,
    width: z.number().int().positive().max(8_192),
    height: z.number().int().positive().max(8_192),
  })
  .strict();
export type PackObjectEntry = z.infer<typeof packObjectEntrySchema>;

const compatibilitySchema = z
  .object({
    renderRecipeVersions: z.array(z.literal(1)).length(1),
  })
  .strict();

const licenseSchema = z
  .object({
    id: stableIdSchema,
    name: z.string().trim().min(1).max(160),
  })
  .strict();

const provenanceSchema = z
  .object({
    source: z.enum(["curated", "generated", "uploaded"]),
    summary: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

const manifestBase = {
  schemaVersion: z.literal(1),
  packId: stableIdSchema,
  version: semanticVersionSchema,
  minimumArchiveVersion: semanticVersionSchema,
  dependencies: z.array(packRefSchema).max(32),
  objects: z.array(packObjectEntrySchema).max(1_024),
  compatibility: compatibilitySchema,
  licenses: z.array(licenseSchema).max(32),
  provenance: provenanceSchema,
};

const fallbackTemplateRefSchema = z
  .object({
    frontTemplateId: stableIdSchema,
    edgeTemplateId: stableIdSchema,
    backTemplateId: stableIdSchema,
  })
  .strict();

export const publishedBadgeVisualSchema = z
  .object({
    visualEditionId: stableIdSchema,
    version: semanticVersionSchema,
    sourceArtHash: sha256DigestSchema,
    renderRecipe: renderRecipeSchema,
    fallback: fallbackTemplateRefSchema,
    accessibleDescription: z.string().trim().min(1).max(500),
  })
  .strict();
export type PublishedBadgeVisual = z.infer<typeof publishedBadgeVisualSchema>;

const compositeRuleSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("allOf"),
    definitionIds: z.array(stableIdSchema).min(1).max(512),
  })
  .strict();

const badgeDefinitionSchema = z
  .object({
    definitionId: stableIdSchema,
    semanticRevision: z.number().int().positive(),
    title: z.string().trim().min(1).max(160),
    criterion: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(2_000),
    collectionIds: z.array(stableIdSchema).max(64),
    compositeRule: compositeRuleSchema.optional(),
  })
  .strict();

const ownedBadgeEntrySchema = z
  .object({
    definition: badgeDefinitionSchema,
    visual: publishedBadgeVisualSchema,
  })
  .strict();

const collectionDefinitionSchema = z
  .object({
    collectionId: stableIdSchema,
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    definitionIds: z.array(stableIdSchema).max(1_024),
  })
  .strict();

export const themePackManifestSchema = z
  .object({
    ...manifestBase,
    kind: z.literal("theme"),
    theme: z
      .object({
        shapes: z.array(badgeShapeSchema).min(1),
        materials: z.array(badgeMaterialSchema).min(1),
        fallbackTemplates: z
          .object({
            front: z.object({ templateId: stableIdSchema, objectHash: sha256DigestSchema }).strict(),
            edge: z.object({ templateId: stableIdSchema, objectHash: sha256DigestSchema }).strict(),
            back: z.object({ templateId: stableIdSchema, objectHash: sha256DigestSchema }).strict(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();
export type ThemePackManifest = z.infer<typeof themePackManifestSchema>;

export const catalogueBadgePackManifestSchema = z
  .object({
    ...manifestBase,
    kind: z.literal("catalogue"),
    themePack: packRefSchema,
    collections: z.array(collectionDefinitionSchema).min(1).max(256),
    entries: z.array(ownedBadgeEntrySchema).min(1).max(2_048),
  })
  .strict();
export type CatalogueBadgePackManifest = z.infer<typeof catalogueBadgePackManifestSchema>;

const badgeDefinitionTargetSchema = z
  .object({
    localDefinitionId: stableIdSchema,
    semanticRevision: z.number().int().positive(),
    requestId: z.string().uuid(),
    requestDigest: sha256DigestSchema,
  })
  .strict();

export const targetedVisualPackManifestSchema = z
  .object({
    ...manifestBase,
    kind: z.literal("targeted-visual"),
    themePack: packRefSchema,
    target: badgeDefinitionTargetSchema,
    visual: publishedBadgeVisualSchema,
  })
  .strict();
export type TargetedVisualPackManifest = z.infer<typeof targetedVisualPackManifestSchema>;

type ClosedPackManifest = ThemePackManifest | CatalogueBadgePackManifest | TargetedVisualPackManifest;

export const packManifestSchema = z
  .discriminatedUnion("kind", [
    themePackManifestSchema,
    catalogueBadgePackManifestSchema,
    targetedVisualPackManifestSchema,
  ])
  .superRefine((manifest, context) => {
    validateObjectTable(manifest, context);
    validateDependencies(manifest, context);
    validateReferences(manifest, context);
    if (manifest.kind === "catalogue") {
      validateCatalogue(manifest, context);
    }
  });
export type PackManifest = z.infer<typeof packManifestSchema>;

function validateObjectTable(manifest: ClosedPackManifest, context: z.RefinementCtx): void {
  const seen = new Set<string>();
  let previous = "";
  manifest.objects.forEach((object, index) => {
    if (seen.has(object.hash)) {
      context.addIssue({
        code: "custom",
        path: ["objects", index, "hash"],
        message: `duplicate object hash ${object.hash}`,
      });
    }
    if (index > 0 && object.hash <= previous) {
      context.addIssue({
        code: "custom",
        path: ["objects", index, "hash"],
        message: "object table must be ordered by hash",
      });
    }
    seen.add(object.hash);
    previous = object.hash;
  });
}

function validateDependencies(manifest: ClosedPackManifest, context: z.RefinementCtx): void {
  const seen = new Set<string>();
  manifest.dependencies.forEach((dependency, index) => {
    const key = `${dependency.packId}@${dependency.version}`;
    if (seen.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["dependencies", index],
        message: `duplicate dependency ${dependency.packId}@${dependency.version}`,
      });
    }
    if (dependency.packId === manifest.packId) {
      context.addIssue({
        code: "custom",
        path: ["dependencies", index, "packId"],
        message: "a pack cannot depend on its own lineage",
      });
    }
    seen.add(key);
  });

  if (manifest.kind !== "theme") {
    const hasTheme = manifest.dependencies.some(
      (dependency) =>
        dependency.packId === manifest.themePack.packId &&
        dependency.version === manifest.themePack.version &&
        dependency.packDigest === manifest.themePack.packDigest,
    );
    if (!hasTheme) {
      context.addIssue({
        code: "custom",
        path: ["themePack"],
        message: "themePack must be listed as an exact dependency",
      });
    }
  }
}

function validateReferences(manifest: ClosedPackManifest, context: z.RefinementCtx): void {
  const objects = new Map(manifest.objects.map((object) => [object.hash, object] as const));
  const referencedHashes = new Set<string>();
  if (manifest.kind === "theme") {
    const fallback = manifest.theme.fallbackTemplates;
    referencedHashes.add(fallback.front.objectHash);
    referencedHashes.add(fallback.edge.objectHash);
    referencedHashes.add(fallback.back.objectHash);
    validateObjectRole(objects, fallback.front.objectHash, "fallback-front", context, [
      "theme",
      "fallbackTemplates",
      "front",
    ]);
    validateObjectRole(objects, fallback.edge.objectHash, "fallback-edge", context, [
      "theme",
      "fallbackTemplates",
      "edge",
    ]);
    validateObjectRole(objects, fallback.back.objectHash, "fallback-back", context, [
      "theme",
      "fallbackTemplates",
      "back",
    ]);
    if (new Set([fallback.front.templateId, fallback.edge.templateId, fallback.back.templateId]).size !== 3) {
      context.addIssue({
        code: "custom",
        path: ["theme", "fallbackTemplates"],
        message: "front, edge, and back fallback template IDs must be distinct",
      });
    }
  } else if (manifest.kind === "catalogue") {
    manifest.entries.forEach((entry, index) => {
      referencedHashes.add(entry.visual.sourceArtHash);
      validateObjectRole(objects, entry.visual.sourceArtHash, "source-art", context, [
        "entries",
        index,
        "visual",
        "sourceArtHash",
      ]);
    });
  } else {
    referencedHashes.add(manifest.visual.sourceArtHash);
    validateObjectRole(objects, manifest.visual.sourceArtHash, "source-art", context, [
      "visual",
      "sourceArtHash",
    ]);
  }

  manifest.objects.forEach((object, index) => {
    if (!referencedHashes.has(object.hash)) {
      context.addIssue({
        code: "custom",
        path: ["objects", index, "hash"],
        message: `object ${object.hash} is not referenced by any runtime manifest field; remove it before publication`,
      });
    }
  });
}

function validateObjectRole(
  objects: ReadonlyMap<string, PackObjectEntry>,
  hash: string,
  expectedRole: PackObjectRole,
  context: z.RefinementCtx,
  path: PropertyKey[],
): void {
  const object = objects.get(hash);
  if (object === undefined) {
    context.addIssue({
      code: "custom",
      path,
      message: `referenced object ${hash} is missing from the object table`,
    });
  } else if (object.role !== expectedRole) {
    context.addIssue({
      code: "custom",
      path,
      message: `referenced object ${hash} has role ${object.role}, expected ${expectedRole}`,
    });
  }
}

function validateCatalogue(manifest: CatalogueBadgePackManifest, context: z.RefinementCtx): void {
  const definitions = new Set<string>();
  const collections = new Map(
    manifest.collections.map((collection) => [collection.collectionId, collection] as const),
  );

  if (collections.size !== manifest.collections.length) {
    context.addIssue({
      code: "custom",
      path: ["collections"],
      message: "collection IDs must be unique",
    });
  }

  manifest.entries.forEach((entry, index) => {
    if (definitions.has(entry.definition.definitionId)) {
      context.addIssue({
        code: "custom",
        path: ["entries", index, "definition", "definitionId"],
        message: `duplicate definition ${entry.definition.definitionId}`,
      });
    }
    definitions.add(entry.definition.definitionId);

    entry.definition.collectionIds.forEach((collectionId, collectionIndex) => {
      const collection = collections.get(collectionId);
      if (collection === undefined) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "definition", "collectionIds", collectionIndex],
          message: `definition references unknown collection ${collectionId}`,
        });
      } else if (!collection.definitionIds.includes(entry.definition.definitionId)) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "definition", "collectionIds", collectionIndex],
          message: `collection ${collectionId} does not reciprocally include ${entry.definition.definitionId}`,
        });
      }
    });
  });

  manifest.collections.forEach((collection, collectionIndex) => {
    collection.definitionIds.forEach((definitionId, definitionIndex) => {
      if (!definitions.has(definitionId)) {
        context.addIssue({
          code: "custom",
          path: ["collections", collectionIndex, "definitionIds", definitionIndex],
          message: `collection references unknown definition ${definitionId}`,
        });
      } else {
        const definition = manifest.entries.find(
          (entry) => entry.definition.definitionId === definitionId,
        )?.definition;
        if (definition !== undefined && !definition.collectionIds.includes(collection.collectionId)) {
          context.addIssue({
            code: "custom",
            path: ["collections", collectionIndex, "definitionIds", definitionIndex],
            message: `definition ${definitionId} does not reciprocally include ${collection.collectionId}`,
          });
        }
      }
    });
  });

  manifest.entries.forEach((entry, entryIndex) => {
    const rule = entry.definition.compositeRule;
    if (rule === undefined) {
      return;
    }
    if (new Set(rule.definitionIds).size !== rule.definitionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["entries", entryIndex, "definition", "compositeRule", "definitionIds"],
        message: "composite rule requirements must be unique",
      });
    }
    rule.definitionIds.forEach((definitionId, requirementIndex) => {
      if (!definitions.has(definitionId) || definitionId === entry.definition.definitionId) {
        context.addIssue({
          code: "custom",
          path: ["entries", entryIndex, "definition", "compositeRule", "definitionIds", requirementIndex],
          message: `composite rule requirement ${definitionId} must reference another definition in this pack`,
        });
      }
    });
  });
}
