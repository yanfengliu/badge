import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

import { BadgePreview } from "./badge-preview.js";

describe("BadgePreview", () => {
  it("renders a recipe-shaped artifact without a live canvas or controls", () => {
    const html = renderToStaticMarkup(
      <BadgePreview
        className="test-preview"
        sourceUrl="blob:frozen-art"
        recipe={DEFAULT_RENDER_RECIPE}
        accessibleDescription="A bronze Yosemite badge."
      />,
    );

    expect(html).toContain("badge-preview test-preview badge-material--metal");
    expect(html).toContain('data-badge-shape="circle"');
    expect(html).toContain('data-badge-material="metal"');
    expect(html).toContain('aria-label="Badge artifact: A bronze Yosemite badge."');
    expect(html).toContain("badge-shape--circle");
    expect(html).toContain('src="blob:frozen-art"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain("--badge-border-color:#b87333");
    expect(html).toContain("--badge-inner-size:92%");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("<button");
  });
});
