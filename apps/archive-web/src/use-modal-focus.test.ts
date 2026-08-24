import { describe, expect, it, vi } from "vitest";

import { restoreModalFocus, shouldDismissModalForKey, updateModalCloseHandler } from "./use-modal-focus.js";

describe("modal dismissal policy", () => {
  it("contains Escape while a destructive operation is busy", () => {
    expect(shouldDismissModalForKey("Escape", false)).toBe(false);
  });

  it("allows Escape only for an idle dismissible modal", () => {
    expect(shouldDismissModalForKey("Escape", true)).toBe(true);
    expect(shouldDismissModalForKey("Enter", true)).toBe(false);
  });

  it("updates the close handler across phase renders without moving focus", () => {
    const oldClose = vi.fn();
    const latestClose = vi.fn();
    const focus = vi.fn();
    const handlerRef = { current: oldClose };

    updateModalCloseHandler(handlerRef, latestClose);
    handlerRef.current();

    expect(oldClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledTimes(1);
    expect(focus).not.toHaveBeenCalled();
  });

  it("returns approval focus to the stable saying region instead of the disabled trigger", () => {
    const stableRegion = { focus: vi.fn() };
    const disabledGenerateButton = { focus: vi.fn() };

    restoreModalFocus(stableRegion, disabledGenerateButton);

    expect(stableRegion.focus).toHaveBeenCalledTimes(1);
    expect(disabledGenerateButton.focus).not.toHaveBeenCalled();
  });
});
