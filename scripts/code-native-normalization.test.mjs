import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const normalizationScript = path.join(repositoryRoot, "scripts/normalize-code-native-catalogue-art.ps1");
const windowsIt = process.platform === "win32" ? it : it.skip;

describe("code-native normalization boundary", () => {
  windowsIt(
    "recognizes video-game sources while enforcing the 0.035 raw miniature ceiling",
    async () => {
      const inputRoot = await mkdtemp(path.join(tmpdir(), "badge-video-game-normalization-"));
      try {
        await writeFile(
          path.join(inputRoot, "png-metrics.json"),
          `${JSON.stringify([
            {
              catalogueDirectory: "video-games",
              slug: "raw-failing-control",
              sourcePngColorType: "RGB",
              sourceSize: [896, 896],
              miniatureResidual: 0.036,
              quantitativePass: true,
            },
          ])}\n`,
          "utf8",
        );

        const result = spawnSync(
          "powershell",
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            normalizationScript,
            "-InputRoot",
            inputRoot,
            "-AllowedDirectory",
            "video-games",
            "-ExpectedCount",
            "1",
          ],
          { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
        );

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("rejected raw renderer output video-games/raw-failing-control");
        expect(result.stderr).toContain("0.035 or below before JPEG processing");
        expect(result.stderr).not.toContain("does not know catalogue directory");
      } finally {
        await rm(inputRoot, { recursive: true, force: true });
      }
    },
    60_000,
  );

  windowsIt(
    "rejects a failing raw miniature before JPEG can blur its score",
    async () => {
      const inputRoot = await mkdtemp(path.join(tmpdir(), "badge-code-native-normalization-"));
      try {
        await writeFile(
          path.join(inputRoot, "png-metrics.json"),
          `${JSON.stringify([
            {
              catalogueDirectory: "michelin-dining",
              slug: "raw-failing-control",
              sourcePngColorType: "RGB",
              sourceSize: [896, 896],
              miniatureResidual: 0.046,
              quantitativePass: false,
            },
          ])}\n`,
          "utf8",
        );

        const result = spawnSync(
          "powershell",
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            normalizationScript,
            "-InputRoot",
            inputRoot,
            "-AllowedDirectory",
            "michelin-dining",
            "-ExpectedCount",
            "1",
          ],
          { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
        );

        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("rejected raw renderer output michelin-dining/raw-failing-control");
        expect(result.stderr).toContain("0.035 or below before JPEG processing");
      } finally {
        await rm(inputRoot, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
