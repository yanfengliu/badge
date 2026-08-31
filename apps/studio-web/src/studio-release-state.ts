import type { PublishedRelease } from "./studio-candidates.js";

export type StudioReleaseState =
  | Readonly<{
      phase: "unpublished";
      currentRelease: null;
      priorReleases: readonly PublishedRelease[];
    }>
  | Readonly<{
      phase: "frozen" | "revising";
      currentRelease: PublishedRelease;
      priorReleases: readonly PublishedRelease[];
    }>;

export const initialStudioReleaseState: StudioReleaseState = Object.freeze({
  phase: "unpublished",
  currentRelease: null,
  priorReleases: Object.freeze([]),
});

export function beginReplacementEdition(state: StudioReleaseState): StudioReleaseState {
  if (state.phase !== "frozen") return state;

  return Object.freeze({
    phase: "revising",
    currentRelease: state.currentRelease,
    priorReleases: state.priorReleases,
  });
}

export function freezeRelease(state: StudioReleaseState, release: PublishedRelease): StudioReleaseState {
  const priorReleases = state.phase === "revising" ? nextPriorReleases(state, release) : state.priorReleases;

  return Object.freeze({
    phase: "frozen",
    currentRelease: release,
    priorReleases,
  });
}

function nextPriorReleases(
  state: Exclude<StudioReleaseState, { phase: "unpublished" }>,
  release: PublishedRelease,
): readonly PublishedRelease[] {
  const priorReleases = state.priorReleases.filter((prior) => !samePublishedRelease(prior, release));
  if (
    !samePublishedRelease(state.currentRelease, release) &&
    !priorReleases.some((prior) => samePublishedRelease(prior, state.currentRelease))
  ) {
    priorReleases.push(state.currentRelease);
  }
  return Object.freeze(priorReleases);
}

export function samePublishedRelease(first: PublishedRelease, second: PublishedRelease): boolean {
  return first.packId === second.packId && first.version === second.version && first.digest === second.digest;
}
