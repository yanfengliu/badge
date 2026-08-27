import { useEffect, useRef, useState } from "react";
import {
  subscribeUntilDisposed,
  type ArchiveApplication,
  type SayingInteractionCommand,
  type SayingProposalSnapshot,
} from "@badge/archive-application";
import type { ArchiveRecord, ArchiveState } from "@badge/archive-domain";
import type { HistoricalQuotation } from "@badge/saying-contract";

import { acceptedFixtureQuotation, alternativeFixtureQuotations } from "./fixture-quotations";
import { isDisclosureRequiredClientMessage } from "./live-saying-client";
import { publishedFixtureForRecordId, publishedFixtureSayingSources } from "./published-fixtures";
import type { SayingDisclosureGateSnapshot } from "./saying-disclosure-gate";
import { createSayingRuntime } from "./saying-runtime";

type PassiveSayingCommand = Exclude<SayingInteractionCommand, { readonly type: "regenerate" }>;

interface UseSayingWorkflowOptions {
  readonly archive: ArchiveApplication;
  readonly selectedRecordId: string;
  readonly selectedRecord: ArchiveRecord | undefined;
  readonly onArchiveState: (state: ArchiveState) => void;
  readonly onError: (message: string) => void;
}

export interface SayingWorkflow {
  readonly proposal: SayingProposalSnapshot;
  readonly saving: boolean;
  readonly acceptedQuotation: HistoricalQuotation | null;
  readonly hasAlternatives: boolean;
  readonly disclosure: SayingDisclosureGateSnapshot;
  readonly providerNote: string;
  readonly successAnnouncement: string | null;
  readonly request: () => void;
  readonly approveDisclosure: () => void;
  readonly closeDisclosure: () => void;
  readonly retryDisclosure: () => void;
  readonly observe: (command: PassiveSayingCommand) => Promise<void>;
}

