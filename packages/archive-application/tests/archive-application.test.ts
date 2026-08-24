import "fake-indexeddb/auto";

import { forceCloseDatabase } from "fake-indexeddb";
import { deleteDB, openDB, unwrap, type IDBPDatabase } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ArchiveApplication,
  ArchivePersistenceError,
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  IndexedDbArchiveRepository,
  type ArchiveSourceAssetInput,
  type ArchiveDatabase,
  type ArchiveRepositoryTransactionStage,
} from "../src/index.js";
import {
  activateAchievement,
  createSeededArchiveState,
  type ActivationInput,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import { validPngBytes, validPngHash } from "./image-fixtures.js";
import {
  historicalQuotationRequest,
  sourceCheckedResponse,
  withAcceptedQuotation,
} from "./historical-quotation-fixtures.js";

const visual: PublishedVisual = {
  packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: validPngHash,
  accessibleDescription: "A crafted Yosemite badge showing granite walls after rain.",
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
};

const sourceAsset: ArchiveSourceAssetInput = {
  hash: visual.sourceAssetHash,
  mimeType: "image/png",
  bytes: validPngBytes,
};

function seed(title = "Visited Yosemite National Park"): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: {
          namespace: "pack",
          packId: "parks",
          definitionId: "visited-yosemite",
        },
        collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "national-parks" }],
        title,
        criterion: "Visit Yosemite National Park honestly.",
        description: null,
        lifecycle: "suggested",
        publishedVisual: visual,
        acceptedSaying: null,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

function seedWithQuotation(title = "Visited Yosemite National Park"): ArchiveState {
  return withAcceptedQuotation(seed(title));
}

const initialQuotationRevision = seedWithQuotation().records[0]!.quotationRevision;

const activationInput: ActivationInput = {
  recordId: "record-yosemite",
  occurredStart: "2026-06-12",
  occurredEnd: "2026-06-14",
  note: "Granite after rain.",
  visibility: "private",
  visualPin: {
    packRef: visual.packRef,
    visualEditionId: visual.visualEditionId,
    sourceAssetHash: visual.sourceAssetHash,
    accessibleDescription: visual.accessibleDescription,
    renderRecipeVersion: visual.renderRecipeVersion,
    renderRecipe: visual.renderRecipe,
  },
};

let repositories: IndexedDbArchiveRepository[] = [];

function repository(
  onTransactionStage?: (stage: ArchiveRepositoryTransactionStage) => void,
): IndexedDbArchiveRepository {
  const result = new IndexedDbArchiveRepository({
    onTransactionStage,
    trustedQuotationRequests: { "record-yosemite": historicalQuotationRequest },
  });
  repositories.push(result);
  return result;
}

