import {
  ArchiveApplication,
  ArchivePersistenceError,
  IndexedDbArchiveRepository,
  type ArchiveSourceAssetInput,
} from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";

import { initializeStarterArchive } from "./archive-startup";
import { createStarterArchiveState, createStarterQuotationRequests } from "./archive-state";

const ARCHIVE_STATE_EVENT = "badge:archive-state-changed";

/**
 * The one Archive instance this document uses.
 *
 * It lives outside the React tree because Badge Studio's handoff must work while the Archive
 * surface is hidden and its effects are suspended: a module the host can import on demand keeps
 * that path independent of what is currently rendered.
 */
export const archiveRepository = new IndexedDbArchiveRepository({
  trustedQuotationRequests: createStarterQuotationRequests(),
});

export const archive = new ArchiveApplication(archiveRepository);

export const starterState = createStarterArchiveState();

/** Starter source bytes loaded during startup, kept for activation and recovery. */
export const starterSourceAssets = new Map<string, ArchiveSourceAssetInput>();

export type ArchiveOpenOutcome = { readonly ok: true } | { readonly ok: false; readonly error: unknown };

let opening: Promise<ArchiveOpenOutcome> | null = null;

/**
 * Opens the archive exactly once, whoever asks first.
 *
 * This deliberately does not live in the Archive surface's effect. The host hides that surface
 * while Badge Studio is open — and a hidden surface runs no effects — so an archive that only
 * opened from there would never open at all for a reload or a shared link straight into
 * `#studio/<recordId>`: Studio would sit on an empty workspace beside an Archive stuck on
 * "Opening your private archive…".
 *
 * It deliberately remembers only whether opening succeeded, never the state it found. A cached
 * snapshot would have to be refreshed by every writer — activation, quotation, lifecycle, restore,
 * recovery, and Studio — and the one any of them forgot would show the Archive a badge as it was
 * before, on a surface the host remounts on every return from Studio. Callers read current state.
 */
export function openArchive(): Promise<ArchiveOpenOutcome> {
  opening ??= (async (): Promise<ArchiveOpenOutcome> => {
    try {
      await initializeStarterArchive(archive, starterState, (assets) => {
        for (const asset of assets) starterSourceAssets.set(asset.hash, asset);
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  })();
  return opening;
}

/**
 * Opens the archive if it is not open, then reads its current state.
 *
 * Every caller uses this rather than `archive.state()` so that one case is handled in one place:
 * browser site data can be cleared while the document is open, which leaves the archive opened
 * and empty. That is a state nothing can read, so it seeds once more instead of reporting an
 * unreadable archive at a badge the owner can see on screen.
 */
export async function readOpenedArchiveState(): Promise<ArchiveState> {
  const outcome = await openArchive();
  if (!outcome.ok) throw outcome.error;
  try {
    return await archive.state();
  } catch (error) {
    if (!(error instanceof ArchivePersistenceError) || error.code !== "STATE_MISSING") throw error;
    opening = null;
    const reopened = await openArchive();
    if (!reopened.ok) throw reopened.error;
    return archive.state();
  }
}

/** Announces a state change made outside the Archive surface, so its screens catch up. */
export function notifyArchiveStateChanged(state: ArchiveState): void {
  window.dispatchEvent(new CustomEvent<ArchiveState>(ARCHIVE_STATE_EVENT, { detail: state }));
}

export function observeArchiveStateChanges(onArchiveState: (state: ArchiveState) => void): () => void {
  const observe = (event: Event) => {
    if (event instanceof CustomEvent) onArchiveState(event.detail as ArchiveState);
  };
  window.addEventListener(ARCHIVE_STATE_EVENT, observe);
  return () => window.removeEventListener(ARCHIVE_STATE_EVENT, observe);
}
