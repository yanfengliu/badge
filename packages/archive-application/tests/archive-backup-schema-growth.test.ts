import { describe, expect, it } from "vitest";

import { archiveRecordSchema, createSeededArchiveState, type ArchiveState } from "@badge/archive-domain";
import { canonicalJsonBytes, sha256Hex } from "@badge/pack-contract";

import { DEFAULTED_ARCHIVE_RECORD_FIELDS, parseArchiveBackup } from "../src/index.js";
import { validPngHash } from "./image-fixtures.js";
import { withAcceptedQuotation } from "./historical-quotation-fixtures.js";

/**
 * A `.badgearchive` v2 container is byte-compared against the canonical encoding of the state it
 * parses to, so every field later added to `archiveRecordSchema` with a `.default()` changes that
 * encoding and would refuse every backup written before it. These fixtures are the exact record
 * shapes earlier releases actually wrote — not a parsed state with keys deleted afterwards, which
 * is a shape no release ever produced and cannot catch this.
 */
const BACKUP_MAGIC = new TextEncoder().encode("BADGEARCHIVE");
const MANIFEST_DIGEST_BYTES = 32;

const publishedVisual = {
  packRef: { packId: "badge.catalogue.starter", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: validPngHash,
  accessibleDescription: "A crafted Yosemite badge.",
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
} as const;

function currentState(): ArchiveState {
  return withAcceptedQuotation(
    createSeededArchiveState({
      ownerId: "local-owner",
      records: [
        {
          recordId: "record-yosemite",
          definitionRef: {
            namespace: "pack",
            packId: "badge.catalogue.starter",
            definitionId: "visited-yosemite",
          },
          collectionRefs: [
            { namespace: "pack", packId: "badge.catalogue.starter", collectionId: "national-parks" },
          ],
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
    }),
  );
}

/** The record shape a release wrote when it had none of the given later-added fields. */
function stateWithout(...absentKeys: readonly string[]): unknown {
  const state = JSON.parse(JSON.stringify(currentState())) as {
    records: Record<string, unknown>[];
  };
  for (const record of state.records) for (const key of absentKeys) delete record[key];
  return state;
}

async function containerFor(rawState: unknown, exportedAt = "2026-08-01T00:00:00.000Z") {
  return containerForBytes(canonicalJsonBytes(rawState), exportedAt);
}

async function containerForBytes(stateBytes: Uint8Array, exportedAt = "2026-08-01T00:00:00.000Z") {
  const manifestBytes = canonicalJsonBytes({
    format: "badgearchive",
    backupVersion: 2,
    exportedAt,
    state: { byteLength: stateBytes.byteLength, sha256: await sha256Hex(stateBytes) },
    sourceAssets: [],
  });
  const header = new Uint8Array(BACKUP_MAGIC.byteLength + 4 + MANIFEST_DIGEST_BYTES);
  header.set(BACKUP_MAGIC);
  new DataView(header.buffer).setUint32(BACKUP_MAGIC.byteLength, manifestBytes.byteLength, true);
  const manifestDigest = await sha256Hex(manifestBytes);
  header.set(
    Uint8Array.from({ length: MANIFEST_DIGEST_BYTES }, (_value, index) =>
      Number.parseInt(manifestDigest.slice(index * 2, index * 2 + 2), 16),
    ),
    BACKUP_MAGIC.byteLength + 4,
  );
  const container = new Uint8Array(header.byteLength + manifestBytes.byteLength + stateBytes.byteLength);
  container.set(header, 0);
  container.set(manifestBytes, header.byteLength);
  container.set(stateBytes, header.byteLength + manifestBytes.byteLength);
  return container;
}

describe("a backup written before a record field existed", () => {
  it("restores a backup from the release just before badge adjustments", async () => {
    const backup = await parseArchiveBackup(await containerFor(stateWithout("adjustment")));

    expect(backup.state.records[0].adjustment).toBeNull();
    expect(backup.state.records[0].quotationRevision).toBe(currentState().records[0].quotationRevision);
  });

  it("still restores a backup from before durable quotation revisions", async () => {
    const backup = await parseArchiveBackup(
      await containerFor(stateWithout("adjustment", "quotationRevision")),
    );

    expect(backup.state.records[0].adjustment).toBeNull();
    expect(backup.state.records[0].acceptedSaying).toBe(currentState().records[0].acceptedSaying);
  });

  it("restores a backup this release wrote", async () => {
    const backup = await parseArchiveBackup(await containerFor(currentState()));

    expect(backup.state.records[0].adjustment).toBeNull();
  });

  it("still refuses state bytes that parse correctly but are not canonical", async () => {
    // Pretty-printed rather than canonical: the same state, different bytes. Relaxing the
    // comparison for older shapes must not relax it for this.
    const bytes = new TextEncoder().encode(JSON.stringify(currentState(), null, 1));

    await expect(parseArchiveBackup(await containerForBytes(bytes))).rejects.toThrow(/not canonical/u);
  });

  it("names every defaulted record field, so the next one cannot silently break older backups", () => {
    const required = {
      recordId: "record-yosemite",
      definitionRef: {
        namespace: "pack",
        packId: "badge.catalogue.starter",
        definitionId: "visited-yosemite",
      },
      collectionRefs: [
        { namespace: "pack", packId: "badge.catalogue.starter", collectionId: "national-parks" },
      ],
      title: "Visited Yosemite National Park",
      criterion: "Visit Yosemite National Park honestly.",
      description: null,
      lifecycle: "suggested",
      publishedVisual,
      acceptedSaying: null,
      note: null,
      visibility: "inherit",
      activation: null,
    };
    const parsed = archiveRecordSchema.parse(required);
    const defaulted = Object.keys(parsed).filter((key) => !(key in required));

    expect([...defaulted].sort()).toEqual([...DEFAULTED_ARCHIVE_RECORD_FIELDS].sort());
  });

  it("refuses a payload where only some records omit a later field", async () => {
    const state = JSON.parse(JSON.stringify(currentState())) as {
      records: Record<string, unknown>[];
    };
    state.records.push({ ...state.records[0], recordId: "record-second" });
    delete state.records[0].adjustment;

    await expect(parseArchiveBackup(await containerFor(state))).rejects.toThrow(/not canonical/u);
  });
});
