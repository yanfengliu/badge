import { ArchiveApplication, IndexedDbArchiveRepository } from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";

import { createStarterQuotationRequests } from "./archive-state";

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
