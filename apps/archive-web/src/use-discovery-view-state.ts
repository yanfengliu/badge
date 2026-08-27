import { useState } from "react";

import { DISCOVERY_PAGE_SIZE } from "./DiscoveryView";

export type DiscoveryReturnSection = "collection" | "timeline";

function asReturnSection(origin: string | null | undefined): DiscoveryReturnSection | null {
  return origin === "collection" || origin === "timeline" ? origin : null;
}

export function useDiscoveryViewState() {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(DISCOVERY_PAGE_SIZE);
  const [returnSection, setReturnSection] = useState<DiscoveryReturnSection | null>(null);

  function resetPage() {
    setVisibleLimit(DISCOVERY_PAGE_SIZE);
  }

  function clearReturn() {
    setReturnSection(null);
  }

  function selectSet(setId: string | null) {
    setSelectedSetId(setId);
    setSelectedRegionId(null);
  }

  function enterDiscover(origin: DiscoveryReturnSection | null = null) {
    selectSet(null);
    resetPage();
    setReturnSection(origin);
  }

  function browseSet(setId: string | null, origin?: string | null) {
    selectSet(setId);
    setQuery("");
    resetPage();
    // A browse that starts inside Discover (a replay dialog's set link) keeps the
    // journey's original return destination instead of erasing it.
    const remembered = asReturnSection(origin);
    if (remembered) setReturnSection(remembered);
  }

  return {
    browseSet,
    clearReturn,
    enterDiscover,
    resetPage,
    returnSection,
    viewProps: {
      selectedSetId,
      selectedRegionId,
      query,
      visibleLimit,
      onVisibleLimitChange: setVisibleLimit,
      onSetChange: selectSet,
      onRegionChange: setSelectedRegionId,
      onQueryChange: setQuery,
    },
  };
}
