import type { ArchiveSection } from "./ArchiveSectionNav";

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
  window.history.pushState(null, "", url);
  return true;
}

export function observeArchiveSectionLocation(
  onSectionChange: (section: ArchiveSection) => void,
): () => void {
  const synchronize = () => onSectionChange(archiveSectionFromHash(window.location.hash));
  window.addEventListener("hashchange", synchronize);
  window.addEventListener("popstate", synchronize);
  return () => {
    window.removeEventListener("hashchange", synchronize);
    window.removeEventListener("popstate", synchronize);
  };
}
