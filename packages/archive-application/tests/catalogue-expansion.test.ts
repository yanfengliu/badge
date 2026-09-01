import "fake-indexeddb/auto";

import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { createSeededArchiveState, type ArchiveState, type PublishedVisual } from "@badge/archive-domain";
import { formatSayingForArchive } from "@badge/saying-contract";

import {
  ARCHIVE_DATABASE_NAME,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  reconcileCatalogueRecords,
} from "../src/index.js";
import {
  alternateSourceCheckedSaying,
  historicalQuotationRequest,
  sourceCheckedResponse,
  sourceCheckedSaying,
} from "./historical-quotation-fixtures.js";
import { validJpegHash, validPngHash, validJpegBytes, validPngBytes } from "./image-fixtures.js";

function visual(packId: string, sourceAssetHash: string, version = "1.0.0"): PublishedVisual {
  return {
    packRef: { packId, version, packDigest: "c".repeat(64) },
    visualEditionId: "visual.fixture.v1",
    sourceAssetHash,
    accessibleDescription: "A crafted fixture badge face.",
    renderRecipeVersion: 1,
    renderRecipe: {
      version: 1,
      shape: "circle",
      material: "enamel",
      borderColor: "#514637",
      borderWidth: 0.075,
      thickness: 0.13,
      relief: 0.032,
      crop: { x: 0.5, y: 0.5, scale: 1 },
    },
  };
}

interface RecordSeedOptions {
  readonly lifecycle?: "suggested" | "planned" | "earned";
  readonly acceptedSaying?: string | null;
  readonly note?: string | null;
  readonly visibility?: "inherit" | "private";
  readonly visual?: PublishedVisual;
}

function record(recordId: string, packId: string, sourceHash: string, options: RecordSeedOptions = {}) {
  const lifecycle = options.lifecycle ?? "suggested";
  const pinned = options.visual ?? visual(packId, sourceHash);
  return {
    recordId,
    definitionRef: { namespace: "pack" as const, packId, definitionId: recordId.replace(/^.*:/u, "") },
    collectionRefs: [{ namespace: "pack" as const, packId, collectionId: "fixture-collection" }],
    title: historicalQuotationRequest.title,
    criterion: historicalQuotationRequest.criterion,
    description: null,
    lifecycle,
    publishedVisual: pinned,
    acceptedSaying: options.acceptedSaying === undefined ? null : options.acceptedSaying,
    note: options.note ?? null,
    visibility: options.visibility ?? ("inherit" as const),
    activation:
      lifecycle === "earned"
        ? {
            occurredStart: "2026-01-01",
            occurredEnd: "2026-01-01",
            recordedAt: "2026-01-02T00:00:00.000Z",
            activatedAt: "2026-01-02T00:00:00.000Z",
            visualPin: pinned,
          }
        : null,
  };
}

function stateOf(records: readonly ReturnType<typeof record>[], ownerId = "local-owner"): ArchiveState {
  return createSeededArchiveState({ ownerId, records });
}

const starterRecord = record("starter:visited-yosemite", "badge.catalogue.starter", validPngHash);
const catalogueRecord = record("catalogue:visited-acadia", "badge.catalogue.discovery", validJpegHash, {
  acceptedSaying: sourceCheckedSaying,
});
const secondCatalogueRecord = record(
  "catalogue:visited-arches",
  "badge.catalogue.discovery",
  "d".repeat(64),
  {
    acceptedSaying: sourceCheckedSaying,
  },
);

let repositories: IndexedDbArchiveRepository[] = [];

function repository(): IndexedDbArchiveRepository {
  const result = new IndexedDbArchiveRepository({
    trustedQuotationRequests: {
      "starter:visited-yosemite": historicalQuotationRequest,
      "catalogue:visited-acadia": historicalQuotationRequest,
      "catalogue:visited-arches": historicalQuotationRequest,
    },
  });
  repositories.push(result);
  return result;
}

