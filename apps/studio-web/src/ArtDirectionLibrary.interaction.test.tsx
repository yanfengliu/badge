// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtDirectionLibrary } from "./ArtDirectionLibrary.js";
import {
  createNationalParkMediaResolver,
  nationalParkSourceFileNames,
  nationalParkThumbnailFileNames,
} from "./national-park-source-urls.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ArtDirectionLibrary mounted interactions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
    await act(async () => root.render(<ArtDirectionLibrary />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
  });

  it("keeps the detail and copied prompt aligned with a filtered park", async () => {
    await changeSearch("parks", "Yosemite");

    expect(detailTitle()).toBe("Yosemite");
    expect(selectedResult()?.textContent).toContain("Yosemite");
    expect(promptText()).toContain("Title: Yosemite");
    expect(promptText()).not.toContain("Title: Acadia");

    let copied = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async (text: string) => void (copied = text)) },
    });
    await expandPrompt();
    await clickButton("Copy prompt");
    expect(copied).toBe(promptText());
    expect(container.textContent).toContain("Exact compiled prompt copied.");
  });

  it("keeps the exact prompt collapsed by default and reveals it from a native disclosure", async () => {
    const disclosure = promptDisclosure();
    const summary = disclosure.querySelector("summary");

    expect(disclosure.open).toBe(false);
    expect(summary?.textContent).toContain("Exact compiled prompt");
    expect(summary?.textContent).toContain("acadia:landmark-witness");

    await expandPrompt();

    expect(disclosure.open).toBe(true);
    expect(promptText()).toContain("Title: Acadia");
    expect(buttonWithText("Copy prompt")).toBeTruthy();

    await expandPrompt();

    expect(disclosure.open).toBe(false);
  });

  it("resets candidate direction across tabs and aligns filtered ideas and styles", async () => {
    await clickButton("Terrain");
    await selectOption("art-direction-style-override", "thread-painted-embroidery");
    expect(container.textContent).toContain("acadia:terrain-memory");
    expect(promptText()).toContain("Thread-painted embroidery");
    expect(promptText()).toContain("SMALL-BADGE MANUFACTURING CONTRACT");

    await clickButton("Common achievements");
    expect(pressedButton("Landmark")?.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("saw-northern-lights:landmark-witness");
    expect(promptText()).not.toContain("Thread-painted embroidery");
    expect(promptText()).toContain("SMALL-BADGE MANUFACTURING CONTRACT");

    await changeSearch("ideas", "marathon");
    expect(detailTitle()).toBe("Finished a marathon");
    expect(promptText()).toContain("Title: Finished a marathon");

    await clickButton("Art styles");
    await changeSearch("styles", "embroidery");
    expect(detailTitle()).toBe("Thread-painted embroidery");
    expect(selectedResult()?.textContent).toContain("Thread-painted embroidery");
  });

  it("restores the recommended style after an explicit override", async () => {
    const styleSelect = container.querySelector<HTMLSelectElement>("#art-direction-style-override");
    if (!styleSelect) throw new Error("Mounted test could not find the source-art style control.");
    const recommendedStyleId = styleSelect.value;

    expect(container.querySelector(".art-direction-library__restore-recommendation")).toBeNull();
    await selectOption("art-direction-style-override", "thread-painted-embroidery");

    const restore = container.querySelector<HTMLButtonElement>(
      ".art-direction-library__restore-recommendation",
    );
    if (!restore) throw new Error("Mounted test could not find the restore recommendation control.");
    expect(restore.textContent).toContain("Restore recommendation");
    expect(styleSelect.value).toBe("thread-painted-embroidery");
    expect(promptText()).toContain("Thread-painted embroidery");

    await act(async () => restore.click());

    expect(container.querySelector(".art-direction-library__restore-recommendation")).toBeNull();
    expect(styleSelect.value).toBe(recommendedStyleId);
    expect(promptText()).not.toContain("Thread-painted embroidery");
  });

  it("moves tab focus and selection with arrow keys", async () => {
    const parksTab = buttonWithText("National parks");
    parksTab.focus();
    await act(async () => {
      parksTab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(document.activeElement?.textContent).toContain("Common achievements");
    expect(buttonWithText("Common achievements").getAttribute("aria-selected")).toBe("true");
  });

  it("contains missing source and thumbnail derivatives in an actionable catalogue error state", async () => {
    const sourceUrls = new Map(
      nationalParkSourceFileNames().map((fileName) => [fileName, `/source/${fileName}`]),
    );
    const thumbnailUrls = new Map(
      nationalParkThumbnailFileNames().map((fileName) => [fileName, `/thumbnail/${fileName}`]),
    );
    sourceUrls.delete("acadia.jpg");
    thumbnailUrls.delete("acadia.jpg");

    await act(async () =>
      root.render(
        <ArtDirectionLibrary mediaResolver={createNationalParkMediaResolver(sourceUrls, thumbnailUrls)} />,
      ),
    );

    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts).toHaveLength(2);
    expect(container.querySelectorAll(".art-direction-library__thumbnail-error")).toHaveLength(1);
    expect(container.textContent).toContain("1 thumbnail is missing: acadia.jpg");
    expect(container.textContent).toContain("npm run catalogue:thumbnails");
    expect(container.textContent).toContain("Selected source study unavailable");
    expect(container.textContent).toContain("Missing file: acadia.jpg");
    expect(container.textContent).toContain("npm run catalogue:refresh-integrity");
    expect(selectedResult()?.getAttribute("aria-label")).toContain("Catalogue thumbnail unavailable");
    expect(promptText()).toContain("Title: Acadia");
    expect(buttonWithText("Copy prompt")).toBeTruthy();
  });

  async function changeSearch(tab: "parks" | "ideas" | "styles", value: string): Promise<void> {
    const input = document.querySelector<HTMLInputElement>(`#art-direction-search-${tab}`);
    if (!input) throw new Error(`Mounted test could not find the ${tab} search input.`);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    });
  }

  async function selectOption(id: string, value: string): Promise<void> {
    const select = document.querySelector<HTMLSelectElement>(`#${id}`);
    if (!select) throw new Error(`Mounted test could not find select ${id}.`);
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  async function clickButton(text: string): Promise<void> {
    await act(async () => buttonWithText(text).click());
  }

  async function expandPrompt(): Promise<void> {
    const disclosure = promptDisclosure();
    const summary = disclosure.querySelector<HTMLElement>("summary");
    if (!summary) throw new Error("Mounted test could not find the exact prompt disclosure summary.");
    await act(async () => summary.click());
  }

  function buttonWithText(text: string): HTMLButtonElement {
    const button = [...container.querySelectorAll<HTMLButtonElement>("button")].find((entry) =>
      entry.textContent?.includes(text),
    );
    if (!button) throw new Error(`Mounted test could not find button containing ${text}.`);
    return button;
  }

  function pressedButton(text: string): HTMLButtonElement | undefined {
    return [...container.querySelectorAll<HTMLButtonElement>('button[aria-pressed="true"]')].find((entry) =>
      entry.textContent?.includes(text),
    );
  }

  function selectedResult(): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>(
      '.art-direction-library__items button[aria-pressed="true"]',
    );
  }

  function detailTitle(): string | null {
    return container.querySelector(".art-direction-library__detail h3")?.textContent ?? null;
  }

  function promptText(): string {
    return container.querySelector(".art-direction-library__prompt")?.textContent ?? "";
  }

  function promptDisclosure(): HTMLDetailsElement {
    const disclosure = container.querySelector<HTMLDetailsElement>(
      ".art-direction-library__prompt-disclosure",
    );
    if (!disclosure) throw new Error("Mounted test could not find the exact prompt disclosure.");
    return disclosure;
  }
});
