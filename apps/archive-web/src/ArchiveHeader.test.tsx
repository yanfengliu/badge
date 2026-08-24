import { renderToStaticMarkup } from "react-dom/server";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchiveHeader } from "./ArchiveHeader.js";
import { ArchiveSectionNav } from "./ArchiveSectionNav.js";

describe("ArchiveHeader", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders both Archive sections as enabled navigation and marks the active one", () => {
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:4173/" } });
    const html = renderToStaticMarkup(
      <ArchiveHeader
        activeSection="timeline"
        onSectionChange={() => undefined}
        onBackup={() => undefined}
        onRestore={() => undefined}
      />,
    );

    expect(html).toMatch(/<button[^>]*>Collection<\/button>/u);
    expect(html).toMatch(/<button[^>]*aria-current="page"[^>]*>Timeline<\/button>/u);
    expect(html).toContain('id="archive-section-collection"');
    expect(html).not.toContain("disabled");
    expect(html).not.toContain("coming in a later slice");
  });

  it("wires the Timeline button to section navigation", () => {
    const requested: string[] = [];
    const nav = ArchiveSectionNav({
      activeSection: "collection",
      onSectionChange: (section) => requested.push(section),
    }) as ReactElement<{ children: ReactNode }>;
    const timelineButton = Children.toArray(nav.props.children)[1];

    expect(isValidElement<{ onClick: () => void }>(timelineButton)).toBe(true);
    if (isValidElement<{ onClick: () => void }>(timelineButton)) timelineButton.props.onClick();
    expect(requested).toEqual(["timeline"]);
  });
});
