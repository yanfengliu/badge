import { describe, expect, it } from "vitest";
import { toExactVisualPin, type ArchiveState } from "@badge/archive-domain";

import { createStarterArchiveState, STARTER_RECORD_IDS } from "./archive-state.js";
import {
  buildCollectionShelves,
  collectionStats,
  filterCollectionShelves,
  replaySetLinks,
} from "./collection-view-model.js";

function earn(
  state: ArchiveState,
  recordId: string,
  occurredStart: string,
  occurredEnd: string,
  activatedAt: string,
): ArchiveState {
  return {
    ...state,
    records: state.records.map((record) =>
      record.recordId === recordId
        ? {
            ...record,
            lifecycle: "earned" as const,
            activation: {
              occurredStart,
              occurredEnd,
              recordedAt: activatedAt,
              activatedAt,
              visualPin: toExactVisualPin(record.publishedVisual),
            },
          }
        : record,
    ),
  };
}

describe("collection view model", () => {
  it("builds only represented shelves from earned records and uses complete Discover set totals", () => {
    const state = earn(
      createStarterArchiveState(),
      STARTER_RECORD_IDS[0]!,
      "2024-05-14",
      "2024-05-14",
      "2024-05-15T18:30:00.000Z",
    );

    const shelves = buildCollectionShelves(state);

    expect(shelves).toHaveLength(1);
    expect(shelves[0]).toMatchObject({
      setId: "us-national-parks",
      title: "U.S. National Parks",
      totalCount: 64,
      collectedCount: 1,
    });
    expect(shelves[0]?.records.map((record) => record.recordId)).toEqual([STARTER_RECORD_IDS[0]]);
    expect(shelves[0]?.records.some((record) => record.lifecycle !== "earned")).toBe(false);
    expect(shelves.every((shelf) => shelf.collectedCount > 0 && shelf.records.length > 0)).toBe(true);
  });

  it("does not turn every discoverable set into an empty Collection shelf", () => {
    expect(buildCollectionShelves(createStarterArchiveState())).toEqual([]);
  });

  it("counts records globally while counting every qualified set membership", () => {
    let state = earn(
      createStarterArchiveState(),
      STARTER_RECORD_IDS[0]!,
      "2019-07-04",
      "2019-07-04",
      "2020-01-01T10:00:00.000Z",
    );
    state = earn(state, STARTER_RECORD_IDS[1]!, "2024-02-10", "2024-02-11", "2024-02-12T09:15:00.000Z");
    const second = state.records.find((record) => record.recordId === STARTER_RECORD_IDS[1]);
    if (!second) throw new Error("Expected the second starter record.");
    state = {
      ...state,
      records: state.records.map((record) =>
        record.recordId === second.recordId
          ? {
              ...record,
              collectionRefs: [
                ...record.collectionRefs,
                { namespace: "pack" as const, packId: "another.pack", collectionId: "books-read" },
              ],
            }
          : record,
      ),
    };

    const stats = collectionStats(state);

    expect(stats.collectedCount).toBe(2);
    expect(stats.setCount).toBe(3);
    expect(stats.yearsLabel).toBe("2019–2024");
    expect(stats.latestRecord?.recordId).toBe(STARTER_RECORD_IDS[1]);
  });

  it("keeps fallback memberships visibly qualified while canonical starter sets stay friendly", () => {
    let state = earn(
      createStarterArchiveState(),
      STARTER_RECORD_IDS[0]!,
      "2024-05-14",
      "2024-05-14",
      "2024-05-15T18:30:00.000Z",
    );
    const earned = state.records.find((record) => record.recordId === STARTER_RECORD_IDS[0]);
    if (!earned) throw new Error("Expected the earned starter record.");
    state = {
      ...state,
      records: state.records.map((record) =>
        record.recordId === earned.recordId
          ? {
              ...record,
              collectionRefs: [
                ...record.collectionRefs,
                { namespace: "local" as const, collectionId: "field-notes" },
                {
                  namespace: "pack" as const,
                  packId: "archive.one",
                  collectionId: "field-notes",
                },
                {
                  namespace: "pack" as const,
                  packId: "archive.two",
                  collectionId: "field-notes",
                },
              ],
            }
          : record,
      ),
    };
    const qualifiedTitles = [
      "Field Notes · Local",
      "Field Notes · Pack archive.one",
      "Field Notes · Pack archive.two",
    ];

    const shelves = buildCollectionShelves(state);
    const links = replaySetLinks(state.records.find((record) => record.recordId === earned.recordId)!);

    expect(shelves.find((shelf) => shelf.setId === "us-national-parks")?.title).toBe("U.S. National Parks");
    expect(
      shelves.filter((shelf) => shelf.title.startsWith("Field Notes")).map((shelf) => shelf.title),
    ).toEqual(qualifiedTitles);
    expect(links.map((link) => link.title)).toEqual(["U.S. National Parks", ...qualifiedTitles]);
    expect(new Set(links.map((link) => link.title)).size).toBe(links.length);
  });

  it("keeps disclosure-independent search scoped to set and collected badge copy", () => {
    let state = earn(
      createStarterArchiveState(),
      STARTER_RECORD_IDS[0]!,
      "2024-05-14",
      "2024-05-14",
      "2024-05-15T18:30:00.000Z",
    );
    state = earn(state, STARTER_RECORD_IDS[1]!, "2024-06-01", "2024-06-01", "2024-06-02T08:00:00.000Z");
    const shelves = buildCollectionShelves(state);

    expect(filterCollectionShelves(shelves, "national PARKS").map((shelf) => shelf.setId)).toEqual([
      "us-national-parks",
    ]);
    expect(filterCollectionShelves(shelves, "sapiens")[0]?.records.map((record) => record.title)).toEqual([
      "Read Sapiens",
    ]);
    expect(filterCollectionShelves(shelves, "nothing matches this")).toEqual([]);
  });
});
