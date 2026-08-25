import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

import { BadgeViewer } from "./badge-viewer.js";

describe("BadgeViewer single-turn presentation", () => {
  it("renders a passive fallback frame without inspection, scale, reset, or fallback-view controls", () => {
    const html = renderToStaticMarkup(
      <BadgeViewer
        sourceUrl="blob:ceremony-art"
        recipe={DEFAULT_RENDER_RECIPE}
        accessibleDescription="A Yosemite badge."
        presentation="single-turn"
        forceFallback
      />,
    );

    expect(html).toContain('data-presentation="single-turn"');
    expect(html).toContain('data-single-turn-state="static"');
    expect(html).toContain("A static badge is shown for this replay.");
    expect(html).not.toContain("Inspect object");
    expect(html).not.toContain("Adjust light");
    expect(html).not.toContain("Zoom");
    expect(html).not.toContain("Reset view");
    expect(html).not.toContain("Reset light");
    expect(html).not.toContain("Fallback view");
    expect(html).not.toContain("Try live 3D again");
    expect(html).not.toContain("<button");
  });

  it("keeps fallback inspection available in the ordinary interactive presentation", () => {
    const html = renderToStaticMarkup(
      <BadgeViewer
        sourceUrl="blob:detail-art"
        recipe={DEFAULT_RENDER_RECIPE}
        accessibleDescription="A Yosemite badge."
        forceFallback
      />,
    );

    expect(html).toContain('data-presentation="interactive"');
    expect(html).toContain('aria-label="Fallback view"');
    expect(html).toContain("Static inspection remains available.");
    expect(html.match(/<button/gu)).toHaveLength(3);
  });
});
