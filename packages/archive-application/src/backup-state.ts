import type { ArchiveState } from "@badge/archive-domain";

export const MAX_ARCHIVE_BACKUP_STATE_BYTES = 8 * 1024 * 1024;

export function requiredEarnedSourceHashes(state: ArchiveState): string[] {
  return [
    ...new Set(
      state.records.flatMap((record) =>
        record.activation ? [record.activation.visualPin.sourceAssetHash] : [],
      ),
    ),
  ].sort();
}
