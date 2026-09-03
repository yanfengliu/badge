// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioAdjustmentSubmission, StudioBadgeTarget } from "@badge/studio-adjustment-contract";

vi.mock("@badge/renderer-web", () => ({
  BadgeViewer: ({ sourceUrl }: { sourceUrl: string }) => <div data-testid="viewer" data-source={sourceUrl} />,
}));

vi.mock("./image-processing", () => ({
  readImageAsset: () =>
    Promise.resolve({ blob: new Blob([new Uint8Array([1])]), hash: "c".repeat(64), mimeType: "image/png" }),
  normalizeStudioAssetForPublication: () =>
    Promise.resolve({
      blob: new Blob([new Uint8Array([2])]),
      bytes: new Uint8Array([2]),
      hash: "d".repeat(64),
      mimeType: "image/png",
    }),
}));

vi.mock("./studio-store", () => ({
  openStudioStore: () => Promise.resolve({ close: () => undefined, saveOriginal: () => Promise.resolve() }),
  StudioStoreError: class StudioStoreError extends Error {},
}));

import { App } from "./App";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const catalogueRecipe = {
  version: 1 as const,
  shape: "circle" as const,
  material: "metal" as const,
  borderColor: "#b87333",
  borderWidth: 0.08,
  thickness: 0.1,
  relief: 0.03,
  crop: { x: 0.5, y: 0.5, scale: 1 },
};

function targetFor(overrides: Partial<StudioBadgeTarget> = {}): StudioBadgeTarget {
  return {
    recordId: "starter:visited-yosemite",
    title: "Yosemite",
    criterion: "Visit Yosemite National Park",
    collected: false,
    sourceUrl: "/yosemite.png",
    catalogueSourceUrl: "/yosemite.png",
    catalogueRecipe,
    appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
    ownImageDescription: null,
    tags: [],
    collections: [
      { key: "pack:starter:us-national-parks", label: "U.S. National Parks", fromCatalogue: true },
      { key: "pack:discovery:books-read", label: "Books Read", fromCatalogue: false },
    ],
    selectedCollectionKeys: ["pack:starter:us-national-parks"],
    quotations: [
      {
        quotationId: "lincoln",
        text: "Afford all an unfettered start.",
        person: "Abraham Lincoln",
        sourceTitle: "The Lincoln Year Book",
        formatted: "a",
      },
      {
        quotationId: "aesop",
        text: "Advantages dearly bought.",
        person: "Aesop",
        sourceTitle: "Aesop's Fables",
        formatted: "b",
      },
    ],
    selectedQuotationId: "lincoln",
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

function studioText(): string {
  return container.textContent ?? "";
}

function buttonNamed(label: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll("button")].find((node) => node.textContent?.trim() === label);
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
});

