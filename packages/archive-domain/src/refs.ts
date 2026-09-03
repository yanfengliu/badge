import { z } from "zod";

export const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/, "Identifier must be stable lowercase ASCII.");

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 digest.");

export const localDefinitionRefSchema = z
  .object({ namespace: z.literal("local"), definitionId: identifierSchema })
  .strict();

export const packDefinitionRefSchema = z
  .object({
    namespace: z.literal("pack"),
    packId: identifierSchema,
    definitionId: identifierSchema,
  })
  .strict();

export const definitionRefSchema = z.discriminatedUnion("namespace", [
  localDefinitionRefSchema,
  packDefinitionRefSchema,
]);
export type DefinitionRef = z.infer<typeof definitionRefSchema>;

export const localCollectionRefSchema = z
  .object({ namespace: z.literal("local"), collectionId: identifierSchema })
  .strict();

export const packCollectionRefSchema = z
  .object({
    namespace: z.literal("pack"),
    packId: identifierSchema,
    collectionId: identifierSchema,
  })
  .strict();

export const collectionRefSchema = z.discriminatedUnion("namespace", [
  localCollectionRefSchema,
  packCollectionRefSchema,
]);
export type CollectionRef = z.infer<typeof collectionRefSchema>;

export const visibilitySchema = z.enum(["inherit", "public", "private"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const archiveLifecycleSchema = z.enum(["suggested", "planned", "earned", "archived"]);
export type ArchiveLifecycle = z.infer<typeof archiveLifecycleSchema>;

export function collectionRefKey(ref: CollectionRef): string {
  return ref.namespace === "local" ? `local:${ref.collectionId}` : `pack:${ref.packId}:${ref.collectionId}`;
}
