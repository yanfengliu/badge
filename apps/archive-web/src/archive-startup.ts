import {
  ArchivePersistenceError,
  type ArchiveApplication,
  type ArchiveRecoveryReasonCode,
  type ArchiveSourceAssetInput,
} from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";

import { assertCompatibleStarterArchive, EarnedSayingCompatibilityError } from "./restore-compatibility.js";
import { auditEarnedArchiveVisuals } from "./restore-flow.js";
import { loadStarterSourceAssets } from "./starter-assets.js";

export class StarterArchiveCompatibilityError extends Error {
  readonly requiresStateRescue: boolean;
  readonly stateRescueReason: ArchiveRecoveryReasonCode | null;

  constructor(cause: unknown, afterRecovery = false) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(
      afterRecovery
        ? `Recovery quarantined and repaired local data, but the resulting readable state is still incompatible with this Archive. The Archive remains closed. Choose the compatible backup again; readable-state replacement will first require a saved safety backup. Details: ${detail}`
        : detail,
      { cause },
    );
    this.name = "StarterArchiveCompatibilityError";
    this.stateRescueReason =
      cause instanceof EarnedSayingCompatibilityError ? "earned-quotation-missing" : null;
    this.requiresStateRescue = this.stateRescueReason !== null;
  }
}

export async function initializeStarterArchive(
  archive: ArchiveApplication,
  expectedState: ArchiveState,
  onAssetsLoaded: (assets: readonly ArchiveSourceAssetInput[]) => void,
): Promise<ArchiveState> {
  const assets = await loadStarterSourceAssets();
  onAssetsLoaded(assets);
  const loaded = await archive.initialize(expectedState, assets);
  await validateStarterArchiveForOpen(archive, expectedState, loaded);
  return initializeReviewedSayingDefaults(archive, expectedState, loaded);
}

export async function initializeReviewedSayingDefaults(
  archive: ArchiveApplication,
  expectedState: ArchiveState,
  loaded: ArchiveState,
): Promise<ArchiveState> {
  let reviewed = loaded;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await archive.initializeSayingDefaults(expectedState, reviewed);
    } catch (error) {
      if (
        !(error instanceof ArchivePersistenceError) ||
        error.code !== "INITIALIZATION_CONFLICT" ||
        attempt === 2
      ) {
        throw error;
      }
      reviewed = await archive.state();
      await validateStarterArchiveForOpen(archive, expectedState, reviewed);
    }
  }
  throw new Error("Archive quotation-default initialization exhausted its bounded retry loop.");
}

export async function validateStarterArchiveForOpen(
  archive: ArchiveApplication,
  expectedState: ArchiveState,
  loaded: ArchiveState,
  afterRecovery = false,
): Promise<void> {
  await auditEarnedArchiveVisuals(archive, loaded);
  try {
    assertCompatibleStarterArchive(expectedState, loaded);
  } catch (error) {
    throw new StarterArchiveCompatibilityError(error, afterRecovery);
  }
}
