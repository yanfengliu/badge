import { describe, expect, it } from "vitest";
import { discoveryBadges, type DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

import { preparationDiscoveryPager, replayDiscoveryPager } from "./discovery-pager";

const parks = discoveryBadges.filter((badge) => badge.setIds.includes("us-national-parks"));
const study = discoveryBadges.find((badge) => badge.availability === "source-study");
if (parks.length < 3 || !study) throw new Error("Discovery pager fixtures are incomplete.");

function withSets(badge: DiscoveryBadge, discoveryId: string, setIds: readonly string[]): DiscoveryBadge {
  return { ...badge, discoveryId, recordId: `catalogue:${discoveryId}`, setIds };
}

describe("preparationDiscoveryPager", () => {
  it("orders the current set exactly as the Discover grid renders it", () => {
    const view = { selectedSetId: "us-national-parks", query: "" };
    const first = preparationDiscoveryPager(parks[0]!.recordId, view);
    const middle = preparationDiscoveryPager(parks[1]!.recordId, view);
    const last = preparationDiscoveryPager(parks.at(-1)!.recordId, view);

    expect(first).toMatchObject({
      contextTitle: "U.S. National Parks",
      currentTitle: parks[0]!.title,
      index: 1,
      total: parks.length,
      previous: null,
      next: { recordId: parks[1]!.recordId, title: parks[1]!.title },
    });
    expect(middle?.previous?.recordId).toBe(parks[0]!.recordId);
    expect(middle?.next?.recordId).toBe(parks[2]!.recordId);
    expect(last?.next).toBeNull();
    expect(last?.index).toBe(parks.length);
  });

  it("pages the complete catalogue when no set is selected", () => {
    const pager = preparationDiscoveryPager(discoveryBadges[0]!.recordId, {
      selectedSetId: null,
      query: "",
    });
    expect(pager?.total).toBe(discoveryBadges.length);
    expect(pager?.contextTitle).toBe("All created badges");
  });

  it("follows the active search filter so steps match the visible results", () => {
    const view = { selectedSetId: "us-national-parks", query: parks[1]!.title };
    const filtered = preparationDiscoveryPager(parks[1]!.recordId, view);
    expect(filtered?.total).toBeLessThan(parks.length);
    expect(filtered?.currentTitle).toBe(parks[1]!.title);
  });

  it("applies the region filter only to the Michelin dining set", () => {
    const bayArea = discoveryBadges.filter(
      (badge) => badge.setIds.includes("michelin-dining") && badge.regionId === "bay-area",
    );
    const regional = preparationDiscoveryPager(bayArea[0]!.recordId, {
      selectedSetId: "michelin-dining",
      query: "",
      regionId: "bay-area",
    });
    expect(regional?.total).toBe(bayArea.length);

    const parksIgnoreRegion = preparationDiscoveryPager(parks[0]!.recordId, {
      selectedSetId: "us-national-parks",
      query: "",
      regionId: "bay-area",
    });
    expect(parksIgnoreRegion?.total).toBe(parks.length);
  });

  it("returns null when the record is outside the current sequence", () => {
    expect(
      preparationDiscoveryPager("catalogue:not-a-real-badge", { selectedSetId: null, query: "" }),
    ).toBeNull();
    expect(
      preparationDiscoveryPager(parks[0]!.recordId, { selectedSetId: "books-read", query: "" }),
    ).toBeNull();
  });
});

describe("replayDiscoveryPager", () => {
  it("steps only through collected memories of the same set, in set order", () => {
    const collected = new Set([parks[0]!.recordId, parks[2]!.recordId, parks[4]!.recordId]);
    const pager = replayDiscoveryPager(parks[2]!.recordId, collected, "us-national-parks");
    expect(pager).toMatchObject({
      contextTitle: "Collected in U.S. National Parks",
      index: 2,
      total: 3,
      previous: { recordId: parks[0]!.recordId },
      next: { recordId: parks[4]!.recordId },
    });
  });

  it("prefers the browsed set for a badge that belongs to several sets", () => {
    const shared = withSets(study, "shared-study", ["us-states", "books-read"]);
    const stateNeighbor = withSets(study, "state-neighbor", ["us-states"]);
    const bookNeighbor = withSets(study, "book-neighbor", ["books-read"]);
    const badges = [stateNeighbor, shared, bookNeighbor];
    const collected = new Set(badges.map((badge) => badge.recordId));

    const browsed = replayDiscoveryPager(shared.recordId, collected, "books-read", badges);
    expect(browsed?.contextTitle).toBe("Collected in Books Read");
    expect(browsed?.next?.recordId).toBe(bookNeighbor.recordId);
    expect(browsed?.previous).toBeNull();

    const unbrowsed = replayDiscoveryPager(shared.recordId, collected, null, badges);
    expect(unbrowsed?.contextTitle).toBe("Collected in U.S. States");
    expect(unbrowsed?.previous?.recordId).toBe(stateNeighbor.recordId);
  });

  it("reports a single collected memory without inventing neighbors", () => {
    const pager = replayDiscoveryPager(parks[0]!.recordId, new Set([parks[0]!.recordId]), null);
    expect(pager).toMatchObject({ index: 1, total: 1, previous: null, next: null });
  });

  it("returns null for a record with no discovery badge", () => {
    expect(replayDiscoveryPager("catalogue:unknown", new Set(["catalogue:unknown"]), null)).toBeNull();
  });
});
