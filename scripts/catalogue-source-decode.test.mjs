import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const decodeGate = path.join(repositoryRoot, "scripts/check-catalogue-source-decode.ps1");
const assetsRoot = path.join(repositoryRoot, "packages/catalogue-authoring/assets");
const windowsIt = process.platform === "win32" ? it : it.skip;

describe("catalogue source full-decode gate", () => {
  windowsIt(
    "fully decodes every reviewed 896-pixel source-study edition",
    () => {
      const states = runGate(path.join(assetsRoot, "us-states"), 50, "U.S. state source study");
      const parks = runGate(path.join(assetsRoot, "national-parks"), 63, "national-park source study");
      const books = runGate(path.join(assetsRoot, "books-read"), 50, "book source study");
      const education = runGate(path.join(assetsRoot, "life-milestones"), 2, "education source study");
      const dining = runGate(path.join(assetsRoot, "michelin-dining"), 132, "dining source study");
      const games = runGate(path.join(assetsRoot, "video-games"), 50, "video-game source study");

      expect(states.status, states.stderr).toBe(0);
      expect(states.stdout).toContain("Fully decoded 50 U.S. state source study JPEGs");
      expect(parks.status, parks.stderr).toBe(0);
      expect(parks.stdout).toContain("Fully decoded 63 national-park source study JPEGs");
      expect(books.status, books.stderr).toBe(0);
      expect(books.stdout).toContain("Fully decoded 50 book source study JPEGs");
      expect(education.status, education.stderr).toBe(0);
      expect(education.stdout).toContain("Fully decoded 2 education source study JPEGs");
      expect(dining.status, dining.stderr).toBe(0);
      expect(dining.stdout).toContain("Fully decoded 132 dining source study JPEGs");
      expect(games.status, games.stderr).toBe(0);
      expect(games.stdout).toContain("Fully decoded 50 video-game source study JPEGs");
    },
    60_000,
  );

  windowsIt(
    "rejects an 896-pixel SOF header with no decodable image payload",
    async () => {
      const temporaryRoot = await mkdtemp(path.join(tmpdir(), "badge-source-decode-"));
      const sourceDirectory = path.join(temporaryRoot, "sources");
      const headerOnlyJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x80, 0x03, 0x80, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11,
        0x00, 0x03, 0x11, 0x00,
      ]);

      try {
        await mkdir(sourceDirectory, { recursive: true });
        await writeFile(path.join(sourceDirectory, "truncated.jpg"), headerOnlyJpeg);
        const result = runGate(sourceDirectory, 1, "test source study");

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("could not fully decode test source study");
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    },
    60_000,
  );
});

function runGate(imageDirectory, expectedCount, kind) {
  return spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      decodeGate,
      "-ImageDirectory",
      imageDirectory,
      "-ExpectedCount",
      String(expectedCount),
      "-ExpectedWidth",
      "896",
      "-ExpectedHeight",
      "896",
      "-MaximumBytes",
      String(256 * 1024),
      "-Kind",
      kind,
    ],
    { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
  );
}
