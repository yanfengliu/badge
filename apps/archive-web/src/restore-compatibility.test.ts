import { describe, expect, it } from "vitest";
import { MAX_ARCHIVE_BACKUP_BYTES } from "@badge/archive-application";
import { activateAchievement } from "@badge/archive-domain";

import { createStarterArchiveState } from "./archive-state.js";
import {
  assertArchiveBackupFileSize,
  assertCompatibleStarterArchive,
  assertCompatibleStarterCatalogue,
  requiresArchiveRecovery,
} from "./restore-compatibility.js";
import { LEGACY_STARTER_VISUAL_LINEAGES } from "./starter-visual-upgrade.js";

const expectedState = createStarterArchiveState();
const expectedRecords = expectedState.records;

describe("Archive restore catalogue compatibility", () => {
  it("rejects a backup that omits an unearned starter before restore confirmation", () => {
    const incoming = expectedRecords.slice(0, -1);

    expect(() => assertCompatibleStarterCatalogue(expectedRecords, incoming)).toThrow(
      /missing record IDs “starter:visited-all-us-national-parks”.*selected file was left untouched.*no Archive data was changed/i,
    );
    expect(incoming).toEqual(expectedRecords.slice(0, -1));
  });

  it("rejects a backup that would add a record this fixture UI cannot display", () => {
    const incoming = [...expectedRecords, { ...expectedRecords[0], recordId: "local:invisible-memory" }];

    expect(() => assertCompatibleStarterCatalogue(expectedRecords, incoming)).toThrow(
      /unexpected record IDs “local:invisible-memory”.*Choose a backup exported by this version/i,
    );
    expect(incoming).toHaveLength(expectedRecords.length + 1);
  });

  it("rejects a preexisting or restored state owned by a different local profile", () => {
    const incoming = { ...expectedState, ownerId: "another-local-owner" };

    expect(() => assertCompatibleStarterArchive(expectedState, incoming)).toThrow(
      /owner another-local-owner.*local-owner.*Archive stayed closed.*no Archive data was changed/i,
    );
  });

  it("rejects same-ID unearned records whose exact published lineage is stale", () => {
    const incoming = expectedRecords.map((record, index) =>
      index === 1
        ? {
            ...record,
            publishedVisual: {
              ...record.publishedVisual,
              packRef: { ...record.publishedVisual.packRef, packDigest: "a".repeat(64) },
              sourceAssetHash: "b".repeat(64),
            },
          }
        : record,
    );

    expect(() => assertCompatibleStarterCatalogue(expectedRecords, incoming)).toThrow(
      /incompatible unearned catalogue lineage.*starter:read-sapiens.*no Archive data was changed/i,
    );
  });

  it("accepts the one frozen alpha.3 unearned lineage for bounded upgrade to current", () => {
    const legacyById = new Map<string, (typeof LEGACY_STARTER_VISUAL_LINEAGES)[number]>(
      LEGACY_STARTER_VISUAL_LINEAGES.map((lineage) => [lineage.recordId, lineage]),
    );
    const incoming = {
      ...expectedState,
      records: expectedState.records.map((record, index) => ({
        ...record,
        publishedVisual: legacyById.get(record.recordId)!.publishedVisual,
        note: index === 0 ? "Keep this personal note through upgrade." : record.note,
        visibility: index === 0 ? ("private" as const) : record.visibility,
      })),
    };

    expect(() => assertCompatibleStarterArchive(expectedState, incoming)).not.toThrow();
    expect(incoming.records[0]!.publishedVisual.packRef.version).toBe("1.0.0-alpha.3");
    expect(incoming.records[0]!.note).toBe("Keep this personal note through upgrade.");
  });

  it("accepts an exact catalogue in any order and permits personal unearned state changes", () => {
    const incoming = [...expectedRecords]
      .reverse()
      .map((record, index) =>
        index === 0 ? { ...record, lifecycle: "planned" as const, note: "Someday." } : record,
      );

    expect(() => assertCompatibleStarterCatalogue(expectedRecords, incoming)).not.toThrow();
  });

  it("accepts earned historical wording and visual versions within the same identity lineage", () => {
    const earned = {
      ...expectedRecords[0],
      title: "A historical Yosemite title",
      criterion: "The criterion used when this memory was sealed",
      description: "Historical context preserved by the backup.",
      lifecycle: "earned" as const,
      publishedVisual: {
        ...expectedRecords[0].publishedVisual,
        packRef: {
          ...expectedRecords[0].publishedVisual.packRef,
          version: "0.8.0",
          packDigest: "a".repeat(64),
        },
        sourceAssetHash: "b".repeat(64),
      },
      activation: {
        occurredStart: "2024-06-10",
        occurredEnd: "2024-06-10",
        recordedAt: "2026-08-23T17:00:00.000Z",
        activatedAt: "2026-08-23T17:00:00.000Z",
        visualPin: {
          ...expectedRecords[0].publishedVisual,
          packRef: {
            ...expectedRecords[0].publishedVisual.packRef,
            version: "0.8.0",
            packDigest: "a".repeat(64),
          },
          sourceAssetHash: "b".repeat(64),
        },
      },
    };

    expect(() =>
      assertCompatibleStarterCatalogue(expectedRecords, [earned, ...expectedRecords.slice(1)]),
    ).not.toThrow();
  });

  it("rejects an earned record whose sealed saying is missing without rewriting it", () => {
    const expected = createStarterArchiveState();
    const earned = activateAchievement(
      expected,
      {
        recordId: expected.records[0]!.recordId,
        occurredStart: "2026-08-20",
        occurredEnd: "2026-08-20",
        note: null,
        visibility: "private",
        visualPin: expected.records[0]!.publishedVisual,
      },
      "2026-08-23T17:00:00.000Z",
    ).state;
    const earnedNull = {
      ...earned,
      records: earned.records.map((record) => ({ ...record, acceptedSaying: null })),
    };

    expect(() => assertCompatibleStarterArchive(expected, earnedNull)).toThrow(
      /earned records without their sealed quotation.*will not invent text after activation/i,
    );
    expect(earnedNull.records[0]!.acceptedSaying).toBeNull();
  });

  it("rejects an earned same-record rebind to an unrelated qualified definition or pack", () => {
    const earned = {
      ...expectedRecords[0],
      lifecycle: "earned" as const,
      definitionRef: { namespace: "pack" as const, packId: "unrelated.pack", definitionId: "lookalike" },
      publishedVisual: {
        ...expectedRecords[0].publishedVisual,
        packRef: { ...expectedRecords[0].publishedVisual.packRef, packId: "unrelated.pack" },
      },
    };

    expect(() =>
      assertCompatibleStarterCatalogue(expectedRecords, [earned, ...expectedRecords.slice(1)]),
    ).toThrow(/earned identity.*starter:visited-yosemite.*unrelated\.pack.*no Archive data was changed/i);
  });

  it("routes resolved earned-source damage through explicit recovery", () => {
    expect(requiresArchiveRecovery(false, "Archive source is corrupt")).toBe(true);
    expect(requiresArchiveRecovery(true, null)).toBe(true);
    expect(requiresArchiveRecovery(false, null)).toBe(false);
  });

  it("refuses an oversized backup before reading its bytes", () => {
    expect(() =>
      assertArchiveBackupFileSize({ name: "huge.badgearchive", size: MAX_ARCHIVE_BACKUP_BYTES + 1 }),
    ).toThrow(/huge\.badgearchive.*no larger than.*was not read.*no Archive data was changed/i);
  });
});
