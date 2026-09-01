import "fake-indexeddb/auto";

import {
  activateAchievement,
  createSeededArchiveState,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import { formatSayingForArchive, type HistoricalQuotation, type SayingRequest } from "@badge/saying-contract";
import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_QUARANTINE_KEY_PREFIX,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_QUARANTINE_KEY_PREFIX,
  ARCHIVE_STATE_KEY,
  ARCHIVE_STATE_STORE,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  createArchiveBackup,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const exportedAt = "2026-08-31T20:00:00.000Z";

const sharedFirst = quotation("shared-first", "The Café road—leads home.", "First Historian", "First Source");
const sharedSecond = quotation(
  "shared-second",
  "THE CAFE road, leads HOME!",
  "Second Historian",
  "Second Source",
);
const alternateA = quotation(
  "alternate-a",
  "A different road opens beyond the hill.",
  "Second Historian",
  "Second Source",
);
const alternateB = quotation(
  "alternate-b",
  "Stars wait beyond the second ridge.",
  "Third Historian",
  "Third Source",
);
const freeCurrent = quotation(
  "free-current",
  "Keep the river at your left.",
  "Fourth Historian",
  "Fourth Source",
);
const freeDefault = quotation(
  "free-default",
  "The valley opens at dawn.",
  "Fourth Historian",
  "Fourth Source",
);
const earnedBankFirst = quotation(
  "earned-bank-first",
  "Remember the climb.",
  "Fifth Historian",
  "Fifth Source",
);
const earnedBankSecond = quotation(
  "earned-bank-second",
  "Carry the day with you.",
  "Sixth Historian",
  "Sixth Source",
);
const arbitraryDefault = quotation(
  "arbitrary-default",
  "A clear path begins with one step.",
  "Seventh Historian",
  "Seventh Source",
);

const requests = {
  "record-target": request("Target badge", "Complete the target achievement.", [sharedSecond, alternateA]),
  "record-next": request("Next badge", "Complete the next achievement.", [alternateA, alternateB]),
  "record-free": request("Free badge", "Complete the free achievement.", [freeCurrent, freeDefault]),
  "record-earned-first": request("Earned first", "Complete the first earned achievement.", [earnedBankFirst]),
  "record-earned-second": request("Earned second", "Complete the second earned achievement.", [
    earnedBankSecond,
  ]),
  "record-earned-prose": request("Earned prose", "Complete the prose achievement.", [arbitraryDefault]),
} as const satisfies Readonly<Record<string, SayingRequest>>;

const reviewedDefaults = {
  "record-target": sharedSecond,
  "record-next": alternateA,
  "record-free": freeDefault,
  "record-earned-first": earnedBankFirst,
  "record-earned-second": earnedBankSecond,
  "record-earned-prose": arbitraryDefault,
} as const satisfies Readonly<Record<string, HistoricalQuotation>>;

const publishedVisual: PublishedVisual = {
  packRef: { packId: "default-uniqueness", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "default-uniqueness-v1",
  sourceAssetHash: validPngHash,
  accessibleDescription: "A deterministic test badge.",
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

const sourceAsset: ArchiveSourceAssetInput = {
  hash: validPngHash,
  mimeType: "image/png",
  bytes: validPngBytes,
};

function quotation(id: string, text: string, person: string, sourceTitle: string): HistoricalQuotation {
  return {
    id,
    text,
    person,
    sourceTitle,
    sourceUrl: `https://example.com/${id}`,
  };
}

function request(
  title: string,
  criterion: string,
  allowedQuotations: readonly HistoricalQuotation[],
): SayingRequest {
  return { title, criterion, allowedQuotations: [...allowedQuotations] };
}

function formatted(quotationRecord: HistoricalQuotation): string {
  return formatSayingForArchive({
    kind: "quotation",
    saying: quotationRecord.text,
    quotation: quotationRecord,
  });
}

function baseState(): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: Object.entries(requests).map(([recordId, sayingRequest]) => ({
      recordId,
      definitionRef: { namespace: "pack" as const, packId: "default-uniqueness", definitionId: recordId },
      collectionRefs: [
        {
          namespace: "pack" as const,
          packId: "default-uniqueness",
          collectionId: "default-uniqueness",
        },
      ],
      title: sayingRequest.title,
      criterion: sayingRequest.criterion,
      description: null,
      lifecycle: "suggested" as const,
      publishedVisual,
      acceptedSaying: null,
      note: null,
      visibility: "inherit" as const,
      activation: null,
    })),
  });
}

