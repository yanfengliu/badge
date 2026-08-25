import type { ArchiveState, ExactVisualPin } from "@badge/archive-domain";
import type { DBSchema } from "idb";
import { z } from "zod";

import type { ArchiveSourceAsset } from "./source-assets.js";
import type { ArchiveCatalogueVisualUpgradePlan } from "./catalogue-visual-upgrade.js";
import type { ArchiveRecoveryReasonCode } from "./recovery-evidence.js";

export const ARCHIVE_DATABASE_NAME = "badge-archive-v1";
export const ARCHIVE_DATABASE_VERSION = 3;
export const ARCHIVE_STATE_STORE = "archive-state";
export const ARCHIVE_OBJECT_STORE = "archive-objects";
export const ARCHIVE_STATE_KEY = "archive-state-v1";
export const ARCHIVE_QUARANTINE_KEY_PREFIX = "archive-state-quarantine:";
export const ARCHIVE_OBJECT_QUARANTINE_KEY_PREFIX = "archive-object-quarantine:";

export interface ArchiveDatabase extends DBSchema {
  "archive-state": {
    key: string;
    value: unknown;
  };
  "archive-objects": {
    key: string;
    value: unknown;
  };
}

export interface ResolvedArchiveVisual {
  readonly recordId: string;
  readonly pin: ExactVisualPin;
  readonly sourceAsset: ArchiveSourceAsset;
}

export interface ArchiveBackupSnapshot {
  readonly state: ArchiveState;
  readonly sourceAssets: readonly ArchiveSourceAsset[];
}

export const archiveStateQuarantineSchema = z
  .object({
    kind: z.literal("quarantined-archive-state"),
    quarantineVersion: z.literal(1),
    quarantinedAt: z.string().datetime({ offset: true }),
    reason: z.enum(["unreadable", "incompatible-readable-state"]),
    raw: z.unknown(),
  })
  .strict();
export type ArchiveStateQuarantine = z.infer<typeof archiveStateQuarantineSchema>;

export const archiveSourceQuarantineSchema = z
  .object({
    kind: z.literal("quarantined-archive-source"),
    quarantineVersion: z.literal(1),
    quarantinedAt: z.string().datetime({ offset: true }),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.enum(["missing", "unreadable-or-conflicting"]),
    raw: z.unknown(),
  })
  .strict();
export type ArchiveSourceQuarantine = z.infer<typeof archiveSourceQuarantineSchema>;

export interface ArchiveRecoveryResult {
  readonly state: ArchiveState;
  readonly stateReplaced: boolean;
  readonly quarantineKey: string;
  readonly quarantineKeys: readonly string[];
}

export type ArchiveRecoveryMode = "repair-corruption" | "replace-incompatible-readable-state";

export interface ArchiveRecoveryOptions {
  readonly mode?: ArchiveRecoveryMode;
  readonly expectedCurrentState?: ArchiveState;
  readonly expectedStateRescueReason?: ArchiveRecoveryReasonCode;
  readonly expectedStateRescueAffectedRecordIds?: readonly string[];
  readonly sayingDefaults?: ArchiveState;
  readonly catalogueVisualUpgradePlan?: ArchiveCatalogueVisualUpgradePlan;
}
