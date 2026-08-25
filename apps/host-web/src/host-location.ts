import { writeBadgeHistoryEntry } from "../../archive-web/src/archive-section-location";

export type HostDestination = "collection" | "timeline" | "discover" | "studio";

export function hostDestinationFromHash(hash: string): HostDestination {
  const candidate = hash.replace(/^#/u, "");
  return candidate === "timeline" || candidate === "discover" || candidate === "studio"
    ? candidate
    : "collection";
}

export function hostDestinationUrl(currentHref: string, destination: HostDestination): string {
  const url = new URL(currentHref);
  url.pathname = "/";
  url.hash = destination === "collection" ? "" : destination;
  return url.toString();
}

export function writeHostDestination(
  destination: HostDestination,
  mode: "push" | "replace" = "push",
  previousIndex?: number,
): boolean {
  const next = hostDestinationUrl(window.location.href, destination);
  if (next === window.location.href) return false;
  writeBadgeHistoryEntry(next, mode, previousIndex);
  return true;
}

export function pushUnindexedHostDestination(destination: HostDestination): boolean {
  const next = hostDestinationUrl(window.location.href, destination);
  if (next === window.location.href) return false;
  window.history.pushState(null, "", next);
  return true;
}

export function traverseToHostHistoryIndex(committedIndex: number, incomingIndex: number): void {
  const delta = committedIndex - incomingIndex;
  if (delta === 1) window.history.forward();
  else if (delta === -1) window.history.back();
  else if (delta !== 0) window.history.go(delta);
}
