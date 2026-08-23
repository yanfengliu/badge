import {
  StudioImageSafetyError,
  assertStudioImageBlobPreflight,
  readImageAsset,
} from "./image-processing.js";
import { StudioStoreError } from "./studio-store-validation.js";

export function preflightStudioInputImage(blob: Blob, label: string): void {
  try {
    assertStudioImageBlobPreflight(blob, label);
  } catch (error) {
    throw invalidInputImage(error);
  }
}

export async function readStudioInputImage(blob: Blob, label: string) {
  try {
    return await readImageAsset(blob);
  } catch (error) {
    if (error instanceof StudioImageSafetyError) {
      throw invalidInputImage(
        new StudioImageSafetyError(error.code, error.message.replace("Selected Studio image", label), {
          cause: error,
        }),
      );
    }
    throw invalidInputImage(error);
  }
}

function invalidInputImage(error: unknown): StudioStoreError {
  const detail = error instanceof Error ? error.message : "The supplied image could not be validated.";
  return new StudioStoreError("ASSET_INVALID", `${detail} No asset was written.`, { cause: error });
}
