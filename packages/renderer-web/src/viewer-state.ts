export type ViewerMode = "object" | "light";

export interface ViewerState {
  yaw: number;
  pitch: number;
  zoom: number;
  lightAzimuth: number;
  lightElevation: number;
}

export interface ZoomKeyCommand {
  direction: "in" | "out";
  precise: boolean;
}

const degrees = (value: number) => (value * Math.PI) / 180;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const VIEWER_ZOOM_MIN = 0.65;
export const VIEWER_ZOOM_MAX = 2.2;
export const OBJECT_PITCH_LIMIT = degrees(85);
export const LIGHT_ELEVATION_MIN = degrees(5);
export const LIGHT_ELEVATION_MAX = degrees(85);

export const INITIAL_VIEWER_STATE: ViewerState = {
  yaw: degrees(-12),
  pitch: degrees(8),
  zoom: 1.65,
  lightAzimuth: degrees(-35),
  lightElevation: degrees(45),
};

export function moveObject(state: ViewerState, deltaX: number, deltaY: number): ViewerState {
  const radiansPerPixel = degrees(0.35);

  return {
    ...state,
    yaw: state.yaw + deltaX * radiansPerPixel,
    pitch: clamp(state.pitch + deltaY * radiansPerPixel, -OBJECT_PITCH_LIMIT, OBJECT_PITCH_LIMIT),
  };
}

export function moveLight(state: ViewerState, deltaX: number, deltaY: number): ViewerState {
  const radiansPerPixel = degrees(0.35);

  return {
    ...state,
    lightAzimuth: state.lightAzimuth + deltaX * radiansPerPixel,
    lightElevation: clamp(
      state.lightElevation - deltaY * radiansPerPixel,
      LIGHT_ELEVATION_MIN,
      LIGHT_ELEVATION_MAX,
    ),
  };
}

export function normalizeWheelDelta(deltaY: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === 1) return deltaY * 16;
  if (deltaMode === 2) return deltaY * pageHeight;
  return deltaY;
}

export function applyWheelZoom(state: ViewerState, cssPixelDelta: number): ViewerState {
  const cappedDelta = clamp(cssPixelDelta, -100, 100);
  const factor = Math.pow(1.1, -cappedDelta / 100);

  return { ...state, zoom: clamp(state.zoom * factor, VIEWER_ZOOM_MIN, VIEWER_ZOOM_MAX) };
}

export function applyZoomCommand(state: ViewerState, direction: "in" | "out", precise: boolean): ViewerState {
  const step = precise ? 1.02 : 1.1;
  const factor = direction === "in" ? step : 1 / step;

  return { ...state, zoom: clamp(state.zoom * factor, VIEWER_ZOOM_MIN, VIEWER_ZOOM_MAX) };
}

export function zoomCommandForKey(code: string, altKey: boolean): ZoomKeyCommand | null {
  if (code === "Equal" || code === "NumpadAdd") return { direction: "in", precise: altKey };
  if (code === "Minus" || code === "NumpadSubtract") return { direction: "out", precise: altKey };
  return null;
}

export function applyArrowCommand(
  state: ViewerState,
  key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
  precise: boolean,
  mode: ViewerMode,
): ViewerState {
  const step = degrees(precise ? 1 : 5);
  const horizontal = key === "ArrowRight" ? step : key === "ArrowLeft" ? -step : 0;
  const vertical = key === "ArrowUp" ? step : key === "ArrowDown" ? -step : 0;

  if (mode === "light") {
    return {
      ...state,
      lightAzimuth: state.lightAzimuth + horizontal,
      lightElevation: clamp(state.lightElevation + vertical, LIGHT_ELEVATION_MIN, LIGHT_ELEVATION_MAX),
    };
  }

  return {
    ...state,
    yaw: state.yaw + horizontal,
    pitch: clamp(state.pitch + vertical, -OBJECT_PITCH_LIMIT, OBJECT_PITCH_LIMIT),
  };
}
