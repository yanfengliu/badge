import { describe, expect, it } from "vitest";

import {
  INITIAL_VIEWER_STATE,
  applyArrowCommand,
  applyZoomCommand,
  applyWheelZoom,
  moveLight,
  moveObject,
  normalizeWheelDelta,
  zoomCommandForKey,
} from "./viewer-state";

describe("viewer interaction contract", () => {
  it("clamps object pitch while leaving yaw free to orbit", () => {
    const moved = moveObject(INITIAL_VIEWER_STATE, 2_000, 2_000);

    expect(moved.yaw).toBeGreaterThan(Math.PI * 2);
    expect(moved.pitch).toBeCloseTo((85 * Math.PI) / 180);
  });

  it("keeps the inspection light inside its useful elevation range", () => {
    const high = moveLight(INITIAL_VIEWER_STATE, 0, -2_000);
    const low = moveLight(INITIAL_VIEWER_STATE, 0, 2_000);

    expect(high.lightElevation).toBeCloseTo((85 * Math.PI) / 180);
    expect(low.lightElevation).toBeCloseTo((5 * Math.PI) / 180);
  });

  it("normalizes line and page wheel units to CSS pixels", () => {
    expect(normalizeWheelDelta(2, 1, 900)).toBe(32);
    expect(normalizeWheelDelta(1, 2, 900)).toBe(900);
    expect(normalizeWheelDelta(40, 0, 900)).toBe(40);
  });

  it("caps each wheel update and keeps zoom inside the documented bounds", () => {
    const oneStep = applyWheelZoom({ ...INITIAL_VIEWER_STATE, zoom: 1 }, -1_000);
    const maximum = applyWheelZoom({ ...INITIAL_VIEWER_STATE, zoom: 2.49 }, -1_000);
    const minimum = applyWheelZoom({ ...INITIAL_VIEWER_STATE, zoom: 0.66 }, 1_000);

    expect(oneStep.zoom).toBeCloseTo(1.1);
    expect(maximum.zoom).toBe(2.2);
    expect(minimum.zoom).toBe(0.65);
  });

  it("uses five-degree arrow steps and one-degree precision steps", () => {
    const ordinary = applyArrowCommand(INITIAL_VIEWER_STATE, "ArrowRight", false, "object");
    const precise = applyArrowCommand(INITIAL_VIEWER_STATE, "ArrowRight", true, "object");

    expect(ordinary.yaw - INITIAL_VIEWER_STATE.yaw).toBeCloseTo((5 * Math.PI) / 180);
    expect(precise.yaw - INITIAL_VIEWER_STATE.yaw).toBeCloseTo(Math.PI / 180);
  });

  it("routes arrow keys to the selected interaction mode only", () => {
    const moved = applyArrowCommand(INITIAL_VIEWER_STATE, "ArrowUp", false, "light");

    expect(moved.pitch).toBe(INITIAL_VIEWER_STATE.pitch);
    expect(moved.lightElevation).toBeGreaterThan(INITIAL_VIEWER_STATE.lightElevation);
  });

  it("uses ten-percent keyboard zoom with a two-percent precision step", () => {
    const ordinary = applyZoomCommand({ ...INITIAL_VIEWER_STATE, zoom: 1 }, "in", false);
    const precise = applyZoomCommand({ ...INITIAL_VIEWER_STATE, zoom: 1 }, "in", true);

    expect(ordinary.zoom).toBeCloseTo(1.1);
    expect(precise.zoom).toBeCloseTo(1.02);
  });

  it("maps plus and minus to ordinary zoom and reserves Alt for precision", () => {
    expect(zoomCommandForKey("Equal", false)).toEqual({ direction: "in", precise: false });
    expect(zoomCommandForKey("Equal", true)).toEqual({ direction: "in", precise: true });
    expect(zoomCommandForKey("NumpadAdd", false)).toEqual({ direction: "in", precise: false });
    expect(zoomCommandForKey("Minus", false)).toEqual({ direction: "out", precise: false });
    expect(zoomCommandForKey("NumpadSubtract", true)).toEqual({ direction: "out", precise: true });
    expect(zoomCommandForKey("KeyA", false)).toBeNull();
  });
});
