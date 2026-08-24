import "fake-indexeddb/auto";

import {
  INITIAL_QUOTATION_REVISION,
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
  type SayingRequest,
} from "@badge/saying-contract";
import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  createArchiveBackup,
  parseArchiveBackup,
} from "../src/index.js";
import {
  alternateSourceCheckedResponse,
  alternateSourceCheckedSaying,
  historicalQuotationRequest,
  sourceCheckedResponse,
  sourceCheckedSaying,
  withAcceptedQuotation,
} from "./historical-quotation-fixtures.js";

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

function createApplication(request: SayingRequest = historicalQuotationRequest) {
  const repository = new IndexedDbArchiveRepository({
    trustedQuotationRequests: { "record-yosemite": request },
  });
  repositories.push(repository);
  return { repository, application: new ArchiveApplication(repository) };
}

afterEach(async () => {
  for (const repository of repositories) repository.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("historical quotation storage closure", () => {
  it("backfills only missing seeded sayings and preserves an existing accepted value", async () => {
    const current = createApplication();
    const stored = await current.application.initialize(state());
    const defaults = withAcceptedQuotation(stored);

    const initialized = await current.application.initializeSayingDefaults(defaults, stored);
    expect(initialized.records[0]?.acceptedSaying).toBe(defaults.records[0]?.acceptedSaying);
    await expect(current.application.initializeSayingDefaults(defaults, initialized)).resolves.toEqual(
      initialized,
    );

    const regenerated = await current.application.updateQuotation(
      "record-yosemite",
      alternateSourceCheckedResponse,
      initialized.records[0]!.quotationRevision,
    );
    await expect(current.application.initializeSayingDefaults(defaults, regenerated)).resolves.toEqual(
      regenerated,
    );
    expect((await current.application.state()).records[0]?.acceptedSaying).toBe(alternateSourceCheckedSaying);
  });

  it("refuses a saying-default backfill when Archive state changed after compatibility review", async () => {
    const current = createApplication();
    const reviewed = await current.application.initialize(state());
    const defaults = withAcceptedQuotation(reviewed);
    await current.application.updateLifecycle("record-yosemite", "planned");

    await expect(current.application.initializeSayingDefaults(defaults, reviewed)).rejects.toMatchObject({
      code: "INITIALIZATION_CONFLICT",
      message: expect.stringMatching(/changed.*reload.*no Archive data was changed/i),
    });
    expect((await current.application.state()).records[0]).toMatchObject({
      lifecycle: "planned",
      acceptedSaying: null,
    });
  });

  it("rejects a caller-invented default outside the record-bound trusted quotation bank", async () => {
    const current = createApplication();
    const reviewed = await current.application.initialize(state());
    const invented = {
      ...reviewed,
      records: reviewed.records.map((record) => ({
        ...record,
        acceptedSaying: "“A convenient invention.” — Imaginary Person, Imaginary Source",
      })),
    };

    await expect(current.application.initializeSayingDefaults(invented, reviewed)).rejects.toMatchObject({
      code: "SAYING_CONFLICT",
      message: expect.stringMatching(/default quotation.*not in.*trusted source-checked quotation bank/i),
    });
    expect(await current.application.state()).toEqual(reviewed);
  });

  it("lets only one stale cross-tab quotation replacement win", async () => {
    const first = createApplication();
    const second = createApplication();
    await first.application.initialize(state());
    await second.application.initialize(state());

    const outcomes = await Promise.allSettled([
      first.application.updateQuotation("record-yosemite", sourceCheckedResponse, INITIAL_QUOTATION_REVISION),
      second.application.updateQuotation(
        "record-yosemite",
        alternateSourceCheckedResponse,
        INITIAL_QUOTATION_REVISION,
      ),
    ]);
    const fulfilled = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<ArchiveState> => outcome.status === "fulfilled",
    );
    const rejected = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({
      code: "SAYING_CONFLICT",
      message: expect.stringMatching(/changed.*review.*no Archive data was changed/i),
    });
    const winningSaying = fulfilled[0]?.value.records[0]?.acceptedSaying;
    expect([sourceCheckedSaying, alternateSourceCheckedSaying]).toContain(winningSaying);
    expect((await first.application.state()).records[0]?.acceptedSaying).toBe(winningSaying);
    expect((await second.application.state()).records[0]?.acceptedSaying).toBe(winningSaying);
  });

  it("rejects a stale quotation completion after the accepted text changes away and back", async () => {
    const initial = withAcceptedQuotation(state());
    const first = createApplication();
    const second = createApplication();
    await first.application.initialize(initial);
    await second.application.initialize(initial);
    const staleRevision = initial.records[0]!.quotationRevision;

    const alternate = await second.application.updateQuotation(
      "record-yosemite",
      alternateSourceCheckedResponse,
      staleRevision,
    );
    const returned = await second.application.updateQuotation(
      "record-yosemite",
      sourceCheckedResponse,
      alternate.records[0]!.quotationRevision,
    );

    await expect(
      first.application.updateQuotation("record-yosemite", alternateSourceCheckedResponse, staleRevision),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });
    expect((await first.application.state()).records[0]).toMatchObject({
      acceptedSaying: sourceCheckedSaying,
      quotationRevision: returned.records[0]!.quotationRevision,
    });
    expect(returned.records[0]!.quotationRevision).not.toBe(staleRevision);
  });

  it("upgrades tokenless v2 state and fences the older writer before quote regeneration", async () => {
    const initial = withAcceptedQuotation(state());
    const tokenless = {
      ...initial,
      records: initial.records.map((record) =>
        Object.fromEntries(Object.entries(record).filter(([key]) => key !== "quotationRevision")),
      ),
    };
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

    const current = createApplication();
    const migrated = await current.application.initialize(initial);
    const pendingRevision = migrated.records[0]!.quotationRevision;
    expect(pendingRevision).not.toBe(INITIAL_QUOTATION_REVISION);
    await expect(openDB(ARCHIVE_DATABASE_NAME, 2)).rejects.toMatchObject({ name: "VersionError" });

    const regenerated = await current.application.updateQuotation(
      "record-yosemite",
      alternateSourceCheckedResponse,
      pendingRevision,
    );
    expect(regenerated.records[0]!.acceptedSaying).toBe(alternateSourceCheckedSaying);
    expect(regenerated.records[0]!.quotationRevision).not.toBe(pendingRevision);
  });

  it("materializes a UUID when a v2 row owns an explicitly undefined quotation token", async () => {
    const initial = withAcceptedQuotation(state());
    const undefinedToken = {
      ...initial,
      records: initial.records.map((record) => ({ ...record, quotationRevision: undefined })),
    };
    const legacy = await openDB(ARCHIVE_DATABASE_NAME, 2, {
      upgrade(database) {
        database.createObjectStore(ARCHIVE_STATE_STORE);
        database.createObjectStore(ARCHIVE_OBJECT_STORE);
      },
      blocking() {
        legacy.close();
      },
    });
    await legacy.put(ARCHIVE_STATE_STORE, undefinedToken, ARCHIVE_STATE_KEY);

    const current = createApplication();
    const migrated = await current.application.initialize(initial);

    expect(migrated.records[0]!.quotationRevision).not.toBe(INITIAL_QUOTATION_REVISION);
    expect(migrated.records[0]!.quotationRevision).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  });

  it("rejects a stale restore checkpoint after another connection replaces the quote", async () => {
    const initial = withAcceptedQuotation(state());
    const first = createApplication();
    const second = createApplication();
    await first.application.initialize(initial);
    await second.application.initialize(initial);
    const checkpoint = await first.application.exportBackupCheckpoint();

    const newer = await second.application.updateQuotation(
      "record-yosemite",
      alternateSourceCheckedResponse,
      initial.records[0]!.quotationRevision,
    );

    await expect(first.application.restoreBackup(checkpoint.bytes, checkpoint.state)).rejects.toMatchObject({
      code: "RESTORE_CONFLICT",
    });
    expect(await first.application.state()).toEqual(newer);
    expect(await second.application.state()).toEqual(newer);
  });

  it("refreshes the unearned quotation token across a successful restore boundary", async () => {
    const initial = withAcceptedQuotation(state());
    const current = createApplication();
    await current.application.initialize(initial);
    const checkpoint = await current.application.exportBackupCheckpoint();

    const restored = await current.application.restoreBackup(checkpoint.bytes, checkpoint.state);
    expect(restored.records[0]!.acceptedSaying).toBe(sourceCheckedSaying);
    expect(restored.records[0]!.quotationRevision).not.toBe(initial.records[0]!.quotationRevision);
    await expect(
      current.application.updateQuotation(
        "record-yosemite",
        alternateSourceCheckedResponse,
        initial.records[0]!.quotationRevision,
      ),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });
  });

  it("applies saying defaults inside restore before returning or persisting state", async () => {
    const current = createApplication();
    const reviewed = await current.application.initialize(state());
    const incoming = state();
    const defaults = withAcceptedQuotation(incoming);
    const backup = await createArchiveBackup(incoming, [], "2026-08-23T17:00:00.000Z");

    const restored = await current.application.restoreBackup(backup, reviewed, defaults);

    expect(restored.records[0]?.acceptedSaying).toBe(sourceCheckedSaying);
    expect((await current.application.state()).records[0]?.acceptedSaying).toBe(sourceCheckedSaying);
  });

  it("admits only quotation metadata whose fully formatted value fits every Archive bound", () => {
    const quotation = maximalPersistableQuotation();
    const request = sayingRequestSchema.parse({
      title: "Yosemite",
      criterion: "Visit Yosemite National Park",
      allowedQuotations: [quotation],
    });
    const response = resolveSayingModelResponse({ quotationId: quotation.id }, request);
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
    const request = {
      title: "Visited Yosemite National Park",
      criterion: "Visit Yosemite National Park honestly.",
      allowedQuotations: [quotation],
    };
    const response = resolveSayingModelResponse({ quotationId: quotation.id }, request);
    const formatted = formatSayingForArchive(response);
    const first = createApplication(request);
    await first.application.initialize(state());
    await first.application.updateQuotation("record-yosemite", response, INITIAL_QUOTATION_REVISION);

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
    const expected = await restored.application.initialize(state());
    expect((await restored.application.restoreBackup(backupBytes, expected)).records[0].acceptedSaying).toBe(
      formatted,
    );
    expect((await restored.repository.read()).records[0].acceptedSaying).toBe(formatted);
  });

  it("round-trips a 771-grapheme formatted quotation through reload and backup restore", async () => {
    const quotation = {
      id: "771-grapheme-source-checked-quotation",
      text: "Q".repeat(600),
      person: "P".repeat(64),
      sourceTitle: "S".repeat(100),
      sourceUrl: "https://example.com/771-grapheme-source-checked-quotation",
    };
    const request = {
      title: "Visited Yosemite National Park",
      criterion: "Visit Yosemite National Park honestly.",
      allowedQuotations: [quotation],
    };
    const response = resolveSayingModelResponse({ quotationId: quotation.id }, request);
    const formatted = formatSayingForArchive(response);
    expect(validateSaying(formatted)).toMatchObject({ ok: true, graphemeCount: 771, value: formatted });
    const first = createApplication(request);
    await first.application.initialize(state());
    await first.application.updateQuotation("record-yosemite", response, INITIAL_QUOTATION_REVISION);

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
    const expected = await restored.application.initialize(state());
    expect((await restored.application.restoreBackup(backupBytes, expected)).records[0].acceptedSaying).toBe(
      formatted,
    );
    expect((await restored.repository.read()).records[0].acceptedSaying).toBe(formatted);
  });
});
