import { useEffect, useRef, useState } from "react";
import type { ArchiveApplication } from "@badge/archive-application";
import type { ArchiveState, ExactVisualPin } from "@badge/archive-domain";

export interface ResolvedVisualDisplay {
  sourceUrl: string;
  pin: ExactVisualPin;
}

export function sourceUrlsForResolvedVisuals(
  visuals: Readonly<Record<string, ResolvedVisualDisplay>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(visuals).map(([recordId, visual]) => [recordId, visual.sourceUrl]),
  );
}

/**
 * Resolves earned badge art into object URLs.
 *
 * A URL is released only after the render that replaces it, and never on teardown. The host
 * hides this surface whenever Badge Studio opens, which unmounts its effects while keeping its
 * state — so the resolved map, and the memory dialog reading it, outlive any cleanup. Revoking
 * there pulled the image out from under a dialog still showing it and the renderer reported
 * "Could not load blob:…" for a URL that had been valid a moment earlier. The last batch is
 * therefore left to the page teardown that would reclaim it anyway.
 */
export function useResolvedVisuals(archive: ArchiveApplication, state: ArchiveState | null) {
  const [visuals, setVisuals] = useState<Record<string, ResolvedVisualDisplay>>({});
  const [error, setError] = useState<string | null>(null);
  const ownedUrls = useRef<string[]>([]);
  const supersededUrls = useRef<string[]>([]);

  useEffect(() => {
    const stale = supersededUrls.current;
    if (stale.length === 0) return;
    supersededUrls.current = [];
    for (const url of stale) URL.revokeObjectURL(url);
  }, [visuals]);

  useEffect(() => {
    const currentState = state;
    if (!currentState) return;
    let active = true;
    const createdUrls: string[] = [];
    async function resolveEarnedVisuals(resolvedState: ArchiveState) {
      try {
        const entries = await Promise.all(
          resolvedState.records
            .filter((record) => record.lifecycle === "earned")
            .map(async (record) => {
              const visual = await archive.visual(record.recordId);
              const sourceUrl = URL.createObjectURL(
                new Blob([visual.sourceAsset.bytes.slice().buffer], { type: visual.sourceAsset.mimeType }),
              );
              createdUrls.push(sourceUrl);
              return [record.recordId, { sourceUrl, pin: visual.pin }] as const;
            }),
        );
        if (active) {
          // Hand the previous batch to the post-render effect rather than revoking it here.
          supersededUrls.current = [...supersededUrls.current, ...ownedUrls.current];
          ownedUrls.current = createdUrls;
          setVisuals(Object.fromEntries(entries));
          setError(null);
        } else {
          for (const url of createdUrls) URL.revokeObjectURL(url);
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : String(caught));
        else for (const url of createdUrls) URL.revokeObjectURL(url);
      }
    }
    void resolveEarnedVisuals(currentState);
    return () => {
      active = false;
    };
  }, [archive, state]);

  return { visuals, error } as const;
}
