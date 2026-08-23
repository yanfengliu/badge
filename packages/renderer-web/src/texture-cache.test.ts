import { afterEach, describe, expect, it, vi } from "vitest";
import { Texture } from "three";

import { retainSourceTexture } from "./texture-cache";

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("source texture retention", () => {
  it("makes each release idempotent while another viewer still retains the texture", () => {
    vi.useFakeTimers();
    const texture = new Texture();
    const dispose = vi.spyOn(texture, "dispose");
    const releaseFirst = retainSourceTexture("asset://shared-wool", texture);
    const releaseSecond = retainSourceTexture("asset://shared-wool", texture);

    releaseFirst();
    releaseFirst();
    vi.runOnlyPendingTimers();
    expect(dispose).not.toHaveBeenCalled();

    releaseSecond();
    vi.runOnlyPendingTimers();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("cancels pending disposal when another viewer retains the texture", () => {
    vi.useFakeTimers();
    const texture = new Texture();
    const dispose = vi.spyOn(texture, "dispose");
    const releaseFirst = retainSourceTexture("asset://handoff", texture);

    releaseFirst();
    const releaseSecond = retainSourceTexture("asset://handoff", texture);
    vi.runOnlyPendingTimers();
    expect(dispose).not.toHaveBeenCalled();

    releaseSecond();
    vi.runOnlyPendingTimers();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
