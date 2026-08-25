import "fake-indexeddb/auto";

import {
  createSeededArchiveState,
  type ArchiveRecord,
  type ArchiveState,
  type PublishedVisual,
} from "@badge/archive-domain";
import { deleteDB, openDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ARCHIVE_STATE_STORE,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  catalogueVisualLineage,
  createArchiveBackup,
  type ArchiveCatalogueVisualUpgradePlan,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const currentBytes = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUeNpj+M/A8B8ABQAB/1bHLw0AAAAASUVORK5CYII=",
    "base64",
  ),
);
const currentHash = "40608fc14ad54b68b2bff707f844efb5b342f85c51b5438c95b0bc78f06d0fa3";

const legacyVisual: PublishedVisual = {
  packRef: { packId: "starter", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "starter-visual-v1",
  sourceAssetHash: validPngHash,
  accessibleDescription: "The exact legacy starter visual.",
  renderRecipeVersion: 1,
  renderRecipe: {
    version: 1,
    shape: "circle",
    material: "metal",
    borderColor: "#806040",
    borderWidth: 0.08,
    thickness: 0.1,
    relief: 0.03,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};

const currentVisual: PublishedVisual = {
  ...legacyVisual,
  packRef: { packId: "starter", version: "1.1.0", packDigest: "b".repeat(64) },
  visualEditionId: "starter-visual-v2",
  sourceAssetHash: currentHash,
  accessibleDescription: "The cleaner manufactured starter visual.",
  renderRecipe: { ...legacyVisual.renderRecipe, material: "enamel" },
};

const legacyAsset: ArchiveSourceAssetInput = {
  hash: validPngHash,
  mimeType: "image/png",
  bytes: validPngBytes,
};
const currentAsset: ArchiveSourceAssetInput = {
  hash: currentHash,
  mimeType: "image/png",
  bytes: currentBytes,
};

function record(recordId: string, lifecycle: "planned" | "earned"): ArchiveRecord {
  const base = {
    recordId,
    definitionRef: { namespace: "pack" as const, packId: "starter", definitionId: recordId },
    collectionRefs: [{ namespace: "pack" as const, packId: "starter", collectionId: "starter-collection" }],
    title: `Title ${recordId}`,
    criterion: `Criterion ${recordId}`,
    description: `Description ${recordId}`,
    lifecycle,
    publishedVisual: legacyVisual,
    acceptedSaying: null,
    quotationRevision: "11111111-1111-4111-8111-111111111111",
    note: `Personal note ${recordId}`,
    visibility: "private" as const,
    activation:
      lifecycle === "earned"
        ? {
            occurredStart: "2025-01-02",
            occurredEnd: "2025-01-03",
            recordedAt: "2026-08-25T12:00:00.000Z",
            activatedAt: "2026-08-25T12:00:00.000Z",
            visualPin: legacyVisual,
          }
        : null,
  };
  return base;
}

function state(records = [record("unearned", "planned"), record("earned", "earned")]): ArchiveState {
  return createSeededArchiveState({ ownerId: "local-owner", records });
}

function plan(input: ArchiveState): ArchiveCatalogueVisualUpgradePlan {
  return {
    upgrades: input.records.map((candidate) => ({
      from: catalogueVisualLineage(candidate),
      to: catalogueVisualLineage({ ...candidate, publishedVisual: currentVisual }),
    })),
  };
}

let repositories: IndexedDbArchiveRepository[] = [];

function repository(): IndexedDbArchiveRepository {
  const result = new IndexedDbArchiveRepository();
  repositories.push(result);
  return result;
}

afterEach(async () => {
  for (const current of repositories) current.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("exact catalogue visual upgrades", () => {
  it("atomically upgrades only known unearned visuals and retains personal and earned history", async () => {
    const legacy = state();
    const current = repository();
    await current.load(legacy, [legacyAsset]);

    const upgraded = await current.upgradeCatalogueVisuals(plan(legacy), [currentAsset], legacy);

    expect(upgraded.records[0]).toEqual({ ...legacy.records[0], publishedVisual: currentVisual });
    expect(upgraded.records[1]).toEqual(legacy.records[1]);
    expect(await current.resolveVisual("unearned")).toMatchObject({
      pin: currentVisual,
      sourceAsset: currentAsset,
    });
    expect(await current.resolveVisual("earned")).toMatchObject({
      pin: legacyVisual,
      sourceAsset: legacyAsset,
    });

    current.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect((await evidence.getAllKeys(ARCHIVE_OBJECT_STORE)).sort()).toEqual(
      [legacyAsset.hash, currentAsset.hash].sort(),
    );
    evidence.close();
  });

  it("is idempotent for current unearned visuals without deleting the legacy source", async () => {
    const legacy = state();
    const current = repository();
    await current.load(legacy, [legacyAsset]);
    const first = await current.upgradeCatalogueVisuals(plan(legacy), [currentAsset], legacy);

    await expect(current.upgradeCatalogueVisuals(plan(legacy), [currentAsset], first)).resolves.toEqual(
      first,
    );

    current.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect((await evidence.getAllKeys(ARCHIVE_OBJECT_STORE)).sort()).toEqual(
      [legacyAsset.hash, currentAsset.hash].sort(),
    );
    evidence.close();
  });

  it("leaves a new install already on the current visual unchanged", async () => {
    const legacy = state([record("unearned", "planned")]);
    const installed = createSeededArchiveState({
      ...legacy,
      records: [{ ...legacy.records[0]!, publishedVisual: currentVisual }],
    });
    const current = repository();
    await current.load(installed, [currentAsset]);

    await expect(current.upgradeCatalogueVisuals(plan(legacy), [currentAsset], installed)).resolves.toEqual(
      installed,
    );
    expect(await current.read()).toEqual(installed);
  });

  it("rolls back both state and source writes when a target source is missing", async () => {
    const legacy = state([record("unearned", "planned")]);
    const current = repository();
    await current.load(legacy, [legacyAsset]);

    await expect(current.upgradeCatalogueVisuals(plan(legacy), [], legacy)).rejects.toMatchObject({
      code: "VISUAL_SOURCE_MISSING",
    });
    expect(await current.read()).toEqual(legacy);

    current.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.getAllKeys(ARCHIVE_OBJECT_STORE)).toEqual([legacyAsset.hash]);
    evidence.close();
  });

  it("rejects a stale expected state after another connection changes personal data", async () => {
    const legacy = state([record("unearned", "planned")]);
    const first = repository();
    const second = repository();
    await first.load(legacy, [legacyAsset]);
    await second.updateLifecycle("unearned", "suggested");

    await expect(first.upgradeCatalogueVisuals(plan(legacy), [currentAsset], legacy)).rejects.toMatchObject({
      code: "CATALOGUE_UPGRADE_CONFLICT",
    });

    expect((await first.read()).records[0]!.lifecycle).toBe("suggested");
    first.close();
    second.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.get(ARCHIVE_OBJECT_STORE, currentAsset.hash)).toBeUndefined();
    evidence.close();
  });

  it("rejects an unknown unearned lineage before storing the proposed current source", async () => {
    const legacy = state([record("unearned", "planned")]);
    const unknown = createSeededArchiveState({
      ...legacy,
      records: [
        {
          ...legacy.records[0]!,
          publishedVisual: {
            ...legacyVisual,
            visualEditionId: "unrecognized-fork",
            sourceAssetHash: "c".repeat(64),
          },
        },
      ],
    });
    const current = repository();
    await current.load(unknown);

    await expect(
      current.upgradeCatalogueVisuals(plan(legacy), [currentAsset], unknown),
    ).rejects.toMatchObject({ code: "CATALOGUE_UPGRADE_UNKNOWN_LINEAGE" });
    expect(await current.read()).toEqual(unknown);

    current.close();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    expect(await evidence.getAllKeys(ARCHIVE_OBJECT_STORE)).toEqual([]);
    expect(await evidence.get(ARCHIVE_STATE_STORE, "archive-state-v1")).toEqual(unknown);
    evidence.close();
  });

  it("normalizes a known legacy unearned backup before monotonic restore", async () => {
    const legacy = state([record("unearned", "planned")]);
    const installed = createSeededArchiveState({
      ...legacy,
      records: [{ ...legacy.records[0]!, publishedVisual: currentVisual, note: "Current note." }],
    });
    const incoming = createSeededArchiveState({
      ...legacy,
      records: [{ ...legacy.records[0]!, note: "Note from alpha.3 backup." }],
    });
    const current = repository();
    const archive = new ArchiveApplication(current);
    await archive.initialize(installed, [currentAsset]);
    const backup = await createArchiveBackup(incoming, [], "2026-08-25T13:00:00.000Z");

    const restored = await archive.restoreBackup(backup, installed, undefined, plan(legacy));

    expect(restored.records[0]).toMatchObject({
      publishedVisual: currentVisual,
      note: "Note from alpha.3 backup.",
      visibility: "private",
    });
    expect(incoming.records[0]!.publishedVisual).toEqual(legacyVisual);
  });

  it("normalizes a known legacy unearned backup before explicit recovery", async () => {
    const legacy = state([record("unearned", "planned")]);
    const normalized = createSeededArchiveState({
      ...legacy,
      records: [{ ...legacy.records[0]!, publishedVisual: currentVisual }],
    });
    const backup = await createArchiveBackup(legacy, [], "2026-08-25T13:00:00.000Z");
    const result = {
      state: normalized,
      stateReplaced: true,
      quarantineKey: "archive-state-quarantine:test",
      quarantineKeys: ["archive-state-quarantine:test"],
    };
    const recover = vi.fn().mockResolvedValue(result);
    const archive = new ArchiveApplication({ recover } as unknown as IndexedDbArchiveRepository, {
      now: () => "2026-08-25T14:00:00.000Z",
    });

    await expect(
      archive.recoverBackup(backup, "local-owner", [currentAsset], {
        mode: "replace-incompatible-readable-state",
        expectedCurrentState: legacy,
        catalogueVisualUpgradePlan: plan(legacy),
      }),
    ).resolves.toEqual(result);

    expect(recover).toHaveBeenCalledWith(
      normalized,
      [],
      [currentAsset],
      "2026-08-25T14:00:00.000Z",
      "local-owner",
      expect.objectContaining({
        mode: "replace-incompatible-readable-state",
        expectedCurrentState: legacy,
        catalogueVisualUpgradePlan: undefined,
      }),
    );
  });
});
