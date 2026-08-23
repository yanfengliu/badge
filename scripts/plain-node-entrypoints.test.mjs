import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

describe("plain Node entrypoints", () => {
  it("loads the pack-fixture generator graph without Vite resolving TypeScript imports", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        "const entry = await import('./scripts/generate-pack-fixtures.mjs'); if (typeof entry.generatePackFixtures !== 'function') throw new Error('generator export missing');",
      ],
      { cwd: repositoryRoot, encoding: "utf8", windowsHide: true },
    );

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
  });
});
