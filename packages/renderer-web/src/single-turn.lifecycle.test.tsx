// @vitest-environment happy-dom

import { StrictMode, useCallback, useState } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INITIAL_VIEWER_STATE, type ViewerState } from "./viewer-state";
import { SINGLE_TURN_DURATION_MS, useReducedMotion, useSingleTurn } from "./single-turn";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface HarnessProps {
  ready: boolean;
  reducedMotion?: boolean;
}

function Harness({ ready, reducedMotion = false }: HarnessProps) {
  const [view, setView] = useState<ViewerState>(INITIAL_VIEWER_STATE);
  const state = useSingleTurn({
    enabled: true,
    fallback: false,
    ready,
    reducedMotion,
    sessionIdentity: "test-session",
    setView,
  });

  return <output data-state={state} data-yaw={view.yaw} />;
}

function MotionPreferenceHarness() {
  const [view, setView] = useState<ViewerState>(INITIAL_VIEWER_STATE);
  const resetPose = useCallback(() => setView(INITIAL_VIEWER_STATE), []);
  const reducedMotion = useReducedMotion(resetPose);
  const state = useSingleTurn({
    enabled: true,
    fallback: false,
    ready: true,
    reducedMotion,
    sessionIdentity: "motion-preference-session",
    setView,
  });

  return <output data-state={state} data-yaw={view.yaw} />;
}

class TestMotionQuery extends EventTarget {
  matches = false;
  readonly media = "(prefers-reduced-motion: reduce)";
  onchange = null;

  setMatches(matches: boolean) {
    this.matches = matches;
    const event = new Event("change") as MediaQueryListEvent;
    Object.defineProperty(event, "matches", { value: matches });
    this.dispatchEvent(event);
  }
}

describe("single-turn animation lifecycle", () => {
  let container: HTMLDivElement;
  let root: Root;
  let nextFrameId: number;
  let frames: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
    nextFrameId = 1;
    frames = new Map();
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

  async function render(props: HarnessProps) {
    await act(async () =>
      root.render(
        <StrictMode>
          <Harness {...props} />
        </StrictMode>,
      ),
    );
  }

  async function runNextFrame(timestamp: number) {
    const frame = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!frame) throw new Error(`No animation frame was scheduled for timestamp ${timestamp}.`);
    frames.delete(frame[0]);
    await act(async () => frame[1](timestamp));
  }

  it("waits for readiness, runs one frame chain, holds, and cancels on unmount", async () => {
    await render({ ready: false });
    expect(frames.size).toBe(0);
    expect(container.querySelector("output")?.dataset.state).toBe("waiting");

    await render({ ready: true });
    expect(frames.size).toBe(1);
    expect(container.querySelector("output")?.dataset.state).toBe("waiting");

    await runNextFrame(100);
    expect(frames.size).toBe(1);
    expect(container.querySelector("output")?.dataset.state).toBe("running");
    await runNextFrame(100 + SINGLE_TURN_DURATION_MS);

    const output = container.querySelector("output");
    expect(output?.dataset.state).toBe("complete");
    expect(Number(output?.dataset.yaw)).toBe(INITIAL_VIEWER_STATE.yaw + Math.PI * 2);
    expect(frames.size).toBe(0);

    await render({ ready: true });
    expect(frames.size).toBe(0);

    await render({ ready: false });
    await render({ ready: true });
    expect(frames.size).toBe(1);
    await act(async () => root.unmount());
    expect(frames.size).toBe(0);
    root = createRoot(container);
  });

  it("schedules no turn when reduced motion is requested", async () => {
    await render({ ready: true, reducedMotion: true });

    const output = container.querySelector("output");
    expect(output?.dataset.state).toBe("reduced-motion");
    expect(Number(output?.dataset.yaw)).toBe(INITIAL_VIEWER_STATE.yaw);
    expect(frames.size).toBe(0);
  });

  it("returns to rest when reduced motion is enabled mid-turn and restarts cleanly when disabled", async () => {
    const query = new TestMotionQuery();
    vi.spyOn(window, "matchMedia").mockReturnValue(query as unknown as MediaQueryList);
    await act(async () =>
      root.render(
        <StrictMode>
          <MotionPreferenceHarness />
        </StrictMode>,
      ),
    );

    await runNextFrame(100);
    await runNextFrame(100 + SINGLE_TURN_DURATION_MS / 2);
    expect(Number(container.querySelector("output")?.dataset.yaw)).not.toBe(INITIAL_VIEWER_STATE.yaw);

    await act(async () => query.setMatches(true));
    expect(container.querySelector("output")?.dataset.state).toBe("reduced-motion");
    expect(Number(container.querySelector("output")?.dataset.yaw)).toBe(INITIAL_VIEWER_STATE.yaw);
    expect(frames.size).toBe(0);

    await act(async () => query.setMatches(false));
    expect(frames.size).toBe(1);
    await runNextFrame(3_000);
    expect(Number(container.querySelector("output")?.dataset.yaw)).toBe(INITIAL_VIEWER_STATE.yaw);
    await runNextFrame(3_000 + SINGLE_TURN_DURATION_MS);
    expect(container.querySelector("output")?.dataset.state).toBe("complete");
    expect(frames.size).toBe(0);
  });

  it("observes a reduced-motion change that occurs while the subscription is attaching", async () => {
    const query = new TestMotionQuery();
    vi.spyOn(query, "addEventListener").mockImplementation((type, listener, options) => {
      query.matches = true;
      EventTarget.prototype.addEventListener.call(query, type, listener, options);
    });
    vi.spyOn(window, "matchMedia").mockReturnValue(query as unknown as MediaQueryList);
    await act(async () =>
      root.render(
        <StrictMode>
          <MotionPreferenceHarness />
        </StrictMode>,
      ),
    );

    expect(container.querySelector("output")?.dataset.state).toBe("reduced-motion");
    expect(Number(container.querySelector("output")?.dataset.yaw)).toBe(INITIAL_VIEWER_STATE.yaw);
    expect(frames.size).toBe(0);
  });
});
