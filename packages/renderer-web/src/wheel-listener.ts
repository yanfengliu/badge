export function addViewerWheelListener(
  target: HTMLElement,
  isEngaged: () => boolean,
  onCapturedWheel: (event: WheelEvent) => void,
): () => void {
  const listener = (event: WheelEvent) => {
    if (!isEngaged()) return;
    event.preventDefault();
    onCapturedWheel(event);
  };

  target.addEventListener("wheel", listener, { passive: false });
  return () => target.removeEventListener("wheel", listener);
}
