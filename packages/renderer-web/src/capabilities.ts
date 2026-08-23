export function supportsWebGL2(): boolean {
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });

    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.width = 1;
    canvas.height = 1;
    return true;
  } catch {
    return false;
  }
}

export function probeWebGL2UnlessForced(
  forceFallback: boolean,
  probe: () => boolean = supportsWebGL2,
): boolean | null {
  return forceFallback ? null : probe();
}
