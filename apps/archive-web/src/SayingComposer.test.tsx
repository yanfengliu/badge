import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SayingProposalSnapshot } from "@badge/archive-application";

import { canActivateWithSaying } from "./app-types";
import { SayingActivationControl, SayingComposer } from "./SayingComposer";
import { initialSayingEditorState, reduceSayingEditorState } from "./saying-editor-state";

interface RenderOverrides {
  readonly acceptedSaying?: string | null;
  readonly editing?: boolean;
  readonly manualValue?: string;
}

function renderComposer(
  proposal: SayingProposalSnapshot,
  manualError: string | null = null,
  overrides: RenderOverrides = {},
): string {
  return renderToStaticMarkup(
    <SayingComposer
      title="Yosemite"
      lifecycle="planned"
      acceptedSaying={overrides.acceptedSaying ?? null}
      proposal={proposal}
      editing={overrides.editing ?? true}
      manualValue={overrides.manualValue ?? "🏕️"}
      manualError={manualError}
      saving={false}
      onGenerate={() => undefined}
      onUseProposal={() => undefined}
      onStartWriting={() => undefined}
      onCancelWriting={() => undefined}
      onManualChange={() => undefined}
      onSaveManual={() => undefined}
    />,
  );
}

describe("SayingComposer", () => {
  it("keeps a persistent live status region before any proposal exists", () => {
    const html = renderComposer({
      recordId: "record-yosemite",
      status: "idle",
      proposal: null,
      provenance: null,
      error: null,
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain("maxlength");
  });

  it("announces request state through the already-mounted status region", () => {
    const html = renderComposer({
      recordId: "record-yosemite",
      status: "requesting",
      proposal: "Worth every switchback.",
      provenance: null,
      error: null,
    });

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Preparing a local saying preview.");
    expect(html).toContain("Worth every switchback.");
    expect(html).toMatch(
      /role="status"[^>]*>.*Preparing a local saying preview\.<\/div><div class="saying-interactions" aria-busy="true">/u,
    );
  });

  it("announces a failed retry without calling the retained proposal newly ready", () => {
    const html = renderComposer({
      recordId: "record-yosemite",
      status: "error",
      proposal: "Worth every switchback.",
      provenance: null,
      error: "Preview source unavailable.",
    });

    expect(html).toContain("Could not prepare another saying.");
    expect(html).toContain("The previous proposal remains available.");
    expect(html).not.toContain("Local saying proposal ready:");
  });

  it("prevents submitting a manual line that already has an inline error", () => {
    const html = renderComposer(
      {
        recordId: "record-yosemite",
        status: "idle",
        proposal: null,
        provenance: null,
        error: null,
      },
      "Saying for Yosemite has 121 graphemes; use at most 120.",
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Save my saying<\/button>/u);
  });

  it("reopens a retained draft visibly and keeps activation blocked until it is resolved", () => {
    let editor = reduceSayingEditorState(initialSayingEditorState, {
      type: "begin",
      recordId: "record-yosemite",
      fallbackValue: "Accepted A",
    });
    editor = reduceSayingEditorState(editor, {
      type: "change",
      recordId: "record-yosemite",
      value: "Unsaved B",
      error: null,
      dirty: true,
    });
    editor = reduceSayingEditorState(editor, { type: "hide", recordId: "record-yosemite" });
    editor = reduceSayingEditorState(editor, { type: "resume-dirty", recordId: "record-yosemite" });
    const editing = editor.editingRecords["record-yosemite"] ?? false;
    const hasUnsavedDraft = editor.dirtyRecords["record-yosemite"] ?? false;
    const html = renderComposer(
      {
        recordId: "record-yosemite",
        status: "idle",
        proposal: null,
        provenance: null,
        error: null,
      },
      null,
      {
        acceptedSaying: "Accepted A",
        editing,
        manualValue: editor.manualSayings["record-yosemite"],
      },
    );

    expect(html).toContain('value="Unsaved B"');
    expect(html).toContain("Save my saying");
    expect(html).toContain("Cancel");
    expect(
      canActivateWithSaying("Accepted A", {
        editing,
        saving: false,
        hasUnsavedDraft,
      }),
    ).toBe(false);
  });
});

describe("SayingActivationControl", () => {
  it("renders the dirty-draft activation gate after extraction from App", () => {
    const html = renderToStaticMarkup(
      <SayingActivationControl
        buttonRef={{ current: null }}
        acceptedSaying="Accepted A"
        activating={false}
        editing
        saving={false}
        hasUnsavedDraft
      />,
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Resolve saying draft.*<\/button>/u);
    expect(html).toContain("Save or cancel your unsaved saying draft before activation.");
  });
});
