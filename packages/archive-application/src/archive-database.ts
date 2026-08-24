import { archiveStateSchema, type ArchiveState } from "@badge/archive-domain";
import { openDB, type IDBPDatabase } from "idb";

import { ArchivePersistenceError } from "./errors.js";
import { hasDurableQuotationRevisions } from "./saying-defaults.js";
import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  type ArchiveDatabase,
} from "./storage-contract.js";

function materializeQuotationRevisions(state: ArchiveState): ArchiveState {
  return archiveStateSchema.parse({
    ...state,
    records: state.records.map((record) => ({
      ...record,
      quotationRevision: crypto.randomUUID(),
    })),
  });
}

export function parseStoredState(untrusted: unknown): ArchiveState {
  if (untrusted === undefined) {
    throw new ArchivePersistenceError(
      "STATE_MISSING",
      "Archive state is missing; initialize the archive with a validated seed before continuing.",
    );
  }
  const parsed = archiveStateSchema.safeParse(untrusted);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ArchivePersistenceError(
      "STATE_UNREADABLE",
      `Archive state is unreadable at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "validation failed"}. The stored row was preserved and automatic writes were stopped; use explicit backup recovery to quarantine and replace it.`,
      { cause: parsed.error },
    );
  }
  if (!hasDurableQuotationRevisions(untrusted)) {
    throw new ArchivePersistenceError(
      "STATE_UNREADABLE",
      "Archive state is missing durable quotation revision tokens. The stored row was preserved and automatic writes were stopped; reopen Badge to finish the storage upgrade or use explicit backup recovery.",
    );
  }
  return parsed.data;
}

export async function abortQuietly(transaction: {
  abort(): void;
  readonly done: Promise<unknown>;
}): Promise<void> {
  try {
    transaction.abort();
  } catch {
    // The browser may already have completed or aborted the transaction.
  }
  try {
    await transaction.done;
  } catch {
    // Preserve the original operation error.
  }
}

export function openArchiveDatabase(
  onInvalidated: (database: IDBPDatabase<ArchiveDatabase>) => void,
): Promise<IDBPDatabase<ArchiveDatabase>> {
  let openedConnection: IDBPDatabase<ArchiveDatabase> | undefined;
  const request = openDB<ArchiveDatabase>(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION, {
    async upgrade(database, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1 && !database.objectStoreNames.contains(ARCHIVE_STATE_STORE)) {
        database.createObjectStore(ARCHIVE_STATE_STORE);
      }
      if (oldVersion < 2 && !database.objectStoreNames.contains(ARCHIVE_OBJECT_STORE)) {
        database.createObjectStore(ARCHIVE_OBJECT_STORE);
      }
      if (oldVersion < 3) {
        const stateStore = transaction.objectStore(ARCHIVE_STATE_STORE);
        const rawState = await stateStore.get(ARCHIVE_STATE_KEY);
        const parsed = archiveStateSchema.safeParse(rawState);
        if (parsed.success && !hasDurableQuotationRevisions(rawState)) {
          await stateStore.put(materializeQuotationRevisions(parsed.data), ARCHIVE_STATE_KEY);
        }
      }
    },
    blocking: () => {
      openedConnection?.close();
      if (openedConnection) onInvalidated(openedConnection);
    },
    terminated: () => {
      if (openedConnection) onInvalidated(openedConnection);
    },
  });
  void request.then(
    (database) => {
      openedConnection = database;
    },
    () => undefined,
  );
  return request;
}
