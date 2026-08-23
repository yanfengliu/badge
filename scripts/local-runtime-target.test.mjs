import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCanonicalRuntimeTarget,
  createVerificationRuntimeTarget,
  runtimeTargetPaths,
} from "./local-runtime-target.mjs";

const repositoryRoot = path.resolve("C:/workspace/badge");

describe("local launcher runtime targets", () => {
  it("keeps interactive state at the one canonical ignored site record", () => {
    expect(runtimeTargetPaths(createCanonicalRuntimeTarget(repositoryRoot))).toEqual({
      kind: "canonical",
      repositoryRoot,
      configPath: path.join(repositoryRoot, ".badge-local", "site.json"),
      legacyConfigPath: path.join(repositoryRoot, ".badge-local", "ports.json"),
      cleanupDirectory: null,
    });
  });

  it("confines lifecycle verification beneath the ignored tmp tree", () => {
    const paths = runtimeTargetPaths(createVerificationRuntimeTarget(repositoryRoot, "contract-1234"));

    expect(paths).toEqual({
      kind: "verification",
      repositoryRoot,
      configPath: path.join(repositoryRoot, "tmp", "local-startup", "contract-1234", "site.json"),
      legacyConfigPath: null,
      cleanupDirectory: path.join(repositoryRoot, "tmp", "local-startup", "contract-1234"),
    });
    expect(paths.configPath).not.toContain(`${path.sep}.badge-local${path.sep}`);
  });

  it("refuses path-shaped verification identifiers", () => {
    expect(() => createVerificationRuntimeTarget(repositoryRoot, "../canonical")).toThrow(
      "verification target identifier",
    );
    expect(() => createVerificationRuntimeTarget(repositoryRoot, "nested/path")).toThrow(
      "verification target identifier",
    );
  });

  it("rejects unbranded target objects", () => {
    expect(() =>
      runtimeTargetPaths({
        kind: "verification",
        configPath: path.join(repositoryRoot, "tmp", "pretend.json"),
      }),
    ).toThrow("trusted local runtime target");
  });
});
