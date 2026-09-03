import type { StudioAdjustmentHandler, StudioBadgeTarget } from "@badge/studio-adjustment-contract";

/**
 * The Archive's side of the Studio handoff, registered with the host composer.
 *
 * The host is the only module allowed to see both surfaces, so it is the host that carries this
 * across — Studio never reaches into Archive persistence, and the Archive never imports Studio.
 */
export interface ArchiveStudioBridge {
  /** Resolves the badge Studio should adjust, or `null` when the archive has no such badge. */
  readonly resolveTarget: (recordId: string) => Promise<StudioBadgeTarget | null>;
  readonly apply: StudioAdjustmentHandler;
}

export type ArchiveStudioBridgeChange = (bridge: ArchiveStudioBridge | null) => void;
