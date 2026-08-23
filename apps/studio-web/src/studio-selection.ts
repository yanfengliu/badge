import { candidateKey, type Candidate } from "./studio-candidates.js";

export interface StudioCandidateCapabilities {
  autosave: boolean;
  process: boolean;
  publish: boolean;
}

export function resolveCandidateSelection(
  candidates: readonly Candidate[],
  selectedKey: string | null,
): Candidate | null {
  if (selectedKey === null) return null;
  return candidates.find((candidate) => candidateKey(candidate) === selectedKey) ?? null;
}

export function candidateCapabilities(selected: Candidate | null): StudioCandidateCapabilities {
  const explicitSelection = selected !== null;
  return {
    autosave: explicitSelection,
    process: explicitSelection,
    publish: explicitSelection,
  };
}
