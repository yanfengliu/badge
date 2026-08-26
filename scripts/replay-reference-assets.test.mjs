import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { validatePublishedPackPng } from "../packages/pack-contract/src/published-png.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const relativePath = "docs/design/assets/archive-replay-2026-08-26.png";
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

describe("canonical earned replay visual reference", () => {
  it("fully decodes the current fixture-only replay as an exact bounded PNG", async () => {
    const bytes = new Uint8Array(await readFile(path.join(repositoryRoot, relativePath)));
    const dimensions = validatePublishedPackPng({ hash: relativePath, width: 1440, height: 1000 }, bytes);

    expect([...bytes.subarray(0, pngSignature.length)]).toEqual(pngSignature);
    expect(dimensions).toMatchObject({ width: 1440, height: 1000 });
    expect(bytes.byteLength).toBeLessThan(256 * 1024);
  });
});
