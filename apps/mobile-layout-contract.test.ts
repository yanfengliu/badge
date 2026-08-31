// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function mediaCss(relativePath: string, condition: string): string {
  const style = document.createElement("style");
  style.textContent = read(relativePath);
  document.head.append(style);
  const rules = [...(style.sheet?.cssRules ?? [])];
  const media = rules.find(
    (rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.conditionText === condition,
  );
  style.remove();
  expect(media, `${relativePath} must define ${condition}`).toBeDefined();
  return [...(media?.cssRules ?? [])].map((rule) => rule.cssText).join("\n");
}

describe("phone layout contract", () => {
  it("declares edge-to-edge safe-area support for both independent builds and the root host", () => {
    for (const htmlPath of [
      "apps/archive-web/index.html",
      "apps/studio-web/index.html",
      "apps/host-web/index.html",
    ]) {
      expect(read(htmlPath), htmlPath).toContain(
        'content="width=device-width, initial-scale=1.0, viewport-fit=cover"',
      );
    }
  });

  it("composes both responsive application surfaces from the single root host", () => {
    const html = read("apps/host-web/index.html");
    const host = read("apps/host-web/src/App.tsx");

    expect(html).toContain('src="/@badge-host/main.tsx"');
    expect(host).toContain('await import("../../archive-web/src/ArchiveSurface")');
    expect(host).toContain('await import("../../studio-web/src/StudioSurface")');
    expect(host).not.toContain("import { ArchiveSurface } from");
    expect(host).not.toContain("import { StudioSurface } from");
    expect(host).toContain("<ArchiveSurface");
    expect(host).toContain("<StudioSurface");
  });

  it("keeps the Archive shell, navigation, fields, rails, and overlays usable at phone widths", () => {
    const base = read("apps/archive-web/src/mobile.css");
    const global = read("apps/archive-web/src/styles.css");
    const entry = read("apps/archive-web/src/ArchiveSurface.tsx");
    const phone = [
      mediaCss("apps/archive-web/src/mobile.css", "(max-width: 640px)"),
      mediaCss("apps/archive-web/src/mobile.css", "(max-width: 480px)"),
    ].join("\n");
    const shortLandscape = mediaCss(
      "apps/archive-web/src/mobile.css",
      "(max-height: 430px) and (orientation: landscape)",
    );
    const discoveryPhone = mediaCss("apps/archive-web/src/discovery.css", "(max-width: 420px)");

    expect(entry.lastIndexOf('import "./mobile.css"')).toBeGreaterThan(
      entry.lastIndexOf('import "./saying-disclosure.css"'),
    );
    expect(base).toMatch(/html,\s*body,\s*#root\s*\{[^}]*min-width:\s*0/su);
    expect(global).toMatch(/html\[data-badge-mode="archive"\]\s*\{[^}]*min-width:\s*0/su);
    expect(base).toMatch(/html,\s*body\s*\{[^}]*overflow-x:\s*clip/su);
    expect(base).toContain("env(safe-area-inset-top");
    expect(base).toContain("env(safe-area-inset-bottom");
    expect(base).toContain("100dvh");
    expect(phone).toMatch(/\.archive-nav\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/su);
    expect(phone).toMatch(/\.nav-link\s*\{[^}]*min-height:\s*48px/su);
    expect(read("apps/archive-web/src/discovery.css")).toMatch(
      /\.discovery-set-browser\s*\{[^}]*grid-auto-flow:\s*column[^}]*overflow-x:\s*auto[^}]*scroll-snap-type:\s*x proximity/su,
    );
    expect(phone).toMatch(
      /\.discovery-set-browser\s*\{[^}]*grid-auto-columns:\s*minmax\(158px, 72vw\)[^}]*scroll-snap-type:\s*x mandatory/su,
    );
    expect(phone).toMatch(/\.collection-shelf__art\s*\{[^}]*pointer-events:\s*auto/su);
    expect(phone).toMatch(/\.collection-shelf__art\s*\{[^}]*touch-action:\s*auto/su);
    expect(phone).toMatch(/\.restore-actions\s*\{[^}]*flex-direction:\s*column-reverse/su);
    expect(phone).toMatch(/\.field\s+:is\(input, textarea, select\)\s*\{[^}]*font-size:\s*16px/su);
    expect(read("apps/archive-web/src/discovery.css")).toMatch(
      /\.discovery-card__action\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/su,
    );
    expect(discoveryPhone).toMatch(
      /\.discovery-card\s*\{[^}]*grid-template-columns:\s*118px minmax\(0, 1fr\)/su,
    );
    expect(phone).toMatch(/\.ceremony-viewer\s*\{[^}]*height:\s*auto/su);
    expect(phone).toMatch(
      /\.ceremony-viewer > \.badge-viewer__viewport[^{]*\{[^}]*block-size:\s*clamp\(220px, 42dvh, 360px\)[^}]*min-block-size:\s*0/su,
    );
    expect(phone).toMatch(
      /\.memory-replay__viewer \.badge-viewer__viewport canvas[^{]*\{[^}]*min-block-size:\s*0/su,
    );
    expect(phone).toMatch(
      /\.memory-replay__viewer \.badge-fallback__stage[^{]*\{[^}]*container-type:\s*size/su,
    );
    expect(phone).toMatch(
      /\.memory-replay__viewer \.badge-fallback__object-frame[^{]*\{[^}]*inline-size:\s*min\(70cqi, var\(--badge-stage-fit-inline\)\)[^}]*block-size:\s*auto[^}]*max-inline-size:\s*none/su,
    );
    expect(phone).toMatch(
      /\.artifact-pane \.badge-fallback__stage[^{]*\{[^}]*min-block-size:\s*0[^}]*container-type:\s*size[^}]*overflow:\s*hidden/su,
    );
    expect(phone).toMatch(
      /\.artifact-pane \.badge-fallback\s*\{[^}]*(?<!min-)block-size:\s*clamp\(250px, 46dvh, 330px\)/su,
    );
    expect(phone).toMatch(
      /\.artifact-pane \.badge-fallback__object-frame[^{]*\{[^}]*inline-size:\s*min\(70cqi, var\(--badge-stage-fit-inline\)\)[^}]*block-size:\s*auto[^}]*max-inline-size:\s*none/su,
    );
    expect(shortLandscape).toMatch(
      /\.artifact-pane \.badge-viewer__viewport[^{]*\{[^}]*block-size:\s*220px/su,
    );
    expect(shortLandscape).toMatch(
      /\.artifact-pane \.badge-fallback__stage[^{]*\{[^}]*min-block-size:\s*0[^}]*container-type:\s*size[^}]*overflow:\s*hidden/su,
    );
    expect(shortLandscape).toMatch(
      /\.artifact-pane \.badge-fallback__object-frame[^{]*\{[^}]*inline-size:\s*min\(70cqi, var\(--badge-stage-fit-inline\)\)[^}]*block-size:\s*auto[^}]*max-inline-size:\s*none/su,
    );
    expect(shortLandscape).toMatch(/\.collection-empty-callout button[^{]*\{[^}]*min-height:\s*44px/su);
    expect(shortLandscape).toMatch(
      /\.ceremony-viewer > \.badge-viewer__viewport[^{]*\{[^}]*block-size:\s*min\(280px, 72dvh\)[^}]*min-block-size:\s*0/su,
    );
    expect(shortLandscape).toMatch(
      /\.memory-replay__viewer \.badge-fallback__stage[^{]*\{[^}]*min-block-size:\s*0/su,
    );
    expect(shortLandscape).toMatch(
      /\.memory-replay__viewer \.badge-fallback__stage[^{]*\{[^}]*container-type:\s*size/su,
    );
    expect(shortLandscape).toMatch(
      /\.memory-replay__viewer \.badge-fallback__object-frame[^{]*\{[^}]*inline-size:\s*min\(70cqi, var\(--badge-stage-fit-inline\)\)[^}]*block-size:\s*auto[^}]*max-inline-size:\s*none/su,
    );
    expect(base).toContain("padding-left: max(clamp(24px, 3.5vw, 58px), var(--safe-left));");
    expect(base).toContain("right: max(24px, var(--safe-right));");
    expect(base).toContain("padding-bottom: calc(84px + var(--safe-bottom));");
  });

  it("keeps Studio navigation, inputs, candidate browsing, and construction controls touch-safe", () => {
    const base = read("apps/studio-web/src/mobile.css");
    const artDirection = read("apps/studio-web/src/art-direction-library.css");
    const entry = read("apps/studio-web/src/StudioSurface.tsx");
    const phone = mediaCss("apps/studio-web/src/mobile.css", "(max-width: 480px)");
    const shortLandscape = mediaCss(
      "apps/studio-web/src/mobile.css",
      "(max-height: 430px) and (orientation: landscape)",
    );

    expect(entry.lastIndexOf('import "./mobile.css"')).toBeGreaterThan(
      entry.lastIndexOf('import "./studio-header.css"'),
    );
    expect(base).toMatch(
      /body\[data-badge-mode="studio"\],\s*body\[data-badge-mode="studio"\] #root\s*\{[^}]*min-width:\s*0/su,
    );
    expect(base).toMatch(/body\[data-badge-mode="studio"\]\s*\{[^}]*overflow-x:\s*clip/su);
    expect(base).toContain("env(safe-area-inset-top");
    expect(base).toContain("env(safe-area-inset-bottom");
    expect(base).toContain("100dvh");
    expect(phone).toMatch(/\.studio-nav\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/su);
    expect(phone).toMatch(/\.studio-nav__link\s*\{[^}]*min-height:\s*48px/su);
    expect(phone).toMatch(/\.candidate-grid\s*\{[^}]*grid-auto-flow:\s*column[^}]*overflow-x:\s*auto/su);
    expect(phone).toMatch(/\.source-actions\s*\{[^}]*align-items:\s*stretch[^}]*flex-direction:\s*column/su);
    expect(phone).toMatch(/\.source-actions \.button\s*\{[^}]*width:\s*100%/su);
    expect(phone).toMatch(/\.publish-bar \.button\s*\{[^}]*max-width:\s*100%/su);
    expect(phone).toMatch(/\.publish-bar \.button\s*\{[^}]*overflow-wrap:\s*anywhere/su);
    expect(phone).toMatch(/\.segment button\s*\{[^}]*min-height:\s*44px/su);
    expect(phone).toMatch(/:is\(input, textarea, select\)\s*\{[^}]*font-size:\s*16px/su);
    expect(phone).toMatch(/\.publish-bar \.button\s*\{[^}]*width:\s*100%/su);
    expect(phone).toMatch(/\.art-direction-library__restore-recommendation[^{]*\{[^}]*min-height:\s*44px/su);
    expect(phone).toMatch(
      /\.construction-bench \.badge-fallback__stage[^{]*\{[^}]*min-block-size:\s*0[^}]*container-type:\s*size[^}]*overflow:\s*hidden/su,
    );
    expect(phone).toMatch(
      /\.construction-bench \.badge-fallback\s*\{[^}]*(?<!min-)block-size:\s*clamp\(240px, 44dvh, 300px\)/su,
    );
    expect(phone).toMatch(
      /\.construction-bench \.badge-fallback__object-frame[^{]*\{[^}]*inline-size:\s*min\(70cqi, var\(--badge-stage-fit-inline\)\)[^}]*block-size:\s*auto[^}]*max-inline-size:\s*none/su,
    );
    expect(shortLandscape).toMatch(
      /\.construction-bench \.badge-viewer__viewport[^{]*\{[^}]*block-size:\s*220px/su,
    );
    expect(shortLandscape).toMatch(
      /\.construction-bench \.badge-fallback__stage[^{]*\{[^}]*min-block-size:\s*0[^}]*container-type:\s*size[^}]*overflow:\s*hidden/su,
    );
    expect(shortLandscape).toMatch(
      /\.construction-bench \.badge-fallback__object-frame[^{]*\{[^}]*inline-size:\s*min\(70cqi, var\(--badge-stage-fit-inline\)\)[^}]*block-size:\s*auto[^}]*max-inline-size:\s*none/su,
    );
    expect(shortLandscape).toMatch(/\.segment button[^{]*\{[^}]*min-height:\s*44px/su);
    expect(shortLandscape).toMatch(
      /\.art-direction-library__restore-recommendation[^{]*\{[^}]*min-height:\s*44px/su,
    );
    expect(shortLandscape).toMatch(/input\[type="range"\]\s*\{[^}]*min-height:\s*44px/su);
    expect(shortLandscape).toContain(".art-direction-library__index");
    expect(base).toMatch(
      /\.art-direction-library__index\s*\{[^}]*padding-right:\s*max\(20px, var\(--safe-right\)\)[^}]*padding-left:\s*max\(20px, var\(--safe-left\)\)/su,
    );
    expect(shortLandscape).toContain(".art-direction-library__detail");
    expect(base).toMatch(
      /\.art-direction-library__detail\s*\{[^}]*padding-right:\s*max\(clamp\(28px, 4vw, 54px\), var\(--safe-right\)\)[^}]*padding-left:\s*max\(clamp\(28px, 4vw, 54px\), var\(--safe-left\)\)/su,
    );
    expect(base).toContain("padding-left: max(clamp(24px, 3.2vw, 52px), var(--safe-left));");
    expect(artDirection).toMatch(
      /\.art-direction-library__prompt-actions button\s*\{[^}]*min-height:\s*44px/su,
    );
  });
});
