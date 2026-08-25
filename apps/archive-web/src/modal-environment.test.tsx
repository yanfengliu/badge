// @vitest-environment happy-dom

import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useModalEnvironment } from "./modal-environment.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function TestModal({ name }: { readonly name: string }) {
  const dialog = useRef<HTMLDivElement>(null);
  useModalEnvironment(dialog);
  return (
    <div ref={dialog} role="dialog" data-modal={name}>
      {name}
    </div>
  );
}

describe("modal document isolation", () => {
  let container: HTMLDivElement;
  let outside: HTMLElement;
  let root: Root;

  beforeEach(() => {
    document.documentElement.setAttribute("style", "color: rgb(12, 34, 56); overflow-x: clip");
    document.body.setAttribute("style", "margin: 7px; overflow-y: scroll");
    outside = document.createElement("aside");
    outside.setAttribute("inert", "legacy");
    container = document.createElement("div");
    document.body.replaceChildren(outside, container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
    document.body.replaceChildren();
  });

  it("locks both scrolling roots, isolates the current modal, and restores exact prior state", async () => {
    await act(async () =>
      root.render(
        <>
          <main data-background>Archive</main>
          <TestModal name="replay" />
        </>,
      ),
    );

    const background = container.querySelector<HTMLElement>("[data-background]");
    const replay = container.querySelector<HTMLElement>('[data-modal="replay"]');
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(background?.hasAttribute("inert")).toBe(true);
    expect(outside.getAttribute("inert")).toBe("legacy");
    expect(replay?.hasAttribute("inert")).toBe(false);

    await act(async () => root.render(<main data-background>Archive</main>));

    expect(document.documentElement.getAttribute("style")).toBe("color: rgb(12, 34, 56); overflow-x: clip");
    expect(document.body.getAttribute("style")).toBe("margin: 7px; overflow-y: scroll");
    expect(background?.hasAttribute("inert")).toBe(false);
    expect(outside.getAttribute("inert")).toBe("legacy");
  });

  it("keeps the document locked while stacked modals hand control back to the earlier modal", async () => {
    await act(async () =>
      root.render(
        <>
          <main data-background>Archive</main>
          <TestModal name="first" />
          <TestModal name="second" />
        </>,
      ),
    );

    expect(container.querySelector('[data-modal="first"]')?.hasAttribute("inert")).toBe(true);
    expect(container.querySelector('[data-modal="second"]')?.hasAttribute("inert")).toBe(false);

    await act(async () =>
      root.render(
        <>
          <main data-background>Archive</main>
          <TestModal name="first" />
        </>,
      ),
    );

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(container.querySelector('[data-modal="first"]')?.hasAttribute("inert")).toBe(false);
    expect(container.querySelector("[data-background]")?.hasAttribute("inert")).toBe(true);

    await act(async () => root.render(<main data-background>Archive</main>));
    expect(document.documentElement.getAttribute("style")).toBe("color: rgb(12, 34, 56); overflow-x: clip");
    expect(document.body.getAttribute("style")).toBe("margin: 7px; overflow-y: scroll");
  });
});
