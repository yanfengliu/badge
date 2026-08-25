import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArchiveRecord, ArchiveState } from "@badge/archive-domain";

import { focusCollectionThen } from "./archive-section-focus.js";
import { createStarterArchiveState } from "./archive-state.js";
import { orderedTimelineRecords, toggledTimelineInspection } from "./timeline-records.js";
import { TimelineView } from "./TimelineView.js";

function earnedRecord(
  record: ArchiveRecord,
  occurredStart: string,
  occurredEnd: string,
  activatedAt: string,
): ArchiveRecord {
  return {
    ...record,
    lifecycle: "earned",
    acceptedSaying: `Remember ${record.title}.`,
    note: `A note for ${record.title}.`,
    activation: {
      occurredStart,
      occurredEnd,
      recordedAt: activatedAt,
      activatedAt,
      visualPin: record.publishedVisual,
    },
  };
}

function occurrenceCount(value: string, fragment: string): number {
  return value.split(fragment).length - 1;
}

describe("TimelineView", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("orders earned memories and renders their frozen badge artifacts without eager live viewers", () => {
    const seeded = createStarterArchiveState();
    const older = earnedRecord(seeded.records[0], "2022-05-01", "2022-05-03", "2026-08-20T18:00:00.000Z");
    const newer = earnedRecord(seeded.records[1], "2025-01-10", "2025-01-10", "2026-08-19T18:00:00.000Z");
    const newerWithChangedPublishedVisual: ArchiveRecord = {
      ...newer,
      publishedVisual: {
        ...newer.publishedVisual,
        accessibleDescription: "A later catalogue visual that was not activated.",
        renderRecipe: {
          ...newer.publishedVisual.renderRecipe,
          shape: "shield",
          material: "enamel",
        },
      },
    };
    const state: ArchiveState = {
      ...seeded,
      records: [older, newerWithChangedPublishedVisual, ...seeded.records.slice(2)],
    };

    expect(orderedTimelineRecords(state).map((record) => record.recordId)).toEqual([
      newer.recordId,
      older.recordId,
    ]);

    const html = renderToStaticMarkup(
      <TimelineView
        state={state}
        sourceUrls={{ [older.recordId]: "blob:older", [newer.recordId]: "blob:newer" }}
        forceFallback={false}
        onOpenMemory={() => undefined}
        onShowDiscover={() => undefined}
      />,
    );
    expect(html.indexOf(newer.title)).toBeLessThan(html.indexOf(older.title));
    expect(html).toContain("January 10, 2025");
    expect(html).toMatch(/May 1, 2022<\/time> – <time[^>]*>May 3, 2022<\/time>/u);
    expect(html).toContain(`Remember ${newer.title}.`);
    expect(html).toContain(`A note for ${older.title}.`);
    expect(html).toContain(`Replay ${newer.title} memory`);
    expect(html).toContain(`Badge artifact: ${newer.activation?.visualPin.accessibleDescription}`);
    expect(html).not.toContain("A later catalogue visual that was not activated.");
    expect(html).toContain("badge-preview timeline-badge-preview");
    expect(html).toContain("badge-material--metal");
    expect(html).toContain("badge-shape--circle");
    expect(html).toContain("badge-material--wool");
    expect(html).toContain("badge-shape--rectangle");
    expect(html).toContain('src="blob:newer"');
    expect(html).not.toMatch(/class="timeline-art">\s*<img/u);
    expect(html).not.toContain("badge-viewer timeline-badge-viewer");
    expect(html).not.toContain("<canvas");
    expect(html).toContain("Inspect badge in 3D");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain(`aria-controls="timeline-artifact-${newer.recordId}"`);
    expect(html.indexOf('class="timeline-inspect"')).toBeLessThan(
      html.indexOf('class="timeline-artifact-slot"'),
    );
    expect(html).toContain('dateTime="2025-01-10"');
    expect(html).toContain(`dateTime="${newer.activation?.activatedAt}"`);
    expect(html).toContain('aria-label="2 earned memories"');
  });

  it("bounds a large Timeline to previews and one persistent inspector trigger per card", () => {
    const seeded = createStarterArchiveState();
    const records = Array.from({ length: 24 }, (_, index) => {
      const day = String((index % 28) + 1).padStart(2, "0");
      return {
        ...earnedRecord(
          seeded.records[index % seeded.records.length],
          `2025-01-${day}`,
          `2025-01-${day}`,
          `2026-08-20T18:${String(index).padStart(2, "0")}:00.000Z`,
        ),
        recordId: `timeline-scale-${index}`,
      };
    });
    const state: ArchiveState = { ...seeded, records };
    const sourceUrls = Object.fromEntries(
      records.map((record) => [record.recordId, `blob:${record.recordId}`]),
    );

    const html = renderToStaticMarkup(
      <TimelineView
        state={state}
        sourceUrls={sourceUrls}
        forceFallback={false}
        onOpenMemory={() => undefined}
        onShowDiscover={() => undefined}
      />,
    );

    expect(occurrenceCount(html, "badge-preview timeline-badge-preview")).toBe(24);
    expect(occurrenceCount(html, 'class="timeline-inspect"')).toBe(24);
    expect(occurrenceCount(html, 'class="timeline-artifact-slot"')).toBe(24);
    expect(occurrenceCount(html, 'aria-pressed="false"')).toBe(24);
    expect(html).not.toContain("timeline-badge-viewer");
    expect(html).not.toContain("<canvas");
  });

  it("moves or closes the single active inspector deterministically", () => {
    expect(toggledTimelineInspection(null, "first")).toBe("first");
    expect(toggledTimelineInspection("first", "second")).toBe("second");
    expect(toggledTimelineInspection("second", "second")).toBeNull();
  });

  it("uses the real activation instant as a deterministic tie-break across offsets", () => {
    const seeded = createStarterArchiveState();
    const laterInstant = earnedRecord(
      seeded.records[0],
      "2025-01-10",
      "2025-01-10",
      "2026-08-23T23:30:00-07:00",
    );
    const earlierInstant = earnedRecord(
      seeded.records[1],
      "2025-01-10",
      "2025-01-10",
      "2026-08-24T01:00:00+02:00",
    );
    const state: ArchiveState = {
      ...seeded,
      records: [earlierInstant, laterInstant, ...seeded.records.slice(2)],
    };

    expect(orderedTimelineRecords(state).map((record) => record.recordId)).toEqual([
      laterInstant.recordId,
      earlierInstant.recordId,
    ]);
  });

  it("gives an actionable empty state before the first activation", () => {
    const html = renderToStaticMarkup(
      <TimelineView
        state={createStarterArchiveState()}
        sourceUrls={{}}
        forceFallback
        onOpenMemory={() => undefined}
        onShowDiscover={() => undefined}
      />,
    );

    expect(html).toContain("No memories sealed yet");
    expect(html).toContain("Browse Discover");
    expect(html).not.toContain("timeline-entry");
  });

  it("focuses the collection navigation before leaving Timeline", () => {
    const events: string[] = [];
    vi.stubGlobal("document", {
      getElementById: () => ({ focus: () => events.push("focus") }),
    });

    focusCollectionThen(() => events.push("action"));

    expect(events).toEqual(["focus", "action"]);
  });

  it("announces a single unresolved earned memory with singular grammar", () => {
    const seeded = createStarterArchiveState();
    const state: ArchiveState = {
      ...seeded,
      records: [
        earnedRecord(seeded.records[0], "2025-01-10", "2025-01-10", "2026-08-19T18:00:00.000Z"),
        ...seeded.records.slice(1),
      ],
    };

    const html = renderToStaticMarkup(
      <TimelineView
        state={state}
        sourceUrls={{}}
        forceFallback
        onOpenMemory={() => undefined}
        onShowDiscover={() => undefined}
      />,
    );
    expect(html).toContain('aria-label="1 earned memory"');
    expect(html).toContain("Artifact is still resolving.");
    expect(html).not.toContain("timeline-badge-viewer");
  });
});
