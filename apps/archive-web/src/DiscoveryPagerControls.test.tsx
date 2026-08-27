// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DiscoveryPager } from "./discovery-pager";
import { DiscoveryPagerControls } from "./DiscoveryPagerControls";
import { discoveryPagerStepForKey, useDiscoveryPagerKeys } from "./use-discovery-pager-keys";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pager: DiscoveryPager = {
  contextTitle: "U.S. National Parks",
  currentTitle: "Badlands",
  index: 3,
  total: 63,
  previous: { recordId: "catalogue:visited-arches", title: "Arches" },
  next: { recordId: "catalogue:visited-big-bend", title: "Big Bend" },
};

const plainKey = {
  defaultPrevented: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};

describe("DiscoveryPagerControls", () => {
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

  it("steps to the exact neighbor badges and names them", async () => {
    const steps: string[] = [];
    await act(async () =>
      root.render(<DiscoveryPagerControls pager={pager} onStep={(step) => steps.push(step.recordId)} />),
    );

    expect(container.textContent).toContain("3 of 63");
    expect(container.textContent).toContain("U.S. National Parks");
    const previous = container.querySelector<HTMLButtonElement>('[aria-label="Previous badge: Arches"]');
    const next = container.querySelector<HTMLButtonElement>('[aria-label="Next badge: Big Bend"]');
    expect(previous?.getAttribute("aria-keyshortcuts")).toBe("ArrowLeft");
    expect(next?.getAttribute("aria-keyshortcuts")).toBe("ArrowRight");
    await act(async () => previous?.click());
    await act(async () => next?.click());
    expect(steps).toEqual(["catalogue:visited-arches", "catalogue:visited-big-bend"]);
  });

  it("keeps end-of-set buttons focusable but inert instead of dropping focus", async () => {
    const onStep = vi.fn();
    await act(async () =>
      root.render(<DiscoveryPagerControls pager={{ ...pager, index: 1, previous: null }} onStep={onStep} />),
    );

    const previous = container.querySelector<HTMLButtonElement>(
      '[aria-label="This is the first badge in this view"]',
    );
    expect(previous?.getAttribute("aria-disabled")).toBe("true");
    expect(previous?.disabled).toBe(false);
    await act(async () => previous?.click());
    expect(onStep).not.toHaveBeenCalled();
  });

  it("renders nothing when the view holds a single badge", async () => {
    await act(async () =>
      root.render(
        <DiscoveryPagerControls
          pager={{ ...pager, index: 1, total: 1, previous: null, next: null }}
          onStep={() => undefined}
        />,
      ),
    );
    expect(container.querySelector(".discovery-pager")).toBeNull();
  });

  it("moves between badges with plain arrow keys anywhere on the page", async () => {
    const steps: string[] = [];
    function Harness() {
      useDiscoveryPagerKeys(pager, (step) => steps.push(step.recordId));
      return <input type="text" aria-label="Note" />;
    }
    await act(async () => root.render(<Harness />));

    await act(async () =>
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })),
    );
    await act(async () =>
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })),
    );
    expect(steps).toEqual(["catalogue:visited-big-bend", "catalogue:visited-arches"]);

    const input = container.querySelector("input");
    await act(async () =>
      input?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })),
    );
    expect(steps).toHaveLength(2);
  });

  it("yields arrow keys to text fields, the engaged viewer, and modified shortcuts", () => {
    const input = document.createElement("input");
    const viewerViewport = document.createElement("div");
    viewerViewport.className = "badge-viewer__viewport";
    const insideViewer = document.createElement("span");
    viewerViewport.append(insideViewer);
    document.body.append(input, viewerViewport);

    expect(discoveryPagerStepForKey(pager, { ...plainKey, key: "ArrowRight" }, document.body)).toBe(
      pager.next,
    );
    expect(discoveryPagerStepForKey(pager, { ...plainKey, key: "ArrowLeft" }, document.body)).toBe(
      pager.previous,
    );
    expect(discoveryPagerStepForKey(null, { ...plainKey, key: "ArrowRight" }, document.body)).toBeNull();
    expect(discoveryPagerStepForKey(pager, { ...plainKey, key: "ArrowDown" }, document.body)).toBeNull();
    expect(discoveryPagerStepForKey(pager, { ...plainKey, key: "ArrowRight" }, input)).toBeNull();
    expect(discoveryPagerStepForKey(pager, { ...plainKey, key: "ArrowRight" }, insideViewer)).toBeNull();
    expect(
      discoveryPagerStepForKey(
        pager,
        { ...plainKey, key: "ArrowRight", defaultPrevented: true },
        document.body,
      ),
    ).toBeNull();
    expect(
      discoveryPagerStepForKey(pager, { ...plainKey, key: "ArrowRight", shiftKey: true }, document.body),
    ).toBeNull();
  });
});
