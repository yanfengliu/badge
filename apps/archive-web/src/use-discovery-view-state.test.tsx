// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useDiscoveryViewState } from "./use-discovery-view-state";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type DiscoveryViewState = ReturnType<typeof useDiscoveryViewState>;

describe("useDiscoveryViewState return origin", () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: DiscoveryViewState;

  function Probe() {
    current = useDiscoveryViewState();
    return null;
  }

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
    await act(async () => root.render(<Probe />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it("remembers which section handed the user into Discover", async () => {
    await act(async () => current.browseSet("us-national-parks", "collection"));
    expect(current.returnSection).toBe("collection");
    expect(current.viewProps.selectedSetId).toBe("us-national-parks");

    await act(async () => current.enterDiscover("timeline"));
    expect(current.returnSection).toBe("timeline");
  });

  it("keeps the original origin while the user keeps browsing inside Discover", async () => {
    await act(async () => current.browseSet("us-national-parks", "collection"));
    await act(async () => current.browseSet("books-read", "discover"));
    expect(current.returnSection).toBe("collection");
    expect(current.viewProps.selectedSetId).toBe("books-read");
  });

  it("forgets the origin on direct entry or when the user leaves Discover", async () => {
    await act(async () => current.browseSet("us-national-parks", "collection"));
    await act(async () => current.enterDiscover());
    expect(current.returnSection).toBeNull();

    await act(async () => current.browseSet("us-national-parks", "timeline"));
    await act(async () => current.clearReturn());
    expect(current.returnSection).toBeNull();
  });
});
