import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { validatePublishedPackPng } from "../packages/pack-contract/src/published-png.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Bound: this proves each promoted Badge Studio reference is a fully decodable PNG at exactly the
 * CSS viewport its entry in `visual-direction.md` claims. It says nothing about what the pixels
 * show — a capture of the wrong surface at the right size still passes — so the record's prose
 * remains the claim and the native-resolution look remains the review.
 */
const references = [
  { file: "docs/design/assets/studio-badge-adjustment-2026-09-02.png", width: 1440, height: 1000 },
  { file: "docs/design/assets/studio-sticky-bench-2026-09-02.png", width: 1440, height: 1000 },
  { file: "docs/design/assets/studio-badge-adjustment-320-2026-09-02.png", width: 320, height: 700 },
];
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const MAX_PROMOTED_REFERENCE_BYTES = 256 * 1024;

describe("canonical Badge Studio visual references", () => {
  it.each(references)("fully decodes $file at exactly $width by $height", async ({ file, width, height }) => {
    const bytes = new Uint8Array(await readFile(path.join(repositoryRoot, file)));
    const dimensions = validatePublishedPackPng({ hash: file, width, height }, bytes);

    expect(path.extname(file)).toBe(".png");
    expect([...bytes.subarray(0, pngSignature.length)]).toEqual(pngSignature);
    expect(dimensions).toMatchObject({ width, height });
    // The fleet blob ceiling: a promoted reference above this needs a stated reason.
    expect(bytes.byteLength).toBeLessThanOrEqual(MAX_PROMOTED_REFERENCE_BYTES);
  });

  it("keeps every promoted reference named by the record it belongs to", async () => {
    const record = await readFile(path.join(repositoryRoot, "docs/design/visual-direction.md"), "utf8");
    for (const { file } of references) {
      expect(record).toContain(file.replace("docs/design/", ""));
    }
  });
});
