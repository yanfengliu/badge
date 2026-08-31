import type { PublishedRelease } from "./studio-candidates.js";
import type { StudioOperation } from "./studio-operation.js";
import type { StudioReleaseState } from "./studio-release-state.js";

interface StudioPublishBarProps {
  readonly busy: StudioOperation | null;
  readonly canPublish: boolean;
  readonly offerDisabled: boolean;
  readonly onOfferCurrent: (release: PublishedRelease) => void;
  readonly onPublish: () => void;
  readonly publishDisabled: boolean;
  readonly releaseState: StudioReleaseState;
}

export function StudioPublishBar({
  busy,
  canPublish,
  offerDisabled,
  onOfferCurrent,
  onPublish,
  publishDisabled,
  releaseState,
}: StudioPublishBarProps) {
  return (
    <div className="publish-bar">
      <div>
        <strong>
          {releaseState.phase === "frozen"
            ? "This edition is frozen."
            : releaseState.phase === "revising"
              ? "Replacement edition in progress."
              : "Ready to freeze this edition?"}
        </strong>
        <span>
          {releaseState.phase === "frozen"
            ? `${releaseState.currentRelease.packId} · ${releaseState.currentRelease.digest.slice(0, 12)}… · swap in an image to begin another edition`
            : releaseState.phase === "revising"
              ? "The current frozen files stay available. Changed content creates a new immutable version; unchanged content re-offers the same release, and any activated memory stays untouched."
              : "Publishing writes an admitted pack and its exact theme dependency. Source drafts stay here."}
        </span>
      </div>
      <div className="publish-actions">
        {releaseState.currentRelease ? (
          <button
            className="button secondary"
            type="button"
            onClick={() => onOfferCurrent(releaseState.currentRelease)}
            disabled={offerDisabled}
          >
            Offer current files again
          </button>
        ) : null}
        {[...releaseState.priorReleases].reverse().map((release) => (
          <button
            key={`${release.packId}@${release.version}:${release.digest}`}
            className="button secondary"
            type="button"
            onClick={() => onOfferCurrent(release)}
            disabled={offerDisabled}
            aria-label={`Offer prior edition ${release.packId} version ${release.version} digest ${release.digest} again`}
            title={`${release.packId} · ${release.version} · ${release.digest}`}
          >
            Offer prior {release.digest.slice(0, 8)}… again
          </button>
        ))}
        {releaseState.phase !== "frozen" ? (
          <button
            className="button primary"
            type="button"
            onClick={onPublish}
            disabled={!canPublish || publishDisabled}
          >
            {busy === "publishing"
              ? "Validating pack…"
              : releaseState.phase === "revising"
                ? "Publish replacement edition"
                : "Publish badge pack"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
