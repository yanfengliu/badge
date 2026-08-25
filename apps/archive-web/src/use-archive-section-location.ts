import { useEffect } from "react";

import type { ArchiveSection } from "./ArchiveSectionNav";
import { observeArchiveSectionLocation } from "./archive-section-location";

export function useArchiveSectionLocation(onSectionChange: (section: ArchiveSection) => void): void {
  useEffect(() => observeArchiveSectionLocation(onSectionChange), [onSectionChange]);
}
