import type { ArchiveSourceAssetInput, ArchiveSourceMimeType } from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { legacyStarterRepairSources } from "@badge/catalogue-fixtures/legacy-repair";

interface StarterSourceDescriptor {
  readonly title: string;
  readonly sourceAssetHash: string;
  readonly sourceUrl: string;
}

function sourceMimeType(value: string): ArchiveSourceMimeType {
  const mimeType = value.split(";", 1)[0].trim();
  if (mimeType === "image/png") return mimeType;
  throw new Error(
    `Archive fixture art returned ${mimeType || "an unknown MIME type"}; run npm run generate:archive-fixtures and reload the Archive.`,
  );
}

async function loadStarterSources(
  sources: readonly StarterSourceDescriptor[],
): Promise<readonly ArchiveSourceAssetInput[]> {
  return Promise.all(
    sources.map(async (source) => {
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

export function legacyStarterRepairSourcesForState(state: ArchiveState) {
  const referencedHashes = new Set(
    state.records.flatMap((record) => [
      record.publishedVisual.sourceAssetHash,
      ...(record.activation ? [record.activation.visualPin.sourceAssetHash] : []),
    ]),
  );
  return legacyStarterRepairSources.filter((source) => referencedHashes.has(source.sourceAssetHash));
}

export function legacyStarterActivationRepairSourcesForState(state: ArchiveState) {
  const activationHashes = new Set(
    state.records.flatMap((record) =>
      record.activation ? [record.activation.visualPin.sourceAssetHash] : [],
    ),
  );
  return legacyStarterRepairSources.filter((source) => activationHashes.has(source.sourceAssetHash));
}

export function loadStarterSourceAssets(): Promise<readonly ArchiveSourceAssetInput[]> {
  return loadStarterSources(starterBadges);
}

export function loadLegacyStarterActivationRepairAssets(
  state: ArchiveState,
): Promise<readonly ArchiveSourceAssetInput[]> {
  return loadStarterSources(legacyStarterActivationRepairSourcesForState(state));
}

export function loadLegacyStarterRepairAssets(
  states: readonly ArchiveState[],
): Promise<readonly ArchiveSourceAssetInput[]> {
  const neededHashes = new Set(
    states.flatMap((state) =>
      legacyStarterRepairSourcesForState(state).map((source) => source.sourceAssetHash),
    ),
  );
  return loadStarterSources(
    legacyStarterRepairSources.filter((source) => neededHashes.has(source.sourceAssetHash)),
  );
}
