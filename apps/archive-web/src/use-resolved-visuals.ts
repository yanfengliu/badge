import { useEffect, useState } from "react";
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

export function useResolvedVisuals(archive: ArchiveApplication, state: ArchiveState | null) {
  const [visuals, setVisuals] = useState<Record<string, ResolvedVisualDisplay>>({});
  const [error, setError] = useState<string | null>(null);

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
          setVisuals(Object.fromEntries(entries));
          setError(null);
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : String(caught));
      }
    }
    void resolveEarnedVisuals(currentState);
    return () => {
      active = false;
      for (const url of createdUrls) URL.revokeObjectURL(url);
    };
  }, [archive, state]);

  return { visuals, error } as const;
}
