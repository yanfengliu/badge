export const BADGE_DISPLAY_SCALE = 0.56;
export const CAMERA_DISTANCE = 4;
export const CAMERA_VERTICAL_FOV_DEGREES = 38;

export function cameraVerticalSpanAtBadge(): number {
  const halfFovRadians = (CAMERA_VERTICAL_FOV_DEGREES * Math.PI) / 360;
  return 2 * CAMERA_DISTANCE * Math.tan(halfFovRadians);
}

export function badgeVerticalExtentAtZoom(unscaledExtent: number, zoom: number): number {
  return unscaledExtent * BADGE_DISPLAY_SCALE * zoom;
}
