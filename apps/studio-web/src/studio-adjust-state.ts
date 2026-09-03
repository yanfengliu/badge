import type { RenderRecipe } from "@badge/render-recipe";
import {
  EMPTY_STUDIO_APPEARANCE,
  studioTagKey,
  type StudioAdjustmentSubmission,
  type StudioAppearance,
  type StudioBadgeTarget,
} from "@badge/studio-adjustment-contract";

/** A picture the owner chose in this Studio session but has not saved to the Archive yet. */
export interface StudioPendingImage {
  readonly hash: string;
  readonly mimeType: "image/png" | "image/jpeg";
  readonly bytes: Uint8Array;
  readonly accessibleDescription: string;
  readonly previewUrl: string;
  readonly fileName: string;
}

export interface StudioDraft {
  readonly appearance: StudioAppearance;
  readonly tags: readonly string[];
  readonly collectionKeys: readonly string[];
  readonly quotationId: string | null;
  readonly pendingImage: StudioPendingImage | null;
  /** Set when the owner asked to go back to the catalogue picture. */
  readonly useCatalogueImage: boolean;
}

export function initialStudioDraft(target: StudioBadgeTarget): StudioDraft {
  return {
    appearance: target.appearance,
    tags: [...target.tags],
    collectionKeys: [...target.selectedCollectionKeys],
    quotationId: target.selectedQuotationId,
    pendingImage: null,
    useCatalogueImage: false,
  };
}

export function draftPreviewUrl(draft: StudioDraft, target: StudioBadgeTarget): string {
  if (draft.pendingImage) return draft.pendingImage.previewUrl;
  return draft.useCatalogueImage ? target.catalogueSourceUrl : target.sourceUrl;
}

/** The catalogue recipe with the owner's adjustment laid over it — what the viewer renders. */
export function draftPreviewRecipe(draft: StudioDraft, target: StudioBadgeTarget): RenderRecipe {
  const recipe = target.catalogueRecipe;
  return {
    ...recipe,
    shape: draft.appearance.shape ?? recipe.shape,
    material: draft.appearance.material ?? recipe.material,
    borderColor: draft.appearance.borderColor ?? recipe.borderColor,
    borderWidth: draft.appearance.borderWidth ?? recipe.borderWidth,
  };
}

export function usesOwnImage(draft: StudioDraft, target: StudioBadgeTarget): boolean {
  if (draft.pendingImage) return true;
  if (draft.useCatalogueImage) return false;
  return target.ownImageDescription !== null;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameKeySet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const other = new Set(right);
  return left.every((key) => other.has(key));
}

export function isStudioDraftDirty(draft: StudioDraft, target: StudioBadgeTarget): boolean {
  const initial = initialStudioDraft(target);
  return (
    draft.appearance.shape !== initial.appearance.shape ||
    draft.appearance.material !== initial.appearance.material ||
    draft.appearance.borderColor !== initial.appearance.borderColor ||
    draft.appearance.borderWidth !== initial.appearance.borderWidth ||
    draft.quotationId !== initial.quotationId ||
    draft.pendingImage !== null ||
    (draft.useCatalogueImage && target.ownImageDescription !== null) ||
    !sameStrings(draft.tags, initial.tags) ||
    !sameKeySet(draft.collectionKeys, initial.collectionKeys)
  );
}

export function isCatalogueDefaultDraft(draft: StudioDraft, target: StudioBadgeTarget): boolean {
  return (
    draft.appearance.shape === null &&
    draft.appearance.material === null &&
    draft.appearance.borderColor === null &&
    draft.appearance.borderWidth === null &&
    draft.tags.length === 0 &&
    draft.pendingImage === null &&
    !usesOwnImage(draft, target) &&
    sameKeySet(
      draft.collectionKeys,
      target.collections.filter((option) => option.fromCatalogue).map((option) => option.key),
    )
  );
}

/** Returns the draft with every adjustable value back to what the catalogue shipped. */
export function catalogueDefaultDraft(target: StudioBadgeTarget): StudioDraft {
  return {
    appearance: EMPTY_STUDIO_APPEARANCE,
    tags: [],
    collectionKeys: target.collections.filter((option) => option.fromCatalogue).map((option) => option.key),
    quotationId: target.selectedQuotationId,
    pendingImage: null,
    useCatalogueImage: true,
  };
}

export function withToggledTag(draft: StudioDraft, tag: string): StudioDraft {
  const trimmed = tag.trim();
  if (trimmed.length === 0) return draft;
  const key = studioTagKey(trimmed);
  if (draft.tags.some((existing) => studioTagKey(existing) === key)) return draft;
  return { ...draft, tags: [...draft.tags, trimmed] };
}

export function withoutTag(draft: StudioDraft, tag: string): StudioDraft {
  return { ...draft, tags: draft.tags.filter((existing) => existing !== tag) };
}

export function withToggledCollection(draft: StudioDraft, key: string): StudioDraft {
  const selected = draft.collectionKeys.includes(key);
  if (!selected) return { ...draft, collectionKeys: [...draft.collectionKeys, key] };
  if (draft.collectionKeys.length === 1) return draft;
  return { ...draft, collectionKeys: draft.collectionKeys.filter((existing) => existing !== key) };
}

export function toStudioSubmission(
  draft: StudioDraft,
  target: StudioBadgeTarget,
): StudioAdjustmentSubmission {
  return {
    recordId: target.recordId,
    appearance: draft.appearance,
    ownImage: draft.pendingImage
      ? {
          hash: draft.pendingImage.hash,
          mimeType: draft.pendingImage.mimeType,
          bytes: draft.pendingImage.bytes,
          accessibleDescription: draft.pendingImage.accessibleDescription,
        }
      : null,
    useCatalogueImage: draft.pendingImage === null && draft.useCatalogueImage,
    tags: [...draft.tags],
    collectionKeys: [...draft.collectionKeys],
    quotationId: draft.quotationId,
  };
}
