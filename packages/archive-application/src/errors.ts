export type ArchivePersistenceErrorCode =
  | "BACKUP_CHECKSUM_MISMATCH"
  | "BACKUP_CATALOGUE_MISMATCH"
  | "BACKUP_INCOMPLETE"
  | "BACKUP_INVALID"
  | "BACKUP_INVALID_JSON"
  | "BACKUP_OWNER_MISMATCH"
  | "BACKUP_TOO_LARGE"
  | "BACKUP_WOULD_LOSE_EARNED_RECORD"
  | "INITIALIZATION_CONFLICT"
  | "RECOVERY_REASON_MISMATCH"
  | "RECOVERY_NOT_REQUIRED"
  | "RESTORE_CONFLICT"
  | "SAYING_CONFLICT"
  | "STATE_MISSING"
  | "STATE_UNREADABLE"
  | "TRANSACTION_FAILED"
  | "VISUAL_SOURCE_CONFLICT"
  | "VISUAL_SOURCE_HASH_MISMATCH"
  | "VISUAL_SOURCE_INVALID"
  | "VISUAL_SOURCE_MISSING"
  | "VISUAL_SOURCE_UNREADABLE";

export class ArchivePersistenceError extends Error {
  constructor(
    readonly code: ArchivePersistenceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ArchivePersistenceError";
  }
}
