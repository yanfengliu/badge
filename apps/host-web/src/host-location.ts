import { writeBadgeHistoryEntry } from "../../archive-web/src/archive-section-location";

export type HostDestination = "collection" | "timeline" | "discover" | "studio";

const STUDIO_RECORD_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;

export function hostDestinationFromHash(hash: string): HostDestination {
  const candidate = hash.replace(/^#/u, "");
  if (candidate === "timeline" || candidate === "discover") return candidate;
  // Badge Studio adjusts a badge, so a location without one is not Studio at all: it resolves to
  // Discover, where badges are, rather than to a workspace with nothing in it.
  if (studioRecordIdFromHash(hash) !== null) return "studio";
  if (candidate === "studio" || candidate.startsWith("studio/")) return "discover";
  return "collection";
}

/**
 * Badge Studio adjusts one badge, so its location carries that badge: `#studio/<recordId>`.
 * A reload or a shared link therefore reopens the same badge instead of an empty workspace.
 */
export function studioRecordIdFromHash(hash: string): string | null {
  const candidate = hash.replace(/^#/u, "");
  if (!candidate.startsWith("studio/")) return null;
  const recordId = decodeURIComponent(candidate.slice("studio/".length));
  return STUDIO_RECORD_ID_PATTERN.test(recordId) ? recordId : null;
}

export function hostDestinationUrl(
  currentHref: string,
  destination: HostDestination,
  studioRecordId: string | null = null,
): string {
  const url = new URL(currentHref);
  url.pathname = "/";
  if (destination === "collection") url.hash = "";
  else if (destination === "studio" && studioRecordId)
    url.hash = `studio/${encodeURIComponent(studioRecordId)}`;
  else url.hash = destination;
  return url.toString();
}

export function writeHostDestination(
  destination: HostDestination,
  mode: "push" | "replace" = "push",
  previousIndex?: number,
  studioRecordId: string | null = null,
): boolean {
  const next = hostDestinationUrl(window.location.href, destination, studioRecordId);
  if (next === window.location.href) return false;
  writeBadgeHistoryEntry(next, mode, previousIndex);
  return true;
}

export function pushUnindexedHostDestination(
  destination: HostDestination,
  studioRecordId: string | null = null,
): boolean {
  const next = hostDestinationUrl(window.location.href, destination, studioRecordId);
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
