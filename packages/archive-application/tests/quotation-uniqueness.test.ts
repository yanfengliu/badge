import "fake-indexeddb/auto";

import {
  INITIAL_QUOTATION_REVISION,
  activateAchievement,
  createSeededArchiveState,
  type ActivationInput,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import {
  formatSayingForArchive,
  resolveSayingModelResponse,
  type HistoricalQuotation,
  type SayingRequest,
} from "@badge/saying-contract";
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
} from "../src/index.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const sharedMeaningFirst = {
  id: "shared-meaning-first",
  text: "The Café road—leads home.",
  person: "First Historian",
  sourceTitle: "First Source",
  sourceUrl: "https://example.com/first-source",
} as const satisfies HistoricalQuotation;

const sharedMeaningSecond = {
  id: "shared-meaning-second",
  text: "THE CAFE road, leads HOME!",
  person: "Second Historian",
  sourceTitle: "Second Source",
  sourceUrl: "https://example.com/second-source",
} as const satisfies HistoricalQuotation;

const distinctSecond = {
  id: "distinct-second",
  text: "A different road opens beyond the hill.",
  person: "Second Historian",
  sourceTitle: "Second Source",
  sourceUrl: "https://example.com/second-source",
} as const satisfies HistoricalQuotation;

const firstRequest = {
  title: "First badge",
  criterion: "Complete the first achievement.",
  allowedQuotations: [sharedMeaningFirst],
} as const satisfies SayingRequest;

const secondRequest = {
  title: "Second badge",
  criterion: "Complete the second achievement.",
  allowedQuotations: [sharedMeaningSecond, distinctSecond],
} as const satisfies SayingRequest;

const trustedQuotationRequests = {
  "record-first": firstRequest,
  "record-second": secondRequest,
} as const;

const firstResponse = resolveSayingModelResponse({ quotationId: sharedMeaningFirst.id }, firstRequest);
const secondResponse = resolveSayingModelResponse({ quotationId: sharedMeaningSecond.id }, secondRequest);
const distinctResponse = resolveSayingModelResponse({ quotationId: distinctSecond.id }, secondRequest);
const firstSaying = formatSayingForArchive(firstResponse);
const secondSaying = formatSayingForArchive(secondResponse);

