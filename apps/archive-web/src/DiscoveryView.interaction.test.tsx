// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoveryBadges } from "@badge/catalogue-fixtures/discovery";

import { DiscoveryView } from "./DiscoveryView.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const available = discoveryBadges.find((badge) => badge.availability === "available");
const sourceStudy = discoveryBadges.find((badge) => badge.availability === "source-study");

if (!available || !sourceStudy) throw new Error("Discovery interaction fixtures are incomplete.");

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

  it("opens only the available record and keeps the source study non-actionable", async () => {
    const opened: string[] = [];
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={[available, sourceStudy]}
          onOpenAvailableBadge={(recordId) => opened.push(recordId)}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );

    const button = container.querySelector<HTMLButtonElement>(".discovery-card button");
    expect(button?.textContent).toContain("Open in Collection");
    await act(async () => button?.click());
    expect(opened).toEqual([available.recordId]);

    const sourceCard = [...container.querySelectorAll<HTMLElement>(".discovery-card")].find((card) =>
      card.textContent?.includes(sourceStudy.title),
    );
    expect(sourceCard?.querySelector("button")).toBeNull();
  });

  it("updates result state from search and availability controls", async () => {
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={[available, sourceStudy]}
          onOpenAvailableBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );

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
    const select = container.querySelector<HTMLSelectElement>("select");
    if (!select) throw new Error("Discovery availability filter is missing.");
    await act(async () => {
      select.value = "source-study";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.textContent).toContain(sourceStudy.title);
    expect(container.textContent).not.toContain(available.title);
    expect(container.textContent).toContain("1 result");
  });
});
