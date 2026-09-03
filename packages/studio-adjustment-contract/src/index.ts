import { badgeMaterialSchema, badgeShapeSchema, renderRecipeSchema } from "@badge/render-recipe";
import { z } from "zod";

/**
 * The only thing that crosses between the Archive and Badge Studio.
 *
 * Studio adjusts one badge the owner opened from Discover. It never reads Archive persistence,
 * never learns a pack id, and never sees a note, date, activation, or any other personal record
 * field: the Archive projects exactly the values below, and Studio hands back exactly a
 * submission. Collections are opaque keys for the same reason — Studio shows labels and returns
 * the keys it was given, and the Archive alone knows what they refer to.
 */

export const STUDIO_MAX_TAGS = 24;
export const STUDIO_MAX_TAG_LENGTH = 48;

export const studioQuotationChoiceSchema = z
  .object({
    quotationId: z.string().min(1),
    text: z.string().min(1),
    person: z.string().min(1),
    sourceTitle: z.string().min(1),
    formatted: z.string().min(1),
  })
  .strict();
export type StudioQuotationChoice = z.infer<typeof studioQuotationChoiceSchema>;

export const studioCollectionOptionSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    fromCatalogue: z.boolean(),
  })
  .strict();
export type StudioCollectionOption = z.infer<typeof studioCollectionOptionSchema>;

export const studioAppearanceSchema = z
  .object({
    shape: badgeShapeSchema.nullable(),
    material: badgeMaterialSchema.nullable(),
    borderColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/, "borderColor must be a lowercase #rrggbb color")
      .nullable(),
    borderWidth: z.number().finite().min(0).max(0.2).nullable(),
  })
  .strict();
export type StudioAppearance = z.infer<typeof studioAppearanceSchema>;

export const EMPTY_STUDIO_APPEARANCE: StudioAppearance = Object.freeze({
  shape: null,
  material: null,
  borderColor: null,
  borderWidth: null,
});

/** One badge, projected for adjustment. Everything Studio is allowed to know about it. */
export const studioBadgeTargetSchema = z
  .object({
    recordId: z.string().min(1),
    title: z.string().min(1),
    criterion: z.string().min(1),
    /** A collected badge's face is sealed with its memory; only tags and collections stay open. */
    collected: z.boolean(),
    /** The image currently shown for this badge, adjusted or not. */
    sourceUrl: z.string().min(1),
    /** The picture the catalogue shipped, so "use the original image" needs no round trip. */
    catalogueSourceUrl: z.string().min(1),
    /** The catalogue's own recipe. Studio renders it with the adjustment laid over the top. */
    catalogueRecipe: renderRecipeSchema,
    appearance: studioAppearanceSchema,
    /** Present when the owner already swapped an image in, so Studio can show and revert it. */
    ownImageDescription: z.string().min(1).nullable(),
    tags: z.array(z.string().min(1)).max(STUDIO_MAX_TAGS),
    collections: z.array(studioCollectionOptionSchema),
    selectedCollectionKeys: z.array(z.string().min(1)).min(1),
    quotations: z.array(studioQuotationChoiceSchema),
    selectedQuotationId: z.string().min(1).nullable(),
  })
  .strict();
export type StudioBadgeTarget = z.infer<typeof studioBadgeTargetSchema>;

export const studioOwnImageSchema = z
  .object({
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    mimeType: z.enum(["image/png", "image/jpeg"]),
    bytes: z.custom<Uint8Array>((value) => value instanceof Uint8Array, {
      message: "Image bytes must be a Uint8Array.",
    }),
    accessibleDescription: z.string().trim().min(1).max(500),
  })
  .strict();
export type StudioOwnImage = z.infer<typeof studioOwnImageSchema>;

/** What Studio hands back when the owner saves. */
export const studioAdjustmentSubmissionSchema = z
  .object({
    recordId: z.string().min(1),
    appearance: studioAppearanceSchema,
    /** New bytes to store, or `null` to keep whatever image the badge already resolves to. */
    ownImage: studioOwnImageSchema.nullable(),
    /** Drops any owner image and returns the badge to its catalogue picture. */
    useCatalogueImage: z.boolean(),
    tags: z.array(z.string().trim().min(1).max(STUDIO_MAX_TAG_LENGTH)).max(STUDIO_MAX_TAGS),
    collectionKeys: z.array(z.string().min(1)).min(1),
    quotationId: z.string().min(1).nullable(),
  })
  .strict();
export type StudioAdjustmentSubmission = z.infer<typeof studioAdjustmentSubmissionSchema>;

export interface StudioAdjustmentResult {
  readonly ok: boolean;
  /** Shown verbatim in Studio's status line, so it must name what happened and what to do. */
  readonly message: string;
}

export type StudioAdjustmentHandler = (
  submission: StudioAdjustmentSubmission,
) => Promise<StudioAdjustmentResult>;

export function studioTagKey(tag: string): string {
  return tag.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/**
 * Rejects a tag list before it reaches persistence so Studio can explain the problem next to the
 * field rather than surfacing a storage error. Returns `null` when the list is acceptable.
 */
export function firstTagProblem(tags: readonly string[]): string | null {
  if (tags.length > STUDIO_MAX_TAGS) {
    return `That is ${tags.length} tags; keep at most ${STUDIO_MAX_TAGS} on one badge.`;
  }
  const seen = new Set<string>();
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed.length === 0) return "A tag needs at least one visible character.";
    if (trimmed.length > STUDIO_MAX_TAG_LENGTH) {
      return `“${trimmed.slice(0, 16)}…” is ${trimmed.length} characters; keep tags to ${STUDIO_MAX_TAG_LENGTH}.`;
    }
    if (/[\p{Cc}\p{Cf}]/u.test(trimmed)) {
      return `“${trimmed}” contains a control character; remove it before saving.`;
    }
    const key = studioTagKey(trimmed);
    if (seen.has(key)) return `“${trimmed}” is already on this badge.`;
    seen.add(key);
  }
  return null;
}
