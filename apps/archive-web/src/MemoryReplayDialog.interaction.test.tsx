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

    setLink?.focus();
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
});
