import { useRef, type ChangeEvent } from "react";

import { ArchiveSectionNav, type ArchiveSection } from "./ArchiveSectionNav";
import { ArchiveMark, DownloadIcon, UploadIcon } from "./icons";

export type { ArchiveSection } from "./ArchiveSectionNav";

interface ArchiveHeaderProps {
  activeSection: ArchiveSection;
  onSectionChange: (section: ArchiveSection) => void;
  onBackup: () => void;
  onRestore: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ArchiveHeader({ activeSection, onSectionChange, onBackup, onRestore }: ArchiveHeaderProps) {
  const restoreInput = useRef<HTMLInputElement>(null);
  return (
    <header className="archive-header">
      <div className="brand">
        <ArchiveMark /> Badge Archive
      </div>
      <ArchiveSectionNav activeSection={activeSection} onSectionChange={onSectionChange} />
      <div className="header-actions">
        <button className="quiet-button" type="button" aria-label="Back up archive" onClick={onBackup}>
          <DownloadIcon />
          <span>Back up</span>
        </button>
        <button
          className="quiet-button"
          type="button"
          aria-label="Restore archive"
          onClick={() => restoreInput.current?.click()}
        >
          <UploadIcon />
          <span>Restore</span>
        </button>
        <span className="avatar" aria-label="Local private profile">
          YL
        </span>
        <input
          ref={restoreInput}
          hidden
          type="file"
          accept=".badgearchive,application/octet-stream,application/json"
          onChange={onRestore}
        />
      </div>
    </header>
  );
}
