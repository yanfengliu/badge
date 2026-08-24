import "fake-indexeddb/auto";

import {
  activateAchievement,
  createSeededArchiveState,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  createArchiveBackup,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import { historicalQuotationRequest, withAcceptedQuotation } from "./historical-quotation-fixtures.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const exportedAt = "2026-08-24T17:00:00.000Z";
const outgoingSource: ArchiveSourceAssetInput = {
  hash: validPngHash,
  mimeType: "image/png",
  bytes: validPngBytes,
};
const incomingSource: ArchiveSourceAssetInput = {
  hash: "40608fc14ad54b68b2bff707f844efb5b342f85c51b5438c95b0bc78f06d0fa3",
  mimeType: "image/png",
  bytes: Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31,
    21, 196, 137, 0, 0, 0, 1, 115, 82, 71, 66, 0, 174, 206, 28, 233, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218,
    99, 248, 207, 192, 240, 31, 0, 5, 0, 1, 255, 86, 199, 47, 13, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96,
    130,
  ]),
};
const baseVisual: PublishedVisual = {
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
const outgoingVisual: PublishedVisual = {
  ...baseVisual,
  packRef: { ...baseVisual.packRef, packId: "historical.unrelated" },
  sourceAssetHash: outgoingSource.hash,
};
const incomingVisual: PublishedVisual = {
  ...baseVisual,
  visualEditionId: "yosemite-metal-v2",
  sourceAssetHash: incomingSource.hash,
};

function seededState(visual: PublishedVisual): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: { namespace: "pack", packId: visual.packRef.packId, definitionId: "yosemite" },
        collectionRefs: [{ namespace: "pack", packId: visual.packRef.packId, collectionId: "parks" }],
        title: "Visited Yosemite National Park",
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

function earnedState(visual: PublishedVisual): ArchiveState {
  return activateAchievement(
    withAcceptedQuotation(seededState(visual)),
    {
      recordId: "record-yosemite",
      occurredStart: "2026-08-24",
      occurredEnd: "2026-08-24",
      note: null,
      visibility: "private",
      visualPin: visual,
    },
    exportedAt,
  ).state;
}

const repositories: IndexedDbArchiveRepository[] = [];

function application(onRecoveryStage?: () => void | Promise<void>): {
  application: ArchiveApplication;
  repository: IndexedDbArchiveRepository;
} {
  const repository = new IndexedDbArchiveRepository({
    trustedQuotationRequests: { "record-yosemite": historicalQuotationRequest },
    onRecoveryStage,
  });
  repositories.push(repository);
  return {
    application: new ArchiveApplication(repository, { now: () => exportedAt }),
    repository,
  };
}

afterEach(async () => {
  for (const repository of repositories.splice(0)) repository.close();
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("source-art state-rescue replacement", () => {
  it("replaces state when its outgoing-only historical source row is present but corrupt", async () => {
    const current = earnedState(outgoingVisual);
    const incoming = earnedState(incomingVisual);
    const backup = await createArchiveBackup(incoming, [incomingSource], exportedAt);
    const initial = application();
    await initial.application.initialize(current, [incomingSource]);
    initial.repository.close();

    const corruptBytes = outgoingSource.bytes.slice();
    corruptBytes[25] ^= 0xff;
    const corruptSource = { ...outgoingSource, bytes: corruptBytes };
    const setup = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await setup.put(ARCHIVE_OBJECT_STORE, corruptSource, outgoingSource.hash);
    setup.close();

    const target = application();
    const checkpoint = await target.application.exportRecoveryEvidenceCheckpoint("source-art-unavailable");
    expect(checkpoint.recoveryReason?.affectedRecordIds).toEqual(["record-yosemite"]);
    const result = await target.application.recoverBackup(backup, current.ownerId, [], {
      mode: "replace-incompatible-readable-state",
      expectedCurrentState: checkpoint.state,
      expectedStateRescueReason: "source-art-unavailable",
      expectedStateRescueAffectedRecordIds: ["record-yosemite"],
    });

    expect(result.stateReplaced).toBe(true);
    expect(result.state.records[0]).toMatchObject({
      lifecycle: "earned",
      publishedVisual: incomingVisual,
    });
    target.repository.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, outgoingSource.hash)).toEqual(corruptSource);
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, incomingSource.hash)).toEqual(incomingSource);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(result.state);
    evidence.close();
  });

  it("stops replacement when another connection repairs the rescued source after inspection", async () => {
    const current = earnedState(outgoingVisual);
    const incoming = earnedState(incomingVisual);
    const backup = await createArchiveBackup(incoming, [incomingSource], exportedAt);
    const initial = application();
    await initial.application.initialize(current, [incomingSource]);
    const checkpoint = await initial.application.exportRecoveryEvidenceCheckpoint("source-art-unavailable");
    initial.repository.close();

    const racing = application(async () => {
      const concurrent = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
      await concurrent.put(ARCHIVE_OBJECT_STORE, outgoingSource, outgoingSource.hash);
      concurrent.close();
    });
    await expect(
      racing.application.recoverBackup(backup, current.ownerId, [], {
        mode: "replace-incompatible-readable-state",
        expectedCurrentState: checkpoint.state,
        expectedStateRescueReason: "source-art-unavailable",
        expectedStateRescueAffectedRecordIds: ["record-yosemite"],
      }),
    ).rejects.toMatchObject({ code: "RECOVERY_REASON_MISMATCH" });

    racing.repository.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toEqual(current);
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, outgoingSource.hash)).toEqual(outgoingSource);
    expect(
      (await evidence.getAllKeys(ARCHIVE_STATE_STORE)).filter(
        (key) => typeof key === "string" && key.startsWith("archive-state-quarantine:"),
      ),
    ).toEqual([]);
    evidence.close();
  });
});