function defaultState(): ArchiveState {
  const base = baseState();
  return {
    ...base,
    records: base.records.map((record) => ({
      ...record,
      acceptedSaying: formatted(reviewedDefaults[record.recordId as keyof typeof reviewedDefaults]),
    })),
  };
}

function withAcceptedSaying(state: ArchiveState, recordId: string, acceptedSaying: string): ArchiveState {
  return {
    ...state,
    records: state.records.map((record) =>
      record.recordId === recordId ? { ...record, acceptedSaying } : record,
    ),
  };
}

function earn(state: ArchiveState, recordId: string, acceptedSaying: string): ArchiveState {
  const withSaying = withAcceptedSaying(state, recordId, acceptedSaying);
  const record = withSaying.records.find((candidate) => candidate.recordId === recordId)!;
  return activateAchievement(
    withSaying,
    {
      recordId,
      occurredStart: "2026-08-31",
      occurredEnd: "2026-08-31",
      note: null,
      visibility: "private",
      visualPin: record.publishedVisual,
    },
    exportedAt,
  ).state;
}

function collisionState(): ArchiveState {
  let state = baseState();
  state = withAcceptedSaying(state, "record-target", formatted(sharedSecond));
  state = withAcceptedSaying(state, "record-free", formatted(freeCurrent));
  state = earn(state, "record-earned-first", formatted(sharedFirst));
  state = earn(state, "record-earned-second", formatted(sharedSecond));
  return earn(state, "record-earned-prose", arbitraryDefault.text);
}

function exhaustedState(): ArchiveState {
  let state = baseState();
  state = earn(state, "record-earned-first", formatted(sharedFirst));
  return earn(state, "record-earned-second", alternateB.text);
}

function sealedDuplicateState(): ArchiveState {
  let state = baseState();
  state = earn(state, "record-earned-first", formatted(sharedFirst));
  return earn(state, "record-earned-second", formatted(sharedSecond));
}

function record(state: ArchiveState, recordId: string) {
  return state.records.find((candidate) => candidate.recordId === recordId)!;
}

function expectDeterministicChoices(state: ArchiveState): void {
  expect(record(state, "record-target").acceptedSaying).toBe(formatted(alternateA));
  expect(record(state, "record-next").acceptedSaying).toBe(formatted(alternateB));
  expect(record(state, "record-free").acceptedSaying).toBe(formatted(freeCurrent));
  expect(record(state, "record-earned-prose").acceptedSaying).toBe(arbitraryDefault.text);
}

function expectEarnedPreserved(actual: ArchiveState, expected: ArchiveState): void {
  for (const recordId of ["record-earned-first", "record-earned-second", "record-earned-prose"]) {
    expect(record(actual, recordId)).toEqual(record(expected, recordId));
  }
}

let repositories: IndexedDbArchiveRepository[] = [];

function application(): ArchiveApplication {
  const repository = new IndexedDbArchiveRepository({ trustedQuotationRequests: requests });
  repositories.push(repository);
  return new ArchiveApplication(repository, { now: () => exportedAt });
}

async function applicationWithExistingState(existing: ArchiveState): Promise<ArchiveApplication> {
  const database = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION, {
    upgrade(current) {
      current.createObjectStore(ARCHIVE_STATE_STORE);
      current.createObjectStore(ARCHIVE_OBJECT_STORE);
    },
  });
  await database.put(ARCHIVE_STATE_STORE, existing, ARCHIVE_STATE_KEY);
  database.close();
  const archive = application();
  expect(await archive.initialize(baseState())).toEqual(existing);
  return archive;
}

