import { companionAppHref } from "../../local-origins";
import { StudioMark } from "./StudioMark";

export function StudioHeader() {
  const archiveHref = companionAppHref(window.location.href, "archive");
  const studioHref = companionAppHref(window.location.href, "studio");
  return (
    <header className="studio-header">
      <div className="brand">
        <StudioMark />
        <span>Badge Archive</span>
        <em>Developer mode</em>
      </div>
      <nav className="studio-nav" aria-label="Primary sections">
        <a className="studio-nav__link" href={archiveHref}>
          Collection
        </a>
        <a className="studio-nav__link" href={`${archiveHref}#timeline`}>
          Timeline
        </a>
        <a className="studio-nav__link" href={`${archiveHref}#discover`}>
          Discover
        </a>
        <a className="studio-nav__link" href={studioHref} aria-current="page">
          Badge Studio
        </a>
      </nav>
      <div className="brief-id">Brief 01 · Yosemite</div>
    </header>
  );
}
