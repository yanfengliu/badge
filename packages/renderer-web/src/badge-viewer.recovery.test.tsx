// @vitest-environment happy-dom

import { StrictMode, type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

import { INITIAL_VIEWER_STATE, type ViewerState } from "./viewer-state";

const sceneProbe = vi.hoisted(() => ({
  current: null as null | {
    view: ViewerState;
    onRendererFailure: (reason: string) => void;
    onTextureReady: () => void;
  },
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({
    children,
    role,
    "aria-label": ariaLabel,
  }: {
    children?: ReactNode;
    role?: string;
    "aria-label"?: string;
  }) => (
    <div data-testid="mock-canvas" role={role} aria-label={ariaLabel}>
      {children}
    </div>
  ),
}));

vi.mock("./capabilities", () => ({
  probeWebGL2UnlessForced: () => true,
}));

vi.mock("./scene", () => ({
  BadgeScene: (props: NonNullable<typeof sceneProbe.current>) => {
    sceneProbe.current = props;
    return <output data-testid="mock-scene" data-yaw={props.view.yaw} />;
  },
}));

import { BadgeViewer } from "./badge-viewer.js";
import { SINGLE_TURN_DURATION_MS } from "./single-turn";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("BadgeViewer single-turn recovery", () => {
  let container: HTMLDivElement;
  let root: Root;
  let nextFrameId: number;
  let frames: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
    sceneProbe.current = null;
    nextFrameId = 1;
    frames = new Map();
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = nextFrameId;
      nextFrameId += 1;
      frames.set(id, callback);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
  });

  async function runNextFrame(timestamp: number) {
    const frame = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!frame) throw new Error(`No animation frame was scheduled for timestamp ${timestamp}.`);
    frames.delete(frame[0]);
    await act(async () => frame[1](timestamp));
  }

  it("resets before automatic renderer recovery and starts the replacement turn from rest", async () => {
    await act(async () =>
      root.render(
        <StrictMode>
          <BadgeViewer
            sourceUrl="blob:recovery-art"
            recipe={DEFAULT_RENDER_RECIPE}
            accessibleDescription="A recovery-test badge."
            presentation="single-turn"
          />
        </StrictMode>,
      ),
    );

    const image = container.querySelector('[role="img"]');
    const loadingStatus = container.querySelector('[role="status"]');
    expect(image?.getAttribute("aria-label")).toBe("3D badge presentation: A recovery-test badge.");
    expect(image?.contains(loadingStatus)).toBe(false);

    await act(async () => sceneProbe.current?.onTextureReady());
    await runNextFrame(100);
    await runNextFrame(100 + SINGLE_TURN_DURATION_MS / 2);
    expect(sceneProbe.current?.view.yaw).not.toBe(INITIAL_VIEWER_STATE.yaw);

    const interruptedScene = sceneProbe.current;
    await act(async () => interruptedScene?.onRendererFailure("Simulated graphics-context loss."));
    expect(sceneProbe.current?.view.yaw).toBe(INITIAL_VIEWER_STATE.yaw);
    expect(container.querySelector(".badge-viewer")?.getAttribute("data-single-turn-state")).toBe("waiting");
    expect(frames.size).toBe(0);

    await act(async () => sceneProbe.current?.onTextureReady());
    expect(frames.size).toBe(1);
    await runNextFrame(3_000);
    expect(sceneProbe.current?.view.yaw).toBe(INITIAL_VIEWER_STATE.yaw);
    await runNextFrame(3_000 + SINGLE_TURN_DURATION_MS);
    expect(container.querySelector(".badge-viewer")?.getAttribute("data-single-turn-state")).toBe("complete");
    expect(frames.size).toBe(0);
  });
});
