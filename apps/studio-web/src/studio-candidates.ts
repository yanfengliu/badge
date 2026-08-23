import { studioFixtureCandidates } from "@badge/catalogue-fixtures/studio";

import {
  candidateIdentityKey,
  generatedCandidateIdentity,
  uploadedCandidateIdentity,
  type CandidateIdentity,
  type CandidateOrigin,
  type CandidateProvenance,
} from "./candidate-identity";
import { candidateIdentityMatchesAsset, type StudioAsset } from "./studio-store-validation";

export type { CandidateOrigin, CandidateProvenance } from "./candidate-identity";

export interface Candidate {
  id: string;
  label: string;
  direction: string;
  sourceUrl: string;
  hash: string;
  origin: CandidateOrigin;
  provenance: CandidateProvenance;
  identity: CandidateIdentity;
  blob?: Blob;
}

export interface PublishedRelease {
  packId: string;
  version: string;
  digest: string;
  bytes: Uint8Array;
  themeBytes: Uint8Array;
}

interface VerifiedCandidateSnapshot {
  hash: string;
  blob: Blob;
}

interface RestoreStudioCandidatesInput {
  fixtureCandidates: readonly Candidate[];
  assets: readonly StudioAsset[];
  selectedIdentity: CandidateIdentity | null;
  legacySelectedHash: string | null;
  createSourceUrl: (blob: Blob) => string;
}

interface RestoredStudioCandidates {
  candidates: Candidate[];
  selectedKey: string | null;
  selectionWarning: string | null;
}

export const initialCandidates: Candidate[] = studioFixtureCandidates.map((candidate) => ({
  id: candidate.id,
  label: candidate.label,
  direction: candidate.direction,
  sourceUrl: candidate.sourceUrl,
  hash: candidate.sourceAssetHash,
  origin: "generated",
  provenance: "generated",
  identity: generatedCandidateIdentity(candidate.sourceAssetHash, candidate.id),
}));

export function attachVerifiedFixtureSnapshots(
  candidates: readonly Candidate[],
  snapshots: readonly VerifiedCandidateSnapshot[],
): Candidate[] {
  const snapshotsByHash = new Map(snapshots.map((snapshot) => [snapshot.hash, snapshot.blob]));
  return candidates.map((candidate) => ({
    ...candidate,
    blob: verifiedCandidateBlob(candidate, snapshotsByHash.get(candidate.hash)),
  }));
}

export function requireCandidateSnapshot(candidate: Readonly<Candidate>): Blob {
  return verifiedCandidateBlob(candidate, candidate.blob);
}

export function findEquivalentCandidate(
  candidates: readonly Candidate[],
  identity: CandidateIdentity,
): Candidate | undefined {
  const key = candidateIdentityKey(identity);
  return candidates.find((candidate) => candidateIdentityKey(candidate.identity) === key);
}

export function candidateKey(candidate: Readonly<Candidate>): string {
  return candidateIdentityKey(candidate.identity);
}

