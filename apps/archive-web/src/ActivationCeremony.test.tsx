import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";

vi.mock("@badge/renderer-web", () => ({
  BadgeViewer: ({ presentation }: { presentation?: string }) => (
    <div data-testid="ceremony-viewer" data-presentation={presentation} />
  ),
}));

import { ActivationCeremony } from "./ActivationCeremony.js";

describe("ActivationCeremony", () => {
  it.each(["interactive", "single-turn"] as const)(
    "passes the %s presentation through to its viewer",
    (presentation) => {
      const html = renderToStaticMarkup(
        <ActivationCeremony
          title="Yosemite"
          saying="A source-checked quotation."
          sourceUrl="blob:ceremony-art"
          recipe={DEFAULT_RENDER_RECIPE}
          accessibleDescription="A Yosemite badge."
          forceFallback={false}
          presentation={presentation}
          returnFocus={createRef<HTMLButtonElement>()}
          onClose={() => undefined}
        />,
      );

      expect(html).toContain('data-testid="ceremony-viewer"');
      expect(html.match(new RegExp(`data-presentation="${presentation}"`, "gu"))).toHaveLength(2);
      expect(html.match(/<button/gu)).toHaveLength(1);
      expect(html).toContain('aria-label="Close activation ceremony"');
    },
  );
});
