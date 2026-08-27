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

export function focusPreparedBadgeTrigger(trigger: HTMLButtonElement | null): void {
  const recordId = trigger?.dataset.prepareRecordId;
  if (!recordId) return;
  const currentTrigger = [...document.querySelectorAll<HTMLButtonElement>("[data-prepare-record-id]")].find(
    (candidate) => candidate.dataset.prepareRecordId === recordId,
  );
  if (currentTrigger) {
    currentTrigger.focus();
    return;
  }
  // The prepared card can leave the rendered window (a reset page or filter); keep keyboard
  // focus in the catalogue instead of dropping it on the document body.
  document.getElementById("discovery-set-heading")?.focus();
}
