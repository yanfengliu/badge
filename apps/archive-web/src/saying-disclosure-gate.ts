import { sayingRequestSchema, type SayingRequest } from "@badge/saying-contract";
import {
  buildSayingDisclosureReview,
  sayingDisclosureSchema,
  type SayingDisclosure,
  type SayingDisclosureReview,
} from "@badge/saying-live-contract";

export interface SayingGenerationIntent {
  readonly type: "generate" | "try-another";
  readonly recordId: string;
  readonly promptInput: SayingRequest;
}

export type SayingDisclosurePhase = "idle" | "loading" | "review" | "error";

export interface SayingDisclosureGateSnapshot {
  readonly phase: SayingDisclosurePhase;
  readonly review: SayingDisclosureReview | null;
  readonly error: string | null;
}

type DisclosureLoader = (signal: AbortSignal) => Promise<SayingDisclosure>;
type AuthorizedGeneration = (
  intent: SayingGenerationIntent,
  review: SayingDisclosureReview,
) => Promise<void> | void;
type GateListener = (snapshot: SayingDisclosureGateSnapshot) => void;
type RequestValidationIssue = { readonly path: readonly PropertyKey[] };
type SayingRequestField = "title" | "criterion" | "direction" | "allowedQuotations";

const sayingRequestFieldOrder: readonly SayingRequestField[] = [
  "title",
  "criterion",
  "direction",
  "allowedQuotations",
];

const sayingRequestFieldCorrections: Readonly<Record<SayingRequestField, string>> = {
  title: "provide a non-empty badge title within the supported length",
  criterion: "provide a non-empty achievement criterion within the supported length",
  direction: "correct or remove the optional direction",
  allowedQuotations: "correct or remove the optional allowedQuotations list",
};

const idleSnapshot: SayingDisclosureGateSnapshot = {
  phase: "idle",
  review: null,
  error: null,
};

function publicError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Saying disclosure could not be loaded; retry after restarting the local Badge site.";
}

function joinList(values: readonly string[], separator: string): string {
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(separator)}${separator}and ${values.at(-1)}`;
}

function invalidRequestMessage(issues: readonly RequestValidationIssue[]): string {
  const issueRoots = new Set(issues.map((issue) => issue.path[0]));
  const fields = sayingRequestFieldOrder.filter((field) => issueRoots.has(field));
  if (fields.length === 0) {
    return "This badge saying request is invalid. Use only a title, criterion, optional direction, and optional allowedQuotations list before generating a saying.";
  }
  const fieldList = joinList(fields, ", ");
  const corrections = joinList(
    fields.map((field) => sayingRequestFieldCorrections[field]),
    "; ",
  );
  return `This badge has invalid saying input in ${fieldList}. ${corrections[0]!.toUpperCase()}${corrections.slice(1)} before generating a saying.`;
}

export class SayingDisclosureGate {
  private currentSnapshot = idleSnapshot;
  private readonly listeners = new Set<GateListener>();
  private readonly intents = new Map<string, SayingGenerationIntent>();
  private pendingIntent: SayingGenerationIntent | null = null;
  private activeLoad: { readonly id: number; readonly abortController: AbortController } | null = null;
  private nextLoadId = 1;
  private acknowledged: string | null = null;

  constructor(
    private readonly loadDisclosure: DisclosureLoader,
    private readonly onAuthorized: AuthorizedGeneration,
  ) {}

  snapshot(): SayingDisclosureGateSnapshot {
    return this.currentSnapshot;
  }

  acknowledgedFingerprint(): string | null {
    return this.acknowledged;
  }

  subscribe(listener: GateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async request(intent: SayingGenerationIntent): Promise<void> {
    const parsedInput = sayingRequestSchema.safeParse(intent.promptInput);
    if (!parsedInput.success) {
      this.publish({
        phase: "error",
        review: null,
        error: invalidRequestMessage(parsedInput.error.issues),
      });
      return;
    }
    const validatedIntent: SayingGenerationIntent = {
      ...intent,
      promptInput: parsedInput.data,
    };
    let review: SayingDisclosureReview;
    try {
      review = buildSayingDisclosureReview(validatedIntent.promptInput);
    } catch {
      this.publish({
        phase: "error",
        review: null,
        error:
          "This badge saying request is too large after validation. Shorten its title, criterion, direction, or allowedQuotations list before generating a saying.",
      });
      return;
    }
    this.intents.set(intent.recordId, validatedIntent);
    if (this.acknowledged) {
      await this.onAuthorized(validatedIntent, review);
      return;
    }
    await this.openReview(validatedIntent);
  }

  async approve(): Promise<void> {
    if (this.currentSnapshot.phase !== "review" || !this.currentSnapshot.review || !this.pendingIntent) {
      return;
    }
    const intent = this.pendingIntent;
    const review = this.currentSnapshot.review;
    this.acknowledged = this.currentSnapshot.review.disclosure.fingerprint;
    this.pendingIntent = null;
    this.publish(idleSnapshot);
    await this.onAuthorized(intent, review);
  }

  close(): void {
    this.abortLoad();
    this.pendingIntent = null;
    this.publish(idleSnapshot);
  }

  async retry(): Promise<void> {
    if (!this.pendingIntent) return;
    await this.openReview(this.pendingIntent);
  }

  async reopenForRecord(recordId: string): Promise<void> {
    this.acknowledged = null;
    const intent = this.intents.get(recordId);
    if (intent) await this.openReview(intent);
  }

  dispose(): void {
    this.abortLoad();
    this.listeners.clear();
    this.pendingIntent = null;
  }

  private async openReview(intent: SayingGenerationIntent): Promise<void> {
    this.abortLoad();
    this.pendingIntent = intent;
    const id = this.nextLoadId++;
    const abortController = new AbortController();
    this.activeLoad = { id, abortController };
    this.publish({ phase: "loading", review: null, error: null });
    try {
      const disclosure = sayingDisclosureSchema.parse(await this.loadDisclosure(abortController.signal));
      if (!this.isActive(id) || abortController.signal.aborted) return;
      const review = buildSayingDisclosureReview(intent.promptInput);
      if (
        disclosure.fingerprint !== review.disclosure.fingerprint ||
        JSON.stringify(disclosure) !== JSON.stringify(review.disclosure)
      ) {
        throw new Error(
          "Saying disclosure changed while it was being reviewed; reload Badge before generating.",
        );
      }
      this.publish({
        phase: "review",
        review,
        error: null,
      });
    } catch (error) {
      if (!this.isActive(id) || abortController.signal.aborted) return;
      this.publish({ phase: "error", review: null, error: publicError(error) });
    } finally {
      if (this.isActive(id)) this.activeLoad = null;
    }
  }

  private publish(snapshot: SayingDisclosureGateSnapshot): void {
    this.currentSnapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  private isActive(id: number): boolean {
    return this.activeLoad?.id === id;
  }

  private abortLoad(): void {
    this.activeLoad?.abortController.abort();
    this.activeLoad = null;
  }
}
