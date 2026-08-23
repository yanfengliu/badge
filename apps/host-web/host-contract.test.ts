import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { canonicalStudioLocation, hostEntryPoints, studioEntryRewrite } from "./vite.config.js";

const hostRoot = path.dirname(fileURLToPath(import.meta.url));

describe("single-origin Badge host", () => {
  it("canonicalizes the Studio segment before Archive history fallback can claim it", () => {
    expect(canonicalStudioLocation("/studio")).toBe("/studio/");
    expect(canonicalStudioLocation("/studio?draft=one")).toBe("/studio/?draft=one");
    expect(canonicalStudioLocation("/studio/")).toBeNull();
    expect(canonicalStudioLocation("/studio/project")).toBeNull();
  });

  it("routes Studio document deep links back through the Studio entry", () => {
    expect(studioEntryRewrite("/studio/project?draft=one", "text/html,application/xhtml+xml")).toBe(
      "/studio/?draft=one",
    );
    expect(studioEntryRewrite("/studio/", "text/html")).toBeNull();
    expect(studioEntryRewrite("/studio/candidate.webp", "image/webp")).toBeNull();
    expect(studioEntryRewrite("/archive/project", "text/html")).toBeNull();
  });

  it("keeps Archive and Studio as separate HTML and source entry points", async () => {
    const archiveHtml = await readFile(hostEntryPoints.archive, "utf8");
    const studioHtml = await readFile(hostEntryPoints.studio, "utf8");

    expect(path.relative(hostRoot, hostEntryPoints.archive)).toBe("index.html");
    expect(path.relative(hostRoot, hostEntryPoints.studio)).toBe(path.join("studio", "index.html"));
    expect(archiveHtml).toContain('name="badge-application" content="archive"');
    expect(archiveHtml).toContain('src="/@badge-archive/main.tsx"');
    expect(archiveHtml).not.toContain("@badge-studio");
    expect(studioHtml).toContain('name="badge-application" content="studio"');
    expect(studioHtml).toContain('src="/@badge-studio/main.tsx"');
    expect(studioHtml).not.toContain("@badge-archive");
  });

  it("keeps the same-origin applications in distinct IndexedDB databases", async () => {
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
