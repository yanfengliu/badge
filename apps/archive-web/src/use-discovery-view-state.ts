import { useState } from "react";

import { DISCOVERY_PAGE_SIZE } from "./DiscoveryView";

export function useDiscoveryViewState() {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(DISCOVERY_PAGE_SIZE);

  function resetPage() {
    setVisibleLimit(DISCOVERY_PAGE_SIZE);
  }

  function selectSet(setId: string | null) {
    setSelectedSetId(setId);
    setSelectedRegionId(null);
  }

  function enterDiscover() {
    selectSet(null);
    resetPage();
  }

  function browseSet(setId: string | null) {
    selectSet(setId);
    setQuery("");
    resetPage();
  }

  return {
    browseSet,
    enterDiscover,
    resetPage,
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
