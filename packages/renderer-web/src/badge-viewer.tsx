import {
  Component,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";

import type { RenderRecipe } from "@badge/render-recipe";

import { BadgeFallback } from "./badge-fallback";
import { probeWebGL2UnlessForced } from "./capabilities";
import { BadgeScene } from "./scene";
import { CAMERA_DISTANCE, CAMERA_VERTICAL_FOV_DEGREES } from "./scene-layout";
import {
  INITIAL_VIEWER_STATE,
  applyArrowCommand,
  applyWheelZoom,
  applyZoomCommand,
  moveLight,
  moveObject,
  normalizeWheelDelta,
  zoomCommandForKey,
  type ViewerMode,
  type ViewerState,
} from "./viewer-state";
import { viewerRenderKeys, viewerSessionChanged } from "./viewer-lifecycle";
import { addViewerWheelListener } from "./wheel-listener";
import { useReducedMotion, useSingleTurn } from "./single-turn";
import "./badge-viewer.css";

export type RendererCapability = "checking" | "webgl2" | "fallback";

const WEBGL_UNAVAILABLE_REASON = "This browser could not start the WebGL2 renderer.";

function capabilityForWebGLSupport(supported: boolean | null): RendererCapability {
  if (supported === null) return "checking";
  return supported ? "webgl2" : "fallback";
}

function reasonForWebGLSupport(supported: boolean | null): string | null {
  return supported === false ? WEBGL_UNAVAILABLE_REASON : null;
}

export interface BadgeViewerProps {
  sourceUrl: string;
  recipe: RenderRecipe;
  accessibleDescription: string;
  className?: string;
  readOnly?: boolean;
  forceFallback?: boolean;
  presentation?: "interactive" | "single-turn";
  onCapabilityChange?: (capability: Exclude<RendererCapability, "checking">) => void;
}

interface BoundaryProps {
  children: ReactNode;
  onError: (reason: string) => void;
}

class ViewerErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(`Live 3D could not render this badge: ${error.message}`);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface ActivePointer {
  id: number;
  x: number;
  y: number;
}

export function BadgeViewer({
  sourceUrl,
  recipe,
  accessibleDescription,
  className = "",
  readOnly = true,
  forceFallback = false,
  presentation = "interactive",
  onCapabilityChange,
}: BadgeViewerProps) {
  const singleTurn = presentation === "single-turn";
  const [webglSupported, setWebglSupported] = useState<boolean | null>(() =>
    probeWebGL2UnlessForced(forceFallback),
  );
  const [capability, setCapability] = useState<RendererCapability>(() =>
    capabilityForWebGLSupport(webglSupported),
  );
  const [fallbackReason, setFallbackReason] = useState<string | null>(() =>
    reasonForWebGLSupport(webglSupported),
  );
  const [recoveryGeneration, setRecoveryGeneration] = useState(0);
  const [view, setView] = useState<ViewerState>(INITIAL_VIEWER_STATE);
  const [mode, setMode] = useState<ViewerMode>("object");
  const [engaged, setEngaged] = useState(false);
  const engagedRef = useRef(false);
  const [readySourceUrl, setReadySourceUrl] = useState<string | null>(null);
  const resetSingleTurnPose = useCallback(() => setView(INITIAL_VIEWER_STATE), []);
  const reducedMotion = useReducedMotion(singleTurn ? resetSingleTurnPose : undefined);
  const viewportRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<ActivePointer | null>(null);
  const queuedWheelDelta = useRef(0);
  const wheelAnimationFrame = useRef<number | null>(null);
  const automaticRecoveryAttempted = useRef(false);
  const instructionsId = useId();
  const renderKeys = viewerRenderKeys(sourceUrl, recipe, recoveryGeneration);
  const sessionIdentity = renderKeys.session;
  const turnIdentity = `${renderKeys.content}\u001f${renderKeys.canvas}`;
  const previousSessionIdentity = useRef(sessionIdentity);
  const fallback = forceFallback || capability === "fallback" || fallbackReason !== null;
  const singleTurnState = useSingleTurn({
    enabled: singleTurn,
    fallback,
    ready: capability === "webgl2" && readySourceUrl === sourceUrl,
    reducedMotion,
    sessionIdentity: turnIdentity,
    setView,
  });

  const updateEngagement = useCallback((nextEngaged: boolean) => {
    engagedRef.current = nextEngaged;
    setEngaged(nextEngaged);
  }, []);

  const clearWheelQueue = useCallback(() => {
    if (wheelAnimationFrame.current !== null) {
      window.cancelAnimationFrame(wheelAnimationFrame.current);
      wheelAnimationFrame.current = null;
    }
    queuedWheelDelta.current = 0;
  }, []);

  useEffect(() => clearWheelQueue, [clearWheelQueue]);

  const releasePointer = useCallback(() => {
    const pointer = activePointer.current;
    const viewport = viewportRef.current;
    if (pointer && viewport?.hasPointerCapture(pointer.id)) viewport.releasePointerCapture(pointer.id);
    activePointer.current = null;
    clearWheelQueue();
  }, [clearWheelQueue]);

  const failToFallback = useCallback(
    (reason: string) => {
      releasePointer();
      updateEngagement(false);
      setCapability("fallback");
      setFallbackReason(reason);
    },
    [releasePointer, updateEngagement],
  );
  const handleTextureReady = useCallback(() => setReadySourceUrl(sourceUrl), [sourceUrl]);
  const handleRendererFailure = useCallback(
    (reason: string) => {
      if (!automaticRecoveryAttempted.current) {
        automaticRecoveryAttempted.current = true;
        releasePointer();
        updateEngagement(false);
        if (singleTurn) resetSingleTurnPose();
        setFallbackReason(null);
        setReadySourceUrl(null);
        setRecoveryGeneration((current) => current + 1);
        return;
      }
      failToFallback(reason);
    },
    [failToFallback, releasePointer, resetSingleTurnPose, singleTurn, updateEngagement],
  );

  useLayoutEffect(() => {
    if (!viewerSessionChanged(previousSessionIdentity.current, sessionIdentity)) return;
    previousSessionIdentity.current = sessionIdentity;
    releasePointer();
    automaticRecoveryAttempted.current = false;
    setView({ ...INITIAL_VIEWER_STATE });
    setMode("object");
    updateEngagement(false);
    setFallbackReason(reasonForWebGLSupport(webglSupported));
    setCapability(capabilityForWebGLSupport(webglSupported));
  }, [releasePointer, sessionIdentity, updateEngagement, webglSupported]);

  useEffect(() => {
    if (forceFallback || webglSupported !== null) return;
    const frame = window.requestAnimationFrame(() => {
      const supported = probeWebGL2UnlessForced(false);
      setWebglSupported(supported);
      setCapability(capabilityForWebGLSupport(supported));
      setFallbackReason(reasonForWebGLSupport(supported));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [forceFallback, webglSupported]);

  useEffect(() => {
    const reportedCapability = forceFallback ? "fallback" : capability;
    if (reportedCapability !== "checking") onCapabilityChange?.(reportedCapability);
  }, [capability, forceFallback, onCapabilityChange]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    updateEngagement(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const pointer = activePointer.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    activePointer.current = { id: pointer.id, x: event.clientX, y: event.clientY };
    setView((current) =>
      mode === "object" ? moveObject(current, deltaX, deltaY) : moveLight(current, deltaX, deltaY),
    );
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || fallback || singleTurn) return;

    return addViewerWheelListener(
      viewport,
      () => engagedRef.current,
      (event) => {
        const pageHeight = viewport.clientHeight || window.innerHeight;
        const delta = normalizeWheelDelta(event.deltaY, event.deltaMode, pageHeight);
        queuedWheelDelta.current += delta;
        if (wheelAnimationFrame.current === null) {
          wheelAnimationFrame.current = window.requestAnimationFrame(() => {
            wheelAnimationFrame.current = null;
            const accumulatedDelta = queuedWheelDelta.current;
            queuedWheelDelta.current = 0;
            setView((current) => applyWheelZoom(current, accumulatedDelta));
          });
        }
      },
    );
  }, [fallback, singleTurn]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      updateEngagement(true);
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      releasePointer();
      updateEngagement(false);
      return;
    }

    if (!engaged) return;
    const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
    if (arrows.includes(event.code as (typeof arrows)[number])) {
      event.preventDefault();
      setView((current) =>
        applyArrowCommand(current, event.code as (typeof arrows)[number], event.shiftKey, mode),
      );
      return;
    }

    const zoomCommand = zoomCommandForKey(event.code, event.altKey);
    if (zoomCommand) {
      event.preventDefault();
      setView((current) => applyZoomCommand(current, zoomCommand.direction, zoomCommand.precise));
    }
  };

  const resetView = () => {
    releasePointer();
    setView((current) => ({
      ...current,
      yaw: INITIAL_VIEWER_STATE.yaw,
      pitch: INITIAL_VIEWER_STATE.pitch,
      zoom: INITIAL_VIEWER_STATE.zoom,
    }));
  };

  const resetLight = () => {
    releasePointer();
    setView((current) => ({
      ...current,
      lightAzimuth: INITIAL_VIEWER_STATE.lightAzimuth,
      lightElevation: INITIAL_VIEWER_STATE.lightElevation,
    }));
  };

  const selectMode = (nextMode: ViewerMode) => {
    releasePointer();
    setMode(nextMode);
  };

  const retryLiveRenderer = () => {
    automaticRecoveryAttempted.current = false;
    setReadySourceUrl(null);
    setFallbackReason(null);
    setCapability("webgl2");
    setRecoveryGeneration((current) => current + 1);
  };

  const visibleFallbackReason = forceFallback
    ? "Live 3D is disabled for this view."
    : (fallbackReason ?? "The live 3D renderer is unavailable.");
  const instructions = engaged
    ? `${mode === "object" ? "Rotate the badge" : "Move the key light"} with arrow keys. Hold Shift for precise arrows. Use plus or minus to zoom; hold Alt for precise zoom. Press Escape to release.`
    : "Press Enter or Space to engage the viewer. Drag to inspect. Wheel zoom starts only while engaged.";

  return (
    <section
      className={`badge-viewer ${className}`.trim()}
      data-appearance-readonly={readOnly}
      data-reduced-motion={reducedMotion}
      data-presentation={presentation}
      data-single-turn-state={singleTurn ? singleTurnState : undefined}
    >
      {fallback ? (
        <>
          <BadgeFallback
            key={sessionIdentity}
            recipe={recipe}
            sourceArtUrl={sourceUrl}
            label={accessibleDescription}
            reason={visibleFallbackReason}
            interactive={!singleTurn}
          />
          {!singleTurn && !forceFallback && webglSupported === true ? (
            <button type="button" className="badge-viewer__retry" onClick={retryLiveRenderer}>
              Try live 3D again
            </button>
          ) : null}
        </>
      ) : (
        <>
          <div
            ref={viewportRef}
            className={`badge-viewer__viewport${engaged ? " is-engaged" : ""}${singleTurn ? " badge-viewer__viewport--passive" : ""}`}
            role={singleTurn ? undefined : "application"}
            aria-label={singleTurn ? undefined : `Interactive 3D badge: ${accessibleDescription}`}
            aria-describedby={singleTurn ? undefined : instructionsId}
            tabIndex={singleTurn ? undefined : 0}
            onPointerDown={singleTurn ? undefined : handlePointerDown}
            onPointerMove={singleTurn ? undefined : handlePointerMove}
            onPointerUp={singleTurn ? undefined : releasePointer}
            onPointerCancel={singleTurn ? undefined : releasePointer}
            onLostPointerCapture={singleTurn ? undefined : releasePointer}
            onKeyDown={singleTurn ? undefined : handleKeyDown}
            onBlur={
              singleTurn
                ? undefined
                : () => {
                    releasePointer();
                    updateEngagement(false);
                  }
            }
          >
            {capability === "checking" ? (
              <div className="badge-viewer__loading" role="status">
                Preparing live 3D…
              </div>
            ) : (
              <ViewerErrorBoundary key={renderKeys.canvas} onError={failToFallback}>
                <Canvas
                  role={singleTurn ? "img" : undefined}
                  aria-label={singleTurn ? `3D badge presentation: ${accessibleDescription}` : undefined}
                  frameloop="demand"
                  dpr={[1, 2]}
                  shadows="basic"
                  camera={{
                    fov: CAMERA_VERTICAL_FOV_DEGREES,
                    near: 0.1,
                    far: 100,
                    position: [0, 0, CAMERA_DISTANCE],
                  }}
                  gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
                  onCreated={({ gl }) => {
                    gl.outputColorSpace = SRGBColorSpace;
                    gl.toneMapping = ACESFilmicToneMapping;
                    gl.toneMappingExposure = 1;
                  }}
                >
                  <BadgeScene
                    recipe={recipe}
                    sourceArtUrl={sourceUrl}
                    view={view}
                    onRendererFailure={handleRendererFailure}
                    onTextureReady={handleTextureReady}
                  />
                </Canvas>
              </ViewerErrorBoundary>
            )}
            {capability === "webgl2" && readySourceUrl !== sourceUrl ? (
              <div className="badge-viewer__loading" role="status">
                Loading badge artwork…
              </div>
            ) : null}
          </div>

          {!singleTurn ? (
            <>
              <p id={instructionsId} className="badge-viewer__instructions">
                {instructions}
              </p>

              <div className="badge-viewer__controls">
                <div className="badge-viewer__mode" role="group" aria-label="Drag mode">
                  <button
                    type="button"
                    className="badge-viewer__mode-action"
                    aria-pressed={mode === "object"}
                    onClick={() => selectMode("object")}
                  >
                    Inspect object
                  </button>
                  <button
                    type="button"
                    className="badge-viewer__mode-action"
                    aria-pressed={mode === "light"}
                    onClick={() => selectMode("light")}
                  >
                    Adjust light
                  </button>
                </div>

                <div className="badge-viewer__zoom" role="group" aria-label="Zoom">
                  <button
                    type="button"
                    className="badge-viewer__quiet-action"
                    aria-label="Zoom out"
                    onClick={() => setView((current) => applyZoomCommand(current, "out", false))}
                  >
                    −
                  </button>
                  <output aria-live="polite">
                    {Math.round((view.zoom / INITIAL_VIEWER_STATE.zoom) * 100)}%
                  </output>
                  <button
                    type="button"
                    className="badge-viewer__quiet-action"
                    aria-label="Zoom in"
                    onClick={() => setView((current) => applyZoomCommand(current, "in", false))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="badge-viewer__resets">
                <button type="button" className="badge-viewer__quiet-action" onClick={resetView}>
                  Reset view
                </button>
                <button type="button" className="badge-viewer__quiet-action" onClick={resetLight}>
                  Reset light
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
