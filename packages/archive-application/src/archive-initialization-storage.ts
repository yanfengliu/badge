import type { ArchiveState } from "@badge/archive-domain";
import type { IDBPDatabase } from "idb";

import { abortQuietly, parseStoredState } from "./archive-database.js";
import { ArchivePersistenceError } from "./errors.js";
import { assertCompatibleRepositorySource } from "./repository-source-assets.js";
import { referencedSourceHashes } from "./source-references.js";
import { copySourceAsset, type ArchiveSourceAsset } from "./source-assets.js";
import {
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  type ArchiveDatabase,
} from "./storage-contract.js";

export async function loadOrSeedArchive(
  database: IDBPDatabase<ArchiveDatabase>,
  seed: ArchiveState,
  sourceAssets: readonly ArchiveSourceAsset[],
  assertNewSeedState: (state: ArchiveState) => void,
): Promise<ArchiveState> {
  const transaction = database.transaction([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE], "readwrite");
  try {
    const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
    const objectStore = transaction.objectStore(ARCHIVE_OBJECT_STORE);
    const existing = await stateStore.get(ARCHIVE_STATE_KEY);
    const state = existing === undefined ? seed : parseStoredState(existing);
    if (existing === undefined) {
      assertNewSeedState(state);
      await stateStore.put(state, ARCHIVE_STATE_KEY);
    }
    const referenced = new Set(referencedSourceHashes(state));
    for (const asset of sourceAssets.filter((candidate) => referenced.has(candidate.hash))) {
      const stored = await objectStore.get(asset.hash);
      if (stored === undefined) await objectStore.put(copySourceAsset(asset), asset.hash);
      else assertCompatibleRepositorySource(stored, asset);
    }
    await transaction.done;
    return state;
  } catch (error) {
    await abortQuietly(transaction);
    if (error instanceof ArchivePersistenceError) throw error;
    throw new ArchivePersistenceError(
      "TRANSACTION_FAILED",
      "Archive initialization failed; existing state and source rows were preserved. Retry or export diagnostics.",
      { cause: error },
    );
  }
}
