export interface CatalogueThumbnailDerivationOptions {
  repositoryRoot?: string;
  sourceDirectory?: string;
  outputDirectory?: string;
  expectedCount?: number;
}

export function regenerateCatalogueThumbnails(options?: CatalogueThumbnailDerivationOptions): Promise<void>;

export function regenerateNationalParkThumbnails(
  options?: CatalogueThumbnailDerivationOptions,
): Promise<void>;
