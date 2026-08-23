import "fake-indexeddb/auto";

import { activateAchievement, archiveStateSchema, createSeededArchiveState } from "@badge/archive-domain";
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
  parseArchiveBackup,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import type { ActivationInput, ArchiveState, PublishedVisual } from "@badge/archive-domain";
import { makeMislabeledSourceBackup, makeStateJsonNoncanonical } from "./backup-test-mutators.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const exportedAt = "2026-08-23T17:00:00.000Z";
const originalBytes = validPngBytes;
const originalHash = validPngHash;
const changedHash = "a40d6e65da11a676b1b24ffdf5bb4af3f41c60b5787fb1d9cdf15f9f348ba759";
const originalVisual: PublishedVisual = {
  packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: originalHash,
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
  hash: originalHash,
  mimeType: "image/png",
  bytes: originalBytes,
};
function state(
  visual: PublishedVisual = originalVisual,
  ownerId = "local-owner",
  title = "Visited Yosemite National Park",
): ArchiveState {
  return createSeededArchiveState({
    ownerId,
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: { namespace: "pack", packId: "parks", definitionId: "visited-yosemite" },
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
const activationInput: ActivationInput = {
  recordId: "record-yosemite",
  occurredStart: "2026-06-12",
  occurredEnd: "2026-06-14",
  note: "Granite after rain.",
  visibility: "private",
  saying: "Wonder leaves a mark.",
  visualPin: originalVisual,
};
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

describe("self-contained .badgearchive v2", () => {
  it("emits byte-identical backups for the same state, sources, and export time", async () => {
    const earned = activateAchievement(state(), activationInput, exportedAt).state;
    expect(await createArchiveBackup(earned, [sourceAsset], exportedAt)).toEqual(
      await createArchiveBackup(earned, [sourceAsset], exportedAt),
    );
  });

  it("restores an earned recipe and source bytes without consulting changed catalogue fixtures", async () => {
    const first = createApplication();
    await first.application.initialize(state());
    const activated = await first.application.activate(activationInput, sourceAsset);
    const backupBytes = await first.application.exportBackup();
    const backup = await parseArchiveBackup(backupBytes);

    expect(backup).toMatchObject({
      format: "badgearchive",
      backupVersion: 2,
      exportedAt,
      state: activated.state,
    });
    expect(backup.sourceAssets).toEqual([sourceAsset]);

    first.repository.close();
    repositories = [];
    await deleteDB(ARCHIVE_DATABASE_NAME);

    const changedVisual: PublishedVisual = {
      ...originalVisual,
      visualEditionId: "yosemite-wool-v2",
      sourceAssetHash: changedHash,
      accessibleDescription: "Mutable replacement fixture description.",
      renderRecipe: {
        ...originalVisual.renderRecipe,
        shape: "shield",
        material: "wool",
        crop: { x: 0.25, y: 0.7, scale: 1.4 },
      },
    };
    const restored = createApplication();
    await restored.application.initialize(state(changedVisual, "local-owner", "Changed fixture title"));
    await restored.application.restoreBackup(backupBytes);

    const visual = await restored.application.visual("record-yosemite");
    expect(visual.pin).toEqual(activationInput.visualPin);
    expect(visual.pin.renderRecipe).toEqual(originalVisual.renderRecipe);
    expect(visual.pin.accessibleDescription).toBe(originalVisual.accessibleDescription);
    expect(visual.sourceAsset).toEqual(sourceAsset);
  });

  it("rejects tampered source bytes before mutating healthy state", async () => {
    const first = createApplication();
    await first.application.initialize(state());
    await first.application.activate(activationInput, sourceAsset);
    const backupBytes = await first.application.exportBackup();
    const tampered = backupBytes.slice();
    tampered[tampered.length - 1] ^= 0xff;

    first.repository.close();
    repositories = [];
    await deleteDB(ARCHIVE_DATABASE_NAME);

    const target = createApplication();
    await target.application.initialize(state());
    const healthy = await target.application.state();
    await expect(target.application.restoreBackup(tampered)).rejects.toMatchObject({
      code: "BACKUP_CHECKSUM_MISMATCH",
    });
    expect(await target.application.state()).toEqual(healthy);
  });

  it("checksums the backup manifest as well as state and source payloads", async () => {
    const backupBytes = await createArchiveBackup(state(), [], exportedAt);
    const tampered = backupBytes.slice();
    const needle = new TextEncoder().encode(exportedAt);
    const index = tampered.findIndex((value, candidate) =>
      needle.every((expected, offset) => tampered[candidate + offset] === expected),
    );
    expect(index).toBeGreaterThan(0);
    tampered[index] = "3".charCodeAt(0);

    await expect(parseArchiveBackup(tampered)).rejects.toMatchObject({
      code: "BACKUP_CHECKSUM_MISMATCH",
    });
  });

  it("rejects noncanonical state JSON even when every declared checksum is recomputed", async () => {
    const backupBytes = await createArchiveBackup(state(), [], exportedAt);
    await expect(parseArchiveBackup(await makeStateJsonNoncanonical(backupBytes))).rejects.toMatchObject({
      code: "BACKUP_INVALID",
    });
  });

  it("rejects a self-consistent backup whose source payload is not the declared image type", async () => {
    const hostileBackup = await makeMislabeledSourceBackup((sourceHash) => {
      const hostileVisual = { ...originalVisual, sourceAssetHash: sourceHash };
      return activateAchievement(
        state(hostileVisual),
        { ...activationInput, visualPin: hostileVisual },
        exportedAt,
      ).state;
    }, exportedAt);
    await expect(parseArchiveBackup(hostileBackup)).rejects.toMatchObject({
      code: "BACKUP_INVALID",
      message: expect.stringMatching(/source.*image\/png.*non-PNG.*no Archive data was changed/i),
    });
  });

  it("rejects wrong formats and incomplete legacy earned backups before mutation", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    const healthy = await target.application.state();
    const wrongFormat = new TextEncoder().encode(
      JSON.stringify({ format: "badgestudio", backupVersion: 1, exportedAt, state: state() }),
    );
    await expect(target.application.restoreBackup(wrongFormat)).rejects.toMatchObject({
      code: "BACKUP_INVALID",
    });

    const earned = activateAchievement(state(), activationInput, exportedAt).state;
    const incompleteLegacy = JSON.stringify({
      format: "badgearchive",
      backupVersion: 1,
      exportedAt,
      state: earned,
    });
    await expect(target.application.restoreBackup(incompleteLegacy)).rejects.toMatchObject({
      code: "BACKUP_INCOMPLETE",
    });
    expect(await target.application.state()).toEqual(healthy);
  });

  it("continues to restore a strict legacy v1 backup when it has no earned visual", async () => {
    const target = createApplication();
    const current = archiveStateSchema.parse({
      ...state(),
      records: [{ ...state().records[0], lifecycle: "planned", note: "A current local plan." }],
    });
    await target.application.initialize(current);
    const legacy = JSON.stringify({ format: "badgearchive", backupVersion: 1, exportedAt, state: state() });

    const restored = await target.application.restoreBackup(legacy);
    expect(restored).toEqual(state());
  });
});

describe("monotonic restore and explicit corrupt-state recovery", () => {
  it("refuses to overwrite state changed after the user exported the restore safety checkpoint", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    const checkpoint = await target.application.exportBackupCheckpoint();
    await target.application.updateLifecycle("record-yosemite", "planned");
    const changed = await target.application.state();

    await expect(target.application.restoreBackup(checkpoint.bytes, checkpoint.state)).rejects.toMatchObject({
      code: "RESTORE_CONFLICT",
      message: expect.stringMatching(
        /changed after.*safety backup.*export.*again.*no Archive data was changed/i,
      ),
    });
    expect(await target.application.state()).toEqual(changed);
  });

  it("rejects owner changes and removal or mutation of existing earned records", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    await target.application.activate(activationInput, sourceAsset);
    const current = await target.application.state();

    const otherOwner = await createArchiveBackup(state(originalVisual, "different-owner"), [], exportedAt);
    await expect(target.application.restoreBackup(otherOwner)).rejects.toMatchObject({
      code: "BACKUP_OWNER_MISMATCH",
    });

    const older = await createArchiveBackup(state(), [], exportedAt);
    await expect(target.application.restoreBackup(older)).rejects.toMatchObject({
      code: "BACKUP_WOULD_LOSE_EARNED_RECORD",
    });

    const changedEarned = archiveStateSchema.parse({
      ...current,
      records: [{ ...current.records[0], note: "A rewritten memory." }],
    });
    const changed = await createArchiveBackup(changedEarned, [sourceAsset], exportedAt);
    await expect(target.application.restoreBackup(changed)).rejects.toMatchObject({
      code: "BACKUP_WOULD_LOSE_EARNED_RECORD",
    });
    expect(await target.application.state()).toEqual(current);
  });

  it("rejects a same-ID unearned backup whose catalogue or visual lineage is stale", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    const healthy = await target.application.state();
    const staleVisual: PublishedVisual = {
      ...originalVisual,
      packRef: { ...originalVisual.packRef, packDigest: "b".repeat(64) },
      sourceAssetHash: changedHash,
    };
    const staleBackup = await createArchiveBackup(state(staleVisual), [], exportedAt);

    await expect(target.application.restoreBackup(staleBackup)).rejects.toMatchObject({
      code: "BACKUP_CATALOGUE_MISMATCH",
      message: expect.stringMatching(/catalogue lineage.*record-yosemite.*no Archive data was changed/i),
    });
    expect(await target.application.state()).toEqual(healthy);
  });

  it("rejects an earned replacement that rebinds a current record to an unrelated definition lineage", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    const healthy = await target.application.state();
    const activated = activateAchievement(state(), activationInput, exportedAt).state;
    const earned = activated.records[0];
    const unrelatedVisual = {
      ...earned.publishedVisual,
      packRef: { ...earned.publishedVisual.packRef, packId: "unrelated.pack" },
    };
    const rebound = archiveStateSchema.parse({
      ...activated,
      records: [
        {
          ...earned,
          definitionRef: {
            namespace: "pack",
            packId: "unrelated.pack",
            definitionId: "lookalike",
          },
          publishedVisual: unrelatedVisual,
          activation: earned.activation
            ? { ...earned.activation, visualPin: unrelatedVisual }
            : earned.activation,
        },
      ],
    });
    const backup = await createArchiveBackup(rebound, [sourceAsset], exportedAt);

    await expect(target.application.restoreBackup(backup)).rejects.toMatchObject({
      code: "BACKUP_CATALOGUE_MISMATCH",
      message: expect.stringMatching(/earned identity.*record-yosemite.*unrelated\.pack/i),
    });
    expect(await target.application.state()).toEqual(healthy);
  });

  it("quarantines an unreadable raw state row before atomically recovering a valid backup", async () => {
    const target = createApplication();
    await target.application.initialize(state(), [sourceAsset]);
    target.repository.close();

    const corrupt = { schemaVersion: 1, ownerId: "local-owner", records: [{ broken: true }] };
    const raw = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await raw.put(ARCHIVE_STATE_STORE, corrupt, ARCHIVE_STATE_KEY);
    raw.close();

    const backup = await createArchiveBackup(state(), [], exportedAt);
    const reopened = createApplication();
    await expect(reopened.application.restoreBackup(backup)).rejects.toMatchObject({
      code: "STATE_UNREADABLE",
    });

    const recovery = await reopened.application.recoverBackup(backup, "local-owner");
    expect(recovery.state).toEqual(state());
    expect(recovery.stateReplaced).toBe(true);
    expect(recovery.quarantineKey).toMatch(/^archive-state-quarantine:/);
    expect(recovery.quarantineKeys).toEqual([recovery.quarantineKey]);

    reopened.repository.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(state());
    expect(await evidence.get(ARCHIVE_STATE_STORE, recovery.quarantineKey)).toMatchObject({
      kind: "quarantined-archive-state",
      quarantinedAt: exportedAt,
      raw: corrupt,
    });
    evidence.close();

    const healthy = createApplication();
    await expect(healthy.application.recoverBackup(backup, "local-owner")).rejects.toMatchObject({
      code: "RECOVERY_NOT_REQUIRED",
    });
  });
  it("atomically quarantines and replaces corrupt immutable source bytes only through recovery", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    await target.application.activate(activationInput, sourceAsset);
    const backup = await target.application.exportBackup();
    const current = await target.application.updateSaying(
      "record-yosemite",
      "A newer accepted line that source repair must preserve.",
    );
    target.repository.close();

    const corruptBytes = sourceAsset.bytes.slice();
    corruptBytes[25] ^= 0xff;
    const corruptSource = { ...sourceAsset, bytes: corruptBytes };
    const raw = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await raw.put(ARCHIVE_OBJECT_STORE, corruptSource, sourceAsset.hash);
    raw.close();

    const reopened = createApplication();
    await expect(reopened.application.visual("record-yosemite")).rejects.toMatchObject({
      code: "VISUAL_SOURCE_UNREADABLE",
    });
    await expect(reopened.application.restoreBackup(backup)).rejects.toMatchObject({
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