describe("Badge Studio adjustment surface", () => {
  it("returns to a saved, leavable state once the badge reflects the save", async () => {
    const saved: StudioAdjustmentSubmission[] = [];
    let guard: (() => Promise<boolean>) | null = null;
    let target = targetFor();
    const render = () =>
      act(async () =>
        root.render(
          <App
            target={target}
            onApply={async (submission) => {
              saved.push(submission);
              // The host re-resolves the badge after a successful save, exactly as it does live.
              target = targetFor({ appearance: { ...target.appearance, shape: "shield" } });
              return { ok: true, message: "Saved to Yosemite — shape · 1 collection." };
            }}
            onClose={() => undefined}
            onLeaveGuardChange={(next) => {
              guard = next;
            }}
          />,
        ),
      );

    await render();
    await act(async () => buttonNamed("shield")?.click());
    expect(buttonNamed("Save adjustments")).toBeDefined();

    await act(async () => buttonNamed("Save adjustments")?.click());
    await render();

    expect(saved).toHaveLength(1);
    expect(saved[0].appearance.shape).toBe("shield");
    expect(buttonNamed("Save adjustments")).toBeUndefined();
    expect(buttonNamed("Saved")?.disabled).toBe(true);
    expect(studioText()).toContain("Saved to Yosemite");
    // The owner must be able to leave a badge they just saved.
    await expect(guard!()).resolves.toBe(true);
  });

  it("does not stay unsaved forever after the owner's own image is saved", async () => {
    let guard: (() => Promise<boolean>) | null = null;
    let target = targetFor();
    const render = () =>
      act(async () =>
        root.render(
          <App
            target={target}
            onApply={async (submission) => {
              // The Archive stored the image and the host re-resolved the badge with it.
              target = targetFor({
                ownImageDescription: submission.ownImage?.accessibleDescription ?? null,
                sourceUrl: "blob:stored",
              });
              return { ok: true, message: "Saved to Yosemite — your own image · 1 collection." };
            }}
            onClose={() => undefined}
            onLeaveGuardChange={(next) => {
              guard = next;
            }}
          />,
        ),
      );

    await render();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File([new Uint8Array([1])], "valley.png", { type: "image/png" })],
    });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(buttonNamed("Save adjustments")).toBeDefined();

    await act(async () => buttonNamed("Save adjustments")?.click());
    await render();

    expect(buttonNamed("Save adjustments")).toBeUndefined();
    expect(buttonNamed("Saved")?.disabled).toBe(true);
    let allowed: boolean | null = null;
    await act(async () => {
      allowed = await guard!();
    });
    expect(allowed).toBe(true);
  });

  it("shows a change made outside Studio instead of the draft it held before", async () => {
    let target = targetFor();
    const render = () =>
      act(async () =>
        root.render(
          <App
            target={target}
            onApply={async () => ({ ok: true, message: "saved" })}
            onClose={() => undefined}
            onLeaveGuardChange={() => undefined}
          />,
        ),
      );

    await render();
    const chosen = () =>
      [...container.querySelectorAll(".studio-quote")].findIndex(
        (node) => node.getAttribute("aria-checked") === "true",
      );
    expect(chosen()).toBe(0);

    // The owner regenerated the quote in the Archive while Studio stayed mounted.
    target = targetFor({ selectedQuotationId: "aesop" });
    await render();

    expect(chosen()).toBe(1);
    expect(buttonNamed("Save adjustments")).toBeUndefined();
  });

  it("keeps an in-progress edit while the badge itself has not changed", async () => {
    const target = targetFor();
    const render = () =>
      act(async () =>
        root.render(
          <App
            target={{ ...target }}
            onApply={async () => ({ ok: true, message: "saved" })}
            onClose={() => undefined}
            onLeaveGuardChange={() => undefined}
          />,
        ),
      );

    await render();
    await act(async () => buttonNamed("shield")?.click());
    // A re-render with an equal-valued target must not throw the edit away.
    await render();

    expect(buttonNamed("shield")?.getAttribute("aria-pressed")).toBe("true");
    expect(buttonNamed("Save adjustments")).toBeDefined();
  });

  it("refuses to leave with unsaved work and names the two ways out", async () => {
    let guard: (() => Promise<boolean>) | null = null;
    await act(async () =>
      root.render(
        <App
          target={targetFor()}
          onApply={async () => ({ ok: true, message: "saved" })}
          onClose={() => undefined}
          onLeaveGuardChange={(next) => {
            guard = next;
          }}
        />,
      ),
    );
    await act(async () => buttonNamed("shield")?.click());

    let allowed: boolean | null = null;
    await act(async () => {
      allowed = await guard!();
    });

    expect(allowed).toBe(false);
    expect(studioText()).toContain("Save them, or choose Discard changes, before leaving.");
  });

  it("seals a collected badge's face while leaving tags and collections open", async () => {
    await act(async () =>
      root.render(
        <App
          target={targetFor({ collected: true })}
          onApply={async () => ({ ok: true, message: "saved" })}
          onClose={() => undefined}
          onLeaveGuardChange={() => undefined}
        />,
      ),
    );

    const fieldsets = [...container.querySelectorAll<HTMLFieldSetElement>(".appearance-controls fieldset")];
    expect(fieldsets.length).toBeGreaterThan(0);
    expect(fieldsets.every((fieldset) => fieldset.disabled)).toBe(true);
    expect(buttonNamed("Use my own image")?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>(".studio-quote")?.disabled).toBe(true);
    expect(studioText()).toContain("sealed with that memory");
    expect([...container.querySelectorAll<HTMLInputElement>(".studio-collections input")][1].disabled).toBe(
      false,
    );
  });
});
