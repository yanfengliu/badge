import type { ArchiveSection } from "./ArchiveSectionNav";

const BADGE_HISTORY_INDEX_KEY = "__badgeHistoryIndex";
const ARCHIVE_SECTION_LOCATION_EVENT = "badge:archive-section-location";

interface ArchiveSectionLocationDetail {
  readonly section: ArchiveSection;
  readonly synchronize: boolean;
}

function historyStateWithIndex(index: number, preserveCurrentState: boolean): Record<string, unknown> {
  const current = window.history.state as unknown;
  const base =
    preserveCurrentState && current !== null && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  return { ...base, [BADGE_HISTORY_INDEX_KEY]: index };
}

export function badgeHistoryIndex(state: unknown): number | null {
  if (state === null || typeof state !== "object" || Array.isArray(state)) return null;
  const candidate = (state as Record<string, unknown>)[BADGE_HISTORY_INDEX_KEY];
  return typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= 0
    ? candidate
    : null;
}

export function ensureBadgeHistoryIndex(fallbackIndex = 0): number {
  const existing = badgeHistoryIndex(window.history.state);
  if (existing !== null) return existing;
  window.history.replaceState(historyStateWithIndex(fallbackIndex, true), "", window.location.href);
  return fallbackIndex;
}

export function writeBadgeHistoryEntry(
  url: string | URL,
  mode: "push" | "replace" = "push",
  previousIndex?: number,
): number {
  const currentIndex = previousIndex ?? ensureBadgeHistoryIndex();
  const nextIndex = mode === "push" ? currentIndex + 1 : currentIndex;
  const state = historyStateWithIndex(nextIndex, mode === "replace");
  window.history[mode === "push" ? "pushState" : "replaceState"](state, "", url);
  return nextIndex;
}

export function archiveSectionFromHash(hash: string): ArchiveSection {
  const candidate = hash.replace(/^#/u, "");
  return candidate === "timeline" || candidate === "discover" || candidate === "collection"
    ? candidate
    : "collection";
}

export function writeArchiveSectionHash(section: ArchiveSection): boolean {
  const url = new URL(window.location.href);
  url.hash = section === "collection" ? "" : section;
  if (url.href === window.location.href) return false;
  if (badgeHistoryIndex(window.history.state) === null) window.history.pushState(null, "", url);
  else writeBadgeHistoryEntry(url);
  window.dispatchEvent(
    new CustomEvent<ArchiveSectionLocationDetail>(ARCHIVE_SECTION_LOCATION_EVENT, {
      detail: { section, synchronize: false },
    }),
  );
  return true;
}

export function notifyArchiveSectionLocation(section: ArchiveSection): void {
  window.dispatchEvent(
    new CustomEvent<ArchiveSectionLocationDetail>(ARCHIVE_SECTION_LOCATION_EVENT, {
      detail: { section, synchronize: true },
    }),
  );
}

export function observeArchiveSectionWrites(onSectionWrite: (section: ArchiveSection) => void): () => void {
  const observeWrite = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail as ArchiveSectionLocationDetail;
    if (!detail.synchronize) onSectionWrite(detail.section);
  };
  window.addEventListener(ARCHIVE_SECTION_LOCATION_EVENT, observeWrite);
  return () => window.removeEventListener(ARCHIVE_SECTION_LOCATION_EVENT, observeWrite);
}

export function observeArchiveSectionLocation(
  onSectionChange: (section: ArchiveSection) => void,
): () => void {
  let observedSection = archiveSectionFromHash(window.location.hash);
  const synchronize = (event: Event) => {
    if (!(event instanceof CustomEvent) && window.location.hash === "#studio") return;
    if (event instanceof CustomEvent) {
      const detail = event.detail as ArchiveSectionLocationDetail;
      observedSection = detail.section;
      if (detail.synchronize) onSectionChange(detail.section);
      return;
    }
    const nextSection = archiveSectionFromHash(window.location.hash);
    if (nextSection === observedSection) return;
    observedSection = nextSection;
    onSectionChange(nextSection);
  };
  window.addEventListener("hashchange", synchronize);
  window.addEventListener("popstate", synchronize);
  window.addEventListener(ARCHIVE_SECTION_LOCATION_EVENT, synchronize);
  return () => {
    window.removeEventListener("hashchange", synchronize);
    window.removeEventListener("popstate", synchronize);
    window.removeEventListener(ARCHIVE_SECTION_LOCATION_EVENT, synchronize);
  };
}
