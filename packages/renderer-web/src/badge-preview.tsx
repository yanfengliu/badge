import { useState, type CSSProperties, type SyntheticEvent } from "react";
import { createSourceFramingPlan, sourceRectToImagePlacement, type RenderRecipe } from "@badge/render-recipe";

import { fallbackFrameAspect } from "./fallback-geometry";
import "./badge-viewer.css";

export interface BadgePreviewProps {
  readonly sourceUrl: string;
  readonly recipe: RenderRecipe;
  readonly accessibleDescription: string;
  readonly className?: string;
}

interface PreviewStyle extends CSSProperties {
  "--badge-border-color": string;
  "--badge-aspect": string;
  "--badge-inner-size": string;
}

interface LoadedSourceDimensions {
  readonly sourceUrl: string;
  readonly width: number;
  readonly height: number;
}

export function BadgePreview({
  sourceUrl,
  recipe,
  accessibleDescription,
  className = "",
}: BadgePreviewProps) {
  const [failedSourceUrl, setFailedSourceUrl] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<LoadedSourceDimensions | null>(null);
  const sourceFailed = failedSourceUrl === sourceUrl;
  const framingPlan =
    loadedSource?.sourceUrl === sourceUrl
      ? createSourceFramingPlan(recipe.shape, recipe.crop, loadedSource)
      : null;
  const imagePlacement = framingPlan ? sourceRectToImagePlacement(framingPlan.sourceRect) : null;
  const style: PreviewStyle = {
    "--badge-border-color": recipe.borderColor,
    "--badge-aspect": String(fallbackFrameAspect(recipe.shape)),
    "--badge-inner-size": `${Math.max(0.72, 1 - recipe.borderWidth) * 100}%`,
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
      setFailedSourceUrl(sourceUrl);
      return;
    }
    setLoadedSource({ sourceUrl, width, height });
  };

  return (
    <div
      className={`badge-preview ${className} badge-material--${recipe.material}`
        .replaceAll(/\s+/gu, " ")
        .trim()}
      style={style}
      data-badge-shape={recipe.shape}
      data-badge-material={recipe.material}
    >
      <div
        className="badge-preview__stage"
        role="img"
        aria-label={`Badge artifact: ${accessibleDescription}`}
      >
        <div className="badge-fallback__object-frame">
          <div className={`badge-fallback__face badge-shape--${recipe.shape}`}>
            <div className={`badge-fallback__art-window badge-shape--${recipe.shape}`} aria-hidden="true">
              {sourceFailed ? (
                <span className="badge-fallback__source-error">Source artwork unavailable</span>
              ) : (
                <img
                  key={sourceUrl}
                  src={sourceUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="badge-fallback__source"
                  style={sourceStyle}
                  onLoad={handleSourceLoad}
                  onError={() => setFailedSourceUrl(sourceUrl)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {sourceFailed ? (
        <p className="badge-preview__status" role="status">
          Badge artwork could not be loaded. Repair the installed pack to restore this preview.
        </p>
      ) : null}
    </div>
  );
}