afterEach(async () => {
  for (const current of repositories) current.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("reconcileCatalogueRecords", () => {
  it("appends records from a pack release the stored state demonstrably predates", () => {
    const earnedStarter = record("starter:visited-yosemite", "badge.catalogue.starter", validPngHash, {
      lifecycle: "earned",
      acceptedSaying: formatSayingForArchive(sourceCheckedResponse),
    });
    const current = stateOf([earnedStarter]);
    const defaults = stateOf([starterRecord, catalogueRecord]);

    const result = reconcileCatalogueRecords(current, defaults);

    expect(result.addedRecordIds).toEqual(["catalogue:visited-acadia"]);
    expect(result.reseededRecordIds).toEqual([]);
    expect(result.state.records).toHaveLength(2);
    expect(result.state.records[0]).toEqual(current.records[0]);
    expect(result.state.records[1]).toEqual(defaults.records[1]);
  });

  it("refuses to backfill a record missing from its own already-stored pack release", () => {
    const current = stateOf([starterRecord, catalogueRecord]);
    const defaults = stateOf([starterRecord, catalogueRecord, secondCatalogueRecord]);

    const result = reconcileCatalogueRecords(current, defaults);

    expect(result.addedRecordIds).toEqual([]);
    expect(result.state.records.map((item) => item.recordId)).toEqual([
      "starter:visited-yosemite",
      "catalogue:visited-acadia",
    ]);
  });

  it("appends newly introduced records when the pack release version advances", () => {
    const current = stateOf([starterRecord, catalogueRecord]);
    const nextVisual = (hash: string) => ({
      ...visual("badge.catalogue.discovery", hash, "1.0.1"),
      packRef: { packId: "badge.catalogue.discovery", version: "1.0.1", packDigest: "e".repeat(64) },
    });
    const defaults = stateOf([
      starterRecord,
      { ...catalogueRecord, publishedVisual: nextVisual(validJpegHash) },
      { ...secondCatalogueRecord, publishedVisual: nextVisual("d".repeat(64)) },
    ]);

    const result = reconcileCatalogueRecords(current, defaults);

    expect(result.addedRecordIds).toEqual(["catalogue:visited-arches"]);
    expect(result.reseededRecordIds).toEqual(["catalogue:visited-acadia"]);
    expect(
      result.state.records.find((item) => item.recordId === "catalogue:visited-acadia")?.publishedVisual
        .packRef.version,
    ).toBe("1.0.1");
  });

  it("reseeds a drifted unearned lineage while preserving every personal field", () => {
    const planned = record("catalogue:visited-acadia", "badge.catalogue.discovery", validJpegHash, {
      lifecycle: "planned",
      acceptedSaying: sourceCheckedSaying,
      note: "Someday soon.",
      visibility: "private",
    });
    const current = stateOf([starterRecord, planned]);
    const regenerated = {
      ...catalogueRecord,
      publishedVisual: {
        ...catalogueRecord.publishedVisual,
        packRef: { ...catalogueRecord.publishedVisual.packRef, packDigest: "f".repeat(64) },
        sourceAssetHash: "a".repeat(64),
      },
    };
    const defaults = stateOf([starterRecord, regenerated]);

    const result = reconcileCatalogueRecords(current, defaults);

    expect(result.reseededRecordIds).toEqual(["catalogue:visited-acadia"]);
    const reseeded = result.state.records.find((item) => item.recordId === "catalogue:visited-acadia");
    expect(reseeded?.publishedVisual).toEqual(regenerated.publishedVisual);
    expect(reseeded).toMatchObject({
      lifecycle: "planned",
      note: "Someday soon.",
      visibility: "private",
      acceptedSaying: sourceCheckedSaying,
      activation: null,
    });
  });

  it("never modifies an earned record even when its lineage drifted from the seed", () => {
    const earnedCatalogue = record("catalogue:visited-acadia", "badge.catalogue.discovery", validJpegHash, {
      lifecycle: "earned",
      acceptedSaying: sourceCheckedSaying,
    });
    const current = stateOf([starterRecord, earnedCatalogue]);
    const regenerated = {
      ...catalogueRecord,
      publishedVisual: {
        ...catalogueRecord.publishedVisual,
        packRef: { ...catalogueRecord.publishedVisual.packRef, packDigest: "f".repeat(64) },
      },
    };

    const result = reconcileCatalogueRecords(current, stateOf([starterRecord, regenerated]));

    expect(result.reseededRecordIds).toEqual([]);
    expect(result.state.records.find((item) => item.recordId === "catalogue:visited-acadia")).toEqual(
      current.records[1],
    );
  });

  it("leaves a readable zero-record state untouched so emptiness stays recovery evidence", () => {
    const current = stateOf([]);
    const result = reconcileCatalogueRecords(current, stateOf([starterRecord, catalogueRecord]));
    expect(result.addedRecordIds).toEqual([]);
    expect(result.state.records).toHaveLength(0);
  });

  it("is idempotent once the catalogue is complete", () => {
    const defaults = stateOf([starterRecord, catalogueRecord]);
    const grown = reconcileCatalogueRecords(stateOf([starterRecord]), defaults);
    const again = reconcileCatalogueRecords(grown.state, defaults);
    expect(again.addedRecordIds).toEqual([]);
    expect(again.reseededRecordIds).toEqual([]);
    expect(again.state).toEqual(grown.state);
  });

  it("does not reconcile across a different owner", () => {
    const current = stateOf([starterRecord], "someone-else");
    const result = reconcileCatalogueRecords(current, stateOf([starterRecord, catalogueRecord]));
    expect(result.addedRecordIds).toEqual([]);
    expect(result.state).toEqual(current);
  });

  it("refuses catalogue defaults that seed an earned record", () => {
    const earnedDefault = record("catalogue:visited-acadia", "badge.catalogue.discovery", validJpegHash, {
      lifecycle: "earned",
      acceptedSaying: sourceCheckedSaying,
    });
    expect(() =>
      reconcileCatalogueRecords(stateOf([starterRecord]), stateOf([starterRecord, earnedDefault])),
    ).toThrowError(/may seed only unearned records/);
  });
});

describe("IndexedDbArchiveRepository.reconcileCatalogueRecords", () => {
  it("persists new catalogue records for an older stored state", async () => {
    const current = repository();
    const stored = await current.load(stateOf([starterRecord]));
    const reconciled = await current.reconcileCatalogueRecords(
      stateOf([starterRecord, catalogueRecord]),
      stored,
    );
    expect(reconciled.records.map((item) => item.recordId)).toEqual([
      "starter:visited-yosemite",
      "catalogue:visited-acadia",
    ]);
    expect(await current.read()).toEqual(reconciled);
  });

  it("persists a reseeded lineage for a regenerated pack", async () => {
    const current = repository();
    const stored = await current.load(stateOf([starterRecord, catalogueRecord]));
    const regenerated = {
      ...catalogueRecord,
      publishedVisual: {
        ...catalogueRecord.publishedVisual,
        packRef: { ...catalogueRecord.publishedVisual.packRef, packDigest: "f".repeat(64) },
      },
    };
    const reconciled = await current.reconcileCatalogueRecords(stateOf([starterRecord, regenerated]), stored);
    expect(
      reconciled.records.find((item) => item.recordId === "catalogue:visited-acadia")?.publishedVisual.packRef
        .packDigest,
    ).toBe("f".repeat(64));
    expect(await current.read()).toEqual(reconciled);
  });

  it("atomically gives a newly added record an alternate when legacy state owns its default", async () => {
    const current = repository();
    const legacyStarter = { ...starterRecord, acceptedSaying: sourceCheckedSaying };
    const stored = await current.load(stateOf([legacyStarter]));
    const reconciled = await current.reconcileCatalogueRecords(
      stateOf([legacyStarter, catalogueRecord]),
      stored,
    );

    expect(
      reconciled.records.find((item) => item.recordId === "starter:visited-yosemite")?.acceptedSaying,
    ).toBe(sourceCheckedSaying);
    expect(
      reconciled.records.find((item) => item.recordId === "catalogue:visited-acadia")?.acceptedSaying,
    ).toBe(alternateSourceCheckedSaying);
    expect(await current.read()).toEqual(reconciled);
  });

  it("rolls back catalogue expansion when existing records reserve every trusted choice", async () => {
    const current = repository();
    const starterWithDefault = { ...starterRecord, acceptedSaying: sourceCheckedSaying };
    const catalogueWithAlternate = {
      ...catalogueRecord,
      acceptedSaying: alternateSourceCheckedSaying,
    };
    const stored = await current.load(stateOf([starterWithDefault, catalogueWithAlternate]));
    const nextVisual = (hash: string) => ({
      ...visual("badge.catalogue.discovery", hash, "1.0.1"),
      packRef: { packId: "badge.catalogue.discovery", version: "1.0.1", packDigest: "e".repeat(64) },
    });
    const defaults = stateOf([
      starterWithDefault,
      { ...catalogueRecord, publishedVisual: nextVisual(validJpegHash) },
      { ...secondCatalogueRecord, publishedVisual: nextVisual("d".repeat(64)) },
    ]);

    await expect(current.reconcileCatalogueRecords(defaults, stored)).rejects.toMatchObject({
      code: "SAYING_CONFLICT",
      message: expect.stringMatching(/no distinct source-checked quotation.*No Archive data was changed/i),
    });
    expect(await current.read()).toEqual(stored);
  });

  it("refuses to reconcile over a state that changed after review", async () => {
    const current = repository();
    await current.load(stateOf([starterRecord]));
    const stale = stateOf([starterRecord, catalogueRecord]);
    await expect(current.reconcileCatalogueRecords(stale, stale)).rejects.toMatchObject({
      code: "INITIALIZATION_CONFLICT",
    });
  });
});

describe("catalogue reconciliation during restore", () => {
  it("restores an older backup and grows it to the current catalogue", async () => {
    const now = () => "2026-08-26T12:00:00.000Z";
    const defaults = stateOf([starterRecord, catalogueRecord]);

    const older = new ArchiveApplication(repository(), { now });
    const olderState = await older.initialize(stateOf([starterRecord]), [
      { hash: validPngHash, mimeType: "image/png", bytes: validPngBytes },
    ]);
    const olderWithQuote = await older.updateQuotation(
      "starter:visited-yosemite",
      sourceCheckedResponse,
      olderState.records[0]!.quotationRevision,
    );
    const activated = await older.activate(
      {
        recordId: "starter:visited-yosemite",
        occurredStart: "2026-05-01",
        occurredEnd: "2026-05-02",
        note: null,
        visibility: "inherit",
        visualPin: visual("badge.catalogue.starter", validPngHash),
      },
      { hash: validPngHash, mimeType: "image/png", bytes: validPngBytes },
      sourceCheckedResponse,
      olderWithQuote.records[0]!.quotationRevision,
    );
    const backup = await older.exportBackup();
    repositories.forEach((item) => item.close());
    await deleteDB(ARCHIVE_DATABASE_NAME);
    repositories = [];

    const newer = new ArchiveApplication(repository(), { now });
    const seeded = await newer.initialize(defaults, [
      { hash: validPngHash, mimeType: "image/png", bytes: validPngBytes },
      { hash: validJpegHash, mimeType: "image/jpeg", bytes: validJpegBytes },
    ]);
    const restored = await newer.restoreBackup(backup, seeded, defaults);

    expect(restored.records.map((item) => item.recordId)).toEqual([
      "starter:visited-yosemite",
      "catalogue:visited-acadia",
    ]);
    const earned = restored.records.find((item) => item.recordId === "starter:visited-yosemite");
    expect(earned?.lifecycle).toBe("earned");
    expect(earned?.acceptedSaying).toBe(activated.record.acceptedSaying);
    const added = restored.records.find((item) => item.recordId === "catalogue:visited-acadia");
    expect(added?.lifecycle).toBe("suggested");
    expect(added?.acceptedSaying).toBe(alternateSourceCheckedSaying);
  });
});
