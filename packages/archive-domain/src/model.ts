import { packRefSchema, type PackRef } from "@badge/pack-contract";
import { renderRecipeSchema, type RenderRecipe } from "@badge/render-recipe";
import { z } from "zod";

import { acceptedSayingSchema } from "./saying.js";

const identifierSchema = z
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

export const exactVisualPinSchema = z
  .object({
    packRef: packRefSchema,
    visualEditionId: identifierSchema,
    sourceAssetHash: sha256Schema,
    accessibleDescription: z.string().trim().min(1).max(500),
    renderRecipeVersion: z.number().int().positive(),
    renderRecipe: renderRecipeSchema,
  })
  .strict()
  .superRefine((pin, context) => {
    if (pin.renderRecipeVersion !== pin.renderRecipe.version) {
      context.addIssue({
        code: "custom",
        path: ["renderRecipeVersion"],
        message: "renderRecipeVersion must match the pinned render recipe version.",
      });
    }
  });

export interface ExactVisualPin {
  packRef: PackRef;
  visualEditionId: string;
  sourceAssetHash: string;
  accessibleDescription: string;
  renderRecipeVersion: number;
  renderRecipe: RenderRecipe;
}

export const publishedVisualSchema = z
  .object({
    packRef: packRefSchema,
    visualEditionId: identifierSchema,
    sourceAssetHash: sha256Schema,
    accessibleDescription: z.string().trim().min(1).max(500),
    renderRecipeVersion: z.number().int().positive(),
    renderRecipe: renderRecipeSchema,
  })
  .strict()
  .superRefine((visual, context) => {
    if (visual.renderRecipeVersion !== visual.renderRecipe.version) {
      context.addIssue({
        code: "custom",
        path: ["renderRecipeVersion"],
        message: "renderRecipeVersion must match the embedded render recipe version.",
      });
    }
  });

export type PublishedVisual = ExactVisualPin;

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  if (!calendarDatePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const calendarDateSchema = z
  .string()
  .refine(isCalendarDate, "Expected a valid calendar date in YYYY-MM-DD form.");

export const activationRecordSchema = z
  .object({
    occurredStart: calendarDateSchema,
    occurredEnd: calendarDateSchema,
    recordedAt: z.string().datetime({ offset: true }),
    activatedAt: z.string().datetime({ offset: true }),
    visualPin: exactVisualPinSchema,
  })
  .strict()
  .superRefine((activation, context) => {
    if (activation.occurredStart > activation.occurredEnd) {
      context.addIssue({
        code: "custom",
        path: ["occurredEnd"],
        message: "occurredEnd must be on or after occurredStart.",
      });
    }
  });
export type ActivationRecord = z.infer<typeof activationRecordSchema>;

function visualPinsEqual(left: ExactVisualPin, right: ExactVisualPin): boolean {
  return (
    left.packRef.packId === right.packRef.packId &&
    left.packRef.version === right.packRef.version &&
    left.packRef.packDigest === right.packRef.packDigest &&
    left.visualEditionId === right.visualEditionId &&
    left.sourceAssetHash === right.sourceAssetHash &&
    left.accessibleDescription === right.accessibleDescription &&
    left.renderRecipeVersion === right.renderRecipeVersion &&
    left.renderRecipe.version === right.renderRecipe.version &&
    left.renderRecipe.shape === right.renderRecipe.shape &&
    left.renderRecipe.material === right.renderRecipe.material &&
    left.renderRecipe.borderColor === right.renderRecipe.borderColor &&
    left.renderRecipe.borderWidth === right.renderRecipe.borderWidth &&
    left.renderRecipe.thickness === right.renderRecipe.thickness &&
    left.renderRecipe.relief === right.renderRecipe.relief &&
    left.renderRecipe.crop.x === right.renderRecipe.crop.x &&
    left.renderRecipe.crop.y === right.renderRecipe.crop.y &&
    left.renderRecipe.crop.scale === right.renderRecipe.crop.scale
  );
}

export const archiveRecordSchema = z
  .object({
    recordId: identifierSchema,
    definitionRef: definitionRefSchema,
    collectionRefs: z.array(collectionRefSchema).min(1),
    title: z.string().trim().min(1).max(200),
    criterion: z.string().trim().min(1).max(1_000),
    description: z.string().max(5_000).nullable(),
    lifecycle: archiveLifecycleSchema,
    publishedVisual: publishedVisualSchema,
    acceptedSaying: acceptedSayingSchema.nullable(),
    note: z.string().max(10_000).nullable(),
    visibility: visibilitySchema,
    activation: activationRecordSchema.nullable(),
  })
  .strict()
  .superRefine((record, context) => {
    if ((record.lifecycle === "earned") !== (record.activation !== null)) {
      context.addIssue({
        code: "custom",
        path: ["activation"],
        message: "Earned lifecycle and activation must either both be present or both be absent.",
      });
    }

    if (record.activation && !visualPinsEqual(record.activation.visualPin, record.publishedVisual)) {
      context.addIssue({
        code: "custom",
        path: ["activation", "visualPin"],
        message: "Activation visual pin must match the record's exact published visual.",
      });
    }

    if (
      record.definitionRef.namespace === "pack" &&
      record.definitionRef.packId !== record.publishedVisual.packRef.packId
    ) {
      context.addIssue({
        code: "custom",
        path: ["definitionRef", "packId"],
        message: "A packaged definition must resolve its visual inside the same pack lineage.",
      });
    }
  });
export type ArchiveRecord = z.infer<typeof archiveRecordSchema>;

export const archiveStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    ownerId: identifierSchema,
    records: z.array(archiveRecordSchema),
  })
  .strict()
  .superRefine((state, context) => {
    const seenRecordIds = new Set<string>();
    state.records.forEach((record, index) => {
      if (seenRecordIds.has(record.recordId)) {
        context.addIssue({
          code: "custom",
          path: ["records", index, "recordId"],
          message: `Duplicate recordId ${record.recordId}.`,
        });
      }
      seenRecordIds.add(record.recordId);
    });
  });
export type ArchiveState = z.infer<typeof archiveStateSchema>;

export interface SeededArchiveStateInput {
  schemaVersion?: 1;
  ownerId: string;
  records: readonly ArchiveRecord[];
}

export function createSeededArchiveState(input: SeededArchiveStateInput): ArchiveState {
  return archiveStateSchema.parse({
    schemaVersion: 1,
    ownerId: input.ownerId,
    records: input.records,
  });
}

export function toExactVisualPin(visual: PublishedVisual): ExactVisualPin {
  return exactVisualPinSchema.parse({
    packRef: visual.packRef,
    visualEditionId: visual.visualEditionId,
    sourceAssetHash: visual.sourceAssetHash,
    accessibleDescription: visual.accessibleDescription,
    renderRecipeVersion: visual.renderRecipeVersion,
    renderRecipe: visual.renderRecipe,
  });
}

export { visualPinsEqual };
