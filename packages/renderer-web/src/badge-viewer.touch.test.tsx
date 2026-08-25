// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

import type { ViewerState } from "./viewer-state";

const sceneProbe = vi.hoisted(() => ({
  current: null as null | { view: ViewerState },
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
}));

vi.mock("./capabilities", () => ({
  probeWebGL2UnlessForced: () => true,
}));

vi.mock("./scene", () => ({
  BadgeScene: (props: NonNullable<typeof sceneProbe.current>) => {
    sceneProbe.current = props;
    return <output data-testid="mock-scene" data-yaw={props.view.yaw} data-pitch={props.view.pitch} />;
  },
}));

import { BadgeViewer } from "./badge-viewer.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("BadgeViewer touch ownership", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
    sceneProbe.current = null;
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
  });

  async function dispatchPointer(
    target: Element,
    type: string,
    init: PointerEventInit & { pointerId: number; pointerType: string },
  ) {
    const event = new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });
    await act(async () => target.dispatchEvent(event));
    return event;
  }

  it("leaves vertical touch movement to page scroll, claims horizontal rotation, and releases afterward", async () => {
    await act(async () =>
      root.render(
        <BadgeViewer
          sourceUrl="blob:touch-art"
          recipe={DEFAULT_RENDER_RECIPE}
          accessibleDescription="A touch-test badge."
        />,
      ),
    );

    const viewport = container.querySelector<HTMLDivElement>(".badge-viewer__viewport");
    expect(viewport).not.toBeNull();
    if (!viewport) return;

    const captured = new Set<number>();
    const setPointerCapture = vi
      .spyOn(viewport, "setPointerCapture")
      .mockImplementation((pointerId) => captured.add(pointerId));
    vi.spyOn(viewport, "hasPointerCapture").mockImplementation((pointerId) => captured.has(pointerId));
    const releasePointerCapture = vi
      .spyOn(viewport, "releasePointerCapture")
      .mockImplementation((pointerId) => captured.delete(pointerId));

    const initialView = sceneProbe.current?.view;
    await dispatchPointer(viewport, "pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 120,
      clientY: 100,
    });
    expect(viewport.classList.contains("is-engaged")).toBe(false);
    expect(setPointerCapture).not.toHaveBeenCalled();

    const verticalMove = await dispatchPointer(viewport, "pointermove", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 123,
      clientY: 132,
    });
    expect(verticalMove.defaultPrevented).toBe(false);
    expect(viewport.classList.contains("is-engaged")).toBe(false);
    expect(sceneProbe.current?.view).toEqual(initialView);

    await dispatchPointer(viewport, "pointerdown", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 120,
      clientY: 100,
    });
    await dispatchPointer(viewport, "pointermove", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 154,
      clientY: 105,
    });
    expect(viewport.classList.contains("is-engaged")).toBe(true);
    expect(setPointerCapture).toHaveBeenCalledWith(2);
    expect(sceneProbe.current?.view.yaw).not.toBe(initialView?.yaw);
    expect(sceneProbe.current?.view.pitch).toBe(initialView?.pitch);

    await dispatchPointer(viewport, "pointermove", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 158,
      clientY: 125,
    });
    expect(sceneProbe.current?.view.pitch).not.toBe(initialView?.pitch);

    await dispatchPointer(viewport, "pointerup", {
      pointerId: 2,
      pointerType: "touch",
      clientX: 158,
      clientY: 125,
    });
    expect(viewport.classList.contains("is-engaged")).toBe(false);
    expect(releasePointerCapture).toHaveBeenCalledWith(2);

    for (const [pointerId, releaseType] of [
      [3, "pointercancel"],
      [4, "lostpointercapture"],
    ] as const) {
      await dispatchPointer(viewport, "pointerdown", {
        pointerId,
        pointerType: "touch",
        clientX: 120,
        clientY: 100,
      });
      await dispatchPointer(viewport, "pointermove", {
        pointerId,
        pointerType: "touch",
        clientX: 154,
        clientY: 105,
      });
      expect(viewport.classList.contains("is-engaged")).toBe(true);
      if (releaseType === "lostpointercapture") captured.delete(pointerId);
      await dispatchPointer(viewport, releaseType, {
        pointerId,
        pointerType: "touch",
        clientX: 154,
        clientY: 105,
      });
      expect(viewport.classList.contains("is-engaged")).toBe(false);
    }
  });

  it("keeps native vertical panning enabled even while the viewer is engaged", () => {
    const css = readFileSync(resolve(process.cwd(), "packages/renderer-web/src/badge-viewer.css"), "utf8");

    expect(css).toMatch(/\.badge-viewer__viewport\s*\{[^}]*touch-action:\s*pan-y pinch-zoom;/u);
    expect(css).not.toContain("touch-action: none");
    expect(css).toMatch(/\.badge-viewer__quiet-action\s*\{[^}]*min-inline-size:\s*44px;/u);
  });

  it("keeps mouse dragging and engaged keyboard inspection intact", async () => {
    await act(async () =>
      root.render(
        <BadgeViewer
          sourceUrl="blob:mouse-art"
          recipe={DEFAULT_RENDER_RECIPE}
          accessibleDescription="A mouse-test badge."
        />,
      ),
    );

    const viewport = container.querySelector<HTMLDivElement>(".badge-viewer__viewport");
    expect(viewport).not.toBeNull();
    if (!viewport) return;
    vi.spyOn(viewport, "setPointerCapture").mockImplementation(() => undefined);
    vi.spyOn(viewport, "hasPointerCapture").mockReturnValue(false);

    const initialView = sceneProbe.current?.view;
    await dispatchPointer(viewport, "pointerdown", {
      pointerId: 3,
      pointerType: "mouse",
      clientX: 100,
      clientY: 100,
    });
    expect(viewport.classList.contains("is-engaged")).toBe(true);
    expect(document.activeElement).toBe(viewport);
    await dispatchPointer(viewport, "pointermove", {
      pointerId: 3,
      pointerType: "mouse",
      clientX: 124,
      clientY: 116,
    });
    expect(sceneProbe.current?.view.yaw).not.toBe(initialView?.yaw);
    expect(sceneProbe.current?.view.pitch).not.toBe(initialView?.pitch);

    await dispatchPointer(viewport, "pointerup", {
      pointerId: 3,
      pointerType: "mouse",
      clientX: 124,
      clientY: 116,
    });
    expect(viewport.classList.contains("is-engaged")).toBe(true);
    const draggedYaw = sceneProbe.current?.view.yaw;
    await act(async () =>
      viewport.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "ArrowRight" }),
      ),
    );
    expect(sceneProbe.current?.view.yaw).not.toBe(draggedYaw);
  });
});
