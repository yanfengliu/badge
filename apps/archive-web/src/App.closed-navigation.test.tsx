// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type * as ArchiveStartup from "./archive-startup";

vi.mock("./archive-startup", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof ArchiveStartup;
  return {
    ...actual,
    initializeStarterArchive: () => new Promise<never>(() => undefined),
  };
});

import { App } from "./App";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Archive navigation while local state is unavailable", () => {
  it("keeps all three Archive destinations reachable and Studio out of the nav while opening", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onShowStudio = vi.fn();

    await act(async () => root.render(<App onShowStudio={onShowStudio} />));

    expect(container.textContent).toContain("Opening your private archive");
    const navLabels = [...container.querySelectorAll<HTMLButtonElement>("nav button")].map((button) =>
      button.textContent?.trim(),
    );
    expect(navLabels).toEqual(["Collection", "Timeline", "Discover"]);

    // Badge Studio adjusts one badge, so it is reachable only from that badge in Discover —
    // never from a global control that has no badge to open.
    expect(container.textContent).not.toContain("Badge Studio");
    expect(container.querySelector("#archive-section-studio")).toBeNull();
    expect(onShowStudio).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });
});
