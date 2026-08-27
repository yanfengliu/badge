import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".mts",
  ".ps1",
  ".ts",
  ".tsx",
  ".yml",
]);

describe("tracked source hygiene", () => {
  it("keeps every tracked text file free of raw NUL bytes so diffs and greps never go binary", async () => {
    const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repositoryRoot, encoding: "utf8" })
      .split("\u0000")
      .filter((file) => textExtensions.has(path.extname(file)));
    expect(tracked.length).toBeGreaterThan(200);
    const offenders = [];
    for (const file of tracked) {
      const bytes = await readFile(path.join(repositoryRoot, file));
      if (bytes.includes(0)) offenders.push(file);
    }
    expect(
      offenders,
      "text files must escape control characters (write \\u0000, never a literal NUL) so git, grep, and reviewers can read them",
    ).toEqual([]);
  }, 30_000);
});
