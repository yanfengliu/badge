import { describe, expect, it } from "vitest";

import { INITIAL_VIEWER_STATE } from "./viewer-state";
import { SINGLE_TURN_DURATION_MS, singleTurnYawAtElapsed } from "./single-turn";

describe("single-turn presentation contract", () => {
  it("advances monotonically through one exact revolution and then holds", () => {
    const startYaw = INITIAL_VIEWER_STATE.yaw;
    const samples = [
      singleTurnYawAtElapsed(startYaw, -1),
      singleTurnYawAtElapsed(startYaw, 0),
      singleTurnYawAtElapsed(startYaw, SINGLE_TURN_DURATION_MS / 4),
      singleTurnYawAtElapsed(startYaw, SINGLE_TURN_DURATION_MS / 2),
      singleTurnYawAtElapsed(startYaw, SINGLE_TURN_DURATION_MS * 0.75),
      singleTurnYawAtElapsed(startYaw, SINGLE_TURN_DURATION_MS),
      singleTurnYawAtElapsed(startYaw, SINGLE_TURN_DURATION_MS * 2),
    ];

    expect(samples[0]).toBe(startYaw);
    expect(samples[1]).toBe(startYaw);
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1]!);
    }
    expect(samples.at(-2)).toBe(startYaw + Math.PI * 2);
    expect(samples.at(-1)).toBe(startYaw + Math.PI * 2);
  });
});
