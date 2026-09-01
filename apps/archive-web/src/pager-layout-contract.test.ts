import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function mediaBlock(css: string, marker: string): string {
  const start = css.indexOf(marker);
  const next = css.indexOf("@media", start + marker.length);
  expect(start).toBeGreaterThan(-1);
  return css.slice(start, next === -1 ? undefined : next);
}

describe("same-set pager layout contract", () => {
  it("keeps both step buttons on fixed tracks as the index copy changes", () => {
    const css = read("apps/archive-web/src/styles.css");

    expect(css).toMatch(
      /\.discovery-pager\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*44px minmax\(0, 1fr\) 44px[^}]*inline-size:\s*min\(100%, 360px\)/su,
    );
    expect(css).toMatch(/\.discovery-pager__position\s*\{[^}]*font-variant-numeric:\s*tabular-nums/su);
  });

  it("keeps preparation navigation in the first visual row without putting it before entry focus", () => {
    const component = read("apps/archive-web/src/BadgePreparationView.tsx");
    const css = read("apps/archive-web/src/artifact.css");
    const pagerSlot = component.indexOf('className="badge-preparation__pager-slot"');
    const heading = component.indexOf('className="collection-heading"');

    expect(pagerSlot).toBeGreaterThan(-1);
    expect(heading).toBeLessThan(pagerSlot);
    expect(css).toMatch(/\.badge-preparation__pager-slot\s*\{[^}]*min-block-size:\s*44px/su);
    expect(css).toMatch(
      /\.badge-preparation--paged \.badge-preparation__pager-slot\s*\{[^}]*grid-row:\s*1/su,
    );
    expect(css).toMatch(/\.badge-preparation--paged \.collection-heading\s*\{[^}]*grid-row:\s*2/su);
  });

  it("keeps replay navigation outside the variable, independently scrollable memory body", () => {
    const component = read("apps/archive-web/src/MemoryReplayDialog.tsx");
    const css = read("apps/archive-web/src/memory-replay.css");
    const pagerSlot = component.indexOf('className="memory-replay__pager-slot"');
    const content = component.indexOf('className="memory-replay__content"');
    const focusCapture = component.indexOf("contentFocusTarget.current = content.current?.contains");
    const recordTransition = component.indexOf("onPagerStep?.(step)");

    expect(pagerSlot).toBeGreaterThan(-1);
    expect(pagerSlot).toBeLessThan(content);
    expect(component).toContain('className="memory-replay__content"');
    expect(component).toContain('role={paged ? "region" : undefined}');
    expect(component).toContain('aria-label={paged ? "Memory details" : undefined}');
    expect(component).toContain("tabIndex={paged ? 0 : undefined}");
    expect(component).toContain("contentNode.scrollTop = 0");
    expect(component).toContain("contentNode.focus({ preventScroll: true })");
    expect(focusCapture).toBeGreaterThan(-1);
    expect(focusCapture).toBeLessThan(recordTransition);
    expect(component).toContain("contentFocusTarget.current === record.recordId");
    expect(css).toMatch(
      /\.memory-replay__details--paged\s*\{[^}]*display:\s*grid[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\)[^}]*align-self:\s*stretch/su,
    );
    expect(css).toMatch(/\.memory-replay__content\s*\{[^}]*min-block-size:\s*0[^}]*overflow-y:\s*auto/su);
    expect(css).toMatch(
      /\.memory-replay__card--paged\s*\{[^}]*block-size:\s*min\(760px, calc\(100dvh - 60px\)\)/su,
    );
  });

  it("reserves the same replay pager row in short landscape", () => {
    const css = read("apps/archive-web/src/mobile.css");
    const mediaMarker = "@media (max-width: 920px) and (max-height: 430px) and (orientation: landscape)";
    const compactCss = mediaBlock(css, mediaMarker);

    expect(compactCss).toMatch(
      /\.memory-replay__card--paged\s*\{[^}]*grid-template-rows:\s*50dvh minmax\(0, 50dvh\)/su,
    );
    expect(compactCss).toMatch(
      /\.memory-replay__card--paged \.memory-replay__viewer\s*\{[^}]*min-height:\s*0/su,
    );
    expect(compactCss).toMatch(/\.memory-replay__details--paged\s*\{[^}]*padding:\s*10px/su);
  });

  it("keeps tablet portrait padding and wide short-landscape rows consistent with their card mode", () => {
    const replayCss = read("apps/archive-web/src/memory-replay.css");
    const mobileCss = read("apps/archive-web/src/mobile.css");
    const wideLandscapeCss = mediaBlock(mobileCss, "@media (max-height: 430px) and (orientation: landscape)");

    expect(mobileCss).toMatch(/\.memory-replay:not\(\.memory-replay--paged\)/u);
    expect(replayCss).toMatch(
      /@media \(max-width: 920px\)[\s\S]*?\.memory-replay\s*\{[^}]*padding:\s*0[\s\S]*?\.memory-replay__card--paged\s*\{[^}]*block-size:\s*100dvh/su,
    );
    expect(wideLandscapeCss).not.toContain(".memory-replay__card--paged");
    expect(wideLandscapeCss).not.toMatch(/\.memory-replay__viewer\s*\{[^}]*height:\s*\d+dvh/su);
    expect(mobileCss).toMatch(
      /@media \(min-width: 921px\) and \(max-height: 430px\) and \(orientation: landscape\)[\s\S]*?\.memory-replay__close\s*\{[^}]*top:\s*0[^}]*right:\s*0/su,
    );
  });
});
