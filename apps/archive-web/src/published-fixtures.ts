import type { ArchiveSourceMimeType } from "@badge/archive-application";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { cataloguePackBadges } from "@badge/catalogue-fixtures/catalogue-pack";
import type { FixtureHistoricalQuotation } from "@badge/catalogue-fixtures/archive";

import { resolveCatalogueSourceUrl } from "./catalogue-source-media";

/**
 * One published fixture view per seeded archive record, whether it ships in the starter
 * pack (PNG in the generated public directory) or the discovery catalogue pack (canonical
 * JPEG study served from the bundled catalogue tier).
 */
export interface PublishedFixtureView {
  readonly recordId: string;
  readonly title: string;
  readonly sourceUrl: string | null;
  readonly sourceMimeType: ArchiveSourceMimeType;
  readonly sourceAssetHash: string;
  readonly defaultQuotationId: string;
  readonly historicalQuotations: readonly FixtureHistoricalQuotation[];
  readonly referenceUrl?: string;
}

const fixtureViews = new Map<string, PublishedFixtureView>([
  ...starterBadges.map(
    (badge) =>
      [
        `starter:${badge.definitionId}`,
        {
          recordId: `starter:${badge.definitionId}`,
          title: badge.title,
          sourceUrl: badge.sourceUrl,
          sourceMimeType: "image/png" as const,
          sourceAssetHash: badge.sourceAssetHash,
          defaultQuotationId: badge.defaultQuotationId,
          historicalQuotations: badge.historicalQuotations,
        },
      ] as const,
  ),
  ...cataloguePackBadges.map(
    (badge) =>
      [
        badge.recordId,
        {
          recordId: badge.recordId,
          title: badge.title,
          sourceUrl: resolveCatalogueSourceUrl(badge.assetKey),
          sourceMimeType: "image/jpeg" as const,
          sourceAssetHash: badge.sourceAssetHash,
          defaultQuotationId: badge.defaultQuotationId,
          historicalQuotations: badge.historicalQuotations,
          ...(badge.referenceUrl ? { referenceUrl: badge.referenceUrl } : {}),
        },
      ] as const,
  ),
]);

export function publishedFixtureForRecordId(recordId: string): PublishedFixtureView | undefined {
  return fixtureViews.get(recordId);
}

export function publishedFixtureSayingSources(): readonly { title: string; criterion: string }[] {
  return [
    ...starterBadges.map((badge) => ({ title: badge.title, criterion: badge.criterion })),
    ...cataloguePackBadges.map((badge) => ({ title: badge.title, criterion: badge.criterion })),
  ];
}
