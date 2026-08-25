import { archiveSectionButtonId } from "./archive-section-focus";

export type ArchiveSection = "collection" | "timeline" | "discover";

interface ArchiveSectionNavProps {
  readonly activeSection: ArchiveSection;
  readonly onSectionChange: (section: ArchiveSection) => void;
  readonly studioHref: string;
}

export function ArchiveSectionNav({ activeSection, onSectionChange, studioHref }: ArchiveSectionNavProps) {
  return (
    <nav className="archive-nav" aria-label="Archive sections">
      <button
        id={archiveSectionButtonId("collection")}
        className="nav-link"
        type="button"
        aria-current={activeSection === "collection" ? "page" : undefined}
        onClick={() => onSectionChange("collection")}
      >
        Collection
      </button>
      <button
        id={archiveSectionButtonId("timeline")}
        className="nav-link"
        type="button"
        aria-current={activeSection === "timeline" ? "page" : undefined}
        onClick={() => onSectionChange("timeline")}
      >
        Timeline
      </button>
      <button
        id={archiveSectionButtonId("discover")}
        className="nav-link"
        type="button"
        aria-current={activeSection === "discover" ? "page" : undefined}
        onClick={() => onSectionChange("discover")}
      >
        Discover
      </button>
      <a className="nav-link" href={studioHref}>
        Badge Studio
      </a>
    </nav>
  );
}
