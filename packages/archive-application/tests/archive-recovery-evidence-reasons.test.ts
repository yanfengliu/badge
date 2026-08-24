import "fake-indexeddb/auto";

import {
  activateAchievement,
  createSeededArchiveState,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ARCHIVE_DATABASE_NAME,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  archiveRecoveryEvidenceSchema,
  createArchiveRecoveryEvidence,
  parseArchiveBackup,
} from "../src/index.js";
import { sourceCheckedSaying, withAcceptedQuotation } from "./historical-quotation-fixtures.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const exportedAt = "2026-08-24T17:00:00.000Z";
const recordId = "record-yosemite";
const repositories: IndexedDbArchiveRepository[] = [];
const visual: PublishedVisual = {
  packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: validPngHash,
  accessibleDescription: "A Yosemite badge.",
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

function earnedState(): ArchiveState {
  const seed = withAcceptedQuotation(
    createSeededArchiveState({
      ownerId: "local-owner",
      records: [
        {
          recordId,
          definitionRef: { namespace: "pack", packId: "parks", definitionId: "yosemite" },
          collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "national-parks" }],
          title: "Yosemite",
          criterion: "Visit Yosemite National Park.",
          description: null,
          lifecycle: "planned",
          publishedVisual: visual,
          acceptedSaying: null,
          note: null,
          visibility: "inherit",
          activation: null,
        },
      ],
    }),
  );
  return activateAchievement(
    seed,
    {
      recordId,
      occurredStart: "2026-08-24",
      occurredEnd: "2026-08-24",
      note: null,
      visibility: "private",
      visualPin: visual,
    },
    exportedAt,
  ).state;
}

async function decodeEvidence(
  state: ArchiveState,
  reason: "earned-quotation-missing" | "source-art-unavailable",
) {
  const bytes = await createArchiveRecoveryEvidence(state, exportedAt, {
    code: reason,
    affectedRecordIds: [recordId],
  });
  return {
    bytes,
    evidence: archiveRecoveryEvidenceSchema.parse(JSON.parse(new TextDecoder().decode(bytes))),
  };
}

afterEach(async () => {
  for (const repository of repositories.splice(0)) repository.close();
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("Archive recovery evidence reasons", () => {
  it("names every earned record whose sealed quotation is missing", async () => {
    const earned = earnedState();
    const state = {
      ...earned,
      records: earned.records.map((record) => ({ ...record, acceptedSaying: null })),
    };

    const { bytes, evidence } = await decodeEvidence(state, "earned-quotation-missing");

    expect(evidence).toMatchObject({
      evidenceVersion: 2,
      rescueReason: {
        code: "earned-quotation-missing",
        affectedRecordIds: [recordId],
      },
      limitations: {
        restorable: false,
        sourceAssetsIncluded: false,
        message:
          "State-only rescue evidence preserves readable records but cannot restore them; it excludes source art and records the exact rescue reason.",
      },
    });
    await expect(parseArchiveBackup(bytes)).rejects.toMatchObject({ code: "BACKUP_INVALID" });
  });

  it("distinguishes unavailable source art from a missing sealed quotation", async () => {
    const { evidence } = await decodeEvidence(earnedState(), "source-art-unavailable");

    expect(evidence).toMatchObject({
      evidenceVersion: 2,
      rescueReason: {
        code: "source-art-unavailable",
        affectedRecordIds: [recordId],
      },
    });
    expect(earnedState().records[0]!.acceptedSaying).toBe(sourceCheckedSaying);
  });

  it("records only the earned record whose source is unavailable", async () => {
    const missingRecordId = "record-missing-source";
    const missingVisual = {
      ...visual,
      visualEditionId: "missing-source-v1",
      sourceAssetHash: "f".repeat(64),
    };
    const seed = withAcceptedQuotation(
      createSeededArchiveState({
        ownerId: "local-owner",
        records: [
          {
            recordId,
            definitionRef: { namespace: "pack", packId: "parks", definitionId: "yosemite" },
            collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "national-parks" }],
            title: "Yosemite",
            criterion: "Visit Yosemite National Park.",
            description: null,
            lifecycle: "planned",
            publishedVisual: visual,
            acceptedSaying: null,
            note: null,
            visibility: "inherit",
            activation: null,
          },
          {
            recordId: missingRecordId,
            definitionRef: { namespace: "pack", packId: "parks", definitionId: "missing" },
            collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "national-parks" }],
            title: "Missing source",
            criterion: "Complete the second achievement.",
            description: null,
            lifecycle: "planned",
            publishedVisual: missingVisual,
            acceptedSaying: null,
            note: null,
            visibility: "inherit",
            activation: null,
          },
        ],
      }),
    );
    const firstEarned = activateAchievement(
      seed,
      {
        recordId,
        occurredStart: "2026-08-23",
        occurredEnd: "2026-08-23",
        note: null,
        visibility: "private",
        visualPin: visual,
      },
      "2026-08-23T17:00:00.000Z",
    ).state;
    const bothEarned = activateAchievement(
      firstEarned,
      {
        recordId: missingRecordId,
        occurredStart: "2026-08-24",
        occurredEnd: "2026-08-24",
        note: null,
        visibility: "private",
        visualPin: missingVisual,
      },
      exportedAt,
    ).state;
    const repository = new IndexedDbArchiveRepository();
    repositories.push(repository);
    const archive = new ArchiveApplication(repository, { now: () => exportedAt });
    await archive.initialize(bothEarned, [
      { hash: validPngHash, mimeType: "image/png", bytes: validPngBytes },
    ]);

    const checkpoint = await archive.exportRecoveryEvidenceCheckpoint("source-art-unavailable");
    const evidence = archiveRecoveryEvidenceSchema.parse(
      JSON.parse(new TextDecoder().decode(checkpoint.bytes)),
    );

    expect(checkpoint.recoveryReason).toEqual({
      code: "source-art-unavailable",
      affectedRecordIds: [missingRecordId],
    });
    expect(evidence).toMatchObject({
      rescueReason: {
        code: "source-art-unavailable",
        affectedRecordIds: [missingRecordId],
      },
    });
  });
});
