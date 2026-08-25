import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  hostEntryPoint,
  hostServerOptions,
  legacyStudioLocation,
  sayingModeForViteMode,
} from "./vite.config.js";

const hostRoot = path.dirname(fileURLToPath(import.meta.url));

describe("single-root Badge host", () => {
  it.each([
    ["fixture", "fixture"],
    ["test", "fixture"],
    ["development", "live"],
    ["production", "live"],
  ] as const)("configures Vite %s mode with the %s saying surface", (viteMode, expected) => {
    expect(sayingModeForViteMode(viteMode)).toBe(expected);
  });

  it("disables Vite's speculative direct-import pre-transforms", () => {
    expect(hostServerOptions.preTransformRequests).toBe(false);
  });

  it("redirects every legacy Studio document URL to the root Studio section", () => {
    expect(legacyStudioLocation("/studio")).toBe("/#studio");
    expect(legacyStudioLocation("/studio/")).toBe("/#studio");
    expect(legacyStudioLocation("/studio/project?fallback")).toBe("/?fallback#studio");
    expect(legacyStudioLocation("/?fallback")).toBeNull();
    expect(legacyStudioLocation("/studio/candidate.webp", "image/webp")).toBeNull();
  });

  it("ships one root document and one host composer instead of a Studio document", async () => {
    const html = await readFile(hostEntryPoint, "utf8");

    expect(path.relative(hostRoot, hostEntryPoint)).toBe("index.html");
    expect(html).toContain('name="badge-application" content="badge-single-root-v1"');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('src="/@badge-host/main.tsx"');
    expect(html).not.toContain('content="archive"');
    expect(html).not.toContain('content="studio"');
    await expect(readFile(path.resolve(hostRoot, "studio/index.html"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("scopes Studio globals so returning to Archive cannot inherit its theme", async () => {
    const [
      studioStyles,
      studioHeader,
      studioMobile,
      studioDocument,
      archiveStyles,
      archiveDocument,
      archiveMobile,
      hostSource,
    ] = await Promise.all([
      readFile(path.resolve(hostRoot, "../studio-web/src/styles.css"), "utf8"),
      readFile(path.resolve(hostRoot, "../studio-web/src/studio-header.css"), "utf8"),
      readFile(path.resolve(hostRoot, "../studio-web/src/mobile.css"), "utf8"),
      readFile(path.resolve(hostRoot, "../studio-web/index.html"), "utf8"),
      readFile(path.resolve(hostRoot, "../archive-web/src/styles.css"), "utf8"),
      readFile(path.resolve(hostRoot, "../archive-web/index.html"), "utf8"),
      readFile(path.resolve(hostRoot, "../archive-web/src/mobile.css"), "utf8"),
      readFile(path.resolve(hostRoot, "src/App.tsx"), "utf8"),
    ]);

    expect(studioStyles).toMatch(/body\[data-badge-mode="studio"\]\s*\{/u);
    expect(studioStyles).toContain('html[data-badge-mode="studio"]');
    expect(archiveStyles).toContain('html[data-badge-mode="archive"]');
    expect(studioStyles).not.toMatch(
      /^\s*(?:html\s*(?:,|\{)|#root|body\s*(?:,|\{)|button|input|summary|\[tabindex\])/mu,
    );
    expect(studioMobile).not.toMatch(/^\s*(?:html|#root|body\s*(?:,|\{)|input\[type="range"\]|:is\(input)/mu);
    expect(studioStyles).toContain(".studio-shell .eyebrow");
    expect(studioStyles).toContain(".studio-shell .button");
    expect(studioStyles).toContain(".studio-shell .visually-hidden");
    expect(studioStyles).toMatch(
      /\.control-row input\[type="range"\]\s*\{[^}]*border:\s*0[^}]*background:\s*transparent[^}]*color:\s*var\(--ink\)/su,
    );
    expect(studioMobile).toContain('.studio-shell input[type="range"]');
    expect(studioMobile).toContain(".studio-shell :is(input, textarea, select)");
    expect(studioHeader).toContain(".studio-header .brand");
    expect(studioHeader).toMatch(/\.studio-header \.brand\s*\{[^}]*letter-spacing:\s*normal/su);
    expect(studioDocument).toContain('<html lang="en" data-badge-mode="studio">');
    expect(studioDocument).toContain('<body data-badge-mode="studio">');
    expect(archiveDocument).toContain('<html lang="en" data-badge-mode="archive">');
    expect(archiveDocument).toContain('<body data-badge-mode="archive">');
    expect(studioMobile.match(/:root\s*\{[^}]*\}/u)?.[0]).toBe(
      archiveMobile.match(/:root\s*\{[^}]*\}/u)?.[0],
    );
    expect(hostSource).toContain("document.body.dataset.badgeMode = surface;");
    expect(hostSource).toContain("document.documentElement.dataset.badgeMode = surface;");
  });

  it("keeps the same-root sections in distinct IndexedDB databases", async () => {
    const [archiveStorage, studioStorage] = await Promise.all([
      readFile(path.resolve(hostRoot, "../../packages/archive-application/src/storage-contract.ts"), "utf8"),
      readFile(path.resolve(hostRoot, "../studio-web/src/studio-store.ts"), "utf8"),
    ]);
    const archiveName = archiveStorage.match(/ARCHIVE_DATABASE_NAME\s*=\s*"([^"]+)"/u)?.[1];
    const studioName = studioStorage.match(/STUDIO_DATABASE_NAME\s*=\s*"([^"]+)"/u)?.[1];

    expect(archiveName).toBe("badge-archive-v1");
    expect(studioName).toBe("badge-studio-v1");
    expect(archiveName).not.toBe(studioName);
  });
});
