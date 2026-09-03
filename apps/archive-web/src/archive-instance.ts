import {
  ArchiveApplication,
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

export type ArchiveOpenOutcome =
  { readonly ok: true; readonly state: ArchiveState } | { readonly ok: false; readonly error: unknown };

let opening: Promise<ArchiveOpenOutcome> | null = null;

/**
 * Opens the archive exactly once, whoever asks first.
 *
 * This deliberately does not live in the Archive surface's effect. The host hides that surface
 * while Badge Studio is open — and a hidden surface runs no effects — so an archive that only
 * opened from there would never open at all for a reload or a shared link straight into
 * `#studio/<recordId>`: Studio would sit on an empty workspace beside an Archive stuck on
 * "Opening your private archive…".
 */
export function openArchive(): Promise<ArchiveOpenOutcome> {
  opening ??= (async (): Promise<ArchiveOpenOutcome> => {
    try {
      const state = await initializeStarterArchive(archive, starterState, (assets) => {
        for (const asset of assets) starterSourceAssets.set(asset.hash, asset);
      });
      return { ok: true, state };
    } catch (error) {
      return { ok: false, error };
    }
  })();
  return opening;
}

/** Replaces the memoized open result after recovery or restore rebuilt the archive. */
export function replaceOpenedArchiveState(state: ArchiveState): void {
  opening = Promise.resolve({ ok: true, state });
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
