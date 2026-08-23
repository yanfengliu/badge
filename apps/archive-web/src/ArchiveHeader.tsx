import { useRef, type ChangeEvent } from "react";

import { companionAppHref } from "../../local-origins";
import { ArchiveMark, ArrowIcon, DownloadIcon, UploadIcon } from "./icons";

interface ArchiveHeaderProps {
  onBackup: () => void;
  onRestore: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ArchiveHeader({ onBackup, onRestore }: ArchiveHeaderProps) {
  const restoreInput = useRef<HTMLInputElement>(null);
  return (
    <header className="archive-header">
      <div className="brand">
        <ArchiveMark /> Badge Archive
      </div>
      <nav className="archive-nav" aria-label="Archive sections">
        <button className="nav-link" aria-current="page">
          Collection
        </button>
        <button className="nav-link" disabled title="Timeline is coming in a later slice">
          Timeline
        </button>
      </nav>
      <div className="header-actions">
        <button className="quiet-button" type="button" onClick={onBackup}>
          <DownloadIcon />
          <span>Back up</span>
        </button>
        <button className="quiet-button" type="button" onClick={() => restoreInput.current?.click()}>
          <UploadIcon />
          <span>Restore</span>
        </button>
        <a className="quiet-button studio-link" href={companionAppHref(window.location.href, "studio")}>
          Badge Studio <ArrowIcon />
        </a>
        <span className="avatar" aria-label="Local private profile">
          YL
        </span>
        <input
          ref={restoreInput}
          className="visually-hidden"
          type="file"
          accept=".badgearchive,application/octet-stream,application/json"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onRestore}
        />
      </div>
    </header>
  );
}
