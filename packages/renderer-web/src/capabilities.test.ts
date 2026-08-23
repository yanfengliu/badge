import { describe, expect, it, vi } from "vitest";

import { probeWebGL2UnlessForced } from "./capabilities";

describe("renderer capability control", () => {
  it("does not invoke the GPU probe in forced fallback mode", () => {
    const probe = vi.fn(() => true);

    expect(probeWebGL2UnlessForced(true, probe)).toBeNull();
    expect(probe).not.toHaveBeenCalled();
  });

  it("runs the probe when live rendering is requested", () => {
    const probe = vi.fn(() => true);

    expect(probeWebGL2UnlessForced(false, probe)).toBe(true);
    expect(probe).toHaveBeenCalledOnce();
  });
});
