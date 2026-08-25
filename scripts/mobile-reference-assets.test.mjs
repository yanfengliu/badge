import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { validatePublishedPackPng } from "../packages/pack-contract/src/published-png.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const references = [
  "docs/design/assets/archive-discover-mobile-2026-08-25.png",
  "docs/design/assets/studio-mobile-2026-08-25.png",
];
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

describe("canonical mobile visual references", () => {
  it.each(references)("fully decodes %s as an exact 390 by 844 PNG", async (relativePath) => {
    const bytes = new Uint8Array(await readFile(path.join(repositoryRoot, relativePath)));
    const dimensions = validatePublishedPackPng({ hash: relativePath, width: 390, height: 844 }, bytes);

    expect(path.extname(relativePath)).toBe(".png");
    expect([...bytes.subarray(0, pngSignature.length)]).toEqual(pngSignature);
    expect(dimensions).toMatchObject({ width: 390, height: 844 });
  });
});
