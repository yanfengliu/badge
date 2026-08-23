import { describe, expect, it, vi } from "vitest";

import { addViewerWheelListener } from "./wheel-listener";

describe("viewer wheel ownership", () => {
  it("uses a non-passive native listener and captures scrolling only while engaged", () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const target = { addEventListener, removeEventListener } as unknown as HTMLElement;
    let engaged = false;
    const onCapturedWheel = vi.fn();
    const cleanup = addViewerWheelListener(target, () => engaged, onCapturedWheel);

    expect(addEventListener).toHaveBeenCalledOnce();
    expect(addEventListener).toHaveBeenCalledWith("wheel", expect.any(Function), {
      passive: false,
    });

    const listener = addEventListener.mock.calls[0]![1] as (event: WheelEvent) => void;
    const disengagedEvent = { preventDefault: vi.fn() } as unknown as WheelEvent;
    listener(disengagedEvent);
    expect(disengagedEvent.preventDefault).not.toHaveBeenCalled();
    expect(onCapturedWheel).not.toHaveBeenCalled();

    engaged = true;
    const engagedEvent = { preventDefault: vi.fn() } as unknown as WheelEvent;
    listener(engagedEvent);
    expect(engagedEvent.preventDefault).toHaveBeenCalledOnce();
    expect(onCapturedWheel).toHaveBeenCalledWith(engagedEvent);

    cleanup();
    expect(removeEventListener).toHaveBeenCalledWith("wheel", listener);
  });
});
