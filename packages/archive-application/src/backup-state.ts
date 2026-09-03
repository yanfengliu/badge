import type { ArchiveState } from "@badge/archive-domain";

import { irreplaceableSourceHashes } from "./source-references.js";

export const MAX_ARCHIVE_BACKUP_STATE_BYTES = 8 * 1024 * 1024;

/** Earned pinned art only — the set a state-only rescue export truthfully reports as omitted. */
export function requiredEarnedSourceHashes(state: ArchiveState): string[] {
  return [
    ...new Set(
      state.records.flatMap((record) =>
        record.activation ? [record.activation.visualPin.sourceAssetHash] : [],
      ),
    ),
  ].sort();
}

/**
 * Every source a complete `.badgearchive` must carry: earned pinned art plus any image the owner
 * swapped in through Badge Studio. An adjusted image exists only on this device, so a backup
 * without it could not rebuild the badge the owner is looking at.
 */
export function requiredBackupSourceHashes(state: ArchiveState): string[] {
  return irreplaceableSourceHashes(state);
}
