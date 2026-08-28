import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const promptScript = path.join(repositoryRoot, "scripts/print-new-catalogue-prompts.mjs");

describe("new catalogue prompt export", () => {
  it("selects one exact video game by slug and emits its canonical primary prompt", () => {
    const result = runPromptExport("pong");

    expect(result.status, result.stderr).toBe(0);
    const rows = JSON.parse(result.stdout);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      catalogueDirectory: "video-games",
      slug: "pong",
      candidateKey: "played-video-game-pong:landmark-witness",
      promptRecipe: { id: "badge-source-art", revision: 2 },
    });
    expect(rows[0].prompt).toContain("Pong");
  }, 60_000);

  it("names games among the accepted selector groups", () => {
    const result = runPromptExport("not-a-catalogue-entry");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Unknown new-catalogue selector(s): not-a-catalogue-entry");
    expect(result.stderr).toContain("use books, education, michelin, games, or an exact record slug");
  }, 60_000);
});

function runPromptExport(selector) {
  return spawnSync(process.execPath, [promptScript, selector], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}
