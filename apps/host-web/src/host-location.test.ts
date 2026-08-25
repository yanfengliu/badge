// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  badgeHistoryIndex,
  ensureBadgeHistoryIndex,
} from "../../archive-web/src/archive-section-location.js";
import {
  hostDestinationFromHash,
  hostDestinationUrl,
  pushUnindexedHostDestination,
  traverseToHostHistoryIndex,
  writeHostDestination,
} from "./host-location.js";

describe("single-root host location", () => {
  beforeEach(() => window.history.replaceState(null, "", "/?fallback"));
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["", "collection"],
    ["#timeline", "timeline"],
    ["#discover", "discover"],
    ["#studio", "studio"],
    ["#unknown", "collection"],
  ] as const)("maps %s to %s", (hash, destination) => {
    expect(hostDestinationFromHash(hash)).toBe(destination);
  });

  it("keeps every destination on the root pathname and preserves runtime query state", () => {
    expect(hostDestinationUrl("http://127.0.0.1:4180/old?fallback#discover", "studio")).toBe(
      "http://127.0.0.1:4180/?fallback#studio",
    );
    expect(hostDestinationUrl("http://127.0.0.1:4180/?fallback#studio", "collection")).toBe(
      "http://127.0.0.1:4180/?fallback",
    );
  });

  it("pushes one history entry only when the destination changes", () => {
    expect(ensureBadgeHistoryIndex()).toBe(0);
    expect(writeHostDestination("studio")).toBe(true);
    expect(window.location.pathname).toBe("/");
    expect(window.location.hash).toBe("#studio");
    expect(badgeHistoryIndex(window.history.state)).toBe(1);
    expect(writeHostDestination("studio")).toBe(false);
  });

  it("can restore Studio after an unindexed destination without rewriting that destination", () => {
    expect(ensureBadgeHistoryIndex()).toBe(0);
    window.history.pushState(null, "", "/#discover");

    expect(writeHostDestination("studio", "push", 0)).toBe(true);
    expect(window.location.hash).toBe("#studio");
    expect(badgeHistoryIndex(window.history.state)).toBe(1);
  });

  it("pushes an unindexed restoration without modifying the unknown destination", () => {
    window.history.replaceState({ preserved: "destination" }, "", "/#discover");
    const replaceState = vi.spyOn(window.history, "replaceState");

    expect(pushUnindexedHostDestination("studio")).toBe(true);
    expect(window.location.hash).toBe("#studio");
    expect(window.history.state).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("uses the exact direction and distance needed to restore a committed entry", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    const forward = vi.spyOn(window.history, "forward").mockImplementation(() => undefined);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);

    traverseToHostHistoryIndex(4, 3);
    expect(forward).toHaveBeenCalledOnce();
    traverseToHostHistoryIndex(3, 4);
    expect(back).toHaveBeenCalledOnce();
    traverseToHostHistoryIndex(7, 3);
    expect(go).toHaveBeenLastCalledWith(4);
    traverseToHostHistoryIndex(2, 6);
    expect(go).toHaveBeenLastCalledWith(-4);
  });
});
