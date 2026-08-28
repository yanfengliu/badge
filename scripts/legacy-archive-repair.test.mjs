import "fake-indexeddb/auto";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  ARCHIVE_DATABASE_NAME,
  ARCHIVE_DATABASE_VERSION,
  ARCHIVE_OBJECT_STORE,
  ArchiveApplication,
  IndexedDbArchiveRepository,
  createArchiveBackup,
} from "@badge/archive-application";
import { archiveStateSchema } from "@badge/archive-domain";
import { legacyStarterRepairSources } from "@badge/catalogue-fixtures/legacy-repair";
import decodeWebp, { init as initializeWebpDecoder } from "@jsquash/webp/decode.js";
import { deleteDB, openDB } from "idb";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createStarterArchiveState } from "../apps/archive-web/src/archive-state.js";
import { LEGACY_STARTER_VISUAL_LINEAGES } from "../apps/archive-web/src/starter-visual-upgrade.js";
import {
  encodeCanonicalRgbaPng,
  exactArrayBuffer,
  expectedArchiveFixtures,
  sha256Hex,
} from "./archive-fixture-contract.mjs";
import { expectedLegacyArchiveRepairFixtures } from "./archive-legacy-repair-contract.mjs";

let repositories = [];
let trustedAssets;

describe.sequential("alpha.3 earned-memory source repair", () => {
  beforeAll(async () => {
    installImageDataForNode();
    const wasm = await WebAssembly.compile(
      await readFile(path.resolve("node_modules/@jsquash/webp/codec/dec/webp_dec.wasm")),
    );
    await initializeWebpDecoder(wasm);
    trustedAssets = await deriveTrustedAssets();
  }, 60_000);

  afterEach(async () => {
    for (const repository of repositories) repository.close();
    repositories = [];
    await deleteDB(ARCHIVE_DATABASE_NAME);
  });

  it("binds every hidden repair URL and hash to one deterministically derived alpha.3 PNG", () => {
    expect(
      legacyStarterRepairSources
        .map((source) => ({ fileName: source.sourceUrl.slice(1), sha256: source.sourceAssetHash }))
        .sort((left, right) => left.fileName.localeCompare(right.fileName)),
    ).toEqual(
      expectedLegacyArchiveRepairFixtures
        .map((fixture) => ({ fileName: fixture.fileName, sha256: fixture.sha256 }))
        .sort((left, right) => left.fileName.localeCompare(right.fileName)),
    );
  });

  it("does not seed retained alpha.3 repair objects into a fresh alpha.4 Archive", async () => {
    const current = createStarterArchiveState();
    const archive = application();

    await archive.initialize(current, trustedAssets);

    closeRepositories();
    const evidence = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    const storedHashes = await evidence.getAllKeys(ARCHIVE_OBJECT_STORE);
    evidence.close();
    expect(storedHashes.sort()).toEqual(expectedArchiveFixtures.map((fixture) => fixture.sha256).sort());
  });

  it("repairs corrupt alpha.3 art for an earned memory from the retained trusted source", async () => {
    const current = createStarterArchiveState();
    const legacy = LEGACY_STARTER_VISUAL_LINEAGES[0];
    const record = current.records.find((candidate) => candidate.recordId === legacy.recordId);
    if (!record) throw new Error(`Missing starter record ${legacy.recordId}.`);
    const earnedLegacy = archiveStateSchema.parse({
      ...current,
      records: current.records.map((candidate) =>
        candidate.recordId === legacy.recordId
          ? {
              ...candidate,
              lifecycle: "earned",
              publishedVisual: legacy.publishedVisual,
              activation: {
                occurredStart: "2025-06-12",
                occurredEnd: "2025-06-12",
                recordedAt: "2026-08-25T12:00:00.000Z",
                activatedAt: "2026-08-25T12:00:00.000Z",
                visualPin: legacy.publishedVisual,
              },
            }
          : candidate,
      ),
    });
    const archive = application();
    await archive.initialize(earnedLegacy, trustedAssets);
    const recoveryInput = await createArchiveBackup(current, [], "2026-08-25T13:00:00.000Z");

    closeRepositories();
    const legacyAsset = trustedAssets.find((asset) => asset.hash === legacy.publishedVisual.sourceAssetHash);
    if (!legacyAsset) {
      throw new Error(`Missing trusted legacy source ${legacy.publishedVisual.sourceAssetHash}.`);
    }
    const corruptBytes = legacyAsset.bytes.slice();
    corruptBytes[25] ^= 0xff;
    const raw = await openDB(ARCHIVE_DATABASE_NAME, ARCHIVE_DATABASE_VERSION);
    await raw.put(ARCHIVE_OBJECT_STORE, { ...legacyAsset, bytes: corruptBytes }, legacyAsset.hash);
    raw.close();

    const reopened = application();
    const recovery = await reopened.recoverBackup(recoveryInput, current.ownerId, trustedAssets);

    expect(recovery.stateReplaced).toBe(false);
    expect(recovery.state).toEqual(earnedLegacy);
    expect(await reopened.visual(legacy.recordId)).toMatchObject({
      pin: legacy.publishedVisual,
      sourceAsset: legacyAsset,
    });
  }, 60_000);
});

function application() {
  const repository = new IndexedDbArchiveRepository();
  repositories.push(repository);
  return new ArchiveApplication(repository, { now: () => "2026-08-25T14:00:00.000Z" });
}

function closeRepositories() {
  for (const repository of repositories) repository.close();
  repositories = [];
}

async function deriveTrustedAssets() {
  return Promise.all(
    [...expectedArchiveFixtures, ...expectedLegacyArchiveRepairFixtures].map(async (fixture) => {
      const source = new Uint8Array(
        await readFile(path.join("packages/catalogue-fixtures/assets", fixture.sourceFileName)),
      );
      expect(source.byteLength).toBe(fixture.sourceByteLength);
      expect(sha256Hex(source)).toBe(fixture.sourceSha256);
      const decoded = await decodeWebp(exactArrayBuffer(source));
      const bytes = encodeCanonicalRgbaPng(decoded.data, decoded.width, decoded.height);
      expect(bytes.byteLength).toBe(fixture.outputByteLength);
      expect(sha256Hex(bytes)).toBe(fixture.sha256);
      return { hash: fixture.sha256, mimeType: "image/png", bytes };
    }),
  );
}

function installImageDataForNode() {
  if (globalThis.ImageData) return;
  Object.defineProperty(globalThis, "ImageData", {
    configurable: true,
    value: class ImageData {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    },
  });
}
