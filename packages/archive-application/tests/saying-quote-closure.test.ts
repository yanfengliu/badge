import "fake-indexeddb/auto";

import {
  SAYING_CODE_POINT_LIMIT,
  SAYING_GRAPHEME_LIMIT,
  SAYING_RAW_UTF16_CODE_UNIT_LIMIT,
  SAYING_UTF8_LIMIT,
  createSeededArchiveState,
  validateSaying,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import {
  SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT,
  SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT,
  formatSayingForArchive,
  resolveSayingModelResponse,
  sayingRequestSchema,
} from "@badge/saying-contract";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ARCHIVE_DATABASE_NAME,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  parseArchiveBackup,
} from "../src/index.js";

const publishedVisual: PublishedVisual = {
  packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: "4c17b6fd4d319c4da050e7962c2fc9e23a4f416eb27588848010e386e3bb8a45",
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

function state(): ArchiveState {
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

function maximalPersistableQuotation() {
  const combiningMark = "\u{1d165}";
  return {
    id: "maximal-source-checked-quotation",
    text: `Q${combiningMark.repeat(1_919)}`,
    person: `P${combiningMark.repeat(SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT - 1)}`,
    sourceTitle: `S${combiningMark.repeat(SAYING_QUOTATION_SOURCE_TITLE_CODE_POINT_LIMIT - 1)}`,
    sourceUrl: "https://example.com/source-checked-quotation",
  };
}

let repositories: IndexedDbArchiveRepository[] = [];

function createApplication() {
  const repository = new IndexedDbArchiveRepository();
  repositories.push(repository);
  return { repository, application: new ArchiveApplication(repository) };
}

afterEach(async () => {
  for (const repository of repositories) repository.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("historical quotation storage closure", () => {
  it("admits only quotation metadata whose fully formatted value fits every Archive bound", () => {
    const quotation = maximalPersistableQuotation();
    const request = sayingRequestSchema.parse({
      title: "Yosemite",
      criterion: "Visit Yosemite National Park",
      allowedQuotations: [quotation],
    });
    const response = resolveSayingModelResponse(
      { kind: "quotation", saying: null, quotationId: quotation.id },
      request,
    );
    const formatted = formatSayingForArchive(response);
    const validation = validateSaying(formatted);

    expect(validation).toMatchObject({ ok: true, value: formatted });
    expect(formatted.length).toBeLessThanOrEqual(SAYING_RAW_UTF16_CODE_UNIT_LIMIT);
    expect(Array.from(formatted).length).toBeLessThanOrEqual(SAYING_CODE_POINT_LIMIT);
    expect(new TextEncoder().encode(formatted).byteLength).toBeLessThanOrEqual(SAYING_UTF8_LIMIT);
    expect(validation.graphemeCount).toBeLessThanOrEqual(SAYING_GRAPHEME_LIMIT);

    expect(
      sayingRequestSchema.safeParse({
        ...request,
        allowedQuotations: [
          {
            ...quotation,
            person: `a${"\u035c".repeat(SAYING_QUOTATION_PERSON_CODE_POINT_LIMIT)}`,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("survives repository reload and .badgearchive export, parse, restore, and reread", async () => {
    const quotation = maximalPersistableQuotation();
    const response = resolveSayingModelResponse(
      { kind: "quotation", saying: null, quotationId: quotation.id },
      { title: "Yosemite", criterion: "Visit Yosemite", allowedQuotations: [quotation] },
    );
    const formatted = formatSayingForArchive(response);
    const first = createApplication();
    await first.application.initialize(state());
    await first.application.updateSaying("record-yosemite", formatted);

    first.repository.close();
    repositories = [];
    const reloaded = createApplication();
    expect((await reloaded.application.initialize(state())).records[0].acceptedSaying).toBe(formatted);
    const backupBytes = await reloaded.application.exportBackup();
    expect((await parseArchiveBackup(backupBytes)).state.records[0].acceptedSaying).toBe(formatted);

    reloaded.repository.close();
    repositories = [];
    await deleteDB(ARCHIVE_DATABASE_NAME);
    const restored = createApplication();
    await restored.application.initialize(state());
    expect((await restored.application.restoreBackup(backupBytes)).records[0].acceptedSaying).toBe(formatted);
    expect((await restored.repository.read()).records[0].acceptedSaying).toBe(formatted);
  });

  it("round-trips a 771-grapheme formatted quotation through reload and backup restore", async () => {
    const formatted = `“${"Q".repeat(600)}” — ${"P".repeat(64)}, ${"S".repeat(100)}`;
    expect(validateSaying(formatted)).toMatchObject({ ok: true, graphemeCount: 771, value: formatted });
    const first = createApplication();
    await first.application.initialize(state());
    await first.application.updateSaying("record-yosemite", formatted);

    first.repository.close();
    repositories = [];
    const reloaded = createApplication();
    expect((await reloaded.application.initialize(state())).records[0].acceptedSaying).toBe(formatted);
    const backupBytes = await reloaded.application.exportBackup();
    expect((await parseArchiveBackup(backupBytes)).state.records[0].acceptedSaying).toBe(formatted);

    reloaded.repository.close();
    repositories = [];
    await deleteDB(ARCHIVE_DATABASE_NAME);
    const restored = createApplication();
    await restored.application.initialize(state());
    expect((await restored.application.restoreBackup(backupBytes)).records[0].acceptedSaying).toBe(formatted);
    expect((await restored.repository.read()).records[0].acceptedSaying).toBe(formatted);
  });
});
