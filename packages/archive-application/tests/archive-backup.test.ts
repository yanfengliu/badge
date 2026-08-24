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
import {
  makeMislabeledSourceBackup,
  makeSourceBackup,
  makeStateJsonNoncanonical,
} from "./backup-test-mutators.js";
import {
  historicalQuotationRequest,
  sourceCheckedResponse,
  withAcceptedQuotation,
} from "./historical-quotation-fixtures.js";
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
function stateWithQuotation(
  visual: PublishedVisual = originalVisual,
  ownerId = "local-owner",
  title = "Visited Yosemite National Park",
): ArchiveState {
  return withAcceptedQuotation(state(visual, ownerId, title));
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

function expectStateExceptQuotationRevisions(actual: ArchiveState, expected: ArchiveState): void {
  expect(actual).toEqual({
    ...expected,
    records: expected.records.map((record, index) => ({
      ...record,
      quotationRevision: actual.records[index]!.quotationRevision,
    })),
  });
}
let repositories: IndexedDbArchiveRepository[] = [];
function createApplication(): { application: ArchiveApplication; repository: IndexedDbArchiveRepository } {
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

describe("self-contained .badgearchive v2", () => {
  it("emits byte-identical backups for the same state, sources, and export time", async () => {
    const earned = activateAchievement(stateWithQuotation(), activationInput, exportedAt).state;
    expect(await createArchiveBackup(earned, [sourceAsset], exportedAt)).toEqual(
      await createArchiveBackup(earned, [sourceAsset], exportedAt),
    );
  });

  it("restores an earned recipe and source bytes without consulting changed catalogue fixtures", async () => {
    const first = createApplication();
    await first.application.initialize(stateWithQuotation());
    const activated = await first.application.activate(
      activationInput,
      sourceAsset,
      sourceCheckedResponse,
      initialQuotationRevision,
    );
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
    const expected = await restored.application.initialize(
      state(changedVisual, "local-owner", "Changed fixture title"),
    );
    await restored.application.restoreBackup(backupBytes, expected);

    const visual = await restored.application.visual("record-yosemite");
    expect(visual.pin).toEqual(activationInput.visualPin);
    expect(visual.pin.renderRecipe).toEqual(originalVisual.renderRecipe);
    expect(visual.pin.accessibleDescription).toBe(originalVisual.accessibleDescription);
    expect(visual.sourceAsset).toEqual(sourceAsset);
  });

  it("rejects tampered source bytes before mutating healthy state", async () => {
    const first = createApplication();
    await first.application.initialize(stateWithQuotation());
    await first.application.activate(
      activationInput,
      sourceAsset,
      sourceCheckedResponse,
      initialQuotationRevision,
    );
    const backupBytes = await first.application.exportBackup();
    const tampered = backupBytes.slice();
    tampered[tampered.length - 1] ^= 0xff;

    first.repository.close();
    repositories = [];
    await deleteDB(ARCHIVE_DATABASE_NAME);

    const target = createApplication();
    await target.application.initialize(state());
    const healthy = await target.application.state();
    await expect(target.application.restoreBackup(tampered, healthy)).rejects.toMatchObject({
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
        stateWithQuotation(hostileVisual),
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
    await expect(target.application.restoreBackup(wrongFormat, healthy)).rejects.toMatchObject({
      code: "BACKUP_INVALID",
    });

    const earned = activateAchievement(stateWithQuotation(), activationInput, exportedAt).state;
    const incompleteLegacy = JSON.stringify({
      format: "badgearchive",
      backupVersion: 1,
      exportedAt,
      state: earned,
    });
    await expect(target.application.restoreBackup(incompleteLegacy, healthy)).rejects.toMatchObject({
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
    const expected = await target.application.initialize(current);
    const legacy = JSON.stringify({ format: "badgearchive", backupVersion: 1, exportedAt, state: state() });

    const restored = await target.application.restoreBackup(legacy, expected);
    expectStateExceptQuotationRevisions(restored, state());
    expect(restored.records[0]!.quotationRevision).not.toBe(state().records[0]!.quotationRevision);
  });

  it("restores a tokenless earned backup after v2 storage materializes its current token", async () => {
    const earned = activateAchievement(stateWithQuotation(), activationInput, exportedAt).state;
    const tokenless = {
      ...earned,
      records: earned.records.map((record) =>
        Object.fromEntries(Object.entries(record).filter(([key]) => key !== "quotationRevision")),
      ),
    };
    const backup = await makeSourceBackup(() => tokenless, [sourceAsset.bytes], exportedAt);
    const legacy = await openDB(ARCHIVE_DATABASE_NAME, 2, {
      upgrade(database) {
        database.createObjectStore(ARCHIVE_STATE_STORE);
        database.createObjectStore(ARCHIVE_OBJECT_STORE);
      },
      blocking() {
        legacy.close();
      },
    });
    await legacy.put(ARCHIVE_STATE_STORE, tokenless, ARCHIVE_STATE_KEY);
    await legacy.put(ARCHIVE_OBJECT_STORE, sourceAsset, sourceAsset.hash);

    const target = createApplication();
    const migrated = await target.application.initialize(state(), [sourceAsset]);
    expect(migrated.records[0]!.quotationRevision).not.toBe(earned.records[0]!.quotationRevision);

    const restored = await target.application.restoreBackup(backup, migrated);
    expect(restored).toEqual(migrated);
    expect(await target.application.state()).toEqual(migrated);
  });
});

describe("monotonic restore and explicit corrupt-state recovery", () => {
  it("rejects an earned-null backup instead of fabricating a quotation after activation", async () => {
    const earned = activateAchievement(stateWithQuotation(), activationInput, exportedAt).state;
    const legacyEarned = archiveStateSchema.parse({
      ...earned,
      records: earned.records.map((record) => ({ ...record, acceptedSaying: null })),
    });
    const backup = await createArchiveBackup(legacyEarned, [sourceAsset], exportedAt);
    const target = createApplication();
    await target.application.initialize(stateWithQuotation());

    const before = await target.application.state();
    await expect(
      target.application.restoreBackup(backup, before, stateWithQuotation()),
    ).rejects.toMatchObject({
      code: "BACKUP_INVALID",
      message: expect.stringMatching(
        /earned records without a sealed quotation.*no Archive data was changed/i,
      ),
    });
    expect(await target.application.state()).toEqual(before);
  });

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
    await target.application.initialize(stateWithQuotation());
    await target.application.activate(
      activationInput,
      sourceAsset,
      sourceCheckedResponse,
      initialQuotationRevision,
    );
    const current = await target.application.state();

    const otherOwner = await createArchiveBackup(state(originalVisual, "different-owner"), [], exportedAt);
    await expect(target.application.restoreBackup(otherOwner, current)).rejects.toMatchObject({
      code: "BACKUP_OWNER_MISMATCH",
    });

    const older = await createArchiveBackup(state(), [], exportedAt);
    await expect(target.application.restoreBackup(older, current)).rejects.toMatchObject({
      code: "BACKUP_WOULD_LOSE_EARNED_RECORD",
    });

    const changedEarned = archiveStateSchema.parse({
      ...current,
      records: [{ ...current.records[0], note: "A rewritten memory." }],
    });
    const changed = await createArchiveBackup(changedEarned, [sourceAsset], exportedAt);
    await expect(target.application.restoreBackup(changed, current)).rejects.toMatchObject({
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

    await expect(target.application.restoreBackup(staleBackup, healthy)).rejects.toMatchObject({
      code: "BACKUP_CATALOGUE_MISMATCH",
      message: expect.stringMatching(/catalogue lineage.*record-yosemite.*no Archive data was changed/i),
    });
    expect(await target.application.state()).toEqual(healthy);
  });

  it("rejects an earned replacement that rebinds a current record to an unrelated definition lineage", async () => {
    const target = createApplication();
    await target.application.initialize(state());
    const healthy = await target.application.state();
    const activated = activateAchievement(stateWithQuotation(), activationInput, exportedAt).state;
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

    await expect(target.application.restoreBackup(backup, healthy)).rejects.toMatchObject({
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
    await expect(reopened.application.restoreBackup(backup, state())).rejects.toMatchObject({
      code: "STATE_UNREADABLE",
    });

    const recovery = await reopened.application.recoverBackup(backup, "local-owner");
    expectStateExceptQuotationRevisions(recovery.state, state());
    expect(recovery.state.records[0]!.quotationRevision).not.toBe(state().records[0]!.quotationRevision);
    expect(recovery.stateReplaced).toBe(true);
    expect(recovery.quarantineKey).toMatch(/^archive-state-quarantine:/);
    expect(recovery.quarantineKeys).toEqual([recovery.quarantineKey]);

    reopened.repository.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(recovery.state);
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
});
