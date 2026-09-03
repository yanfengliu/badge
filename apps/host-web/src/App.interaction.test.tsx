// @vitest-environment happy-dom

import { act, useEffect, useLayoutEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const studioControl = vi.hoisted(() => ({ allowLeave: true, guardCalls: 0 }));
const archiveControl = vi.hoisted(() => ({ effectsActive: false }));

vi.mock("../../archive-web/src/ArchiveSurface", () => ({
  ArchiveSurface: ({ onShowStudio }: { onShowStudio: (recordId: string) => void }) => {
    const [preparation, setPreparation] = useState("empty");
    const [activeSection, setActiveSection] = useState("collection");
    useEffect(() => {
      archiveControl.effectsActive = true;
      return () => {
        archiveControl.effectsActive = false;
      };
    }, []);
    useLayoutEffect(() => {
      const synchronize = () => {
        if (/^#studio(?:\/|$)/u.test(window.location.hash)) return;
        const nextSection = window.location.hash.replace(/^#/u, "") || "collection";
        if (nextSection === activeSection) return;
        setPreparation("empty");
        setActiveSection(nextSection);
      };
      window.addEventListener("badge:archive-section-location", synchronize);
      window.addEventListener("popstate", synchronize);
      return () => {
        window.removeEventListener("badge:archive-section-location", synchronize);
        window.removeEventListener("popstate", synchronize);
      };
    }, [activeSection]);
    return (
      <div data-testid="archive-surface">
        <button id="archive-section-collection" type="button">
          Collection
        </button>
        <button id="archive-section-discover" type="button">
          Discover
        </button>
        <button id="archive-preparation" type="button" onClick={() => setPreparation("prepared")}>
          Prepare
        </button>
        <output id="archive-preparation-value">{preparation}</output>
        <output id="archive-active-section">{activeSection}</output>
        <button id="archive-section-studio" type="button" onClick={() => onShowStudio("record-yosemite")}>
          Adjust in Badge Studio
        </button>
      </div>
    );
  },
}));

vi.mock("../../studio-web/src/StudioSurface", () => ({
  StudioSurface: ({
    target,
    onClose,
    onLeaveGuardChange,
  }: {
    target: { readonly recordId: string } | null;
    onClose: () => void;
    onLeaveGuardChange: (guard: (() => Promise<boolean>) | null) => void;
  }) => {
    useEffect(() => {
      onLeaveGuardChange(async () => {
        studioControl.guardCalls += 1;
        return studioControl.allowLeave;
      });
      return () => onLeaveGuardChange(null);
    }, [onLeaveGuardChange]);
    return (
      <div data-testid="studio-surface">
        <button id="studio-section-discover" type="button" onClick={onClose}>
          Back to Discover
        </button>
        <p id="studio-section-studio" tabIndex={-1}>
          {target?.recordId ?? "no badge"}
        </p>
      </div>
    );
  },
}));

vi.mock("../../archive-web/src/studio-bridge-host", () => ({
  archiveStudioBridge: {
    resolveTarget: async (recordId: string) => ({ recordId }),
    apply: async () => ({ ok: true, message: "saved" }),
  },
}));

import { App } from "./App.js";
import { writeArchiveSectionHash } from "../../archive-web/src/archive-section-location.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("single-root Badge host interactions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    studioControl.allowLeave = true;
    studioControl.guardCalls = 0;
    archiveControl.effectsActive = false;
    window.history.replaceState(null, "", "/");
    document.head.replaceChildren();
    const theme = document.createElement("meta");
    theme.name = "theme-color";
    document.head.append(theme);
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
  });

  async function traverseHistory(traverse: () => void): Promise<void> {
    await act(async () => {
      traverse();
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });
  }

  it("opens Studio on one badge and restores focus on return", async () => {
    await act(async () => root.render(<App />));
    expect(container.querySelector('[data-testid="archive-surface"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="studio-surface"]')).toBeNull();
    expect(container.querySelectorAll("[data-host-surface]:not([hidden])")).toHaveLength(1);
    expect(document.title).toBe("Badge Archive");

    await act(async () => container.querySelector<HTMLButtonElement>("#archive-section-studio")?.click());
    expect(window.location.pathname).toBe("/");
    expect(window.location.hash).toBe("#studio/record-yosemite");
    await vi.waitFor(() =>
      expect(container.querySelector("#studio-section-studio")?.textContent).toBe("record-yosemite"),
    );
    expect(container.querySelector('[data-testid="studio-surface"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-host-surface]:not([hidden])")).toHaveLength(1);
    expect(document.body.dataset.badgeMode).toBe("studio");
    expect(document.documentElement.dataset.badgeMode).toBe("studio");
    expect(document.title).toBe("Badge Studio");
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(container.querySelector("#studio-section-studio")),
    );

    await act(async () => container.querySelector<HTMLButtonElement>("#studio-section-discover")?.click());
    expect(studioControl.guardCalls).toBe(1);
    expect(window.location.pathname).toBe("/");
    expect(window.location.hash).toBe("#discover");
    expect(container.querySelector('[data-testid="archive-surface"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-host-surface]:not([hidden])")).toHaveLength(1);
    expect(document.body.dataset.badgeMode).toBe("archive");
    expect(document.documentElement.dataset.badgeMode).toBe("archive");
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(container.querySelector("#archive-section-discover")),
    );
  });

  it("retains each visited surface while hiding and inerting the inactive one", async () => {
    await act(async () => root.render(<App />));
    expect(writeArchiveSectionHash("discover")).toBe(true);
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-preparation")?.click());
    expect(container.querySelector("#archive-preparation-value")?.textContent).toBe("prepared");
    expect(archiveControl.effectsActive).toBe(true);

    await act(async () => container.querySelector<HTMLButtonElement>("#archive-section-studio")?.click());
    const archiveWrapper = container.querySelector<HTMLElement>('[data-host-surface="archive"]');
    const studioWrapper = container.querySelector<HTMLElement>('[data-host-surface="studio"]');
    expect(archiveWrapper?.hidden).toBe(true);
    expect(archiveWrapper?.hasAttribute("inert")).toBe(true);
    expect(studioWrapper?.hidden).toBe(false);
    expect(studioWrapper?.hasAttribute("inert")).toBe(false);
    expect(archiveControl.effectsActive).toBe(false);
    expect(container.querySelectorAll("[data-host-surface]:not([hidden])")).toHaveLength(1);

    await act(async () => container.querySelector<HTMLButtonElement>("#studio-section-discover")?.click());
    expect(container.querySelector("#archive-preparation-value")?.textContent).toBe("prepared");
    expect(archiveWrapper?.hidden).toBe(false);
    expect(archiveWrapper?.hasAttribute("inert")).toBe(false);
    expect(studioWrapper?.hidden).toBe(true);
    expect(studioWrapper?.hasAttribute("inert")).toBe(true);
    expect(archiveControl.effectsActive).toBe(true);
    expect(container.querySelectorAll("[data-host-surface]:not([hidden])")).toHaveLength(1);
  });

  it("synchronizes a different retained Archive section and preserves a same-section return", async () => {
    await act(async () => root.render(<App />));
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-preparation")?.click());
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-section-studio")?.click());

    await act(async () => container.querySelector<HTMLButtonElement>("#studio-section-discover")?.click());
    expect(container.querySelector("#archive-active-section")?.textContent).toBe("discover");
    expect(container.querySelector("#archive-preparation-value")?.textContent).toBe("empty");

    await act(async () => container.querySelector<HTMLButtonElement>("#archive-preparation")?.click());
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-section-studio")?.click());
    await act(async () => container.querySelector<HTMLButtonElement>("#studio-section-discover")?.click());
    expect(container.querySelector("#archive-active-section")?.textContent).toBe("discover");
    expect(container.querySelector("#archive-preparation-value")?.textContent).toBe("prepared");
  });

  it("suspends Archive effects on history entry to Studio and remembers its last written section", async () => {
    await act(async () => root.render(<App />));
    expect(writeArchiveSectionHash("discover")).toBe(true);
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-preparation")?.click());

    await act(async () => {
      window.history.pushState({ __badgeHistoryIndex: 2 }, "", "/#studio/record-yosemite");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(archiveControl.effectsActive).toBe(false);
    expect(container.querySelector('[data-host-surface="archive"]')?.hasAttribute("inert")).toBe(true);

    await act(async () => container.querySelector<HTMLButtonElement>("#studio-section-discover")?.click());
    expect(container.querySelector("#archive-active-section")?.textContent).toBe("discover");
    expect(container.querySelector("#archive-preparation-value")?.textContent).toBe("prepared");
    expect(archiveControl.effectsActive).toBe(true);
  });

  it("synchronizes a different retained Archive section reached by browser history", async () => {
    await act(async () => root.render(<App />));
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-section-studio")?.click());
    await act(async () => container.querySelector<HTMLButtonElement>("#studio-section-discover")?.click());
    expect(container.querySelector("#archive-active-section")?.textContent).toBe("discover");

    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("#studio/record-yosemite");
    expect(archiveControl.effectsActive).toBe(false);

    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("");
    expect(container.querySelector("#archive-active-section")?.textContent).toBe("collection");
    expect(archiveControl.effectsActive).toBe(true);
  });

  it("restores the existing Studio entry after a rejected Back without replacing the Archive entry", async () => {
    await act(async () => root.render(<App />));
    expect(writeArchiveSectionHash("discover")).toBe(true);
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-section-studio")?.click());
    expect(window.location.hash).toBe("#studio/record-yosemite");

    studioControl.allowLeave = false;
    const replaceState = vi.spyOn(window.history, "replaceState");
    await traverseHistory(() => window.history.back());
    await vi.waitFor(() => expect(window.location.hash).toBe("#studio/record-yosemite"));
    expect(studioControl.guardCalls).toBe(1);
    expect(replaceState).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="studio-surface"]')).not.toBeNull();

    studioControl.allowLeave = true;
    await traverseHistory(() => window.history.back());
    await vi.waitFor(() => expect(window.location.hash).toBe("#discover"));
    await vi.waitFor(() => expect(container.querySelector('[data-testid="archive-surface"]')).not.toBeNull());
  });

  it("restores the existing Studio entry after a rejected Forward without replacing the Archive entry", async () => {
    await act(async () => root.render(<App />));
    expect(writeArchiveSectionHash("discover")).toBe(true);
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-section-studio")?.click());
    await act(async () => container.querySelector<HTMLButtonElement>("#studio-section-discover")?.click());
    expect(window.location.hash).toBe("#discover");

    await traverseHistory(() => window.history.back());
    await vi.waitFor(() => expect(window.location.hash).toBe("#studio/record-yosemite"));
    await vi.waitFor(() => expect(container.querySelector('[data-testid="studio-surface"]')).not.toBeNull());

    studioControl.allowLeave = false;
    const replaceState = vi.spyOn(window.history, "replaceState");
    await traverseHistory(() => window.history.forward());
    await vi.waitFor(() => expect(studioControl.guardCalls).toBe(2));
    await vi.waitFor(() => expect(window.location.hash).toBe("#studio/record-yosemite"));
    expect(replaceState).not.toHaveBeenCalled();

    studioControl.allowLeave = true;
    await traverseHistory(() => window.history.forward());
    await vi.waitFor(() => expect(window.location.hash).toBe("#discover"));
    await vi.waitFor(() => expect(container.querySelector('[data-testid="archive-surface"]')).not.toBeNull());
  });

  it("keeps an allowed null-state Archive entry unknown and preserves it after a later rejected Back", async () => {
    window.history.replaceState(null, "", "/#discover");
    window.history.pushState({ __badgeHistoryIndex: 0 }, "", "/#studio/record-yosemite");
    await act(async () => root.render(<App />));

    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("#discover");
    expect(window.history.state).toBeNull();

    await traverseHistory(() => window.history.forward());
    expect(window.location.hash).toBe("#studio/record-yosemite");
    studioControl.allowLeave = false;
    const replaceState = vi.spyOn(window.history, "replaceState");
    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("#studio/record-yosemite");
    expect(window.history.state).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();

    studioControl.allowLeave = true;
    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("#discover");
    expect(window.history.state).toBeNull();
  });

  it("does not invent traversal deltas when Archive pushes between indexed and unknown entries", async () => {
    window.history.replaceState({ __badgeHistoryIndex: 5 }, "", "/#studio/record-yosemite");
    window.history.pushState(null, "", "/");
    window.history.pushState({ __badgeHistoryIndex: 6 }, "", "/#studio/record-yosemite");
    await act(async () => root.render(<App />));

    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("");
    expect(window.history.state).toBeNull();
    expect(writeArchiveSectionHash("discover")).toBe(true);
    expect(window.history.state).toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>("#archive-section-studio")?.click());
    expect(window.location.hash).toBe("#studio/record-yosemite");
    expect(window.history.state).toBeNull();

    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("#discover");
    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("");
    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("#studio/record-yosemite");
    expect(window.history.state).toEqual({ __badgeHistoryIndex: 5 });

    studioControl.allowLeave = false;
    const go = vi.spyOn(window.history, "go");
    const replaceState = vi.spyOn(window.history, "replaceState");
    await traverseHistory(() => window.history.forward());
    expect(window.location.hash).toBe("#studio/record-yosemite");
    expect(window.history.state).toBeNull();
    expect(go).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();

    studioControl.allowLeave = true;
    await traverseHistory(() => window.history.back());
    expect(window.location.hash).toBe("");
    expect(window.history.state).toBeNull();
  });
});
