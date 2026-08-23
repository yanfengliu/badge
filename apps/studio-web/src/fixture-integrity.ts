import type { StudioCandidateFixture } from "@badge/catalogue-fixtures/studio";

import { StudioImageSafetyError, type ImageAsset } from "./image-processing.js";

export function assertStudioFixtureIntegrity(candidate: StudioCandidateFixture, asset: ImageAsset): void {
  if (asset.hash !== candidate.sourceAssetHash) {
    throw new StudioImageSafetyError(
      "IMAGE_DATA_MISMATCH",
      `Studio fixture ${candidate.id} loaded as ${asset.hash}, not pinned ${candidate.sourceAssetHash}; no fixture assets or draft were written. Restore the reviewed tracked artwork or update its integrity metadata in the same release.`,
    );
  }
}
