import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

vi.mock("@badge/renderer-web", () => ({
  BadgeViewer: ({ presentation = "interactive" }: { presentation?: string }) => (
    <div data-testid="ceremony-viewer" data-presentation={presentation}>
      {presentation === "interactive" ? (
        <>
          <button type="button">Inspect object</button>
          <button type="button">Adjust light</button>
          <button type="button">Zoom in</button>
          <button type="button">Reset view</button>
        </>
      ) : null}
    </div>
  ),
}));

import { ActivationCeremony } from "./ActivationCeremony.js";

describe("ActivationCeremony", () => {
  it("keeps first-activation examination interactive", () => {
    const html = renderToStaticMarkup(
      <ActivationCeremony
        title="Yosemite"
        saying="A source-checked quotation."
        sourceUrl="blob:ceremony-art"
        recipe={DEFAULT_RENDER_RECIPE}
        accessibleDescription="A Yosemite badge."
        forceFallback={false}
        returnFocus={createRef<HTMLButtonElement>()}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain('data-testid="ceremony-viewer"');
    expect(html.match(/data-presentation="interactive"/gu)).toHaveLength(2);
    expect(html).not.toContain('data-presentation="single-turn"');
    expect(html).toContain("Inspect object");
    expect(html).toContain("Adjust light");
    expect(html).toContain("Zoom in");
    expect(html).toContain("Reset view");
    expect(html.match(/<button/gu)).toHaveLength(5);
    expect(html).toContain('aria-label="Close activation ceremony"');
  });
});
