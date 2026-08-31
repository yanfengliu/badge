// @vitest-environment happy-dom

import { act, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SurfaceLoadBoundary } from "./SurfaceLoadBoundary.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SurfaceLoadBoundary", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("turns a rejected surface chunk into an actionable surface-specific error", async () => {
    const retry = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const RejectedSurface = lazy(async () => {
      throw new Error("surface chunk request failed");
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SurfaceLoadBoundary surface="studio" onRetry={retry}>
          <Suspense fallback={<p>Opening…</p>}>
            <RejectedSurface />
          </Suspense>
        </SurfaceLoadBoundary>,
      );
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Badge Studio could not open");
    const button = container.querySelector<HTMLButtonElement>("button");
    expect(button?.textContent).toBe("Reload Badge");
    button?.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalled();

    await act(async () => root.unmount());
  });
});
