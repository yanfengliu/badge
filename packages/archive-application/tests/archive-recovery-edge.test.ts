import "fake-indexeddb/auto";

import {
  activateAchievement,
  createSeededArchiveState,
  type ActivationInput,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import { canonicalJsonBytes, sha256Hex } from "@badge/pack-contract";
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
  archiveRecoveryEvidenceSchema,
  createArchiveBackup,
  parseArchiveBackup,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
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
const activationInput: ActivationInput = {
  recordId: "record-yosemite",
  occurredStart: "2026-06-12",
  occurredEnd: "2026-06-14",
  note: "Granite after rain.",
  visibility: "private",
  saying: "Wonder leaves a mark.",
  visualPin: originalVisual,
};

function state(publishedVisual: PublishedVisual = originalVisual): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: { namespace: "pack", packId: "parks", definitionId: "visited-yosemite" },
        collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "national-parks" }],
        title: "Visited Yosemite National Park",
        criterion: "Visit Yosemite National Park honestly.",
        description: null,
        lifecycle: "suggested",
        publishedVisual,
        acceptedSaying: null,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

let repositories: IndexedDbArchiveRepository[] = [];

function createApplication(): { application: ArchiveApplication; repository: IndexedDbArchiveRepository } {
  const repository = new IndexedDbArchiveRepository();
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

describe("Archive recovery edge conditions", () => {
  it("explicitly quarantines and replaces readable state the current Archive cannot present", async () => {
    const incompatibleVisual: PublishedVisual = {
      ...originalVisual,
      packRef: { ...originalVisual.packRef, packDigest: "c".repeat(64) },
      sourceAssetHash: "b".repeat(64),
    };
    const incompatibleState = state(incompatibleVisual);
    const target = createApplication();
    await target.application.initialize(incompatibleState);
    const checkpoint = await target.application.exportBackupCheckpoint();
    const backup = await createArchiveBackup(state(), [], exportedAt);

    await expect(
      target.application.recoverBackup(backup, "local-owner", [sourceAsset]),
    ).rejects.toMatchObject({ code: "BACKUP_INCOMPLETE" });

    const recovery = await target.application.recoverBackup(backup, "local-owner", [sourceAsset], {
      mode: "replace-incompatible-readable-state",
      expectedCurrentState: checkpoint.state,
    });
    expect(recovery).toMatchObject({ state: state(), stateReplaced: true });
    expect(await target.application.state()).toEqual(state());
    expect(await target.application.visual("record-yosemite")).toMatchObject({ sourceAsset });

    target.repository.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, recovery.quarantineKey)).toMatchObject({
      kind: "quarantined-archive-state",
      reason: "incompatible-readable-state",
      raw: incompatibleState,
    });
    evidence.close();
  });

  it("refuses readable replacement when state changed after the safety checkpoint", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    const checkpoint = await target.application.exportBackupCheckpoint();
    await target.application.updateLifecycle("record-yosemite", "planned");
    const changed = await target.application.state();
    const backup = await createArchiveBackup(state(), [], exportedAt);

    await expect(
      target.application.recoverBackup(backup, "local-owner", [sourceAsset], {
        mode: "replace-incompatible-readable-state",
        expectedCurrentState: checkpoint.state,
      }),
    ).rejects.toMatchObject({ code: "RESTORE_CONFLICT" });
    expect(await target.application.state()).toEqual(changed);
  });

  it("exports non-restorable state evidence before replacing incompatible state with missing historical art", async () => {
    const missingVisual: PublishedVisual = {
      ...originalVisual,
      packRef: { ...originalVisual.packRef, packId: "historical.unrelated" },
      sourceAssetHash: "f".repeat(64),
      visualEditionId: "historical-missing-source",
    };
    const original = state();
    const historicalSeed = createSeededArchiveState({
      ownerId: original.ownerId,
      records: [
        {
          ...original.records[0],
          definitionRef: {
            namespace: "pack",
            packId: missingVisual.packRef.packId,
            definitionId: original.records[0].definitionRef.definitionId,
          },
          collectionRefs: original.records[0].collectionRefs.map((reference) => ({
            namespace: "pack" as const,
            packId: missingVisual.packRef.packId,
            collectionId: reference.collectionId,
          })),
          publishedVisual: missingVisual,
        },
      ],
    });
    const current = activateAchievement(
      historicalSeed,
      { ...activationInput, visualPin: missingVisual },
      exportedAt,
    ).state;
    const target = createApplication();
    await target.application.initialize(current);
    await expect(target.application.exportBackup()).rejects.toMatchObject({
      code: "VISUAL_SOURCE_MISSING",
    });

    const rescue = await target.application.exportRecoveryEvidenceCheckpoint();
    const evidence = archiveRecoveryEvidenceSchema.parse(JSON.parse(new TextDecoder().decode(rescue.bytes)));
    expect(evidence).toMatchObject({
      limitations: { restorable: false, sourceAssetsIncluded: false },
      omittedEarnedSourceHashes: [missingVisual.sourceAssetHash],
      state: current,
    });
    expect(evidence.stateSha256).toBe(await sha256Hex(canonicalJsonBytes(current)));
    await expect(parseArchiveBackup(rescue.bytes)).rejects.toMatchObject({ code: "BACKUP_INVALID" });

    const compatibleBackup = await createArchiveBackup(state(), [], exportedAt);
    const recovery = await target.application.recoverBackup(compatibleBackup, "local-owner", [sourceAsset], {
      mode: "replace-incompatible-readable-state",
      expectedCurrentState: rescue.state,
    });
    expect(recovery).toMatchObject({ state: state(), stateReplaced: true });
  });

  it("requires an explicit matching owner when corrupt state evidence has no readable owner", async () => {
    const target = createApplication();
    await target.application.initialize(state(), [sourceAsset]);
    target.repository.close();

    const corrupt = { schemaVersion: 1, records: [{ broken: true }] };
    const raw = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await raw.put(ARCHIVE_STATE_STORE, corrupt, ARCHIVE_STATE_KEY);
    raw.close();

    const backup = await createArchiveBackup(state(), [], exportedAt);
    const reopened = createApplication();
    await expect(reopened.application.recoverBackup(backup, "different-owner")).rejects.toMatchObject({
      code: "BACKUP_OWNER_MISMATCH",
    });
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(corrupt);
    evidence.close();

    await expect(reopened.application.recoverBackup(backup, "local-owner")).resolves.toMatchObject({
      state: state(),
    });
  });

  it("aborts recovery if another connection changes an inspected source before the write", async () => {
    const corruptState = { schemaVersion: 1, ownerId: "local-owner", records: [{ broken: true }] };
    const earned = activateAchievement(state(), activationInput, exportedAt).state;
    const backup = await createArchiveBackup(earned, [sourceAsset], exportedAt);
    const initial = createApplication();
    await initial.application.initialize(state());
    initial.repository.close();

    const setup = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await setup.put(ARCHIVE_STATE_STORE, corruptState, ARCHIVE_STATE_KEY);
    setup.close();

    const concurrentSource = {
      ...sourceAsset,
      bytes: new TextEncoder().encode("inserted-after-recovery-inspection"),
    };
    const racingRepository = new IndexedDbArchiveRepository({
      async onRecoveryStage() {
        const otherConnection = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
        await otherConnection.put(ARCHIVE_OBJECT_STORE, concurrentSource, sourceAsset.hash);
        otherConnection.close();
      },
    });
    repositories.push(racingRepository);
    const racingApplication = new ArchiveApplication(racingRepository, { now: () => exportedAt });
    await expect(racingApplication.recoverBackup(backup, "local-owner")).rejects.toMatchObject({
      code: "TRANSACTION_FAILED",
    });

    racingRepository.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(corruptState);
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, sourceAsset.hash)).toEqual(concurrentSource);
    expect(
      (await evidence.getAllKeys(ARCHIVE_STATE_STORE)).filter(
        (key) => typeof key === "string" && key.startsWith("archive-state-quarantine:"),
      ),
    ).toEqual([]);
    expect(
      (await evidence.getAllKeys(ARCHIVE_OBJECT_STORE)).filter(
        (key) => typeof key === "string" && key.startsWith("archive-object-quarantine:"),
      ),
    ).toEqual([]);
    evidence.close();
  });

  it("refuses to export an earned state whose immutable source object is missing", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    target.repository.close();

    const earned = activateAchievement(state(), activationInput, exportedAt).state;
    const raw = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await raw.put(ARCHIVE_STATE_STORE, earned, ARCHIVE_STATE_KEY);
    raw.close();

    const reopened = createApplication();
    await expect(reopened.application.exportBackup()).rejects.toMatchObject({
      code: "VISUAL_SOURCE_MISSING",
    });
    expect(await reopened.application.state()).toEqual(earned);
  });
});
