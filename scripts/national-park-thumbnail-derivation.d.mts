export interface NationalParkThumbnailDerivationOptions {
  repositoryRoot?: string;
  sourceDirectory?: string;
  outputDirectory?: string;
  expectedCount?: number;
}

export function regenerateNationalParkThumbnails(
  options?: NationalParkThumbnailDerivationOptions,
): Promise<void>;
