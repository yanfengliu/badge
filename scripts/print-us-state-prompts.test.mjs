import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const promptScript = path.join(repositoryRoot, "scripts/print-us-state-prompts.mjs");

describe("U.S. state prompt export", () => {
  it("selects one exact state by slug and emits its canonical primary prompt", () => {
    const result = runPromptExport("new-york");

    expect(result.status, result.stderr).toBe(0);
    const rows = JSON.parse(result.stdout);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      catalogueId: "us-states",
      censusStateFips: "36",
      postalCode: "NY",
      slug: "new-york",
      candidateKey: "visited-us-state-36:landmark-witness",
      recipe: { id: "badge-source-art", revision: 1 },
    });
    expect(rows[0].prompt).toContain("mountains, hills, or wilderness peaks");
  });

  it("fails with the accepted selector forms when a state is unknown", () => {
    const result = runPromptExport("not-a-state");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Unknown U.S. state selector(s): not-a-state");
    expect(result.stderr).toContain("use a two-digit Census FIPS, USPS code, or state slug");
  });
});

function runPromptExport(selector) {
  return spawnSync(process.execPath, [promptScript, selector], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}