afterEach(async () => {
  for (const repository of repositories) repository.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("quotation-default uniqueness reconciliation", () => {
  it("reserves formatted and raw earned text first while remaining deterministic and idempotent", async () => {
    const current = collisionState();
    const archive = await applicationWithExistingState(current);
    const defaults = defaultState();

    const initialized = await archive.initializeSayingDefaults(defaults, current);

    expectDeterministicChoices(initialized);
    expectEarnedPreserved(initialized, current);
    expect(record(initialized, "record-target").quotationRevision).not.toBe(
      record(current, "record-target").quotationRevision,
    );
    expect(record(initialized, "record-next").quotationRevision).not.toBe(
      record(current, "record-next").quotationRevision,
    );
    expect(record(initialized, "record-free").quotationRevision).toBe(
      record(current, "record-free").quotationRevision,
    );

    await expect(archive.initializeSayingDefaults(defaults, initialized)).resolves.toEqual(initialized);
    expect(await archive.state()).toEqual(initialized);
  });

  it.each(["restore", "recovery"] as const)(
    "uses the same formatted-or-raw reservation rule during %s while preserving earned records exactly",
    async (boundary) => {
      const archive = application();
      const baseline = await archive.initialize(baseState(), [sourceAsset]);
      const incoming = collisionState();
      const backup = await createArchiveBackup(incoming, [sourceAsset], exportedAt);
      const defaults = defaultState();

      const reconciled =
        boundary === "restore"
          ? await archive.restoreBackup(backup, baseline, defaults)
          : (
              await archive.recoverBackup(backup, baseline.ownerId, [sourceAsset], {
                mode: "replace-incompatible-readable-state",
                expectedCurrentState: baseline,
                sayingDefaults: defaults,
              })
            ).state;

      expectDeterministicChoices(reconciled);
      expectEarnedPreserved(reconciled, incoming);
      expect(await archive.state()).toEqual(reconciled);
    },
  );

  it.each(["restore", "recovery"] as const)(
    "refuses %s without defaults when an unearned quotation collides with sealed history",
    async (boundary) => {
      const archive = application();
      const baseline = await archive.initialize(baseState(), [sourceAsset]);
      const incoming = collisionState();
      const backup = await createArchiveBackup(incoming, [sourceAsset], exportedAt);

      const operation =
        boundary === "restore"
          ? archive.restoreBackup(backup, baseline)
          : archive.recoverBackup(backup, baseline.ownerId, [sourceAsset], {
              mode: "replace-incompatible-readable-state",
              expectedCurrentState: baseline,
            });

      await expect(operation).rejects.toMatchObject({
        code: "SAYING_CONFLICT",
        message: expect.stringMatching(/same quotation wording.*unearned.*current source-checked/i),
      });
      expect(await archive.state()).toEqual(baseline);
    },
  );

  it.each(["restore", "recovery"] as const)(
    "preserves grandfathered sealed duplicates through %s without defaults",
    async (boundary) => {
      const archive = application();
      const baseline = await archive.initialize(baseState(), [sourceAsset]);
      const incoming = sealedDuplicateState();
      const backup = await createArchiveBackup(incoming, [sourceAsset], exportedAt);

      const restored =
        boundary === "restore"
          ? await archive.restoreBackup(backup, baseline)
          : (
              await archive.recoverBackup(backup, baseline.ownerId, [sourceAsset], {
                mode: "replace-incompatible-readable-state",
                expectedCurrentState: baseline,
              })
            ).state;

      expect(record(restored, "record-earned-first").acceptedSaying).toBe(formatted(sharedFirst));
      expect(record(restored, "record-earned-second").acceptedSaying).toBe(formatted(sharedSecond));
      expect(record(restored, "record-earned-first").lifecycle).toBe("earned");
      expect(record(restored, "record-earned-second").lifecycle).toBe("earned");
    },
  );

  it.each(["initialization", "restore", "recovery"] as const)(
    "fails %s atomically when formatted or raw earned values occupy every trusted quotation",
    async (boundary) => {
      const archive = application();
      const incoming = exhaustedState();
      const baseline = await archive.initialize(boundary === "initialization" ? incoming : baseState(), [
        sourceAsset,
      ]);
      const backup = await createArchiveBackup(incoming, [sourceAsset], exportedAt);
      const defaults = defaultState();

      const operation =
        boundary === "initialization"
          ? archive.initializeSayingDefaults(defaults, baseline)
          : boundary === "restore"
            ? archive.restoreBackup(backup, baseline, defaults)
            : archive.recoverBackup(backup, baseline.ownerId, [sourceAsset], {
                mode: "replace-incompatible-readable-state",
                expectedCurrentState: baseline,
                sayingDefaults: defaults,
              });

      await expect(operation).rejects.toMatchObject({
        code: "SAYING_CONFLICT",
        message: expect.stringMatching(/Next badge.*no distinct source-checked quotation.*publish/i),
      });
      expect(await archive.state()).toEqual(baseline);
      if (boundary === "recovery") {
        const database = await openDB(ARCHIVE_DATABASE_NAME);
        try {
          const stateKeys = await database.getAllKeys(ARCHIVE_STATE_STORE);
          const objectKeys = await database.getAllKeys(ARCHIVE_OBJECT_STORE);
          expect(stateKeys).toContain(ARCHIVE_STATE_KEY);
          expect(stateKeys.filter((key) => String(key).startsWith(ARCHIVE_QUARANTINE_KEY_PREFIX))).toEqual(
            [],
          );
          expect(
            objectKeys.filter((key) => String(key).startsWith(ARCHIVE_OBJECT_QUARANTINE_KEY_PREFIX)),
          ).toEqual([]);
        } finally {
          database.close();
        }
      }
    },
  );
});
