import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SayingProposalSnapshot } from "@badge/archive-application";

import { canActivateWithSaying } from "./app-types";
import { manualSayingEditorStartValue, type AcceptedSayingProtection } from "./accepted-saying-attribution";
import { SayingActivationControl, SayingComposer } from "./SayingComposer";
import { initialSayingEditorState, reduceSayingEditorState } from "./saying-editor-state";

interface RenderOverrides {
  readonly acceptedSaying?: string | null;
  readonly editing?: boolean;
  readonly generationBlocked?: boolean;
  readonly manualValue?: string;
  readonly acceptedSayingProtection?: AcceptedSayingProtection;
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
      acceptedSayingProtection={overrides.acceptedSayingProtection ?? null}
      saving={false}
      generationBlocked={overrides.generationBlocked ?? false}
      proposalSourceLabel="local preview"
      providerNote="Fixture mode uses curated local lines."
      focusTargetRef={{ current: null }}
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
    expect(html).toContain('class="saying-block" tabindex="-1"');
    expect(html).not.toContain("maxlength");
  });

  it("announces request state through the already-mounted status region", () => {
    const html = renderComposer({
      recordId: "record-yosemite",
      status: "requesting",
      proposal: { kind: "original", saying: "Worth every switchback." },
      provenance: null,
      error: null,
    });

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Preparing a saying proposal.");
    expect(html).toContain("Worth every switchback.");
    expect(html).toMatch(
      /role="status"[^>]*>.*Preparing a saying proposal\.<\/div><div class="saying-interactions" aria-busy="true">/u,
    );
  });

  it("announces a failed retry without calling the retained proposal newly ready", () => {
    const html = renderComposer({
      recordId: "record-yosemite",
      status: "error",
      proposal: { kind: "original", saying: "Worth every switchback." },
      provenance: null,
      error: "Preview source unavailable.",
    });

    expect(html).toContain("Could not prepare another saying.");
    expect(html).toContain("The previous proposal remains available.");
    expect(html).not.toContain("Saying proposal ready:");
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
      "Saying for Yosemite has 801 graphemes; use at most 800.",
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Save my saying<\/button>/u);
  });

  it("keeps generation disabled while provider disclosure is open", () => {
    const html = renderComposer(
      {
        recordId: "record-yosemite",
        status: "idle",
        proposal: null,
        provenance: null,
        error: null,
      },
      null,
      { editing: false, generationBlocked: true },
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Review Claude access…<\/button>/u);
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

    expect(html).toContain("<textarea");
    expect(html).toContain(">Unsaved B</textarea>");
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

  it("renders originals plainly and historical sources as one semantic quotation", () => {
    const original = renderComposer(
      {
        recordId: "record-yosemite",
        status: "ready",
        proposal: { kind: "original", saying: "The valley kept a little time for me." },
        provenance: null,
        error: null,
      },
      null,
      { editing: false },
    );
    expect(original).toContain("The valley kept a little time for me.");
    expect(original).toContain("Suggestion · source not verified");
    expect(original).not.toContain("New saying");
    expect(original).not.toContain("Original saying");
    expect(original).not.toContain("“The valley kept");

    const quotation = renderComposer(
      {
        recordId: "record-yosemite",
        status: "ready",
        proposal: {
          kind: "quotation",
          saying: "But in every walk with Nature one receives far more than he seeks.",
          quotation: {
            id: "john-muir-every-walk-nature",
            text: "But in every walk with Nature one receives far more than he seeks.",
            person: "John Muir",
            sourceTitle: "Steep Trails",
            sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
          },
        },
        provenance: null,
        error: null,
      },
      null,
      { editing: false },
    );
    expect(quotation.match(/“/gu)).toHaveLength(2);
    expect(quotation).toContain("— John Muir, Steep Trails");
    expect(quotation).toContain("View source");
  });

  it("never preloads an attributed accepted quotation into the personal-text editor", () => {
    const acceptedQuotation =
      "“It is by far the grandest of all the special temples of Nature I was ever permitted to enter.” — John Muir, Letters to a Friend, July 26, 1868";
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
        acceptedSaying: acceptedQuotation,
        editing: false,
        acceptedSayingProtection: { kind: "attributed" },
      },
    );

    expect(html).toContain("Replace with my own");
    expect(html).toContain("The attributed quotation stays exact");
    expect(manualSayingEditorStartValue(acceptedQuotation)).toBe("");
    expect(manualSayingEditorStartValue('"Read not to contradict." — Francis Bacon, Of Studies')).toBe("");
    expect(manualSayingEditorStartValue("A personal line.")).toBe("A personal line.");
    expect(manualSayingEditorStartValue("A thought — held, gently.")).toBe("A thought — held, gently.");
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
