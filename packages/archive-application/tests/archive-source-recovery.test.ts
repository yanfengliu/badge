import "fake-indexeddb/auto";

import {
  archiveStateSchema,
  createSeededArchiveState,
  type ActivationInput,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ArchiveApplication,
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  IndexedDbArchiveRepository,
  createArchiveBackup,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import {
  historicalQuotationRequest,
  sourceCheckedResponse,
  withAcceptedQuotation,
} from "./historical-quotation-fixtures.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const exportedAt = "2026-08-23T17:00:00.000Z";
const originalVisual: PublishedVisual = {
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
  hash: validPngHash,
  mimeType: "image/png",
  bytes: validPngBytes,
};

function state(): ArchiveState {
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
        title: "Visited Yosemite National Park",
        criterion: "Visit Yosemite National Park honestly.",
        description: null,
        lifecycle: "suggested",
        publishedVisual: originalVisual,
        acceptedSaying: null,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

function stateWithQuotation(): ArchiveState {
  return withAcceptedQuotation(state());
}

const initialQuotationRevision = stateWithQuotation().records[0]!.quotationRevision;
const activationInput: ActivationInput = {
  recordId: "record-yosemite",
  occurredStart: "2026-06-12",
  occurredEnd: "2026-06-14",
  note: "Granite after rain.",
  visibility: "private",
  visualPin: originalVisual,
};

let repositories: IndexedDbArchiveRepository[] = [];

function createApplication(): {
  application: ArchiveApplication;
  repository: IndexedDbArchiveRepository;
} {
  const repository = new IndexedDbArchiveRepository({
    trustedQuotationRequests: { "record-yosemite": historicalQuotationRequest },
  });
  repositories.push(repository);
  return {
    repository,
    application: new ArchiveApplication(repository, { now: () => exportedAt }),
  };
}

afterEach(async () => {
  for (const repository of repositories) repository.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("explicit source recovery", () => {
  it("atomically quarantines and replaces corrupt immutable source bytes only through recovery", async () => {
    const target = createApplication();
    await target.application.initialize(stateWithQuotation());
    const activated = await target.application.activate(
      activationInput,
      sourceAsset,
      sourceCheckedResponse,
      initialQuotationRevision,
    );
    const backup = await target.application.exportBackup();
    const current = archiveStateSchema.parse({
      ...activated.state,
      records: [
        {
          ...activated.state.records[0],
          note: "A newer earned note that source repair must preserve.",
        },
      ],
    });
    target.repository.close();

    const corruptBytes = sourceAsset.bytes.slice();
    corruptBytes[25] ^= 0xff;
    const corruptSource = { ...sourceAsset, bytes: corruptBytes };
    const raw = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await raw.put(ARCHIVE_STATE_STORE, current, ARCHIVE_STATE_KEY);
    await raw.put(ARCHIVE_OBJECT_STORE, corruptSource, sourceAsset.hash);
    raw.close();

    const reopened = createApplication();
    await expect(reopened.application.visual("record-yosemite")).rejects.toMatchObject({
      code: "VISUAL_SOURCE_UNREADABLE",
    });
    await expect(
      reopened.application.restoreBackup(backup, await reopened.application.state()),
    ).rejects.toMatchObject({
      code: "BACKUP_WOULD_LOSE_EARNED_RECORD",
    });
    await expect(reopened.application.visual("record-yosemite")).rejects.toMatchObject({
      code: "VISUAL_SOURCE_UNREADABLE",
    });

    const recovery = await reopened.application.recoverBackup(backup, "local-owner");
    expect(recovery.stateReplaced).toBe(false);
    expect(recovery.state).toEqual(current);
    expect(recovery.quarantineKey).toMatch(/^archive-object-quarantine:/);
    expect(recovery.quarantineKeys).toEqual([recovery.quarantineKey]);
    expect(await reopened.application.visual("record-yosemite")).toMatchObject({
      pin: activationInput.visualPin,
      sourceAsset,
    });

    reopened.repository.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, recovery.quarantineKey)).toMatchObject({
      kind: "quarantined-archive-source",
      sourceHash: sourceAsset.hash,
      raw: corruptSource,
    });
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, sourceAsset.hash)).toEqual(sourceAsset);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(current);
    evidence.close();
  });

  it("repairs corrupt prefetched art for an unearned record using trusted current fixture bytes", async () => {
    const target = createApplication();
    const current = archiveStateSchema.parse({
      ...state(),
      records: [
        {
          ...state().records[0],
          lifecycle: "planned",
          note: "A newer local plan that source repair must preserve.",
        },
      ],
    });
    await target.application.initialize(current, [sourceAsset]);
    const backup = await createArchiveBackup(state(), [], exportedAt);
    target.repository.close();

    const corruptBytes = sourceAsset.bytes.slice();
    corruptBytes[25] ^= 0xff;
    const corruptSource = { ...sourceAsset, bytes: corruptBytes };
    const raw = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await raw.put(ARCHIVE_OBJECT_STORE, corruptSource, sourceAsset.hash);
    raw.close();

    const reopened = createApplication();
    await expect(reopened.application.initialize(state(), [sourceAsset])).rejects.toMatchObject({
      code: "VISUAL_SOURCE_CONFLICT",
    });
    await expect(reopened.application.recoverBackup(backup, "local-owner")).rejects.toMatchObject({
      code: "BACKUP_INCOMPLETE",
      message: expect.stringMatching(/source.*unearned catalogue record.*trusted current sources/i),
    });

    const recovery = await reopened.application.recoverBackup(backup, "local-owner", [sourceAsset]);
    expect(recovery.quarantineKey).toMatch(/^archive-object-quarantine:/);
    expect(recovery.stateReplaced).toBe(false);
    expect(recovery.state).toEqual(current);
    expect(await reopened.application.visual("record-yosemite")).toMatchObject({
      pin: originalVisual,
      sourceAsset,
    });

    reopened.repository.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, recovery.quarantineKey)).toMatchObject({
      kind: "quarantined-archive-source",
      sourceHash: sourceAsset.hash,
      raw: corruptSource,
    });
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, sourceAsset.hash)).toEqual(sourceAsset);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(current);
    evidence.close();
  });
});
