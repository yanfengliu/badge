import { describe, expect, it } from "vitest";

import { canActivateWithSaying } from "./app-types";
import { initialSayingEditorState, reduceSayingEditorState } from "./saying-editor-state";

describe("saying editor state", () => {
  it("keeps badge B editing when badge A finishes saving", () => {
    let state = reduceSayingEditorState(initialSayingEditorState, {
      type: "save-started",
      recordId: "record-a",
    });
    state = reduceSayingEditorState(state, {
      type: "begin",
      recordId: "record-b",
      fallbackValue: "B draft",
    });
    state = reduceSayingEditorState(state, {
      type: "save-succeeded",
      recordId: "record-a",
    });

    expect(state.editingRecords["record-b"]).toBe(true);
    expect(state.manualSayings["record-b"]).toBe("B draft");
    expect(state.editingRecords["record-a"]).toBe(false);
  });

  it("resumes an unsaved per-badge draft after navigation without replacing it with accepted text", () => {
    let state = reduceSayingEditorState(initialSayingEditorState, {
      type: "begin",
      recordId: "record-a",
      fallbackValue: "Accepted A",
    });
    state = reduceSayingEditorState(state, {
      type: "change",
      recordId: "record-a",
      value: "Unsaved A draft",
      error: null,
      dirty: true,
    });
    state = reduceSayingEditorState(state, { type: "hide", recordId: "record-a" });
    state = reduceSayingEditorState(state, { type: "resume-dirty", recordId: "record-a" });

    expect(state.editingRecords["record-a"]).toBe(true);
    expect(state.manualSayings["record-a"]).toBe("Unsaved A draft");
    expect(state.dirtyRecords["record-a"]).toBe(true);
    expect(
      canActivateWithSaying("Accepted A", {
        editing: state.editingRecords["record-a"] ?? false,
        saving: state.savingRecords["record-a"] ?? false,
        hasUnsavedDraft: state.dirtyRecords["record-a"] ?? false,
      }),
    ).toBe(false);

    state = reduceSayingEditorState(state, { type: "cancel", recordId: "record-a" });
    expect(
      canActivateWithSaying("Accepted A", {
        editing: state.editingRecords["record-a"] ?? false,
        saving: state.savingRecords["record-a"] ?? false,
        hasUnsavedDraft: state.dirtyRecords["record-a"] ?? false,
      }),
    ).toBe(true);
  });

  it("explicit Cancel discards the draft so reopening starts from accepted text", () => {
    let state = reduceSayingEditorState(initialSayingEditorState, {
      type: "begin",
      recordId: "record-a",
      fallbackValue: "Accepted A",
    });
    state = reduceSayingEditorState(state, {
      type: "change",
      recordId: "record-a",
      value: "Discard me",
      error: null,
      dirty: true,
    });
    state = reduceSayingEditorState(state, { type: "cancel", recordId: "record-a" });
    state = reduceSayingEditorState(state, {
      type: "begin",
      recordId: "record-a",
      fallbackValue: "Accepted A",
    });

    expect(state.manualSayings["record-a"]).toBe("Accepted A");
  });

  it("clears pre-restore text, errors, editing, and saving state", () => {
    const dirtyState = {
      manualSayings: { "record-yosemite": "Old pre-restore text" },
      manualErrors: { "record-yosemite": "Old error" },
      editingRecords: { "record-yosemite": true },
      savingRecords: { "record-yosemite": true },
      dirtyRecords: { "record-yosemite": true },
    };

    expect(reduceSayingEditorState(dirtyState, { type: "archive-restored" })).toEqual(
      initialSayingEditorState,
    );
  });
});
