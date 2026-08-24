import { useEffect, useReducer, useState } from "react";
import {
  subscribeUntilDisposed,
  type ArchiveApplication,
  type SayingInteractionCommand,
  type SayingProposalSnapshot,
} from "@badge/archive-application";
import { validateSaying, type ArchiveRecord, type ArchiveState } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { formatSayingForArchive } from "@badge/saying-contract";

import {
  manualSayingEditorStartValue,
  protectAcceptedSaying,
  type AcceptedSayingProtection,
} from "./accepted-saying-attribution";
import { sayingValidationMessage } from "./app-types";
import { isDisclosureRequiredClientMessage } from "./live-saying-client";
import type { SayingDisclosureGateSnapshot } from "./saying-disclosure-gate";
import { initialSayingEditorState, reduceSayingEditorState } from "./saying-editor-state";
import { createSayingRuntime } from "./saying-runtime";

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
  readonly acceptedSayingProtection: AcceptedSayingProtection;
  readonly disclosure: SayingDisclosureGateSnapshot;
  readonly proposalSourceLabel: string;
  readonly providerNote: string;
  readonly request: () => void;
  readonly approveDisclosure: () => void;
  readonly closeDisclosure: () => void;
  readonly retryDisclosure: () => void;
  readonly useProposal: () => void;
  readonly startWriting: () => void;
  readonly cancelWriting: () => void;
  readonly changeManual: (value: string) => void;
  readonly saveManual: () => void;
  readonly observe: (command: PassiveSayingCommand) => Promise<void>;
}

function releaseArchiveFocusForDisclosure(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
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
  const [runtime] = useState(() => createSayingRuntime(import.meta.env.MODE, starterBadges));
  const [disclosure, setDisclosure] = useState<SayingDisclosureGateSnapshot>(
    () => runtime.disclosureGate?.snapshot() ?? { phase: "idle", review: null, error: null },
  );
  const { controller, disclosureGate } = runtime;

  useEffect(() => {
    const unsubscribeController = subscribeUntilDisposed(controller, (snapshot) => {
      setProposals((current) => ({ ...current, [snapshot.recordId]: snapshot }));
      if (isDisclosureRequiredClientMessage(snapshot.error)) releaseArchiveFocusForDisclosure();
      runtime.handleProposalSnapshot(snapshot);
    });
    const unsubscribeDisclosure = disclosureGate?.subscribe(setDisclosure);
    return () => {
      unsubscribeController();
      unsubscribeDisclosure?.();
      runtime.dispose();
    };
  }, [controller, disclosureGate, runtime]);

  const proposal = proposals[selectedRecordId] ?? controller.snapshot(selectedRecordId);
  const manualValue = editor.manualSayings[selectedRecordId] ?? selectedRecord?.acceptedSaying ?? "";
  const manualError = editor.manualErrors[selectedRecordId] ?? null;
  const editing = editor.editingRecords[selectedRecordId] ?? false;
  const saving = editor.savingRecords[selectedRecordId] ?? false;
  const hasUnsavedDraft = editor.dirtyRecords[selectedRecordId] ?? false;
  const acceptedSayingProtection = protectAcceptedSaying(selectedRecord?.acceptedSaying);

  function request() {
    if (!selectedRecord) return;
    const fixture = starterBadges.find(
      (badge) => selectedRecord.recordId === `starter:${badge.definitionId}`,
    );
    const intent = {
      type: proposal.proposal ? "try-another" : "generate",
      recordId: selectedRecord.recordId,
      promptInput: {
        title: selectedRecord.title,
        criterion: selectedRecord.criterion,
        ...(fixture?.historicalQuotations.length
          ? { allowedQuotations: fixture.historicalQuotations.map((quotation) => ({ ...quotation })) }
          : {}),
      },
    } as const;
    if (disclosureGate) {
      if (!disclosureGate.acknowledgedFingerprint()) releaseArchiveFocusForDisclosure();
      void disclosureGate.request(intent);
    } else void controller.dispatch(intent);
  }

  function approveDisclosure() {
    void disclosureGate?.approve();
  }

  function closeDisclosure() {
    disclosureGate?.close();
  }

  function retryDisclosure() {
    void disclosureGate?.retry();
  }

  function startWriting() {
    dispatchEditor({
      type: "begin",
      recordId: selectedRecordId,
      fallbackValue: manualSayingEditorStartValue(selectedRecord?.acceptedSaying, acceptedSayingProtection),
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
        !validation.ok && validation.code !== "EMPTY"
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
    if (proposal.proposal) void persist(formatSayingForArchive(proposal.proposal), true);
  }

  function saveManual() {
    void persist(manualValue, false);
  }

  function observe(command: PassiveSayingCommand): Promise<void> {
    if (command.type === "badge-selected") {
      controller.cancel(selectedRecordId);
      disclosureGate?.close();
      dispatchEditor({ type: "hide", recordId: selectedRecordId });
      if (command.recordId) dispatchEditor({ type: "resume-dirty", recordId: command.recordId });
    }
    if (command.type === "archive-restored") {
      disclosureGate?.close();
      dispatchEditor({ type: "archive-restored" });
    }
    if (command.type === "badge-activated") disclosureGate?.close();
    return controller.dispatch(command);
  }

  return {
    proposal,
    editing,
    saving,
    hasUnsavedDraft,
    manualValue,
    manualError,
    acceptedSayingProtection,
    disclosure,
    proposalSourceLabel: runtime.proposalSourceLabel,
    providerNote: runtime.providerNote,
    request,
    approveDisclosure,
    closeDisclosure,
    retryDisclosure,
    useProposal,
    startWriting,
    cancelWriting,
    changeManual,
    saveManual,
    observe,
  };
}
