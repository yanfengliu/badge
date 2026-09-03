// @vitest-environment happy-dom

import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toExactVisualPin } from "@badge/archive-domain";

vi.mock("@badge/renderer-web", () => ({
  BadgeViewer: () => <div data-testid="memory-replay-viewer" />,
}));

import { createStarterArchiveState } from "./archive-state.js";
import type { ReplaySetLink } from "./collection-view-model.js";
import { MemoryReplayDialog } from "./MemoryReplayDialog.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const parksSet: ReplaySetLink = {
  key: "pack:badge.catalogue.starter:us-national-parks",
  setId: "us-national-parks",
  title: "U.S. National Parks",
};

const yosemiteQuotation = {
  id: "john-muir-yosemite-temple-1868",
  text: "It is by far the grandest of all the special temples of Nature I was ever permitted to enter.",
  person: "John Muir",
  personWikipediaUrl: "https://en.wikipedia.org/wiki/John_Muir",
  sourceTitle: "Letters to a Friend, July 26, 1868",
  sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
};

function earnedYosemite() {
  const base = createStarterArchiveState().records[0]!;
  return {
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
}

function earnedEveryNationalPark() {
  return {
    ...earnedYosemite(),
    recordId: "starter:all-national-parks",
    title: "Every national park",
    note: "A long memory body that requires its own scrolling region.",
  };
}

function ReplayHarness({ onBrowseSet }: { readonly onBrowseSet?: (set: ReplaySetLink) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)}>
        Replay Yosemite
      </button>
      {open ? (
        <MemoryReplayDialog
          record={earnedYosemite()}
          sourceUrl="blob:earned-yosemite"
          quotation={null}
          sets={[parksSet]}
          forceFallback={false}
          returnFocus={trigger}
          onAdjustInStudio={() => undefined}
          onBrowseSet={(set) => {
            onBrowseSet?.(set);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PagedReplayHarness() {
  const records = [earnedYosemite(), earnedEveryNationalPark()];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const record = records[index]!;
  const pager = {
    contextTitle: "Collected in U.S. National Parks",
    currentTitle: record.title,
    index: index + 1,
    total: records.length,
    previous:
      index === 0 ? null : { recordId: records[index - 1]!.recordId, title: records[index - 1]!.title },
    next:
      index === records.length - 1
        ? null
        : { recordId: records[index + 1]!.recordId, title: records[index + 1]!.title },
  };
  const onPagerStep = (step: { readonly recordId: string }) => {
    const nextIndex = records.findIndex((candidate) => candidate.recordId === step.recordId);
    if (nextIndex >= 0) setIndex(nextIndex);
  };
  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)}>
        Replay collected set
      </button>
      {open ? (
        <MemoryReplayDialog
          record={record}
          sourceUrl={`blob:${record.recordId}`}
          quotation={index === 0 ? yosemiteQuotation : null}
          sets={[parksSet]}
          forceFallback={false}
          pager={pager}
          returnFocus={trigger}
          onAdjustInStudio={() => undefined}
          onBrowseSet={() => undefined}
          onPagerStep={onPagerStep}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

describe("MemoryReplayDialog interactions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.body.replaceChildren();
  });

  it("contains focus and Escape while leaving the replay trigger as the ordinary return target", async () => {
    await act(async () => root.render(<ReplayHarness />));
    const trigger = container.querySelector<HTMLButtonElement>("button");
    if (!trigger) throw new Error("Replay trigger is missing.");
    trigger.focus();
    await act(async () => trigger.click());

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    const close = container.querySelector<HTMLButtonElement>('[aria-label="Close memory replay"]');
    const setLink = container.querySelector<HTMLButtonElement>("[data-set-link]");
    expect(trigger.hasAttribute("inert")).toBe(true);
    expect(dialog?.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(close);

    expect(setLink).not.toBeNull();
    // Tab from whatever is last in the dialog must wrap to its first control, not escape into
    // the inert Archive behind it. Naming the last element instead would silently stop testing
    // containment the moment the dialog grows another control at the end.
    const focusable = [...(dialog?.querySelectorAll<HTMLElement>("button, [href], input, [tabindex]") ?? [])];
    focusable.at(-1)?.focus();
    expect(document.activeElement).toBe(focusable.at(-1));
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })));
    expect(document.activeElement).toBe(close);

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(trigger.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps set navigation actionable while the rest of the Archive is inert", async () => {
    const browse = vi.fn();
    await act(async () => root.render(<ReplayHarness onBrowseSet={browse} />));
    const trigger = container.querySelector<HTMLButtonElement>("button");
    await act(async () => trigger?.click());
    const setLink = container.querySelector<HTMLButtonElement>("[data-set-link]");
    await act(async () => setLink?.click());

    expect(browse).toHaveBeenCalledWith(parksSet);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("resets the memory body and moves changing-content focus to its visible region", async () => {
    await act(async () => root.render(<PagedReplayHarness />));
    const trigger = container.querySelector<HTMLButtonElement>("button");
    await act(async () => trigger?.click());
    const content = container.querySelector<HTMLElement>('[role="region"][aria-label="Memory details"]');
    const setLink = container.querySelector<HTMLButtonElement>("[data-set-link]");
    if (!content || !setLink) throw new Error("Paged replay did not expose its memory region and set link.");

    content.scrollTop = 120;
    setLink.focus();
    await act(async () => {
      setLink.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });

    expect(container.querySelector("#memory-replay-title")?.textContent).toBe("Every national park");
    expect(container.querySelector('[role="region"][aria-label="Memory details"]')).toBe(content);
    expect(content.scrollTop).toBe(0);
    expect(document.activeElement).toBe(content);
  });

  it("captures focus before a paged quotation source disappears", async () => {
    await act(async () => root.render(<PagedReplayHarness />));
    const trigger = container.querySelector<HTMLButtonElement>("button");
    await act(async () => trigger?.click());
    const content = container.querySelector<HTMLElement>('[role="region"][aria-label="Memory details"]');
    const source = container.querySelector<HTMLAnchorElement>(`a[href="${yosemiteQuotation.sourceUrl}"]`);
    if (!content || !source) throw new Error("Paged replay did not expose the quotation source link.");

    content.scrollTop = 120;
    source.focus();
    await act(async () => {
      source.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });

    expect(container.querySelector("#memory-replay-title")?.textContent).toBe("Every national park");
    expect(container.querySelector(`a[href="${yosemiteQuotation.sourceUrl}"]`)).toBeNull();
    expect(content.scrollTop).toBe(0);
    expect(document.activeElement).toBe(content);
  });
});
