import { type ArchiveApplication, type ArchiveSourceAssetInput } from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";

import { assertCompatibleStarterArchive } from "./restore-compatibility.js";
import { auditEarnedArchiveVisuals } from "./restore-flow.js";
import { loadStarterSourceAssets } from "./starter-assets.js";

export class StarterArchiveCompatibilityError extends Error {
  constructor(cause: unknown, afterRecovery = false) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(
      afterRecovery
        ? `Recovery quarantined and repaired local data, but the resulting readable state is still incompatible with this Archive. The Archive remains closed. Choose the compatible backup again; readable-state replacement will first require a saved safety backup. Details: ${detail}`
        : detail,
      { cause },
    );
    this.name = "StarterArchiveCompatibilityError";
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
  return loaded;
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
