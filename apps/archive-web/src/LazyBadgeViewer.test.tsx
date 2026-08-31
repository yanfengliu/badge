// @vitest-environment happy-dom

import { act, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

import { BadgeViewerLoadBoundary, LazyBadgeViewer } from "./LazyBadgeViewer.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("LazyBadgeViewer", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it.each(["ceremony-viewer", "memory-replay__viewer", "timeline-badge-viewer"])(
    "preserves the %s layout contract while the renderer chunk loads",
    (className) => {
      const html = renderToStaticMarkup(
        <LazyBadgeViewer
          className={className}
          sourceUrl="blob:deferred-badge"
          recipe={DEFAULT_RENDER_RECIPE}
          accessibleDescription="A deferred badge."
        />,
      );

      expect(html).toContain(`class="badge-viewer ${className}"`);
      const template = document.createElement("template");
      template.innerHTML = html;
      const viewer = template.content.querySelector(`.badge-viewer.${className}`);
      expect(viewer?.querySelector(":scope > .badge-viewer__viewport.badge-viewer__deferred")).not.toBeNull();
      expect(html).toContain('data-presentation="interactive"');
    },
  );

  it("keeps a rejected renderer chunk inside the badge surface with a retry", async () => {
    const retry = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const RejectedRenderer = lazy(async () => {
      throw new Error("renderer chunk request failed");
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <BadgeViewerLoadBoundary className="memory-replay__viewer" presentation="single-turn" onRetry={retry}>
          <Suspense fallback={<p>Preparing…</p>}>
            <RejectedRenderer />
          </Suspense>
        </BadgeViewerLoadBoundary>,
      );
    });

    const viewer = container.querySelector<HTMLElement>(".badge-viewer");
    const alert = container.querySelector<HTMLElement>('[role="alert"]');
    expect(viewer?.classList.contains("memory-replay__viewer")).toBe(true);
    expect(viewer?.dataset.presentation).toBe("single-turn");
    expect(
      viewer?.querySelector(
        ":scope > .badge-viewer__viewport.badge-viewer__deferred.badge-viewer__viewport--passive",
      ),
    ).not.toBeNull();
    expect(alert?.textContent).toContain("The badge presentation could not load");
    container.querySelector<HTMLButtonElement>("button")?.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalled();

    await act(async () => root.unmount());
  });
});
