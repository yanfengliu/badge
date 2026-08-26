import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const decodeGate = path.join(repositoryRoot, "scripts/check-discovery-detail-decode.ps1");
const windowsIt = process.platform === "win32" ? it : it.skip;

describe("discovery detail full-decode gate", () => {
  windowsIt("accepts the complete key-bound on-demand detail tier", () => {
    const result = runGate(
      path.join(repositoryRoot, "packages/catalogue-authoring/assets/discovery-details.manifest.json"),
      path.join(repositoryRoot, "packages/catalogue-authoring/assets"),
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Fully decoded and key-bound 297 discovery detail previews.");
  });

  windowsIt("rejects a detail JPEG that only declares dimensions in a truncated header", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "badge-detail-decode-"));
    const assetsRoot = path.join(temporaryRoot, "assets");
    const detailDirectory = path.join(assetsRoot, "example", "details");
    const detailFile = path.join(detailDirectory, "truncated.jpg");
    const manifestFile = path.join(temporaryRoot, "manifest.json");
    const headerOnlyJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x80, 0x01, 0x80, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11,
      0x00, 0x03, 0x11, 0x00,
    ]);

    try {
      await mkdir(detailDirectory, { recursive: true });
      await writeFile(detailFile, headerOnlyJpeg);
      await writeFile(
        manifestFile,
        `${JSON.stringify({
          schemaVersion: 1,
          recipe: { id: "catalogue-detail-preview", revision: 1 },
          width: 384,
          height: 384,
          loading: "on-demand",
          limits: {
            maximumEntries: 320,
            maximumFileBytes: 65_536,
            maximumTotalBytes: 16_777_216,
          },
          totalBytes: headerOnlyJpeg.byteLength,
          entries: [
            {
              key: "example/truncated.jpg",
              bytes: headerOnlyJpeg.byteLength,
              sha256: createHash("sha256").update(headerOnlyJpeg).digest("hex"),
              width: 384,
              height: 384,
            },
          ],
        })}\n`,
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
