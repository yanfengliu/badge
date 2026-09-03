import { displayedVisual, exactVisualPinSchema } from "@badge/archive-domain";
import type { IDBPDatabase } from "idb";

import { parseStoredState } from "./archive-database.js";
import { ArchivePersistenceError } from "./errors.js";
import { irreplaceableSourceHashes, ownerAdjustedSourceHashes } from "./source-references.js";
import { validateStoredSourceAsset, type ArchiveSourceAsset } from "./source-assets.js";
import {
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  type ArchiveBackupSnapshot,
  type ArchiveDatabase,
  type ResolvedArchiveVisual,
} from "./storage-contract.js";

/**
 * Resolves what one record actually shows: an earned record's sealed pin, otherwise the
 * catalogue visual with the owner's Badge Studio adjustment laid over it.
 */
export async function readResolvedVisual(
  database: IDBPDatabase<ArchiveDatabase>,
  recordId: string,
): Promise<ResolvedArchiveVisual> {
  const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readonly");
  const state = parseStoredState(await transaction.objectStore(ARCHIVE_STATE_STORE).get(ARCHIVE_STATE_KEY));
  const record = state.records.find((candidate) => candidate.recordId === recordId);
  if (!record) {
    await transaction.done;
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_MISSING",
      `Archive record ${recordId} was not found; reload the collection before resolving its visual.`,
    );
  }
  const pin = exactVisualPinSchema.parse(displayedVisual(record));
  const stored = await transaction.objectStore(ARCHIVE_OBJECT_STORE).get(pin.sourceAssetHash);
  await transaction.done;
  if (stored === undefined) {
    const ownImage = record.adjustment?.source?.sourceAssetHash === pin.sourceAssetHash;
    throw new ArchivePersistenceError(
      "VISUAL_SOURCE_MISSING",
      ownImage
        ? `Archive source ${pin.sourceAssetHash} for record ${recordId} is the image you added in Badge Studio and it is missing; restore an intact .badgearchive backup, or open the badge in Studio and choose the image again.`
        : `Archive source ${pin.sourceAssetHash} for record ${recordId} is missing; restore an intact .badgearchive backup or reinstall the exact admitted pack.`,
    );
  }
  return { recordId, pin, sourceAsset: await validateStoredSourceAsset(stored, pin.sourceAssetHash) };
}

export async function readBackupSnapshot(
  database: IDBPDatabase<ArchiveDatabase>,
): Promise<ArchiveBackupSnapshot> {
  const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readonly");
  const state = parseStoredState(await transaction.objectStore(ARCHIVE_STATE_STORE).get(ARCHIVE_STATE_KEY));
  const hashes = irreplaceableSourceHashes(state);
  const rows = await Promise.all(
    hashes.map((hash) => transaction.objectStore(ARCHIVE_OBJECT_STORE).get(hash)),
  );
  await transaction.done;
  const ownerAdjusted = new Set(ownerAdjustedSourceHashes(state));
  const sourceAssets: ArchiveSourceAsset[] = [];
  for (let index = 0; index < hashes.length; index += 1) {
    const hash = hashes[index];
    const row = rows[index];
    if (row === undefined) {
      throw new ArchivePersistenceError(
        "VISUAL_SOURCE_MISSING",
        ownerAdjusted.has(hash)
          ? `Archive source ${hash} is an image you added in Badge Studio and it is missing; the backup was not created. Restore an intact backup, or open that badge in Studio and choose the image again.`
          : `Archive source ${hash} required by an earned record is missing; the backup was not created. Reinstall the exact pack or restore an intact backup first.`,
      );
    }
    sourceAssets.push(await validateStoredSourceAsset(row, hash));
  }
  return { state, sourceAssets };
}
