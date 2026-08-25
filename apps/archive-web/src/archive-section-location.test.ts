// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  archiveSectionFromHash,
  badgeHistoryIndex,
  ensureBadgeHistoryIndex,
  notifyArchiveSectionLocation,
  observeArchiveSectionLocation,
  observeArchiveSectionWrites,
  writeArchiveSectionHash,
} from "./archive-section-location.js";

describe("archive section location", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));

  it("accepts only navigable Archive section hashes", () => {
    expect(archiveSectionFromHash("#timeline")).toBe("timeline");
    expect(archiveSectionFromHash("#discover")).toBe("discover");
    expect(archiveSectionFromHash("#collection")).toBe("collection");
    expect(archiveSectionFromHash("#unknown")).toBe("collection");
    expect(archiveSectionFromHash("")).toBe("collection");
  });

  it("pushes canonical section entries and ignores the current location", () => {
    const pushState = vi.spyOn(window.history, "pushState");

    expect(ensureBadgeHistoryIndex()).toBe(0);
    expect(writeArchiveSectionHash("discover")).toBe(true);
    expect(window.location.hash).toBe("#discover");
    expect(badgeHistoryIndex(window.history.state)).toBe(1);
    expect(pushState).toHaveBeenCalledTimes(1);

    expect(writeArchiveSectionHash("discover")).toBe(false);
    expect(pushState).toHaveBeenCalledTimes(1);

    expect(writeArchiveSectionHash("collection")).toBe(true);
    expect(window.location.hash).toBe("");
    expect(badgeHistoryIndex(window.history.state)).toBe(2);
    expect(pushState).toHaveBeenCalledTimes(2);
  });

  it("adds an index without discarding state already attached to the current entry", () => {
    window.history.replaceState({ preserved: "value" }, "", "/");

    expect(ensureBadgeHistoryIndex(7)).toBe(7);
    expect(window.history.state).toMatchObject({ preserved: "value" });
    expect(badgeHistoryIndex(window.history.state)).toBe(7);
    expect(ensureBadgeHistoryIndex(99)).toBe(7);
  });

  it("keeps Archive pushes unindexed when the current entry has unknown ordering", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");

    expect(writeArchiveSectionHash("discover")).toBe(true);
    expect(window.location.hash).toBe("#discover");
    expect(window.history.state).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("synchronizes a different retained section without resetting a same-section round trip", () => {
    const changes: string[] = [];
    const writes: string[] = [];
    const stopObserving = observeArchiveSectionLocation((section) => changes.push(section));
    const stopObservingWrites = observeArchiveSectionWrites((section) => writes.push(section));

    expect(writeArchiveSectionHash("discover")).toBe(true);
    expect(changes).toEqual([]);
    expect(writes).toEqual(["discover"]);

    window.history.pushState({ __badgeHistoryIndex: 2 }, "", "/#studio");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(changes).toEqual([]);

    window.history.pushState({ __badgeHistoryIndex: 3 }, "", "/#timeline");
    notifyArchiveSectionLocation("timeline");
    expect(changes).toEqual(["timeline"]);
    expect(writes).toEqual(["discover"]);
    stopObserving();
    stopObservingWrites();

    window.history.replaceState({ __badgeHistoryIndex: 4 }, "", "/");
    const stopDisconnectedObserver = observeArchiveSectionLocation(() => undefined);
    stopDisconnectedObserver();
    window.history.pushState({ __badgeHistoryIndex: 5 }, "", "/#discover");
    const reconnectedChanges: string[] = [];
    const stopReconnectedObserver = observeArchiveSectionLocation((section) =>
      reconnectedChanges.push(section),
    );
    notifyArchiveSectionLocation("discover");
    expect(reconnectedChanges).toEqual(["discover"]);
    stopReconnectedObserver();
  });
});
