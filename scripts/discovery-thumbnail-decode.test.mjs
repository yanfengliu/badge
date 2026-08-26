import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const decodeGate = path.join(repositoryRoot, "scripts/check-discovery-thumbnail-decode.ps1");
const windowsIt = process.platform === "win32" ? it : it.skip;

describe("discovery thumbnail full-decode gate", () => {
  windowsIt("accepts the exact key-bound reviewed derivative tier", () => {
    const result = runGate(
      path.join(repositoryRoot, "packages/catalogue-authoring/assets/discovery-thumbnails.manifest.json"),
      path.join(repositoryRoot, "packages/catalogue-authoring/assets"),
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Fully decoded and key-bound 297 discovery thumbnails.");
  });

  windowsIt("rejects a JPEG that only declares dimensions in a truncated header", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "badge-thumbnail-decode-"));
    const assetsRoot = path.join(temporaryRoot, "assets");
    const thumbnailDirectory = path.join(assetsRoot, "example", "thumbnails");
    const thumbnailFile = path.join(thumbnailDirectory, "truncated.jpg");
    const manifestFile = path.join(temporaryRoot, "manifest.json");
    const headerOnlyJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x80, 0x00, 0x80, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11,
      0x00, 0x03, 0x11, 0x00,
    ]);

    try {
      await mkdir(thumbnailDirectory, { recursive: true });
      await writeFile(thumbnailFile, headerOnlyJpeg);
      await writeFile(
        manifestFile,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            recipe: { id: "catalogue-list-thumbnail", revision: 1 },
            width: 128,
            height: 128,
            limits: { maximumEntries: 256, maximumFileBytes: 16_384, maximumTotalBytes: 2_097_152 },
            totalBytes: headerOnlyJpeg.byteLength,
            entries: [
              {
                key: "example/truncated.jpg",
                bytes: headerOnlyJpeg.byteLength,
                sha256: createHash("sha256").update(headerOnlyJpeg).digest("hex"),
                width: 128,
                height: 128,
              },
            ],
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      const result = runGate(manifestFile, assetsRoot);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("could not fully decode as a bounded JPEG");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});

function runGate(manifestPath, assetsRoot) {
  return spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      decodeGate,
      "-ManifestPath",
      manifestPath,
      "-AssetsRoot",
      assetsRoot,
    ],
    { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
  );
}
