import { useLayoutEffect } from "react";

import type { ArchiveSection } from "./ArchiveSectionNav";
import { observeArchiveSectionLocation } from "./archive-section-location";

export function useArchiveSectionLocation(onSectionChange: (section: ArchiveSection) => void): void {
  useLayoutEffect(() => observeArchiveSectionLocation(onSectionChange), [onSectionChange]);
}
