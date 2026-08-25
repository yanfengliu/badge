import type { ArchiveSourceAssetInput, ArchiveSourceMimeType } from "@badge/archive-application";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { legacyStarterRepairSources } from "@badge/catalogue-fixtures/legacy-repair";

function sourceMimeType(value: string): ArchiveSourceMimeType {
  const mimeType = value.split(";", 1)[0].trim();
  if (mimeType === "image/png") return mimeType;
  throw new Error(
    `Archive fixture art returned ${mimeType || "an unknown MIME type"}; run npm run generate:archive-fixtures and reload the Archive.`,
  );
}

export async function loadStarterSourceAssets(): Promise<readonly ArchiveSourceAssetInput[]> {
  return Promise.all(
    [...starterBadges, ...legacyStarterRepairSources].map(async (source) => {
      const response = await fetch(source.sourceUrl);
      if (!response.ok) {
        throw new Error(
          `Archive source art for ${source.title} returned HTTP ${response.status}; rebuild the app and retry.`,
        );
      }
      const blob = await response.blob();
      return {
        hash: source.sourceAssetHash,
        mimeType: sourceMimeType(blob.type),
        bytes: new Uint8Array(await blob.arrayBuffer()),
      };
    }),
  );
}
