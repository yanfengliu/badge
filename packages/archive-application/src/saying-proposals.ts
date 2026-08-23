import {
  sayingProviderResultSchema,
  sayingRequestSchema,
  type SayingProvider,
  type SayingProviderProvenance,
  type SayingRequest,
} from "@badge/saying-contract";

export type SayingProposalStatus = "idle" | "requesting" | "ready" | "error";

export interface SayingProposalSnapshot {
  readonly recordId: string;
  readonly status: SayingProposalStatus;
  readonly proposal: string | null;
  readonly provenance: SayingProviderProvenance | null;
  readonly error: string | null;
}

export type SayingInteractionCommand =
  | {
      readonly type: "generate" | "try-another";
      readonly recordId: string;
      readonly promptInput: SayingRequest;
    }
  | {
      readonly type:
        "archive-opened" | "badge-selected" | "badge-activated" | "ceremony-replayed" | "archive-restored";
      readonly recordId?: string;
    };

interface ActiveRequest {
  readonly requestId: number;
  readonly abortController: AbortController;
}

type SayingProposalListener = (snapshot: SayingProposalSnapshot) => void;

export function subscribeUntilDisposed(
  controller: SayingProposalController,
  listener: SayingProposalListener,
): () => void {
  const unsubscribe = controller.subscribe(listener);
  return () => {
    unsubscribe();
    controller.cancelAll();
  };
}

function emptySnapshot(recordId: string): SayingProposalSnapshot {
  return {
    recordId,
    status: "idle",
    proposal: null,
    provenance: null,
    error: null,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class SayingProposalController {
  private readonly snapshots = new Map<string, SayingProposalSnapshot>();
  private readonly activeRequests = new Map<string, ActiveRequest>();
  private readonly listeners = new Set<SayingProposalListener>();
  private nextRequestId = 1;

  constructor(private readonly provider: SayingProvider) {}

  snapshot(recordId: string): SayingProposalSnapshot {
    return this.snapshots.get(recordId) ?? emptySnapshot(recordId);
  }

  subscribe(listener: SayingProposalListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async dispatch(command: SayingInteractionCommand): Promise<void> {
    if (command.type === "generate" || command.type === "try-another") {
      await this.request(command.recordId, command.promptInput);
      return;
    }
    if (command.type === "badge-activated" && command.recordId) this.cancel(command.recordId);
    if (command.type === "archive-restored") this.clearAll();
  }

  dismiss(recordId: string): void {
    this.invalidate(recordId);
    this.publish(emptySnapshot(recordId));
  }

  cancel(recordId: string): void {
    if (!this.activeRequests.has(recordId)) return;
    this.invalidate(recordId);
    const current = this.snapshot(recordId);
    this.publish({
      ...current,
      status: current.proposal ? "ready" : "idle",
      error: null,
    });
  }

  cancelAll(): void {
    for (const recordId of [...this.activeRequests.keys()]) this.cancel(recordId);
  }

  clearAll(): void {
    const recordIds = new Set([...this.snapshots.keys(), ...this.activeRequests.keys()]);
    for (const recordId of recordIds) {
      this.invalidate(recordId);
      this.publish(emptySnapshot(recordId));
    }
  }

  private publish(snapshot: SayingProposalSnapshot): void {
    this.snapshots.set(snapshot.recordId, snapshot);
    for (const listener of this.listeners) listener(snapshot);
  }

  private async request(recordId: string, promptInput: SayingRequest): Promise<void> {
    const previous = this.snapshot(recordId);
    this.activeRequests.get(recordId)?.abortController.abort();

    const requestId = this.nextRequestId++;
    const abortController = new AbortController();
    this.activeRequests.set(recordId, { requestId, abortController });
    this.publish({ ...previous, status: "requesting", error: null });

    try {
      const validatedInput = sayingRequestSchema.parse(promptInput);
      const result = sayingProviderResultSchema.parse(
        await this.provider.propose({
          requestId,
          promptInput: validatedInput,
          signal: abortController.signal,
        }),
      );
      if (!this.isLatest(recordId, requestId) || abortController.signal.aborted) return;
      this.publish({
        recordId,
        status: "ready",
        proposal: result.response.saying,
        provenance: result.provenance,
        error: null,
      });
    } catch (error) {
      if (!this.isLatest(recordId, requestId) || abortController.signal.aborted) return;
      this.publish({ ...previous, status: "error", error: errorMessage(error) });
    } finally {
      if (this.isLatest(recordId, requestId)) this.activeRequests.delete(recordId);
    }
  }

  private isLatest(recordId: string, requestId: number): boolean {
    return this.activeRequests.get(recordId)?.requestId === requestId;
  }

  private invalidate(recordId: string): void {
    this.activeRequests.get(recordId)?.abortController.abort();
    this.activeRequests.delete(recordId);
  }
}