afterEach(async () => {
  for (const current of repositories) current.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("IndexedDbArchiveRepository", () => {
  it("uses the canonical database identity and seeds only an absent state", async () => {
    expect(ARCHIVE_DATABASE_NAME).toBe("badge-archive-v1");
    expect(ARCHIVE_DATABASE_VERSION).toBe(3);

    const current = repository();
    expect(await current.load(seed())).toEqual(seed());
    expect(await current.load(seed("A replacement that must not win"))).toEqual(seed());
  });

  it("clears a rejected database-open attempt so the same repository can retry", async () => {
    const tooNew = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION + 1, {
      upgrade(database) {
        database.createObjectStore(ARCHIVE_STATE_STORE);
        database.createObjectStore(ARCHIVE_OBJECT_STORE);
      },
    });
    tooNew.close();

    const current = repository();
    await expect(current.load(seed())).rejects.toMatchObject({ name: "VersionError" });
    await deleteDB(ARCHIVE_DATABASE_NAME);

    await expect(current.load(seed())).resolves.toEqual(seed());
  });

  it("closes for database deletion and reopens a fresh store afterward", async () => {
    const current = repository();
    await current.load(seed());
    let deleteWasBlocked = false;

    await deleteDB(ARCHIVE_DATABASE_NAME, {
      blocked() {
        deleteWasBlocked = true;
      },
    });

    expect(deleteWasBlocked).toBe(false);
    await expect(current.load(seed())).resolves.toEqual(seed());
  });

  it("forgets an abnormally terminated connection and reopens on the next read", async () => {
    const current = repository();
    await current.load(seed());
    const wrappedConnection = Reflect.get(current, "connection") as IDBPDatabase<ArchiveDatabase> | undefined;
    if (!wrappedConnection) throw new Error("repository connection was not opened");

    forceCloseDatabase(unwrap(wrappedConnection) as unknown as Parameters<typeof forceCloseDatabase>[0]);

    await expect(current.read()).resolves.toEqual(seed());
  });

  it("upgrades a storage-v1 database containing the current state contract without replacing its row", async () => {
    const legacy = await openDB(ARCHIVE_DATABASE_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(ARCHIVE_STATE_STORE);
      },
    });
    await legacy.put(ARCHIVE_STATE_STORE, seed(), ARCHIVE_STATE_KEY);
    legacy.close();

    const current = repository();
    expect(await current.load(seed("Must not replace the v1 row"))).toEqual(seed());
    current.close();

    const upgraded = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect([...upgraded.objectStoreNames]).toEqual(
      expect.arrayContaining([ARCHIVE_STATE_STORE, ARCHIVE_OBJECT_STORE]),
    );
    expect(await upgraded.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(seed());
    upgraded.close();
  });

  it("backfills matching source bytes for a current-contract earned row in storage v1", async () => {
    const earned = activateAchievement(
      seedWithQuotation(),
      activationInput,
      "2026-08-23T17:00:00.000Z",
    ).state;
    const legacy = await openDB(ARCHIVE_DATABASE_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(ARCHIVE_STATE_STORE);
      },
    });
    await legacy.put(ARCHIVE_STATE_STORE, earned, ARCHIVE_STATE_KEY);
    legacy.close();

    const current = repository();
    expect(await current.load(seed("Current fixture must not replace history"), [sourceAsset])).toEqual(
      earned,
    );
    expect(await current.resolveVisual("record-yosemite")).toMatchObject({
      pin: earned.records[0].activation?.visualPin,
      sourceAsset,
    });
  });

  it("preserves and rejects a literal legacy pin that cannot prove the exact published visual", async () => {
    const earned = activateAchievement(
      seedWithQuotation(),
      activationInput,
      "2026-08-23T17:00:00.000Z",
    ).state;
    const record = earned.records[0];
    const activation = record.activation;
    if (!activation) throw new Error("fixture must be earned");
    const legacyState = {
      ...earned,
      records: [
        {
          ...record,
          activation: {
            ...activation,
            visualPin: {
              packRef: activation.visualPin.packRef,
              visualEditionId: activation.visualPin.visualEditionId,
              sourceAssetHash: activation.visualPin.sourceAssetHash,
              renderRecipeVersion: activation.visualPin.renderRecipeVersion,
            },
          },
        },
      ],
    };
    const legacy = await openDB(ARCHIVE_DATABASE_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(ARCHIVE_STATE_STORE);
      },
    });
    await legacy.put(ARCHIVE_STATE_STORE, legacyState, ARCHIVE_STATE_KEY);
    legacy.close();

    const current = repository();
    await expect(current.load(seed(), [sourceAsset])).rejects.toMatchObject({
      code: "STATE_UNREADABLE",
    });
    current.close();

    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(legacyState);
    evidence.close();
  });

  it("reports a corrupt state without overwriting its recovery evidence", async () => {
    const current = repository();
    await current.load(seed());
    current.close();

    const raw = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    const corrupt = { schemaVersion: 1, ownerId: "local-owner", records: [{ broken: true }] };
    await raw.put(ARCHIVE_STATE_STORE, corrupt, ARCHIVE_STATE_KEY);
    raw.close();

    const reopened = repository();
    await expect(reopened.load(seed("Must not overwrite"))).rejects.toMatchObject({
      code: "STATE_UNREADABLE",
    });
    reopened.close();

    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(corrupt);
    evidence.close();
  });

  it("rejects corrupt PNG initialization before either IndexedDB store changes", async () => {
    const current = repository();
    const originalState = await current.load(seed());
    current.close();

    const corruptSource = {
      ...sourceAsset,
      bytes: corruptPngAdlerKeepingChunkCrc(validPngBytes),
    };
    const reopened = repository();
    await expect(
      reopened.load(seed("Must not replace existing state"), [corruptSource]),
    ).rejects.toMatchObject({
      code: "VISUAL_SOURCE_INVALID",
    });
    reopened.close();

    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(originalState);
    expect(await evidence.getAllKeys(ARCHIVE_OBJECT_STORE)).toEqual([]);
    evidence.close();
  });

  it("commits activation before resolving and survives a fresh connection", async () => {
    const stages: ArchiveRepositoryTransactionStage[] = [];
    const current = repository((stage) => stages.push(stage));
    const application = new ArchiveApplication(current, {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    await application.initialize(seedWithQuotation());

    const result = await application.activate(
      activationInput,
      sourceAsset,
      sourceCheckedResponse,
      initialQuotationRevision,
    );
    expect(stages).toEqual(["activation:written", "activation:committed"]);
    expect(result.record.lifecycle).toBe("earned");
    current.close();

    const reopened = repository();
    const persisted = await reopened.read();
    expect(persisted.records[0].activation).toEqual(result.activation);
    expect(persisted.records[0].lifecycle).toBe("earned");

    const resolved = await reopened.resolveVisual("record-yosemite");
    expect(resolved.pin).toEqual(result.activation.visualPin);
    expect(resolved.pin.accessibleDescription).toBe(
      "A crafted Yosemite badge showing granite walls after rain.",
    );
    expect(resolved.sourceAsset).toEqual(sourceAsset);
    resolved.sourceAsset.bytes[0] ^= 0xff;
    expect((await reopened.resolveVisual("record-yosemite")).sourceAsset).toEqual(sourceAsset);
  });

  it("returns committed activation success even when the committed observer throws", async () => {
    const observerErrors: Array<{ error: unknown; stage: ArchiveRepositoryTransactionStage }> = [];
    const current = new IndexedDbArchiveRepository({
      trustedQuotationRequests: { "record-yosemite": historicalQuotationRequest },
      onTransactionStage(stage) {
        if (stage === "activation:committed") throw new Error("observer failed after commit");
      },
      onObserverError(error, stage) {
        observerErrors.push({ error, stage });
      },
    });
    repositories.push(current);
    const application = new ArchiveApplication(current, {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    await application.initialize(seedWithQuotation());

    await expect(
      application.activate(activationInput, sourceAsset, sourceCheckedResponse, initialQuotationRevision),
    ).resolves.toMatchObject({
      record: { lifecycle: "earned" },
    });
    expect(observerErrors).toHaveLength(1);
    expect(observerErrors[0]).toMatchObject({ stage: "activation:committed" });
    expect(observerErrors[0].error).toEqual(new Error("observer failed after commit"));
    expect((await current.read()).records[0].lifecycle).toBe("earned");
  });

  it("rolls an aborted activation back and never reports it committed", async () => {
    const stages: ArchiveRepositoryTransactionStage[] = [];
    const current = repository((stage) => {
      stages.push(stage);
      if (stage === "activation:written") throw new Error("injected transaction failure");
    });
    const application = new ArchiveApplication(current, {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    await application.initialize(seedWithQuotation());

    await expect(
      application.activate(activationInput, sourceAsset, sourceCheckedResponse, initialQuotationRevision),
    ).rejects.toBeInstanceOf(ArchivePersistenceError);
    expect(stages).toEqual(["activation:written"]);
    expect(await current.read()).toEqual(seedWithQuotation());
    await expect(current.resolveVisual("record-yosemite")).rejects.toMatchObject({
      code: "VISUAL_SOURCE_MISSING",
    });
  });

  it("rejects source bytes that do not match the activated visual pin before mutation", async () => {
    const current = repository();
    const application = new ArchiveApplication(current, {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    await application.initialize(seedWithQuotation());

    await expect(
      application.activate(
        activationInput,
        {
          ...sourceAsset,
          hash: "f".repeat(64),
        },
        sourceCheckedResponse,
        initialQuotationRevision,
      ),
    ).rejects.toMatchObject({ code: "VISUAL_SOURCE_HASH_MISMATCH" });
    expect(await application.state()).toEqual(seedWithQuotation());
  });

  it("rejects corrupt PNG activation before either IndexedDB store changes", async () => {
    const current = repository();
    const application = new ArchiveApplication(current, {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    const originalState = await application.initialize(seedWithQuotation());

    await expect(
      application.activate(
        activationInput,
        {
          ...sourceAsset,
          bytes: corruptPngAdlerKeepingChunkCrc(validPngBytes),
        },
        sourceCheckedResponse,
        initialQuotationRevision,
      ),
    ).rejects.toMatchObject({ code: "VISUAL_SOURCE_INVALID" });
    current.close();

    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(originalState);
    expect(await evidence.getAllKeys(ARCHIVE_OBJECT_STORE)).toEqual([]);
    evidence.close();
  });
});

function corruptPngAdlerKeepingChunkCrc(source: Uint8Array): Uint8Array {
  const bytes = source.slice();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 8;
  while (cursor + 12 <= bytes.byteLength) {
    const dataLength = view.getUint32(cursor, false);
    const dataEnd = cursor + 8 + dataLength;
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8));
    if (type === "IDAT") {
      bytes[dataEnd - 1] ^= 1;
      view.setUint32(dataEnd, crc32(bytes.subarray(cursor + 4, dataEnd)), false);
      return bytes;
    }
    cursor = dataEnd + 4;
  }
  throw new Error("PNG fixture does not contain an IDAT chunk");
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
