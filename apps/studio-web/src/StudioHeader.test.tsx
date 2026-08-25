import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StudioHeader } from "./StudioHeader.js";

describe("StudioHeader", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps Badge Studio inside the same four-destination primary navigation", () => {
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:4173/studio/" } });
    const html = renderToStaticMarkup(<StudioHeader />);

    expect(html.match(/class="studio-nav__link/gu)).toHaveLength(4);
    expect(html).toContain('href="http://127.0.0.1:4173/"');
    expect(html).toContain('href="http://127.0.0.1:4173/#timeline"');
    expect(html).toContain('href="http://127.0.0.1:4173/#discover"');
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Badge Studio<\/a>/u);
    expect(html).not.toContain("Return to Archive");
  });
});
