import { badgeMaterialSchema, badgeShapeSchema } from "@badge/render-recipe";
import { z } from "zod";

import { collectionRefSchema, sha256Schema } from "./refs.js";

/**
 * A badge adjustment is the owner's personal overlay on one installed catalogue badge. The
 * shipped pack keeps its frozen appearance; this record holds only what the owner changed in
 * Badge Studio, so a later catalogue reconcile or visual upgrade can refresh the underlying
 * `publishedVisual` without discarding the adjustment, and so clearing the overlay always
 * restores the exact catalogue default.
 *
 * Appearance and source adjustments are unearned-only. Activation folds the effective visual
 * into `publishedVisual` and pins it; the overlay is deliberately left in place afterwards
 * because applying it to the already-folded visual is idempotent, and it remains the honest
 * record of which fields the owner — not the catalogue — chose.
 */

export const MAX_BADGE_TAGS = 24;
export const MAX_BADGE_TAG_LENGTH = 48;

export const badgeTagSchema = z
  .string()
  .trim()
  .min(1, "A tag needs at least one visible character.")
  .max(MAX_BADGE_TAG_LENGTH, `A tag may hold at most ${MAX_BADGE_TAG_LENGTH} characters.`)
  .refine((tag) => !/[\p{Cc}\p{Cf}]/u.test(tag), "A tag may not contain control or formatting characters.");
export type BadgeTag = z.infer<typeof badgeTagSchema>;

export const borderColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/, "borderColor must be a lowercase #rrggbb color");

export const appearanceAdjustmentSchema = z
  .object({
    shape: badgeShapeSchema.nullable(),
    material: badgeMaterialSchema.nullable(),
    borderColor: borderColorSchema.nullable(),
    borderWidth: z.number().finite().min(0).max(0.2).nullable(),
  })
  .strict();
export type AppearanceAdjustment = z.infer<typeof appearanceAdjustmentSchema>;

export const EMPTY_APPEARANCE_ADJUSTMENT: AppearanceAdjustment = Object.freeze({
  shape: null,
  material: null,
  borderColor: null,
  borderWidth: null,
});

export const adjustedSourceSchema = z
  .object({
    sourceAssetHash: sha256Schema,
    accessibleDescription: z.string().trim().min(1).max(500),
  })
  .strict();
export type AdjustedSource = z.infer<typeof adjustedSourceSchema>;

export function badgeTagKey(tag: string): string {
  return tag.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export const badgeAdjustmentSchema = z
  .object({
    adjustedAt: z.string().datetime({ offset: true }),
    appearance: appearanceAdjustmentSchema,
    source: adjustedSourceSchema.nullable(),
    tags: z.array(badgeTagSchema).max(MAX_BADGE_TAGS),
    collectionRefs: z.array(collectionRefSchema).min(1).nullable(),
  })
  .strict()
  .superRefine((adjustment, context) => {
    const seen = new Set<string>();
    adjustment.tags.forEach((tag, index) => {
      const key = badgeTagKey(tag);
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["tags", index],
          message: `Tag ${tag} repeats an existing tag on this badge; every tag must be distinct.`,
        });
      }
      seen.add(key);
    });
  });
export type BadgeAdjustment = z.infer<typeof badgeAdjustmentSchema>;

export function isEmptyBadgeAdjustment(adjustment: BadgeAdjustment | null): boolean {
  if (!adjustment) return true;
  return (
    !adjustsAppearanceOrSource(adjustment) &&
    adjustment.tags.length === 0 &&
    adjustment.collectionRefs === null
  );
}

export function adjustsAppearanceOrSource(adjustment: BadgeAdjustment | null): boolean {
  if (!adjustment) return false;
  return (
    adjustment.source !== null ||
    adjustment.appearance.shape !== null ||
    adjustment.appearance.material !== null ||
    adjustment.appearance.borderColor !== null ||
    adjustment.appearance.borderWidth !== null
  );
}

export function sameAppearanceAdjustment(left: AppearanceAdjustment, right: AppearanceAdjustment): boolean {
  return (
    left.shape === right.shape &&
    left.material === right.material &&
    left.borderColor === right.borderColor &&
    left.borderWidth === right.borderWidth
  );
}

export function sameAdjustedSource(left: AdjustedSource | null, right: AdjustedSource | null): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.sourceAssetHash === right.sourceAssetHash &&
    left.accessibleDescription === right.accessibleDescription
  );
}
