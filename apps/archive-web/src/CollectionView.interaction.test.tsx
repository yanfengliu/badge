// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { toExactVisualPin } from "@badge/archive-domain";

import { createStarterArchiveState, STARTER_RECORD_IDS } from "./archive-state.js";
import { CollectionView } from "./CollectionView.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function earnedState() {
  const state = createStarterArchiveState();
  return {
    ...state,
    records: state.records.map((record) =>
      record.recordId === STARTER_RECORD_IDS[0]
        ? {
            ...record,
            lifecycle: "earned" as const,
            activation: {
              occurredStart: "2024-05-14",
              occurredEnd: "2024-05-14",
              recordedAt: "2024-05-15T18:30:00.000Z",
              activatedAt: "2024-05-15T18:30:00.000Z",
              visualPin: toExactVisualPin(record.publishedVisual),
            },
          }
        : record,
    ),
  };
}

describe("CollectionView interactions", () => {
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

  it("replays a collected badge, expands its set, and browses that set", async () => {
    const replayed: string[] = [];
    const browsed: string[] = [];
    await act(async () =>
      root.render(
        <CollectionView
          state={earnedState()}
          sourceUrls={{ [STARTER_RECORD_IDS[0]!]: "blob:yosemite" }}
          onReplay={(recordId) => replayed.push(recordId)}
          onBrowseSet={(setId) => browsed.push(setId)}
          onShowDiscover={() => undefined}
        />,
      ),
    );

    const badge = container.querySelector<HTMLButtonElement>('[aria-label="Replay Yosemite activation"]');
    await act(async () => badge?.click());
    expect(replayed).toEqual([STARTER_RECORD_IDS[0]]);

    const disclosure = container.querySelector<HTMLButtonElement>(
      '[aria-label="Expand U.S. National Parks collected memories"]',
    );
    expect(disclosure?.getAttribute("aria-expanded")).toBe("false");
    await act(async () => disclosure?.click());
    expect(disclosure?.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Visit Yosemite National Park");

    const browse = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.trim() === "Browse set",
    );
    await act(async () => browse?.click());
    expect(browsed).toEqual(["us-national-parks"]);
  });

  it("searches collected memory and set copy without opening disclosures", async () => {
    await act(async () =>
      root.render(
        <CollectionView
          state={earnedState()}
          sourceUrls={{}}
          onReplay={() => undefined}
          onBrowseSet={() => undefined}
          onShowDiscover={() => undefined}
        />,
      ),
    );
    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error("Collection search input is missing.");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "sapiens");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });

    expect(container.textContent).toContain("No collected memories match this search.");
    expect(container.querySelector('[aria-expanded="true"]')).toBeNull();
  });
});
