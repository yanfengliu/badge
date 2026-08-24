import { describe, expect, it, vi } from "vitest";
import { createSayingServerPlugin } from "./plugin.js";

describe("saying Vite plugin", () => {
  it("mounts no HTTP provider surface and creates no generator in fixture mode", () => {
    const createGenerator = vi.fn();
    const plugin = createSayingServerPlugin({ mode: "fixture", createGenerator });
    expect(plugin.name).toContain("disabled-in-fixture-mode");
    expect(plugin.configureServer).toBeUndefined();
    expect(plugin.configurePreviewServer).toBeUndefined();
    expect(createGenerator).not.toHaveBeenCalled();
  });
});
