import { useState } from "react";

import { DISCOVERY_PAGE_SIZE } from "./DiscoveryView";

export function useDiscoveryViewState() {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(DISCOVERY_PAGE_SIZE);

  function resetPage() {
    setVisibleLimit(DISCOVERY_PAGE_SIZE);
  }

  function enterDiscover() {
    setSelectedSetId(null);
    resetPage();
  }

  function browseSet(setId: string | null) {
    setSelectedSetId(setId);
    resetPage();
  }

  return {
    browseSet,
    enterDiscover,
    resetPage,
    viewProps: {
      selectedSetId,
      query,
      visibleLimit,
      onVisibleLimitChange: setVisibleLimit,
      onSetChange: setSelectedSetId,
      onQueryChange: setQuery,
    },
  };
}
