import { describe, expect, it } from "vitest";

import {
  artDirectionReducer,
  createInitialArtDirectionState,
  resolveVisibleSelection,
} from "./art-direction-library-state.js";

describe("the art-direction interaction state", () => {
  it("shows the first visible result when a search hides the prior selection", () => {
    expect(resolveVisibleSelection(["yosemite"], "acadia")).toBe("yosemite");
    expect(resolveVisibleSelection(["acadia", "yosemite"], "yosemite")).toBe("yosemite");
    expect(resolveVisibleSelection([], "acadia")).toBeNull();
  });

  it("resets role, override, query, and clipboard feedback across content tabs", () => {
    let state = createInitialArtDirectionState();
    state = artDirectionReducer(state, { type: "select-role", role: "terrain-memory" });
    state = artDirectionReducer(state, { type: "override-style", id: "thread-painted-embroidery" });
    state = artDirectionReducer(state, { type: "set-query", query: "Yosemite" });
    state = artDirectionReducer(state, { type: "report-copy", status: "copied" });
    state = artDirectionReducer(state, { type: "select-tab", tab: "ideas" });

    expect(state).toMatchObject({
      activeTab: "ideas",
      query: "",
      role: "landmark-witness",
      styleOverrideId: null,
      copyStatus: null,
    });
  });

  it("resets a candidate direction when selecting another park or idea", () => {
    let state = createInitialArtDirectionState();
    state = artDirectionReducer(state, { type: "select-role", role: "emblematic-metaphor" });
    state = artDirectionReducer(state, { type: "override-style", id: "screenprint-night" });
    state = artDirectionReducer(state, { type: "select-park", slug: "yosemite" });
    expect(state).toMatchObject({
      selectedParkSlug: "yosemite",
      role: "landmark-witness",
      styleOverrideId: null,
    });
  });
});
