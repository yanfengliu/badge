import { StudioMark } from "./StudioMark";

export type StudioPrimarySection = "collection" | "timeline" | "discover";

export function StudioHeader({
  onSectionChange,
  disabled = false,
}: {
  readonly onSectionChange: (section: StudioPrimarySection) => void;
  readonly disabled?: boolean;
}) {
  return (
    <header className="studio-header">
      <div className="brand">
        <StudioMark />
        <span>Badge Archive</span>
        <em>Developer mode</em>
      </div>
      <nav className="studio-nav" aria-label="Primary sections">
        <button
          id="studio-section-collection"
          className="studio-nav__link"
          type="button"
          disabled={disabled}
          onClick={() => onSectionChange("collection")}
        >
          Collection
        </button>
        <button
          id="studio-section-timeline"
          className="studio-nav__link"
          type="button"
          disabled={disabled}
          onClick={() => onSectionChange("timeline")}
        >
          Timeline
        </button>
        <button
          id="studio-section-discover"
          className="studio-nav__link"
          type="button"
          disabled={disabled}
          onClick={() => onSectionChange("discover")}
        >
          Discover
        </button>
        <button
          id="studio-section-studio"
          className="studio-nav__link"
          type="button"
          disabled={disabled}
          aria-current="page"
        >
          Badge Studio
        </button>
      </nav>
      <div className="brief-id">Brief 01 · Yosemite</div>
    </header>
  );
}
