import { renderToStaticMarkup } from "react-dom/server";
import { Children, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { StudioHeader } from "./StudioHeader.js";

describe("StudioHeader", () => {
  it("keeps Badge Studio inside the same four-destination primary navigation", () => {
    const html = renderToStaticMarkup(<StudioHeader onSectionChange={() => undefined} />);

    expect(html.match(/class="studio-nav__link/gu)).toHaveLength(4);
    expect(html).toMatch(/<button[^>]*id="studio-section-collection"[^>]*>Collection<\/button>/u);
    expect(html).toMatch(/<button[^>]*id="studio-section-timeline"[^>]*>Timeline<\/button>/u);
    expect(html).toMatch(/<button[^>]*id="studio-section-discover"[^>]*>Discover<\/button>/u);
    expect(html).toMatch(
      /<button[^>]*id="studio-section-studio"[^>]*aria-current="page"[^>]*>Badge Studio<\/button>/u,
    );
    expect(html).not.toContain("Return to Archive");
    expect(html).not.toContain("/studio/");
  });

  it("requests an Archive section without owning route or persistence state", () => {
    const requested: string[] = [];
    const tree = StudioHeader({ onSectionChange: (section) => requested.push(section) });
    const nav = Children.toArray((tree.props as { children: ReactNode }).children)[1];
    if (!isValidElement<{ children: ReactNode }>(nav)) throw new Error("Studio nav is missing.");
    const discover = Children.toArray(nav.props.children)[2];
    if (!isValidElement<{ onClick: () => void }>(discover)) throw new Error("Discover control is missing.");

    discover.props.onClick();
    expect(requested).toEqual(["discover"]);
  });

  it("disables every primary destination while a required draft flush is in flight", () => {
    const html = renderToStaticMarkup(<StudioHeader disabled onSectionChange={() => undefined} />);

    expect(html.match(/<button[^>]*disabled=""/gu)).toHaveLength(4);
  });
});
