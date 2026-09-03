import {
  ArchiveDomainError,
  adjustBadge,
  archiveStateSchema,
  type ArchiveState,
} from "@badge/archive-domain";
import type { BadgeAdjustmentInput } from "@badge/archive-domain";
import type { IDBPDatabase } from "idb";

import { abortQuietly, parseStoredState } from "./archive-database.js";
import { ArchivePersistenceError } from "./errors.js";
import { assertCompatibleRepositorySource } from "./repository-source-assets.js";
import { copySourceAsset, type ArchiveSourceAsset } from "./source-assets.js";
import {
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  type ArchiveDatabase,
} from "./storage-contract.js";

/**
 * Confirms the archive already holds the bytes an adjustment names. Without this a Studio
 * session that adjusts a badge to an image whose bytes were never stored would write a record
 * that `resolveVisual` cannot render on the next read.
 */
export async function assertHeldAdjustmentSource(
  database: IDBPDatabase<ArchiveDatabase>,
  recordId: string,
  hash: string,
): Promise<void> {
  const transaction = database.transaction(ARCHIVE_OBJECT_STORE, "readonly");
  const stored = await transaction.store.get(hash);
  await transaction.done;
  if (stored === undefined) {
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_MISSING",
      `Badge ${recordId} was adjusted to use image ${hash}, but the archive does not hold those bytes; choose the image again in Badge Studio so it is stored together with the adjustment.`,
    );
  }
}

/**
 * Writes one badge's adjustment and, when the owner swapped in their own picture, the image
 * bytes in the same transaction as the state that references them — so a failure can never
 * leave a record pointing at art the archive does not hold.
 */
export async function storeBadgeAdjustment(
  database: IDBPDatabase<ArchiveDatabase>,
  recordId: string,
  input: BadgeAdjustmentInput,
  adjustedAt: string,
  sourceAsset: ArchiveSourceAsset | null,
): Promise<ArchiveState> {
  const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
  try {
    const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
    const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
    const state = parseStoredState(await stateStore.get(ARCHIVE_STATE_KEY));
    const next = adjustBadge(state, recordId, input, adjustedAt);
    if (sourceAsset) {
      const existing = await objectStore.get(sourceAsset.hash);
      if (existing === undefined) await objectStore.put(copySourceAsset(sourceAsset), sourceAsset.hash);
      else assertCompatibleRepositorySource(existing, sourceAsset);
    }
    await stateStore.put(archiveStateSchema.parse(next), ARCHIVE_STATE_KEY);
    await transaction.done;
    return next;
  } catch (error) {
    await abortQuietly(transaction);
    if (error instanceof ArchiveDomainError || error instanceof ArchivePersistenceError) throw error;
    throw new ArchivePersistenceError(
      "TRANSACTION_FAILED",
      "Archive adjustment transaction failed; neither the badge adjustment nor its image bytes were kept. Retry the action.",
      { cause: error },
    );
  }
}
