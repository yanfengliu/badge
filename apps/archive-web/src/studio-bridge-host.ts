import type { StudioAdjustmentSubmission, StudioBadgeTarget } from "@badge/studio-adjustment-contract";

import {
  archive,
  notifyArchiveStateChanged,
  openArchive,
  replaceOpenedArchiveState,
} from "./archive-instance";
import { publishedFixtureForRecordId } from "./published-fixtures";
import { applyStudioSubmission, buildStudioTarget } from "./studio-bridge";
import type { ArchiveStudioBridge } from "./studio-bridge-port";

const ownedUrls = new Set<string>();

function releaseOwnedUrls(): void {
  for (const url of ownedUrls) URL.revokeObjectURL(url);
  ownedUrls.clear();
}

async function resolveTarget(recordId: string): Promise<StudioBadgeTarget | null> {
  // Opens the archive if nothing has yet: Studio can be the first thing this document shows.
  const opened = await openArchive();
  if (!opened.ok) return null;
  const state = await archive.state();
  const record = state.records.find((candidate) => candidate.recordId === recordId);
  if (!record) return null;
  const fixture = publishedFixtureForRecordId(recordId);
  let sourceUrl = fixture?.sourceUrl ?? null;
  // Only an owner-supplied image or a collected badge needs bytes out of the archive; every
  // other badge already renders the bundled catalogue study the fixture names.
  if (record.adjustment?.source || record.activation) {
    try {
      const resolved = await archive.visual(recordId);
      releaseOwnedUrls();
      const objectUrl = URL.createObjectURL(
        new Blob([resolved.sourceAsset.bytes.slice().buffer], { type: resolved.sourceAsset.mimeType }),
      );
      ownedUrls.add(objectUrl);
      sourceUrl = objectUrl;
    } catch {
      // Fall back to the catalogue study so Studio still opens with its controls usable.
    }
  }
  return buildStudioTarget({ record, fixture, sourceUrl });
}

async function apply(submission: StudioAdjustmentSubmission) {
  const opened = await openArchive();
  if (!opened.ok) {
    return {
      ok: false,
      message: "Your archive could not be opened, so nothing was saved. Reload Badge and try again.",
    };
  }
  const state = await archive.state();
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
  if (outcome.state) {
    // The Archive surface is hidden while Studio is open, so it is running no effects and hears
    // no announcement. Refreshing the memoized open result is what it actually reads when the
    // host shows it again; without this it comes back holding the badge as it was before the
    // save, shows the old picture, and refuses activation as a changed visual.
    replaceOpenedArchiveState(outcome.state);
    notifyArchiveStateChanged(outcome.state);
  }
  return outcome.result;
}

/**
 * The Archive's half of the Studio handoff, reachable without rendering the Archive surface.
 * The host imports this on demand when it opens Badge Studio.
 */
export const archiveStudioBridge: ArchiveStudioBridge = { resolveTarget, apply };
