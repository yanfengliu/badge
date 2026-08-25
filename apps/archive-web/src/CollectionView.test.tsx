import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { toExactVisualPin, type ArchiveState } from "@badge/archive-domain";

import { createStarterArchiveState, STARTER_RECORD_IDS } from "./archive-state.js";
import { CollectionView } from "./CollectionView.js";

function earnedYosemite(): ArchiveState {
  const state = createStarterArchiveState();
  return {
    ...state,
    records: state.records.map((record) =>
      record.recordId === STARTER_RECORD_IDS[0]
        ? {
            ...record,
            lifecycle: "earned" as const,
            activation: {
              occurredStart: "2024-05-14",
              occurredEnd: "2024-05-14",
              recordedAt: "2024-05-15T18:30:00.000Z",
              activatedAt: "2024-05-15T18:30:00.000Z",
              visualPin: toExactVisualPin(record.publishedVisual),
            },
          }
        : record,
    ),
  };
}

describe("CollectionView", () => {
  it("highlights only the inherent browse surface, not independent shelf actions", () => {
    const styles = readFileSync(new URL("./collection.css", import.meta.url), "utf8");

    expect(styles).toMatch(
      /\.collection-shelf__browse-surface:hover,\s*\.collection-shelf__browse-surface:focus-visible\s*\{/su,
    );
    expect(styles).not.toMatch(
      /\.collection-shelf__row:(?:hover|focus-within)\s+\.collection-shelf__browse-surface/su,
    );
  });

  it("shows a deliberate empty cabinet and routes the first-memory action to Discover", () => {
    const html = renderToStaticMarkup(
      <CollectionView
        state={createStarterArchiveState()}
        sourceUrls={{}}
        onReplay={() => undefined}
        onBrowseSet={() => undefined}
        onShowDiscover={() => undefined}
      />,
    );

    expect(html).toContain("Your cabinet is waiting");
    expect(html).toContain("Browse sets in Discover");
    expect(html).toContain("0 / 64 collected");
    expect(html).toContain("0 / 1 collected");
    expect(html).toContain("No memories collected here yet");
    expect(html).not.toContain("planned");
    expect(html).not.toContain("suggested");
  });

  it("renders only activated badges on closed-by-default set shelves", () => {
    const html = renderToStaticMarkup(
      <CollectionView
        state={earnedYosemite()}
        sourceUrls={{ [STARTER_RECORD_IDS[0]!]: "blob:yosemite" }}
        onReplay={() => undefined}
        onBrowseSet={() => undefined}
        onShowDiscover={() => undefined}
      />,
    );

    expect(html).toContain("The Field Archive");
    expect(html).toContain("U.S. National Parks");
    expect(html).toContain("1 / 64 collected");
    expect(html).toContain("Books Read");
    expect(html).toContain("Life Milestones");
    expect(html).toContain('aria-label="Replay Yosemite activation"');
    expect(html).toContain('aria-label="Browse U.S. National Parks set"');
    expect(html).toContain("collection-shelf__browse-surface");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("collection-set-link");
    expect(html).not.toContain("Read Sapiens");
    expect(html).not.toContain("Every national park");
    expect(html).not.toContain("PLANNED");
    expect(html).not.toContain("BADGES");
  });

  it("presents derived collection stats without relabeling potential work as collected", () => {
    const html = renderToStaticMarkup(
      <CollectionView
        state={earnedYosemite()}
        sourceUrls={{}}
        onReplay={() => undefined}
        onBrowseSet={() => undefined}
        onShowDiscover={() => undefined}
      />,
    );

    expect(html).toContain("Collected");
    expect(html).toContain("Sets represented");
    expect(html).toContain("Years held");
    expect(html).toContain("Latest memory");
    expect(html).not.toContain("memories sealed");
  });
});