function releaseArchiveFocusForDisclosure(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

export async function persistReadyQuotation(
  archive: Pick<ArchiveApplication, "updateQuotation">,
  snapshot: SayingProposalSnapshot,
): Promise<ArchiveState | null> {
  if (snapshot.status !== "ready" || !snapshot.proposal) return null;
  return archive.updateQuotation(snapshot.recordId, snapshot.proposal, snapshot.expectedQuotationRevision);
}

export function trackSayingWrite(activeWrites: Set<Promise<void>>, write: Promise<void>): void {
  activeWrites.add(write);
  void write.then(
    () => activeWrites.delete(write),
    () => activeWrites.delete(write),
  );
}

export async function drainSayingWrites(activeWrites: ReadonlySet<Promise<void>>): Promise<void> {
  await Promise.allSettled([...activeWrites]);
}

export function shouldSurfaceSayingWriteOutcome(
  recordId: string,
  selectedRecordId: string,
  writeNavigationEpoch: number,
  currentNavigationEpoch: number,
): boolean {
  return recordId === selectedRecordId && writeNavigationEpoch === currentNavigationEpoch;
}

export function clearSayingMessagesForNavigation(
  current: Readonly<Record<string, string | null>>,
  departingRecordId: string,
  arrivingRecordId?: string,
): Readonly<Record<string, string | null>> {
  const next = { ...current };
  delete next[departingRecordId];
  if (arrivingRecordId) delete next[arrivingRecordId];
  return next;
}

const staleArchiveMutationCodes = new Set(["ALREADY_EARNED", "INVALID_LIFECYCLE", "SAYING_CONFLICT"]);

export async function stateAfterStaleArchiveMutation(
  archive: Pick<ArchiveApplication, "state">,
  error: unknown,
): Promise<ArchiveState | null> {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string" ||
    !staleArchiveMutationCodes.has(error.code)
  ) {
    return null;
  }
  return archive.state();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useSayingWorkflow({
  archive,
  selectedRecordId,
  selectedRecord,
  onArchiveState,
  onError,
}: UseSayingWorkflowOptions): SayingWorkflow {
  const [proposals, setProposals] = useState<Record<string, SayingProposalSnapshot>>({});
  const [savingRecords, setSavingRecords] = useState<Readonly<Record<string, boolean>>>({});
  const [generationErrors, setGenerationErrors] = useState<Readonly<Record<string, string | null>>>({});
  const [successAnnouncements, setSuccessAnnouncements] = useState<Readonly<Record<string, string | null>>>(
    {},
  );
  const [acceptingRecords] = useState(() => new Set<string>());
  const activeWrites = useRef(new Set<Promise<void>>());
  const navigationEpoch = useRef(0);
  const selectedRecordIdRef = useRef(selectedRecordId);
  const callbacks = useRef({ onArchiveState, onError });
  const [runtime] = useState(() =>
    createSayingRuntime(import.meta.env.MODE, publishedFixtureSayingSources()),
  );
  const [disclosure, setDisclosure] = useState<SayingDisclosureGateSnapshot>(
    () => runtime.disclosureGate?.snapshot() ?? { phase: "idle", review: null, error: null },
  );
  const { controller, disclosureGate } = runtime;

  useEffect(() => {
    selectedRecordIdRef.current = selectedRecordId;
  }, [selectedRecordId]);

  useEffect(() => {
    callbacks.current = { onArchiveState, onError };
  }, [onArchiveState, onError]);

  useEffect(() => {
    let active = true;
    const unsubscribeController = subscribeUntilDisposed(controller, (snapshot) => {
      setProposals((current) => ({ ...current, [snapshot.recordId]: snapshot }));
      if (isDisclosureRequiredClientMessage(snapshot.error)) releaseArchiveFocusForDisclosure();
      runtime.handleProposalSnapshot(snapshot);
      if (snapshot.status !== "ready" || !snapshot.proposal || acceptingRecords.has(snapshot.recordId)) {
        return;
      }

      acceptingRecords.add(snapshot.recordId);
      const writeNavigationEpoch = navigationEpoch.current;
      setSavingRecords((current) => ({ ...current, [snapshot.recordId]: true }));
      setGenerationErrors((current) => ({ ...current, [snapshot.recordId]: null }));
      const write = persistReadyQuotation(archive, snapshot)
        .then((state) => {
          if (active && state) {
            callbacks.current.onArchiveState(state);
            const quotation = snapshot.proposal?.quotation;
            if (
              quotation &&
              shouldSurfaceSayingWriteOutcome(
                snapshot.recordId,
                selectedRecordIdRef.current,
                writeNavigationEpoch,
                navigationEpoch.current,
              )
            ) {
              setSuccessAnnouncements((current) => ({
                ...current,
                [snapshot.recordId]: `Quote regenerated. “${quotation.text}” — ${quotation.person}.`,
              }));
            }
          }
          controller.dismiss(snapshot.recordId);
        })
        .catch(async (error: unknown) => {
          let message = errorText(error);
          let refreshedState: ArchiveState | null = null;
          try {
            refreshedState = await stateAfterStaleArchiveMutation(archive, error);
          } catch (refreshError) {
            message = `${message} Badge also could not reload the newer Archive state: ${errorText(refreshError)}`;
          }
          if (active) {
            if (refreshedState) callbacks.current.onArchiveState(refreshedState);
            if (
              shouldSurfaceSayingWriteOutcome(
                snapshot.recordId,
                selectedRecordIdRef.current,
                writeNavigationEpoch,
                navigationEpoch.current,
              )
            ) {
              setSuccessAnnouncements((current) => ({ ...current, [snapshot.recordId]: null }));
              setGenerationErrors((current) => ({ ...current, [snapshot.recordId]: message }));
              callbacks.current.onError(message);
            }
          }
          controller.dismiss(snapshot.recordId);
        })
        .finally(() => {
          acceptingRecords.delete(snapshot.recordId);
          if (active) {
            setSavingRecords((current) => ({ ...current, [snapshot.recordId]: false }));
          }
        });
      trackSayingWrite(activeWrites.current, write);
    });
    const unsubscribeDisclosure = disclosureGate?.subscribe(setDisclosure);
    return () => {
      active = false;
      unsubscribeController();
      unsubscribeDisclosure?.();
      runtime.dispose();
    };
  }, [acceptingRecords, archive, controller, disclosureGate, runtime]);

  const rawProposal = proposals[selectedRecordId] ?? controller.snapshot(selectedRecordId);
  const localError = generationErrors[selectedRecordId] ?? null;
  const proposal = localError ? { ...rawProposal, status: "error" as const, error: localError } : rawProposal;
  const saving = savingRecords[selectedRecordId] ?? false;
  const successAnnouncement = successAnnouncements[selectedRecordId] ?? null;
  const fixture = selectedRecord ? publishedFixtureForRecordId(selectedRecord.recordId) : undefined;
  const acceptedQuotation = acceptedFixtureQuotation(fixture, selectedRecord?.acceptedSaying);
  const hasAlternatives = fixture
    ? alternativeFixtureQuotations(fixture, selectedRecord?.acceptedSaying).length > 0
    : false;

  function request() {
    if (!selectedRecord || !fixture) return;
    const allowedQuotations = alternativeFixtureQuotations(fixture, selectedRecord.acceptedSaying);
    if (allowedQuotations.length === 0) {
      setGenerationErrors((current) => ({
        ...current,
        [selectedRecord.recordId]: `No alternative source-checked quotations are available for ${selectedRecord.title}.`,
      }));
      return;
    }
    setGenerationErrors((current) => ({ ...current, [selectedRecord.recordId]: null }));
    setSuccessAnnouncements((current) => ({ ...current, [selectedRecord.recordId]: null }));
    const intent = {
      type: "regenerate",
      recordId: selectedRecord.recordId,
      expectedQuotationRevision: selectedRecord.quotationRevision,
      promptInput: {
        title: selectedRecord.title,
        criterion: selectedRecord.criterion,
        allowedQuotations,
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

  async function observe(command: PassiveSayingCommand): Promise<void> {
    if (command.type === "badge-selected") {
      navigationEpoch.current += 1;
      controller.dismiss(selectedRecordId);
      if (command.recordId && command.recordId !== selectedRecordId) {
        controller.dismiss(command.recordId);
      }
      disclosureGate?.close();
      setGenerationErrors((current) =>
        clearSayingMessagesForNavigation(current, selectedRecordId, command.recordId),
      );
      setSuccessAnnouncements((current) =>
        clearSayingMessagesForNavigation(current, selectedRecordId, command.recordId),
      );
    }
    if (command.type === "archive-restored") {
      navigationEpoch.current += 1;
      disclosureGate?.close();
      setGenerationErrors({});
      setSuccessAnnouncements({});
    }
    if (command.type === "badge-activated") disclosureGate?.close();
    await controller.dispatch(command);
    if (command.type === "archive-restored") {
      await drainSayingWrites(activeWrites.current);
      setGenerationErrors({});
      setSuccessAnnouncements({});
    }
  }

  return {
    proposal,
    saving,
    acceptedQuotation,
    hasAlternatives,
    disclosure,
    providerNote: runtime.providerNote,
    successAnnouncement,
    request,
    approveDisclosure,
    closeDisclosure,
    retryDisclosure,
    observe,
  };
}
