import "fake-indexeddb/auto";

import { archiveStateSchema } from "@badge/archive-domain";
import { deleteDB, openDB, type IDBPDatabase } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import { recoverArchive } from "../src/recovery.js";
import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  type ArchiveDatabase,
} from "../src/storage-contract.js";

const ownerId = "local-owner";
const quarantinedAt = "2026-08-23T17:00:00.000Z";
const incomingState = archiveStateSchema.parse({ schemaVersion: 1, ownerId, records: [] });

let connections: IDBPDatabase<ArchiveDatabase>[] = [];

async function database(): Promise<IDBPDatabase<ArchiveDatabase>> {
  const connection = await openDB<ArchiveDatabase>(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION, {
    upgrade(current) {
      current.createObjectStore(ARCHIVE_STATE_STORE);
      current.createObjectStore(ARCHIVE_OBJECT_STORE);
    },
  });
  connections.push(connection);
  return connection;
}

afterEach(async () => {
  for (const connection of connections) connection.close();
  connections = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

const structuredCloneChanges: ReadonlyArray<readonly [string, () => unknown, () => unknown]> = [
  [
    "Blob bytes",
    () => new Blob(["aa"], { type: "text/plain" }),
    () => new Blob(["bb"], { type: "text/plain" }),
  ],
  ["Date value", () => new Date(0), () => new Date(1)],
  ["Map entry", () => new Map([["key", "before"]]), () => new Map([["key", "after"]])],
  ["Set entry", () => new Set(["before"]), () => new Set(["after"])],
  ["ArrayBuffer bytes", () => Uint8Array.of(1, 2).buffer, () => Uint8Array.of(1, 3).buffer],
  ["typed-array bytes", () => Uint16Array.of(1, 2), () => Uint16Array.of(1, 3)],
];

describe("recovery compare-and-swap", () => {
  it.each(structuredCloneChanges)("detects a concurrent %s change", async (_name, before, after) => {
    const primary = await database();
    const original = { ownerId, evidence: before() };
    const concurrent = { ownerId, evidence: after() };
    await primary.put(ARCHIVE_STATE_STORE, original, ARCHIVE_STATE_KEY);

    await expect(
      recoverArchive(primary, incomingState, [], quarantinedAt, ownerId, {
        afterInspection: async () => {
          const other = await database();
          await other.put(ARCHIVE_STATE_STORE, concurrent, ARCHIVE_STATE_KEY);
          other.close();
        },
      }),
    ).rejects.toMatchObject({
      code: "TRANSACTION_FAILED",
      message: expect.stringMatching(/another connection changed the state after inspection/i),
    });

    expect(await primary.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(concurrent);
    expect(await primary.getAllKeys(ARCHIVE_STATE_STORE)).toEqual([ARCHIVE_STATE_KEY]);
  });

  it("keeps the transaction alive while comparing unchanged nested structured-clone evidence", async () => {
    const primary = await database();
    const raw = {
      ownerId,
      evidence: new Map<string, unknown>([
        ["blob", new Blob(["unchanged"], { type: "text/plain" })],
        ["views", new Set<unknown>([Uint8Array.of(1, 2, 3), new Date(0)])],
      ]),
    };
    await primary.put(ARCHIVE_STATE_STORE, raw, ARCHIVE_STATE_KEY);

    const recovered = await recoverArchive(primary, incomingState, [], quarantinedAt, ownerId);

    expect(recovered).toMatchObject({ state: incomingState, stateReplaced: true });
    expect(await primary.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(incomingState);
    expect(await primary.get(ARCHIVE_STATE_STORE, recovered.quarantineKey)).toMatchObject({
      kind: "quarantined-archive-state",
      raw,
    });
  });
});
