import "fake-indexeddb/auto";

import { createSeededArchiveState, type ArchiveState } from "@badge/archive-domain";
import { deleteDB, openDB, unwrap } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  IndexedDbArchiveRepository,
} from "../src/index.js";

function seed(): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: { namespace: "pack", packId: "parks", definitionId: "yosemite" },
        collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "parks" }],
        title: "Visited Yosemite National Park",
        criterion: "Visit Yosemite National Park honestly.",
        description: null,
        lifecycle: "suggested",
        publishedVisual: {
          packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
          visualEditionId: "yosemite-v1",
          sourceAssetHash: "b".repeat(64),
          accessibleDescription: "Yosemite after rain.",
          renderRecipeVersion: 1,
          renderRecipe: {
            version: 1,
            shape: "circle",
            material: "metal",
            borderColor: "#b87333",
            borderWidth: 0.08,
            thickness: 0.1,
            relief: 0.03,
            crop: { x: 0.5, y: 0.5, scale: 1 },
          },
        },
        acceptedSaying: null,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

function withoutQuotationRevision(state: ArchiveState): unknown {
  return {
    ...state,
    records: state.records.map((record) =>
      Object.fromEntries(Object.entries(record).filter(([key]) => key !== "quotationRevision")),
    ),
  };
}

const repositories: IndexedDbArchiveRepository[] = [];

async function blockedMigration(): Promise<{
  blocker: Awaited<ReturnType<typeof openDB>>;
  current: IndexedDbArchiveRepository;
  loading: Promise<ArchiveState>;
  tokenless: unknown;
}> {
  const blocker = await openDB(ARCHIVE_DATABASE_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(ARCHIVE_STATE_STORE);
    },
  });
  const tokenless = withoutQuotationRevision(seed());
  await blocker.put(ARCHIVE_STATE_STORE, tokenless, ARCHIVE_STATE_KEY);
  const versionChange = new Promise<void>((resolve) => {
    unwrap(blocker).addEventListener("versionchange", () => resolve(), { once: true });
  });
  const current = new IndexedDbArchiveRepository();
  repositories.push(current);
  const loading = current.load(seed());
  await versionChange;
  return { blocker, current, loading, tokenless };
}

afterEach(async () => {
  for (const repository of repositories.splice(0)) repository.close();
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("Archive database open lifecycle", () => {
  it("keeps a blocked token migration owned until the older connection closes", async () => {
    const { blocker, loading, tokenless } = await blockedMigration();
    let settled = false;
    void loading.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    expect(await blocker.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(tokenless);
    await Promise.resolve();
    expect(settled).toBe(false);
    blocker.close();

    const loaded = await loading;
    expect(loaded.records[0]?.quotationRevision).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("owns a blocked open through close and truthfully reports its completed migration", async () => {
    const { blocker, current, loading } = await blockedMigration();
    current.close();
    blocker.close();

    await expect(loading).rejects.toMatchObject({
      code: "TRANSACTION_FAILED",
      message: expect.stringMatching(/version upgrade may have completed.*record action did not run/i),
    });
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    const migrated = (await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)) as ArchiveState;
    expect(migrated.records[0]?.quotationRevision).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    evidence.close();
    await expect(current.load(seed())).resolves.toEqual(migrated);
  });
});
