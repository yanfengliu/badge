// @vitest-environment happy-dom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoveryBadges } from "@badge/catalogue-fixtures/discovery";

import { DiscoveryView } from "./DiscoveryView.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const available = discoveryBadges.find((badge) => badge.availability === "available");
const sourceStudy = discoveryBadges.find((badge) => badge.availability === "source-study");

if (!available || !sourceStudy) throw new Error("Discovery interaction fixtures are incomplete.");
const searchableBadges = [available, sourceStudy] as const;

describe("DiscoveryView mounted interactions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it("opens collected and uncollected published records through separate actions", async () => {
    const prepared: Array<{ recordId: string; trigger: HTMLButtonElement }> = [];
    const replayed: string[] = [];
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={searchableBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query=""
          onSetChange={() => undefined}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={(recordId, trigger) => prepared.push({ recordId, trigger })}
          onOpenCollectedBadge={(recordId) => replayed.push(recordId)}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );

    const button = container.querySelector<HTMLButtonElement>(".discovery-card button");
    expect(button?.textContent).toContain("Prepare badge");
    await act(async () => button?.click());
    expect(prepared).toEqual([{ recordId: available.recordId, trigger: button }]);
    expect(replayed).toEqual([]);

    await act(async () =>
      root.render(
        <DiscoveryView
          badges={searchableBadges}
          collectedRecordIds={new Set([available.recordId])}
          resolvedSourceUrls={{ [available.recordId]: "blob:earned" }}
          selectedSetId={null}
          query=""
          onSetChange={() => undefined}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={(recordId, trigger) => prepared.push({ recordId, trigger })}
          onOpenCollectedBadge={(recordId) => replayed.push(recordId)}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );
    const replayButton = container.querySelector<HTMLButtonElement>(".discovery-card button");
    expect(replayButton?.textContent).toContain("View memory");
    await act(async () => replayButton?.click());
    expect(replayed).toEqual([available.recordId]);

    const sourceCard = [...container.querySelectorAll<HTMLElement>(".discovery-card")].find((card) =>
      card.textContent?.includes(sourceStudy.title),
    );
    expect(sourceCard?.querySelector("button")).toBeNull();
  });

  it("updates result state from search and availability controls", async () => {
    function SearchHarness() {
      const [query, setQuery] = useState("");
      return (
        <DiscoveryView
          badges={searchableBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query={query}
          onSetChange={() => undefined}
          onQueryChange={setQuery}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />
      );
    }
    await act(async () => root.render(<SearchHarness />));

    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error("Discovery search input is missing.");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "no badge has this phrase");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.textContent).toContain("No badges match this search.");

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.textContent).toContain(sourceStudy.title);
    expect(container.textContent).toContain(available.title);
    expect(container.textContent).toContain("2 results");
  });

  it("requests a controlled set change from the set browser", async () => {
    const requested: Array<string | null> = [];
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={discoveryBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query=""
          onSetChange={(setId) => requested.push(setId)}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );

    const parksButton = [...container.querySelectorAll<HTMLButtonElement>(".discovery-set-button")].find(
      (button) => button.textContent?.includes("U.S. National Parks"),
    );
    await act(async () => parksButton?.click());
    expect(requested).toEqual(["us-national-parks"]);
  });

  it("reveals at most 24 more results at a time and resets after the query changes", async () => {
    const manyBadges = Array.from({ length: 55 }, (_, index) => ({
      ...sourceStudy,
      discoveryId: `scale-study-${index}`,
      title: `Scale study ${index}`,
    }));

    function ScaleHarness() {
      const [query, setQuery] = useState("");
      return (
        <DiscoveryView
          badges={manyBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query={query}
          onSetChange={() => undefined}
          onQueryChange={setQuery}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />
      );
    }

    await act(async () => root.render(<ScaleHarness />));
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(24);

    const showMore = () =>
      [...container.querySelectorAll<HTMLButtonElement>(".discovery-pagination button")][0];
    expect(showMore()?.textContent).toContain("Show 24 more");
    await act(async () => showMore()?.click());
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(48);
    expect(showMore()?.textContent).toContain("Show 7 more");
    await act(async () => showMore()?.click());
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(55);
    expect(showMore()).toBeUndefined();

    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error("Discovery search input is missing.");
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setInput?.call(input, "Scale study 54");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(1);
    await act(async () => {
      setInput?.call(input, "");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(24);
    expect(showMore()?.textContent).toContain("Show 24 more");
  });
});
