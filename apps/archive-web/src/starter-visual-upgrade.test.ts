import { createHash } from "node:crypto";

import { canonicalJson } from "@badge/pack-contract";
import { describe, expect, it } from "vitest";

import { LEGACY_STARTER_VISUAL_LINEAGES } from "./starter-visual-upgrade.js";

describe("starter visual-upgrade history", () => {
  it("pins the complete alpha.3 lineage independently of the upgrade implementation", () => {
    const digest = createHash("sha256").update(canonicalJson(LEGACY_STARTER_VISUAL_LINEAGES)).digest("hex");

    expect(digest).toBe("14fda60e2bb023e24da3aa3d4ca372498ca16455294fb5c61ce84643f79f0b8a");
  });
});