const publishedVisual: PublishedVisual = {
  packRef: { packId: "test-pack", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "test-visual-v1",
  sourceAssetHash: validPngHash,
  accessibleDescription: "A test badge.",
  renderRecipeVersion: 1,
  renderRecipe: {
    version: 1,
    shape: "circle",
    material: "metal",
    borderColor: "#70543e",
    borderWidth: 0.08,
    thickness: 0.1,
    relief: 0.03,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};

function state(firstAccepted: string | null = null, secondAccepted: string | null = null): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-first",
        definitionRef: { namespace: "pack", packId: "test-pack", definitionId: "first" },
        collectionRefs: [{ namespace: "pack", packId: "test-pack", collectionId: "test-collection" }],
        title: firstRequest.title,
        criterion: firstRequest.criterion,
        description: null,
        lifecycle: "suggested",
        publishedVisual,
        acceptedSaying: firstAccepted,
        note: null,
        visibility: "inherit",
        activation: null,
      },
      {
        recordId: "record-second",
        definitionRef: { namespace: "pack", packId: "test-pack", definitionId: "second" },
        collectionRefs: [{ namespace: "pack", packId: "test-pack", collectionId: "test-collection" }],
        title: secondRequest.title,
        criterion: secondRequest.criterion,
        description: null,
        lifecycle: "suggested",
        publishedVisual,
        acceptedSaying: secondAccepted,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

function earnFirst(input: ArchiveState): ArchiveState {
  const record = input.records[0]!;
  return activateAchievement(
    input,
    {
      recordId: record.recordId,
      occurredStart: "2026-08-31",
      occurredEnd: "2026-08-31",
      note: null,
      visibility: "private",
      visualPin: record.publishedVisual,
    },
    "2026-08-31T12:00:00.000Z",
  ).state;
}

let repositories: IndexedDbArchiveRepository[] = [];

function createApplication() {
  const repository = new IndexedDbArchiveRepository({ trustedQuotationRequests });
  repositories.push(repository);
  return new ArchiveApplication(repository);
}

async function createApplicationWithExistingState(existing: ArchiveState): Promise<ArchiveApplication> {
  const database = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION, {
    upgrade(current) {
      current.createObjectStore(ARCHIVE_STATE_STORE);
      current.createObjectStore(ARCHIVE_OBJECT_STORE);
    },
  });
  await database.put(ARCHIVE_STATE_STORE, existing, ARCHIVE_STATE_KEY);
  database.close();
  const application = createApplication();
  expect(await application.initialize(state())).toEqual(existing);
  return application;
}

afterEach(async () => {
  for (const repository of repositories) repository.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("transactional quotation uniqueness", () => {
  it("rejects every canonical collision in a fresh seed before writing state or sources", async () => {
    const application = createApplication();
    const duplicate = state(firstSaying, secondSaying);
    const bothEarned = activateAchievement(
      earnFirst(duplicate),
      {
        recordId: "record-second",
        occurredStart: "2026-08-31",
        occurredEnd: "2026-08-31",
        note: null,
        visibility: "private",
        visualPin: publishedVisual,
      },
      "2026-08-31T12:01:00.000Z",
    ).state;

    for (const freshSeed of [duplicate, bothEarned]) {
      await expect(
        application.initialize(freshSeed, [
          { hash: validPngHash, mimeType: "image/png", bytes: validPngBytes },
        ]),
      ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });
    }

    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    try {
      expect(await evidence.get(ARCHIVE_STATE_STORE, ARCHIVE_STATE_KEY)).toBeUndefined();
      expect(await evidence.getAllKeys(ARCHIVE_OBJECT_STORE)).toEqual([]);
    } finally {
      evidence.close();
    }
  });

  it("rejects canonically equivalent text already accepted by another trusted record", async () => {
    const application = createApplication();
    const initial = state(firstSaying);
    await application.initialize(initial);

    await expect(
      application.updateQuotation("record-second", secondResponse, INITIAL_QUOTATION_REVISION),
    ).rejects.toMatchObject({
      code: "SAYING_CONFLICT",
      message: expect.stringMatching(/already accepted.*First badge.*different source-checked quotation/i),
    });
    expect(await application.state()).toEqual(initial);
  });

  it("lets a trusted earned quotation block new reuse without rewriting the sealed record", async () => {
    const application = createApplication();
    const initial = earnFirst(state(firstSaying));
    await application.initialize(initial);

    await expect(
      application.updateQuotation("record-second", secondResponse, INITIAL_QUOTATION_REVISION),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });
    expect(await application.state()).toEqual(initial);
  });

  it("reserves an exact persisted quotation already sealed in earned legacy state", async () => {
    const application = createApplication();
    const legacy = formatSayingForArchive(secondResponse);
    const initial = earnFirst(state(legacy));
    await application.initialize(initial);

    await expect(
      application.updateQuotation("record-second", secondResponse, INITIAL_QUOTATION_REVISION),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });

    expect(await application.state()).toEqual(initial);
  });

  it("reserves an exact persisted quotation retained in unearned legacy state", async () => {
    const application = createApplication();
    const legacy = formatSayingForArchive(secondResponse);
    const initial = state(legacy);
    await application.initialize(initial);

    await expect(
      application.updateQuotation("record-second", secondResponse, INITIAL_QUOTATION_REVISION),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });

    expect(await application.state()).toEqual(initial);
  });

  it("reserves raw earned legacy prose when it is canonically identical to a proposed quotation", async () => {
    const application = createApplication();
    const legacy = sharedMeaningSecond.text;
    const initial = earnFirst(state(legacy));
    await application.initialize(initial);

    await expect(
      application.updateQuotation("record-second", secondResponse, INITIAL_QUOTATION_REVISION),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });

    expect(await application.state()).toEqual(initial);
  });

  it("reserves visually identical raw legacy prose containing default-ignorable characters", async () => {
    const application = createApplication();
    const legacy = sharedMeaningSecond.text.replace("CAFE", "CA\u200DF\u2060E").replace("road", "ro\u00ADad");
    const initial = earnFirst(state(legacy));
    await application.initialize(initial);

    await expect(
      application.updateQuotation("record-second", secondResponse, INITIAL_QUOTATION_REVISION),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });

    expect(await application.state()).toEqual(initial);
  });

  it("reserves the quote inside ambiguous legacy formatting when a source title contains the delimiter", async () => {
    const acceptedSaying = `“${sharedMeaningSecond.text}” — Alice, Essay “Part” — Volume, Two`;
    const initial = state(acceptedSaying);
    initial.records[0] = { ...initial.records[0]!, title: "Archived first badge" };
    const application = await createApplicationWithExistingState(initial);

    await expect(
      application.updateQuotation("record-second", secondResponse, INITIAL_QUOTATION_REVISION),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });

    expect(await application.state()).toEqual(initial);
  });

  it("rejects activation that would newly seal a restored duplicate quotation", async () => {
    const legacy = formatSayingForArchive(secondResponse);
    const initial = earnFirst(state(legacy, secondSaying));
    const application = await createApplicationWithExistingState(initial);
    const target = initial.records[1]!;
    const activationInput: ActivationInput = {
      recordId: target.recordId,
      occurredStart: "2026-08-31",
      occurredEnd: "2026-08-31",
      note: null,
      visibility: "private",
      visualPin: target.publishedVisual,
    };

    await expect(
      application.activate(
        activationInput,
        { hash: validPngHash, mimeType: "image/png", bytes: validPngBytes },
        secondResponse,
        target.quotationRevision,
      ),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });

    expect(await application.state()).toEqual(initial);
    await expect(repositories[0]!.resolveVisual(target.recordId)).rejects.toMatchObject({
      code: "VISUAL_SOURCE_MISSING",
    });
  });

  it("rejects activation against an exact persisted duplicate in unearned legacy state", async () => {
    const legacy = formatSayingForArchive(secondResponse);
    const initial = state(legacy, secondSaying);
    const application = await createApplicationWithExistingState(initial);
    const target = initial.records[1]!;
    const activationInput: ActivationInput = {
      recordId: target.recordId,
      occurredStart: "2026-08-31",
      occurredEnd: "2026-08-31",
      note: null,
      visibility: "private",
      visualPin: target.publishedVisual,
    };

    await expect(
      application.activate(
        activationInput,
        { hash: validPngHash, mimeType: "image/png", bytes: validPngBytes },
        secondResponse,
        target.quotationRevision,
      ),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });

    expect(await application.state()).toEqual(initial);
    await expect(repositories[0]!.resolveVisual(target.recordId)).rejects.toMatchObject({
      code: "VISUAL_SOURCE_MISSING",
    });
  });

  it("keeps existing trusted duplicates readable and permits an update that removes one", async () => {
    const initial = state(firstSaying, secondSaying);
    const application = await createApplicationWithExistingState(initial);

    const updated = await application.updateQuotation(
      "record-second",
      distinctResponse,
      INITIAL_QUOTATION_REVISION,
    );

    expect(updated.records[0]?.acceptedSaying).toBe(firstSaying);
    expect(updated.records[1]?.acceptedSaying).toBe(formatSayingForArchive(distinctResponse));
  });

  it("lets exactly one concurrent cross-record update claim a canonical quotation text", async () => {
    const first = createApplication();
    const second = createApplication();
    const initial = state();
    await first.initialize(initial);
    await second.initialize(initial);

    const outcomes = await Promise.allSettled([
      first.updateQuotation("record-first", firstResponse, INITIAL_QUOTATION_REVISION),
      second.updateQuotation("record-second", secondResponse, INITIAL_QUOTATION_REVISION),
    ]);
    const fulfilled = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<ArchiveState> => outcome.status === "fulfilled",
    );
    const rejected = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({ code: "SAYING_CONFLICT" });
    const durable = await first.state();
    expect(durable.records.filter((record) => record.acceptedSaying !== null)).toHaveLength(1);
  });
});
