import "fake-indexeddb/auto";

import { createSeededArchiveState, type ActivationInput, type ArchiveState } from "@badge/archive-domain";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import {
  ArchiveApplication,
  ARCHIVE_DATABASE_NAME,
  IndexedDbArchiveRepository,
  type ArchiveSourceAssetInput,
} from "../src/index.js";
import {
  alternateSourceCheckedResponse,
  historicalQuotationRequest,
  sourceCheckedResponse,
  sourceCheckedSaying,
  withAcceptedQuotation,
} from "./historical-quotation-fixtures.js";
import { validPngBytes, validPngHash } from "./image-fixtures.js";

const visual = {
  packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: validPngHash,
  accessibleDescription: "A crafted Yosemite badge showing granite walls after rain.",
  renderRecipeVersion: 1 as const,
  renderRecipe: {
    version: 1 as const,
    shape: "circle" as const,
    material: "metal" as const,
    borderColor: "#b87333",
    borderWidth: 0.08,
    thickness: 0.1,
    relief: 0.03,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};

const sourceAsset: ArchiveSourceAssetInput = {
  hash: visual.sourceAssetHash,
  mimeType: "image/png",
  bytes: validPngBytes,
};

function seed(): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: {
          namespace: "pack",
          packId: "parks",
          definitionId: "visited-yosemite",
        },
        collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "national-parks" }],
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

function seedWithQuotation(): ArchiveState {
  return withAcceptedQuotation(seed());
}

const activationInput: ActivationInput = {
  recordId: "record-yosemite",
  occurredStart: "2026-06-12",
  occurredEnd: "2026-06-14",
  note: "Granite after rain.",
  visibility: "private",
  visualPin: visual,
};

let repositories: IndexedDbArchiveRepository[] = [];

function repository(): IndexedDbArchiveRepository {
  const result = new IndexedDbArchiveRepository({
    trustedQuotationRequests: { "record-yosemite": historicalQuotationRequest },
  });
  repositories.push(result);
  return result;
}

afterEach(async () => {
  for (const current of repositories) current.close();
  repositories = [];
  await deleteDB(ARCHIVE_DATABASE_NAME);
});

describe("quotation mutation boundaries", () => {
  it("rejects activation when its validated quotation no longer matches stored state", async () => {
    const current = repository();
    const application = new ArchiveApplication(current, {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    const initial = await application.initialize(seedWithQuotation());

    await expect(
      application.activate(
        activationInput,
        sourceAsset,
        alternateSourceCheckedResponse,
        initial.records[0]!.quotationRevision,
      ),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });
    expect(await current.read()).toEqual(initial);
    await expect(current.resolveVisual("record-yosemite")).rejects.toMatchObject({
      code: "VISUAL_SOURCE_MISSING",
    });
  });

  it("rejects fabricated quotation metadata at both mutation boundaries", async () => {
    const current = repository();
    const application = new ArchiveApplication(current, {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    const initial = await application.initialize(seedWithQuotation());
    const fabricated = {
      ...sourceCheckedResponse,
      quotation: {
        ...sourceCheckedResponse.quotation,
        sourceUrl: "https://example.com/fabricated-source",
      },
    };

    await expect(
      application.updateQuotation("record-yosemite", fabricated, initial.records[0]!.quotationRevision),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });
    await expect(
      application.activate(activationInput, sourceAsset, fabricated, initial.records[0]!.quotationRevision),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });
    expect(await current.read()).toEqual(initial);
  });

  it("rejects stale activation after another tab changes the quote away and back", async () => {
    const first = new ArchiveApplication(repository(), {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    const second = new ArchiveApplication(repository(), {
      now: () => "2026-08-23T17:00:00.000Z",
    });
    const initial = await first.initialize(seedWithQuotation());
    await second.initialize(seedWithQuotation());
    const staleRevision = initial.records[0]!.quotationRevision;
    const alternate = await second.updateQuotation(
      "record-yosemite",
      alternateSourceCheckedResponse,
      staleRevision,
    );
    const returned = await second.updateQuotation(
      "record-yosemite",
      sourceCheckedResponse,
      alternate.records[0]!.quotationRevision,
    );

    await expect(
      first.activate(activationInput, sourceAsset, sourceCheckedResponse, staleRevision),
    ).rejects.toMatchObject({ code: "SAYING_CONFLICT" });
    expect(await first.state()).toEqual(returned);
    expect(returned.records[0]).toMatchObject({ lifecycle: "suggested", activation: null });
  });

  it("persists lifecycle and quotation updates sequentially", async () => {
    const current = repository();
    const application = new ArchiveApplication(current);
    await application.initialize(seed());

    await Promise.all([
      application.updateLifecycle("record-yosemite", "planned"),
      application.updateQuotation(
        "record-yosemite",
        sourceCheckedResponse,
        seed().records[0]!.quotationRevision,
      ),
    ]);

    expect((await current.read()).records[0]).toMatchObject({
      lifecycle: "planned",
      acceptedSaying: sourceCheckedSaying,
    });
  });
});
