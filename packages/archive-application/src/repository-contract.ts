import type { TrustedQuotationRequests } from "./quotation-admission.js";

export type ArchiveRepositoryTransactionStage = "activation:written" | "activation:committed";
export type ArchiveRepositoryRecoveryStage = "recovery:inspected";

export interface IndexedDbArchiveRepositoryOptions {
  onTransactionStage?: (stage: ArchiveRepositoryTransactionStage) => void;
  onObserverError?: (error: unknown, stage: ArchiveRepositoryTransactionStage) => void;
  onRecoveryStage?: (stage: ArchiveRepositoryRecoveryStage) => void | Promise<void>;
  trustedQuotationRequests?: TrustedQuotationRequests;
}
