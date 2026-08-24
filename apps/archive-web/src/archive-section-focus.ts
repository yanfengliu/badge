import type { ArchiveSection } from "./ArchiveSectionNav";

export function archiveSectionButtonId(section: ArchiveSection): string {
  return `archive-section-${section}`;
}

export function focusArchiveSection(section: ArchiveSection): void {
  document.getElementById(archiveSectionButtonId(section))?.focus();
}

export function focusCollectionThen(action: () => void): void {
  focusArchiveSection("collection");
  action();
}
