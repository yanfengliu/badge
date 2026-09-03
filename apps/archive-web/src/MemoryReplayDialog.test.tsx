import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { toExactVisualPin } from "@badge/archive-domain";

vi.mock("@badge/renderer-web", () => ({
  BadgeViewer: ({ presentation }: { presentation?: string }) => (
    <div data-testid="memory-replay-viewer" data-presentation={presentation} />
  ),
}));

import { createStarterArchiveState, STARTER_RECORD_IDS } from "./archive-state.js";
import { MemoryReplayDialog } from "./MemoryReplayDialog.js";

describe("MemoryReplayDialog", () => {
  it("shows the activation time, exact historical quote, and every linked set", () => {
    const state = createStarterArchiveState();
    const base = state.records.find((record) => record.recordId === STARTER_RECORD_IDS[0]);
    if (!base) throw new Error("Expected Yosemite fixture record.");
    const record = {
      ...base,
      lifecycle: "earned" as const,
      collectionRefs: [...base.collectionRefs, { namespace: "local" as const, collectionId: "best-trips" }],
      activation: {
        occurredStart: "2024-05-14",
        occurredEnd: "2024-05-16",
        recordedAt: "2024-05-17T18:30:00.000Z",
        activatedAt: "2024-05-17T18:30:00.000Z",
        visualPin: toExactVisualPin(base.publishedVisual),
      },
    };

    const html = renderToStaticMarkup(
      <MemoryReplayDialog
        record={record}
        sourceUrl="blob:earned-yosemite"
        quotation={{
          id: "john-muir-yosemite-temple-1868",
          text: "It is by far the grandest of all the special temples of Nature I was ever permitted to enter.",
          person: "John Muir",
          personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
          sourceTitle: "Letters to a Friend, July 26, 1868",
          sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
        }}
        sets={[
          {
            key: "pack:badge.catalogue.starter:us-national-parks",
            setId: "us-national-parks",
            title: "U.S. National Parks",
          },
          { key: "local:best-trips", setId: null, title: "Best trips" },
        ]}
        forceFallback={false}
        returnFocus={createRef<HTMLButtonElement>()}
        onAdjustInStudio={() => undefined}
        onBrowseSet={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain('data-presentation="single-turn"');
    expect(html).toContain('class="badge-viewer memory-replay__viewer"');
    expect(html).toContain(
      'class="badge-viewer__viewport badge-viewer__deferred badge-viewer__viewport--passive"',
    );
    expect(html).toContain('dateTime="2024-05-14"');
    expect(html).toContain('dateTime="2024-05-16"');
    expect(html).toContain('dateTime="2024-05-17T18:30:00.000Z"');
    expect(html).toContain("Happened");
    expect(html).toContain("Sealed");
    expect(html).toContain("John Muir");
    expect(html).toContain("https://en.wikipedia.org/wiki/John_Muir");
    expect(html).toContain("Letters to a Friend, July 26, 1868");
    expect(html).toContain("U.S. National Parks");
    expect(html).toContain("Best trips");
    expect(html.match(/data-set-link/gu)).toHaveLength(1);
    expect(html).toContain("This set is not available in Discover");
  });

  it("pages between the collected memories of the same set", () => {
    const state = createStarterArchiveState();
    const base = state.records.find((record) => record.recordId === STARTER_RECORD_IDS[0]);
    if (!base) throw new Error("Expected Yosemite fixture record.");
    const record = {
      ...base,
      lifecycle: "earned" as const,
      activation: {
        occurredStart: "2024-05-14",
        occurredEnd: "2024-05-14",
        recordedAt: "2024-05-15T18:30:00.000Z",
        activatedAt: "2024-05-15T18:30:00.000Z",
        visualPin: toExactVisualPin(base.publishedVisual),
      },
    };

    const html = renderToStaticMarkup(
      <MemoryReplayDialog
        record={record}
        sourceUrl="blob:earned-yosemite"
        quotation={null}
        sets={[]}
        forceFallback={false}
        pager={{
          contextTitle: "Collected in U.S. National Parks",
          currentTitle: record.title,
          index: 2,
          total: 3,
          previous: { recordId: "catalogue:visited-acadia", title: "Acadia" },
          next: { recordId: "catalogue:visited-arches", title: "Arches" },
        }}
        returnFocus={createRef<HTMLButtonElement>()}
        onAdjustInStudio={() => undefined}
        onBrowseSet={() => undefined}
        onPagerStep={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("2 of 3");
    expect(html).toContain("Collected in U.S. National Parks");
    expect(html).toContain('aria-label="Previous badge: Acadia"');
    expect(html).toContain('aria-label="Next badge: Arches"');
  });

  it("keeps an unhydrated legacy quote visible without inventing provenance", () => {
    const state = createStarterArchiveState();
    const base = state.records[0]!;
    const record = {
      ...base,
      acceptedSaying: "A legacy quote kept exactly as accepted.",
      lifecycle: "earned" as const,
      activation: {
        occurredStart: "2024-05-14",
        occurredEnd: "2024-05-14",
        recordedAt: "2024-05-15T18:30:00.000Z",
        activatedAt: "2024-05-15T18:30:00.000Z",
        visualPin: toExactVisualPin(base.publishedVisual),
      },
    };

    const html = renderToStaticMarkup(
      <MemoryReplayDialog
        record={record}
        sourceUrl="blob:earned-yosemite"
        quotation={null}
        sets={[]}
        forceFallback={false}
        returnFocus={createRef<HTMLButtonElement>()}
        onAdjustInStudio={() => undefined}
        onBrowseSet={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("A legacy quote kept exactly as accepted.");
    expect(html).not.toContain("Wikipedia");
  });

  it("keeps a historical figure as text when no Wikipedia biography applies", () => {
    const state = createStarterArchiveState();
    const base = state.records[0]!;
    const record = {
      ...base,
      lifecycle: "earned" as const,
      activation: {
        occurredStart: "2024-05-14",
        occurredEnd: "2024-05-14",
        recordedAt: "2024-05-15T18:30:00.000Z",
        activatedAt: "2024-05-15T18:30:00.000Z",
        visualPin: toExactVisualPin(base.publishedVisual),
      },
    };

    const html = renderToStaticMarkup(
      <MemoryReplayDialog
        record={record}
        sourceUrl="blob:earned-yosemite"
        quotation={{
          id: "historical-figure-without-wikipedia",
          text: "A source-checked historical quotation.",
          person: "Historical Figure",
          sourceTitle: "Collected Letters",
          sourceUrl: "https://example.org/collected-letters",
        }}
        sets={[]}
        forceFallback={false}
        returnFocus={createRef<HTMLButtonElement>()}
        onAdjustInStudio={() => undefined}
        onBrowseSet={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Historical Figure");
    expect(html).not.toContain('href=""');
    expect(html).not.toContain("undefined");
  });
});
