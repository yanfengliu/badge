import "fake-indexeddb/auto";

import { activateAchievement, createSeededArchiveState, type ArchiveState } from "@badge/archive-domain";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ARCHIVE_DATABASE_NAME,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  createArchiveBackup,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import { historicalQuotationRequest, withAcceptedQuotation } from "./historical-quotation-fixtures.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const exportedAt = "2026-08-24T17:00:00.000Z";
const repositories: IndexedDbArchiveRepository[] = [];
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
        definitionRef: { namespace: "pack", packId: "parks", definitionId: "yosemite" },
        collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "national-parks" }],
        title: historicalQuotationRequest.title,
        criterion: historicalQuotationRequest.criterion,
        description: null,
        lifecycle: "suggested",
        publishedVisual: {
          packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
          visualEditionId: "yosemite-v1",
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
        },
        acceptedSaying: null,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

function inventedEarnedDefaults(seed: ArchiveState): ArchiveState {
  const record = seed.records[0]!;
  const earned = activateAchievement(
    withAcceptedQuotation(seed),
    {
      recordId: record.recordId,
      occurredStart: "2026-08-24",
      occurredEnd: "2026-08-24",
      note: null,
      visibility: "private",
      visualPin: record.publishedVisual,
    },
    exportedAt,
  ).state;
  return {
    ...earned,
    records: earned.records.map((candidate) => ({
      ...candidate,
      acceptedSaying: "“A convenient invention.” — Imaginary Person, Imaginary Source",
    })),
  };
}

function earnedLegacyState(seed: ArchiveState): ArchiveState {
  const record = seed.records[0]!;
  const earned = activateAchievement(
    withAcceptedQuotation(seed),
    {
      recordId: record.recordId,
      occurredStart: "2026-08-24",
      occurredEnd: "2026-08-24",
      note: null,
      visibility: "private",
      visualPin: record.publishedVisual,
    },
    exportedAt,
  ).state;
  return {
    ...earned,
    records: earned.records.map((candidate) => ({
      ...candidate,
      acceptedSaying: "A sealed saying from the earlier design.",
    })),
  };
}

function application(): ArchiveApplication {
  const repository = new IndexedDbArchiveRepository({
    trustedQuotationRequests: { "record-yosemite": historicalQuotationRequest },
  });
  repositories.push(repository);
  return new ArchiveApplication(repository, { now: () => exportedAt });
}

afterEach(async () => {
  for (const repository of repositories.splice(0)) repository.close();
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("trusted quotation defaults", () => {
  it.each(["restore", "recovery"] as const)(
    "preserves an earned legacy saying byte-for-byte during %s when defaults are supplied",
    async (boundary) => {
      const archive = application();
      const base = state();
      const reviewed = await archive.initialize(base, [sourceAsset]);
      const incoming = earnedLegacyState(base);
      const defaults = withAcceptedQuotation(base);
      const backup = await createArchiveBackup(incoming, [sourceAsset], exportedAt);

      const restored =
        boundary === "restore"
          ? await archive.restoreBackup(backup, reviewed, defaults)
          : (
              await archive.recoverBackup(backup, reviewed.ownerId, [sourceAsset], {
                mode: "replace-incompatible-readable-state",
                expectedCurrentState: reviewed,
                sayingDefaults: defaults,
              })
            ).state;

      expect(restored.records[0]?.acceptedSaying).toBe("A sealed saying from the earlier design.");
      expect((await archive.state()).records[0]?.acceptedSaying).toBe(
        "A sealed saying from the earlier design.",
      );
    },
  );

  it.each(["restore", "recovery"] as const)(
    "standardizes an unverified unearned saying during %s before persistence",
    async (boundary) => {
      const archive = application();
      const base = state();
      const reviewed = await archive.initialize(base, [sourceAsset]);
      const legacy = {
        ...base,
        records: base.records.map((record) => ({
          ...record,
          acceptedSaying: "Worth every switchback.",
        })),
      };
      const defaults = withAcceptedQuotation(base);
      const backup = await createArchiveBackup(legacy, [], exportedAt);

      const standardized =
        boundary === "restore"
          ? await archive.restoreBackup(backup, reviewed, defaults)
          : (
              await archive.recoverBackup(backup, reviewed.ownerId, [sourceAsset], {
                mode: "replace-incompatible-readable-state",
                expectedCurrentState: reviewed,
                sayingDefaults: defaults,
              })
            ).state;

      expect(standardized.records[0]?.acceptedSaying).toBe(defaults.records[0]?.acceptedSaying);
      expect(standardized.records[0]?.quotationRevision).not.toBe(legacy.records[0]?.quotationRevision);
      expect((await archive.state()).records[0]?.acceptedSaying).toBe(defaults.records[0]?.acceptedSaying);
    },
  );

  it.each(["initialization", "restore", "recovery"] as const)(
    "rejects an invented quotation hidden behind an earned lifecycle during %s",
    async (boundary) => {
      const archive = application();
      const reviewed = await archive.initialize(state());
      const invented = inventedEarnedDefaults(reviewed);
      const checkpoint = await archive.exportBackupCheckpoint();
      const backup = await createArchiveBackup(state(), [], exportedAt);

      const operation =
        boundary === "initialization"
          ? archive.initializeSayingDefaults(invented, reviewed)
          : boundary === "restore"
            ? archive.restoreBackup(backup, checkpoint.state, invented)
            : archive.recoverBackup(backup, reviewed.ownerId, [], {
                mode: "replace-incompatible-readable-state",
                expectedCurrentState: checkpoint.state,
                sayingDefaults: invented,
              });

      await expect(operation).rejects.toMatchObject({
        code: "SAYING_CONFLICT",
        message: expect.stringMatching(/default quotation.*not in.*trusted source-checked quotation bank/i),
      });
      expect(await archive.state()).toEqual(reviewed);
    },
  );

  it.each(
    (["initialization", "restore", "recovery"] as const).flatMap((boundary) =>
      (["title", "criterion"] as const).map((field) => ({ boundary, field })),
    ),
  )(
    "rejects a $field-mismatched same-ID target during $boundary default backfill",
    async ({ boundary, field }) => {
      const defaults = withAcceptedQuotation(state());
      const base = state();
      const target = {
        ...base,
        records: base.records.map((record) => ({
          ...record,
          [field]: `${record[field]} — changed achievement`,
        })),
      };
      const archive = application();
      const current = await archive.initialize(target);
      const checkpoint = await archive.exportBackupCheckpoint();
      const backup = await createArchiveBackup(target, [], exportedAt);

      const operation =
        boundary === "initialization"
          ? archive.initializeSayingDefaults(defaults, current)
          : boundary === "restore"
            ? archive.restoreBackup(backup, checkpoint.state, defaults)
            : archive.recoverBackup(backup, current.ownerId, [], {
                mode: "replace-incompatible-readable-state",
                expectedCurrentState: checkpoint.state,
                sayingDefaults: defaults,
              });

      await expect(operation).rejects.toMatchObject({
        code: "SAYING_CONFLICT",
        message: expect.stringMatching(/trusted quotation bank.*different achievement wording/i),
      });
      expect(await archive.state()).toEqual(current);
    },
  );
});
