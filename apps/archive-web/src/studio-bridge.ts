import type { ArchiveApplication } from "@badge/archive-application";
import {
  collectionRefKey,
  effectiveCollectionRefs,
  effectiveTags,
  type ArchiveRecord,
  type ArchiveState,
  type BadgeAdjustmentInput,
  type CollectionRef,
} from "@badge/archive-domain";
import { CATALOGUE_PACK_ID } from "@badge/catalogue-fixtures/catalogue-pack";
import { discoverySets } from "@badge/catalogue-fixtures/discovery";
import { resolveSayingModelResponse } from "@badge/saying-contract";
import {
  EMPTY_STUDIO_APPEARANCE,
  type StudioAdjustmentResult,
  type StudioAdjustmentSubmission,
  type StudioBadgeTarget,
  type StudioCollectionOption,
} from "@badge/studio-adjustment-contract";

import { formatFixtureQuotation } from "./fixture-quotations";
import type { PublishedFixtureView } from "./published-fixtures";

function humanizeIdentifier(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function labelForRef(ref: CollectionRef): string {
  const set = discoverySets.find((candidate) => candidate.setId === ref.collectionId);
  if (set) return set.title;
  return ref.namespace === "local"
    ? `${humanizeIdentifier(ref.collectionId)} · Local`
    : `${humanizeIdentifier(ref.collectionId)} · Pack ${ref.packId}`;
}

/**
 * Every collection the owner may put this badge in: the ones its catalogue pack shipped, plus
 * each remaining Discover set, plus anything they already chose. Studio only ever sees the keys
 * and labels — the refs stay on this side.
 */
export function studioCollectionOptions(
  record: ArchiveRecord,
): readonly (StudioCollectionOption & { readonly ref: CollectionRef })[] {
  const options = new Map<string, StudioCollectionOption & { ref: CollectionRef }>();
  // A set is offered once by its collection id, not once per pack that ships it: a starter-pack
  // badge and the discovery catalogue both carry `us-national-parks`, and offering both would
  // put the same shelf on screen twice under one label.
  const offeredSetIds = new Set<string>();
  const offer = (ref: CollectionRef, label: string, fromCatalogue: boolean) => {
    const key = collectionRefKey(ref);
    if (options.has(key) || offeredSetIds.has(ref.collectionId)) return;
    options.set(key, { key, label, fromCatalogue, ref });
    offeredSetIds.add(ref.collectionId);
  };
  for (const ref of record.collectionRefs) offer(ref, labelForRef(ref), true);
  for (const ref of effectiveCollectionRefs(record)) offer(ref, labelForRef(ref), false);
  for (const set of discoverySets) {
    offer({ namespace: "pack", packId: CATALOGUE_PACK_ID, collectionId: set.setId }, set.title, false);
  }
  return [...options.values()];
}

export interface StudioTargetInput {
  readonly record: ArchiveRecord;
  readonly fixture: PublishedFixtureView | undefined;
  /** What the badge currently renders as, adjustment included. */
  readonly sourceUrl: string | null;
}

/**
 * Projects one badge for Badge Studio. Deliberately narrow: no note, date, activation, visibility,
 * pack digest, or provenance crosses, because Studio has no use for any of them.
 */
export function buildStudioTarget({
  record,
  fixture,
  sourceUrl,
}: StudioTargetInput): StudioBadgeTarget | null {
  const catalogueSourceUrl = fixture?.sourceUrl ?? null;
  const resolvedSourceUrl = sourceUrl ?? catalogueSourceUrl;
  if (!catalogueSourceUrl || !resolvedSourceUrl) return null;
  const options = studioCollectionOptions(record);
  const quotations = (fixture?.historicalQuotations ?? []).map((quotation) => ({
    quotationId: quotation.id,
    text: quotation.text,
    person: quotation.person,
    sourceTitle: quotation.sourceTitle,
    formatted: formatFixtureQuotation(quotation),
  }));
  const selected = quotations.find((quotation) => quotation.formatted === record.acceptedSaying);
  return {
    recordId: record.recordId,
    title: record.title,
    criterion: record.criterion,
    collected: record.lifecycle === "earned" || record.activation !== null,
    sourceUrl: resolvedSourceUrl,
    catalogueSourceUrl,
    catalogueRecipe: record.publishedVisual.renderRecipe,
    appearance: record.adjustment?.appearance ?? EMPTY_STUDIO_APPEARANCE,
    ownImageDescription: record.adjustment?.source?.accessibleDescription ?? null,
    tags: [...effectiveTags(record)],
    collections: options.map(({ key, label, fromCatalogue }) => ({ key, label, fromCatalogue })),
    selectedCollectionKeys: effectiveCollectionRefs(record).map(collectionRefKey),
    quotations,
    selectedQuotationId: selected?.quotationId ?? null,
  };
}

function sameRefs(left: readonly CollectionRef[], right: readonly CollectionRef[]): boolean {
  if (left.length !== right.length) return false;
  const other = new Set(right.map(collectionRefKey));
  return left.every((ref) => other.has(collectionRefKey(ref)));
}

export function adjustmentInputFor(
  record: ArchiveRecord,
  submission: StudioAdjustmentSubmission,
): BadgeAdjustmentInput {
  const byKey = new Map(studioCollectionOptions(record).map((option) => [option.key, option.ref]));
  const refs = submission.collectionKeys.map((key) => {
    const ref = byKey.get(key);
    if (!ref) {
      throw new Error(
        `Collection ${key} is not one of the collections offered for ${record.title}; reopen the badge in Badge Studio and choose again.`,
      );
    }
    return ref;
  });
  const source = submission.ownImage
    ? {
        sourceAssetHash: submission.ownImage.hash,
        accessibleDescription: submission.ownImage.accessibleDescription,
      }
    : submission.useCatalogueImage
      ? null
      : (record.adjustment?.source ?? null);
  return {
    appearance: submission.appearance,
    source,
    tags: [...submission.tags],
    collectionRefs: sameRefs(refs, record.collectionRefs) ? null : refs,
  };
}

function adjustmentSummary(submission: StudioAdjustmentSubmission, quotationChanged: boolean): string {
  const parts: string[] = [];
  const face = [
    submission.appearance.shape !== null ? "shape" : null,
    submission.appearance.material !== null ? "material" : null,
    submission.appearance.borderColor !== null ? "border color" : null,
    submission.appearance.borderWidth !== null ? "border width" : null,
  ].filter((value): value is string => value !== null);
  if (submission.ownImage) parts.push("your own image");
  else if (submission.useCatalogueImage) parts.push("the original image");
  if (face.length > 0) parts.push(face.join(", "));
  if (submission.tags.length > 0)
    parts.push(`${submission.tags.length} tag${submission.tags.length === 1 ? "" : "s"}`);
  parts.push(
    `${submission.collectionKeys.length} collection${submission.collectionKeys.length === 1 ? "" : "s"}`,
  );
  if (quotationChanged) parts.push("a new quote");
  return parts.join(" · ");
}

/**
 * Applies one Studio submission to the archive: the adjustment and its image bytes first, then
 * the quote through the same trusted-bank admission every other quotation change uses. A failure
 * leaves the badge exactly as it was and says what to do next.
 */
export async function applyStudioSubmission(
  archive: Pick<ArchiveApplication, "adjustBadge" | "updateQuotation">,
  record: ArchiveRecord,
  fixture: PublishedFixtureView | undefined,
  submission: StudioAdjustmentSubmission,
): Promise<{ readonly state: ArchiveState | null; readonly result: StudioAdjustmentResult }> {
  const currentQuotationId = fixture?.historicalQuotations.find(
    (quotation) => formatFixtureQuotation(quotation) === record.acceptedSaying,
  )?.id;
  const quotationChanged =
    submission.quotationId !== null &&
    submission.quotationId !== currentQuotationId &&
    record.lifecycle !== "earned" &&
    record.activation === null;

  let state: ArchiveState;
  try {
    state = await archive.adjustBadge(
      record.recordId,
      adjustmentInputFor(record, submission),
      submission.ownImage
        ? {
            hash: submission.ownImage.hash,
            mimeType: submission.ownImage.mimeType,
            bytes: submission.ownImage.bytes,
          }
        : null,
    );
  } catch (error) {
    return {
      state: null,
      result: {
        ok: false,
        message: `${record.title} was not changed. ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }

  if (quotationChanged && fixture) {
    try {
      state = await archive.updateQuotation(
        record.recordId,
        resolveSayingModelResponse(
          { quotationId: submission.quotationId },
          {
            title: record.title,
            criterion: record.criterion,
            allowedQuotations: fixture.historicalQuotations.map((quotation) => ({ ...quotation })),
          },
        ),
        record.quotationRevision,
      );
    } catch (error) {
      return {
        state,
        result: {
          ok: false,
          message: `The badge was adjusted, but its quote was not changed: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  return {
    state,
    result: {
      ok: true,
      message: `Saved to ${record.title} — ${adjustmentSummary(submission, quotationChanged)}.`,
    },
  };
}
