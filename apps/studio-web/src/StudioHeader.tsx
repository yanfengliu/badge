import { StudioMark } from "./StudioMark";

export function StudioHeader({
  badgeTitle,
  dirty,
  saving,
  disabled,
  onClose,
  onSave,
}: {
  readonly badgeTitle: string;
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly disabled: boolean;
  readonly onClose: () => void;
  readonly onSave: () => void;
}) {
  return (
    <header className="studio-header">
      <div className="brand">
        <StudioMark />
        <span>Badge Studio</span>
        <em>Adjusting one badge</em>
      </div>
      <p className="studio-header__badge" id="studio-section-studio" tabIndex={-1}>
        {badgeTitle}
      </p>
      <div className="studio-header__actions">
        <button className="studio-nav__link" type="button" disabled={saving} onClick={onClose}>
          Back to Discover
        </button>
        <button
          className="studio-save"
          type="button"
          disabled={disabled || saving || !dirty}
          onClick={onSave}
        >
          {saving ? "Saving…" : dirty ? "Save adjustments" : "Saved"}
        </button>
      </div>
    </header>
  );
}
