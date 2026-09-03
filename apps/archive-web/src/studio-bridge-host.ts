import type { StudioAdjustmentSubmission, StudioBadgeTarget } from "@badge/studio-adjustment-contract";

import { archive, notifyArchiveStateChanged, readOpenedArchiveState } from "./archive-instance";
import { publishedFixtureForRecordId } from "./published-fixtures";
import { applyStudioSubmission, buildStudioTarget } from "./studio-bridge";
import type { ArchiveStudioBridge } from "./studio-bridge-port";

/**
 * The one object URL this module hands out, kept by the bytes it points at.
 *
 * Resolving is not a one-shot: a save re-resolves the same badge, and revoking before minting
 * the replacement pulled the image out from under the viewer that was still showing it — the
 * renderer reported "Could not load blob:…" for a URL that had just been valid. Re-resolving the
 * same bytes now reuses the same URL and revokes nothing; switching badges revokes the old one
 * only after the new one exists.
 */
let ownedUrl: { readonly hash: string; readonly url: string } | null = null;

function objectUrlFor(hash: string, bytes: Uint8Array, mimeType: string): string {
  if (ownedUrl?.hash === hash) return ownedUrl.url;
  const previous = ownedUrl;
  ownedUrl = { hash, url: URL.createObjectURL(new Blob([bytes.slice().buffer], { type: mimeType })) };
  if (previous) URL.revokeObjectURL(previous.url);
  return ownedUrl.url;
}

async function resolveTarget(recordId: string): Promise<StudioBadgeTarget | null> {
  // Opens the archive if nothing has yet: Studio can be the first thing this document shows.
  let state;
  try {
    state = await readOpenedArchiveState();
  } catch {
    return null;
  }
  const record = state.records.find((candidate) => candidate.recordId === recordId);
  if (!record) return null;
  const fixture = publishedFixtureForRecordId(recordId);
  let sourceUrl = fixture?.sourceUrl ?? null;
  // Only an owner-supplied image or a collected badge needs bytes out of the archive; every
  // other badge already renders the bundled catalogue study the fixture names.
  if (record.adjustment?.source || record.activation) {
    try {
      const resolved = await archive.visual(recordId);
      sourceUrl = objectUrlFor(
        resolved.pin.sourceAssetHash,
        resolved.sourceAsset.bytes,
        resolved.sourceAsset.mimeType,
      );
    } catch {
      // Fall back to the catalogue study so Studio still opens with its controls usable.
    }
  }
  return buildStudioTarget({ record, fixture, sourceUrl });
}

async function apply(submission: StudioAdjustmentSubmission) {
  let state;
  try {
    state = await readOpenedArchiveState();
  } catch {
    return {
      ok: false,
      message: "Your archive could not be opened, so nothing was saved. Reload Badge and try again.",
    };
  }
  const record = state.records.find((candidate) => candidate.recordId === submission.recordId);
  if (!record) {
    return {
      ok: false,
      message: "This badge is no longer in your archive; reopen it from Discover before saving.",
    };
  }
  const outcome = await applyStudioSubmission(
    archive,
    record,
    publishedFixtureForRecordId(submission.recordId),
    submission,
  );
  // A visible Archive surface catches up from this; a hidden one hears nothing and instead
  // re-reads current state when the host shows it again.
  if (outcome.state) notifyArchiveStateChanged(outcome.state);
  return outcome.result;
}

/**
 * The Archive's half of the Studio handoff, reachable without rendering the Archive surface.
 * The host imports this on demand when it opens Badge Studio.
 */
export const archiveStudioBridge: ArchiveStudioBridge = { resolveTarget, apply };