export function restoreStudioCandidates({
  fixtureCandidates,
  assets,
  selectedIdentity,
  legacySelectedHash,
  createSourceUrl,
}: RestoreStudioCandidatesInput): RestoredStudioCandidates {
  const assetsByHash = new Map(assets.map((asset) => [asset.hash, asset]));
  const fixtureHashes = new Set(fixtureCandidates.map((candidate) => candidate.hash));
  const urlsByHash = new Map<string, string>();
  const candidates = [...fixtureCandidates];
  let skippedLegacyDerivatives = 0;

  const sourceUrlFor = (asset: StudioAsset): string => {
    const existing = urlsByHash.get(asset.hash);
    if (existing) return existing;
    const sourceUrl = createSourceUrl(asset.blob);
    urlsByHash.set(asset.hash, sourceUrl);
    return sourceUrl;
  };
  const addAssetCandidate = (
    asset: StudioAsset,
    identity: CandidateIdentity,
    operation?: string,
  ): Candidate => {
    const existing = findEquivalentCandidate(candidates, identity);
    if (existing) return existing;
    const candidate: Candidate = {
      id: `local:${candidateIdentityKey(identity)}`,
      label:
        asset.kind === "original"
          ? identity.origin === "generated"
            ? "Generated artwork"
            : "Uploaded artwork"
          : operation === "publication-png-v1"
            ? "Publish-safe PNG"
            : "Warm mineral treatment",
      direction:
        asset.kind === "original" ? "Restored immutable upload" : "Restored non-destructive derivative",
      sourceUrl: sourceUrlFor(asset),
      hash: asset.hash,
      origin: identity.origin,
      provenance: identity.provenance,
      identity,
      blob: asset.blob,
    };
    candidates.push(candidate);
    return candidate;
  };

  for (const asset of assets) {
    if (asset.kind === "original") {
      if (asset.schemaVersion === 2) {
        for (const identity of asset.candidateIdentities) addAssetCandidate(asset, identity);
        continue;
      }
      const uploadedIdentity = uploadedCandidateIdentity(asset.hash);
      const selectedUploaded =
        selectedIdentity && candidateIdentityKey(selectedIdentity) === candidateIdentityKey(uploadedIdentity);
      if (!fixtureHashes.has(asset.hash) || selectedUploaded) {
        addAssetCandidate(asset, uploadedIdentity);
      }
      continue;
    }
    if (asset.schemaVersion === 2) {
      for (const lineage of asset.candidateLineages) {
        addAssetCandidate(asset, lineage.candidateIdentity, lineage.operation);
      }
      continue;
    }
    if (selectedIdentity && candidateIdentityMatchesAsset(asset, selectedIdentity)) {
      addAssetCandidate(asset, selectedIdentity);
    } else {
      skippedLegacyDerivatives += 1;
    }
  }

  if (selectedIdentity) {
    const selected = findEquivalentCandidate(candidates, selectedIdentity);
    if (!selected) {
      const selectedAsset = assetsByHash.get(selectedIdentity.hash);
      if (selectedAsset?.kind === "derivative" && selectedAsset.schemaVersion === 1) {
        return {
          candidates,
          selectedKey: null,
          selectionWarning:
            "The older Studio derivative does not bind provenance to its parent candidate, so it remains preserved but cannot be selected, processed, or published. Choose a source and apply the treatment again.",
        };
      }
      throw new Error(
        `Stored Studio candidate identity ${candidateIdentityKey(selectedIdentity)} does not match its preserved asset origin and transform lineage. The draft and assets were preserved; restore an intact Studio backup or choose the source and treatment again.`,
      );
    }
    return {
      candidates,
      selectedKey: candidateKey(selected),
      selectionWarning: legacyDerivativeWarning(skippedLegacyDerivatives),
    };
  }

  if (legacySelectedHash) {
    const matches = candidates.filter((candidate) => candidate.hash === legacySelectedHash);
    if (matches.length === 1) {
      return { candidates, selectedKey: candidateKey(matches[0]), selectionWarning: null };
    }
    return {
      candidates,
      selectedKey: null,
      selectionWarning:
        "The older Studio draft did not record candidate provenance, so its ambiguous selection was not guessed. Its bytes remain preserved; choose the source and treatment again.",
    };
  }

  return {
    candidates,
    selectedKey: null,
    selectionWarning: legacyDerivativeWarning(skippedLegacyDerivatives),
  };
}

function legacyDerivativeWarning(count: number): string | null {
  return count > 0
    ? "Older Studio derivatives without recorded provenance remain preserved but were not added as candidates. Choose a source and apply the treatment again to create an unambiguous lineage."
    : null;
}

function verifiedCandidateBlob(candidate: Readonly<Candidate>, blob: Blob | undefined): Blob {
  if (blob instanceof Blob) return blob;
  throw new Error(
    `Studio candidate ${candidate.id} has no verified source snapshot; reload Badge Studio before processing or publishing it. No pack bytes were produced.`,
  );
}
