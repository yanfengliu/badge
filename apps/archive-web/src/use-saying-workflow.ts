import { useEffect, useReducer, useState } from "react";
import {
  SayingProposalController,
  subscribeUntilDisposed,
  type ArchiveApplication,
  type SayingInteractionCommand,
  type SayingProposalSnapshot,
} from "@badge/archive-application";
import { validateSaying, type ArchiveRecord, type ArchiveState } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";

import { sayingValidationMessage } from "./app-types";
import { initialSayingEditorState, reduceSayingEditorState } from "./saying-editor-state";
import { createFixtureSayingProvider } from "./saying-proposals";

type PassiveSayingCommand = Exclude<SayingInteractionCommand, { readonly type: "generate" | "try-another" }>;

interface UseSayingWorkflowOptions {
  readonly archive: ArchiveApplication;
  readonly selectedRecordId: string;
  readonly selectedRecord: ArchiveRecord | undefined;
  readonly onArchiveState: (state: ArchiveState) => void;
  readonly onError: (message: string) => void;
}

export interface SayingWorkflow {
  readonly proposal: SayingProposalSnapshot;
  readonly editing: boolean;
  readonly saving: boolean;
  readonly hasUnsavedDraft: boolean;
  readonly manualValue: string;
  readonly manualError: string | null;
  readonly request: () => void;
  readonly useProposal: () => void;
  readonly startWriting: () => void;
  readonly cancelWriting: () => void;
  readonly changeManual: (value: string) => void;
  readonly saveManual: () => void;
  readonly observe: (command: PassiveSayingCommand) => Promise<void>;
}

export function useSayingWorkflow({
  archive,
  selectedRecordId,
  selectedRecord,
  onArchiveState,
  onError,
}: UseSayingWorkflowOptions): SayingWorkflow {
  const [proposals, setProposals] = useState<Record<string, SayingProposalSnapshot>>({});
  const [editor, dispatchEditor] = useReducer(reduceSayingEditorState, initialSayingEditorState);
  const [controller] = useState(
    () => new SayingProposalController(createFixtureSayingProvider(starterBadges)),
  );

  useEffect(() => {
    return subscribeUntilDisposed(controller, (snapshot) =>
      setProposals((current) => ({ ...current, [snapshot.recordId]: snapshot })),
    );
  }, [controller]);

  const proposal = proposals[selectedRecordId] ?? controller.snapshot(selectedRecordId);
  const manualValue = editor.manualSayings[selectedRecordId] ?? selectedRecord?.acceptedSaying ?? "";
  const manualError = editor.manualErrors[selectedRecordId] ?? null;
  const editing = editor.editingRecords[selectedRecordId] ?? false;
  const saving = editor.savingRecords[selectedRecordId] ?? false;
  const hasUnsavedDraft = editor.dirtyRecords[selectedRecordId] ?? false;

  function request() {
    if (!selectedRecord) return;
    void controller.dispatch({
      type: proposal.proposal ? "try-another" : "generate",
      recordId: selectedRecord.recordId,
      promptInput: { title: selectedRecord.title, criterion: selectedRecord.criterion },
    });
  }

  function startWriting() {
    dispatchEditor({
      type: "begin",
      recordId: selectedRecordId,
      fallbackValue: selectedRecord?.acceptedSaying ?? "",
    });
  }

  function cancelWriting() {
    dispatchEditor({ type: "cancel", recordId: selectedRecordId });
  }

  function changeManual(value: string) {
    const validation = validateSaying(value);
    dispatchEditor({
      type: "change",
      recordId: selectedRecordId,
      value,
      error:
        !validation.ok && validation.code === "TOO_LONG"
          ? sayingValidationMessage(selectedRecord?.title ?? "this badge", value)
          : null,
      dirty: validation.value !== (selectedRecord?.acceptedSaying ?? ""),
    });
  }

  async function persist(value: string, dismissProposal: boolean) {
    if (!selectedRecord) return;
    const recordId = selectedRecord.recordId;
    const validation = validateSaying(value);
    if (!validation.ok) {
      dispatchEditor({
        type: "validation-error",
        recordId,
        error: sayingValidationMessage(selectedRecord.title, value)!,
      });
      return;
    }

    dispatchEditor({ type: "save-started", recordId });
    try {
      const state = await archive.updateSaying(recordId, validation.value);
      onArchiveState(state);
      dispatchEditor({ type: "save-succeeded", recordId });
      if (dismissProposal) controller.dismiss(recordId);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      dispatchEditor({ type: "save-finished", recordId });
    }
  }

  function useProposal() {
    if (proposal.proposal) void persist(proposal.proposal, true);
  }

  function saveManual() {
    void persist(manualValue, false);
  }

  function observe(command: PassiveSayingCommand): Promise<void> {
    if (command.type === "badge-selected") {
      dispatchEditor({ type: "hide", recordId: selectedRecordId });
      if (command.recordId) dispatchEditor({ type: "resume-dirty", recordId: command.recordId });
    }
    if (command.type === "archive-restored") {
      dispatchEditor({ type: "archive-restored" });
    }
    return controller.dispatch(command);
  }

  return {
    proposal,
    editing,
    saving,
    hasUnsavedDraft,
    manualValue,
    manualError,
    request,
    useProposal,
    startWriting,
    cancelWriting,
    changeManual,
    saveManual,
    observe,
  };
}
