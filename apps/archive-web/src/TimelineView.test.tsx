import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArchiveRecord, ArchiveState } from "@badge/archive-domain";

import { createStarterArchiveState } from "./archive-state.js";
import { orderedTimelineRecords } from "./timeline-records.js";
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

interface ButtonProps {
  readonly children?: ReactNode;
  readonly onClick?: () => void;
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!isValidElement<ButtonProps>(node)) return "";
  return Children.toArray(node.props.children).map(nodeText).join("");
}

function findButton(node: ReactNode, label: string): ReactElement<ButtonProps> {
  if (isValidElement<ButtonProps>(node)) {
    if (node.type === "button" && nodeText(node).includes(label)) return node;
    for (const child of Children.toArray(node.props.children)) {
      try {
        return findButton(child, label);
      } catch {
        // Continue through this small, hook-free component tree.
      }
    }
  }
  throw new Error(`Button containing ${label} was not found.`);
}

describe("TimelineView", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("orders earned memories by when they happened, newest first", () => {
    const seeded = createStarterArchiveState();
    const older = earnedRecord(seeded.records[0], "2022-05-01", "2022-05-03", "2026-08-20T18:00:00.000Z");
    const newer = earnedRecord(seeded.records[1], "2025-01-10", "2025-01-10", "2026-08-19T18:00:00.000Z");
    const state: ArchiveState = { ...seeded, records: [older, newer, ...seeded.records.slice(2)] };

    expect(orderedTimelineRecords(state).map((record) => record.recordId)).toEqual([
      newer.recordId,
      older.recordId,
    ]);

    const html = renderToStaticMarkup(
      <TimelineView
        state={state}
        sourceUrls={{ [older.recordId]: "blob:older", [newer.recordId]: "blob:newer" }}
        onOpenMemory={() => undefined}
        onShowCollection={() => undefined}
      />,
    );
    expect(html.indexOf(newer.title)).toBeLessThan(html.indexOf(older.title));
    expect(html).toContain("January 10, 2025");
    expect(html).toMatch(/May 1, 2022<\/time> – <time[^>]*>May 3, 2022<\/time>/u);
    expect(html).toContain(`Remember ${newer.title}.`);
    expect(html).toContain(`A note for ${older.title}.`);
    expect(html).toContain(`Open ${newer.title} memory`);
    expect(html).toContain(newer.publishedVisual.accessibleDescription);
    expect(html).toContain('dateTime="2025-01-10"');
    expect(html).toContain(`dateTime="${newer.activation?.activatedAt}"`);
    expect(html).toContain('aria-label="2 earned memories"');

    const events: string[] = [];
    vi.stubGlobal("document", {
      getElementById: () => ({ focus: () => events.push("focus") }),
    });
    const view = TimelineView({
      state,
      sourceUrls: {},
      onOpenMemory: (recordId) => events.push(`open:${recordId}`),
      onShowCollection: () => events.push("collection"),
    });
    findButton(view, `Open ${newer.title} memory`).props.onClick?.();
    expect(events).toEqual(["focus", `open:${newer.recordId}`]);
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
        onOpenMemory={() => undefined}
        onShowCollection={() => undefined}
      />,
    );

    expect(html).toContain("No memories sealed yet");
    expect(html).toContain("Return to collection");
    expect(html).not.toContain("timeline-entry");

    const events: string[] = [];
    vi.stubGlobal("document", {
      getElementById: () => ({ focus: () => events.push("focus") }),
    });
    const view = TimelineView({
      state: createStarterArchiveState(),
      sourceUrls: {},
      onOpenMemory: () => undefined,
      onShowCollection: () => events.push("collection"),
    });
    findButton(view, "Return to collection").props.onClick?.();
    expect(events).toEqual(["focus", "collection"]);
  });

  it("announces a single earned memory with singular grammar", () => {
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
        onOpenMemory={() => undefined}
        onShowCollection={() => undefined}
      />,
    );
    expect(html).toContain('aria-label="1 earned memory"');
  });
});
