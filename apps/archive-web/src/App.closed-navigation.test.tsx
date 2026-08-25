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
  it("keeps Badge Studio discoverable while Archive is still opening", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onShowStudio = vi.fn();

    await act(async () => root.render(<App onShowStudio={onShowStudio} />));

    expect(container.textContent).toContain("Opening your private archive");
    const studio = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.trim() === "Badge Studio",
    );
    expect(studio).toBeDefined();
    await act(async () => studio?.click());
    expect(onShowStudio).toHaveBeenCalledOnce();

    await act(async () => root.unmount());
    container.remove();
  });
});
