import { useState, type CSSProperties, type SyntheticEvent } from "react";

import { createSourceFramingPlan, sourceRectToImagePlacement, type RenderRecipe } from "@badge/render-recipe";

import { fallbackFrameAspect } from "./fallback-geometry";

type FallbackView = "front" | "edge" | "back";

interface BadgeFallbackProps {
  recipe: RenderRecipe;
  sourceArtUrl: string;
  label: string;
  reason: string;
  interactive?: boolean;
}

interface FallbackStyle extends CSSProperties {
  "--badge-border-color": string;
  "--badge-edge-width": string;
  "--badge-aspect": string;
  "--badge-inner-size": string;
  "--badge-stage-fit-inline": string;
}

interface LoadedSourceDimensions {
  sourceArtUrl: string;
  width: number;
  height: number;
}

export function BadgeFallback({
  recipe,
  sourceArtUrl,
  label,
  reason,
  interactive = true,
}: BadgeFallbackProps) {
  const [view, setView] = useState<FallbackView>("front");
  const [failedSourceUrl, setFailedSourceUrl] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<LoadedSourceDimensions | null>(null);
  const sourceFailed = failedSourceUrl === sourceArtUrl;
  const frameAspect = fallbackFrameAspect(recipe.shape);
  const framingPlan =
    loadedSource?.sourceArtUrl === sourceArtUrl
      ? createSourceFramingPlan(recipe.shape, recipe.crop, loadedSource)
      : null;
  const imagePlacement = framingPlan ? sourceRectToImagePlacement(framingPlan.sourceRect) : null;
  const style: FallbackStyle = {
    "--badge-border-color": recipe.borderColor,
    "--badge-edge-width": `${Math.max(7, recipe.thickness * 160)}px`,
    "--badge-aspect": String(frameAspect),
    "--badge-inner-size": `${Math.max(0.72, 1 - recipe.borderWidth) * 100}%`,
    "--badge-stage-fit-inline": `${frameAspect * 100}cqb`,
  };
  const sourceStyle: CSSProperties = imagePlacement
    ? {
        left: `${imagePlacement.left * 100}%`,
        top: `${imagePlacement.top * 100}%`,
        width: `${imagePlacement.width * 100}%`,
        height: `${imagePlacement.height * 100}%`,
      }
    : { visibility: "hidden" };

  const handleSourceLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
    if (width <= 0 || height <= 0) {
      setFailedSourceUrl(sourceArtUrl);
      return;
    }
    setLoadedSource({ sourceArtUrl, width, height });
  };

  return (
    <div className={`badge-fallback badge-material--${recipe.material}`} style={style}>
      <div className="badge-fallback__notice" role="status">
        <span className="badge-fallback__status-mark" aria-hidden="true" />
        <span>
          {reason}{" "}
          {sourceFailed
            ? "The source artwork could not be loaded; repair the installed pack."
            : interactive
              ? "Static inspection remains available."
              : "A static badge is shown for this replay."}
        </span>
      </div>

      <div
        className={`badge-fallback__stage badge-fallback__stage--${view}`}
        role="img"
        aria-label={`${label}; ${interactive ? `${view} fallback view` : "static fallback view"}`}
      >
        <div className="badge-fallback__object-frame">
          {view === "front" ? (
            <div className={`badge-fallback__face badge-shape--${recipe.shape}`}>
              <div className={`badge-fallback__art-window badge-shape--${recipe.shape}`} aria-hidden="true">
                {sourceFailed ? (
                  <span className="badge-fallback__source-error">Source artwork unavailable</span>
                ) : (
                  <img
                    key={sourceArtUrl}
                    src={sourceArtUrl}
                    alt=""
                    className="badge-fallback__source"
                    style={sourceStyle}
                    onLoad={handleSourceLoad}
                    onError={() => setFailedSourceUrl(sourceArtUrl)}
                  />
                )}
              </div>
            </div>
          ) : null}
          {view === "edge" ? <div className="badge-fallback__edge" aria-hidden="true" /> : null}
          {view === "back" ? (
            <div
              className={`badge-fallback__face badge-fallback__back badge-shape--${recipe.shape}`}
              aria-hidden="true"
            >
              <span className="badge-fallback__back-inset" />
            </div>
          ) : null}
        </div>
      </div>

      {interactive ? (
        <div className="badge-fallback__views" role="group" aria-label="Fallback view">
          {(["front", "edge", "back"] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              className="badge-viewer__quiet-action"
              aria-pressed={view === candidate}
              onClick={() => setView(candidate)}
            >
              {candidate[0].toUpperCase() + candidate.slice(1)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
