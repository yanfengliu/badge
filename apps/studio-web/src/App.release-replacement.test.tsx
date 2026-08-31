// @vitest-environment happy-dom

import "fake-indexeddb/auto";

import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { readFile } from "node:fs/promises";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { studioFixtureCandidates } from "@badge/catalogue-fixtures/studio";
import { sha256Hex } from "@badge/pack-contract";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as ImageProcessing from "./image-processing.js";
import { STUDIO_DATABASE_NAME } from "./studio-store.js";

const mocks = vi.hoisted(() => ({
  normalizeForPublication: vi.fn(),
  offerPackClosureDownload: vi.fn(),
  publishYosemitePack: vi.fn(),
}));

vi.mock("@badge/renderer-web", () => ({
  BadgeViewer: ({
    accessibleDescription,
    sourceUrl,
  }: {
    accessibleDescription: string;
    sourceUrl: string;
  }) => (
    <div
      data-testid="badge-viewer"
      data-accessible-description={accessibleDescription}
      data-source-url={sourceUrl}
    />
  ),
}));

vi.mock("./image-processing.js", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof ImageProcessing;
  return { ...actual, normalizeStudioAssetForPublication: mocks.normalizeForPublication };
});

vi.mock("./pack-download.js", () => ({
  offerPackClosureDownload: mocks.offerPackClosureDownload,
}));

vi.mock("./publish-pack.js", () => ({
  publishYosemitePack: mocks.publishYosemitePack,
}));

import { App } from "./App.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PNG_BYTES = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181,
  28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102, 0, 0,
  0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);
const currentFixturePaths: Readonly<Record<string, string>> = {
  "candidate-literal": "../../../packages/catalogue-fixtures/assets/yosemite-literal-manufactured-v2.webp",
  "candidate-symbolic": "../../../packages/catalogue-fixtures/assets/yosemite-symbolic-manufactured-v2.webp",
  "candidate-topographic":
    "../../../packages/catalogue-fixtures/assets/yosemite-topographic-manufactured-v2.webp",
};

describe("mounted Studio image replacement", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await deleteDB(STUDIO_DATABASE_NAME);
    vi.stubGlobal("Blob", NodeBlob);
    vi.stubGlobal("File", NodeFile);
    const currentBlobs = new Map<string, Blob>();
    for (const candidate of studioFixtureCandidates) {
      currentBlobs.set(candidate.sourceUrl, await fixtureBlob(currentFixturePaths[candidate.id]));
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const sourceUrl = input instanceof Request ? input.url : String(input);
        const blob = currentBlobs.get(sourceUrl);
        return {
          ok: blob !== undefined,
          status: blob ? 200 : 404,
          blob: async () => blob ?? new Blob([], { type: "image/webp" }),
        } as Response;
      }),
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async (source: ImageBitmapSource) => {
        const dimension = source instanceof Blob && source.type === "image/png" ? 1 : 896;
        return { width: dimension, height: dimension, close: vi.fn() } as unknown as ImageBitmap;
      }),
    );
    let objectUrl = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:studio-${String(++objectUrl)}`);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    mocks.normalizeForPublication.mockImplementation(async (blob: Blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return {
        blob,
        bytes,
        hash: await sha256Hex(bytes),
        mimeType: "image/png" as const,
        width: 896,
        height: 896,
      };
    });
    mocks.publishYosemitePack
      .mockResolvedValueOnce(releaseResult(`0.1.0-studio.${"1".repeat(64)}`, "a".repeat(64), 1))
      .mockResolvedValueOnce(releaseResult(`0.1.0-studio.${"2".repeat(64)}`, "b".repeat(64), 2))
      .mockResolvedValueOnce(releaseResult(`0.1.0-studio.${"2".repeat(64)}`, "b".repeat(64), 2));

    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    await deleteDB(STUDIO_DATABASE_NAME);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps one accessible own-image action before and after freeze and opens a new edition only after a valid upload", async () => {
    await act(async () =>
      root.render(<App onSectionChange={() => undefined} onLeaveGuardChange={() => undefined} />),
    );
    await waitFor(() => expect(container.textContent).toContain("Three source-art proposals"));

    const uploadButton = buttonWithText("Swap in my image");
    const uploadInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!uploadInput) throw new Error("Mounted Studio did not render its image upload input.");
    expect(uploadButton.disabled).toBe(false);
    expect(uploadInput.hidden).toBe(true);
    expect(uploadInput.disabled).toBe(false);
    expect(uploadInput.getAttribute("accept")).toBe("image/png,image/jpeg,image/webp");
    expect(uploadInput.hasAttribute("aria-hidden")).toBe(false);
    expect(container.textContent).toContain("Available before or after activation");

    await clickButton("Publish badge pack");
    await waitFor(() => expect(container.textContent).toContain("This edition is frozen"));

    expect(buttonWithText("Swap in my image").disabled).toBe(false);
    expect(uploadInput.disabled).toBe(false);
    expect(buttonWithText("Process selected again").disabled).toBe(true);
    expect(buttonWithText("Offer current files again")).toBeDefined();
    const frozenCandidate = container.querySelector<HTMLButtonElement>("button.candidate");
    expect(frozenCandidate?.disabled).toBe(true);

    await chooseNoFile(uploadInput);
    expect(container.textContent).toContain("This edition is frozen");
    expect(buttonWithText("Process selected again").disabled).toBe(true);

    await chooseFile(uploadInput, new File([PNG_BYTES], "wrong.txt", { type: "text/plain" }));
    await waitFor(() => expect(container.textContent).toContain("choose a PNG, JPEG, or WebP"));
    expect(container.textContent).toContain("This edition is frozen");
    expect(buttonWithText("Process selected again").disabled).toBe(true);

    await chooseFile(uploadInput, new File([PNG_BYTES], "my-memory.png", { type: "image/png" }));
    await waitFor(() => expect(container.textContent).toContain("Replacement edition in progress"));

    const candidates = [...container.querySelectorAll<HTMLButtonElement>("button.candidate")];
    expect(candidates).toHaveLength(4);
    expect(candidates.at(-1)?.textContent).toContain("my-memory.png");
    expect(candidates.at(-1)?.getAttribute("aria-pressed")).toBe("true");
    expect(candidates.every((candidate) => !candidate.disabled)).toBe(true);
    expect(buttonWithText("Process selected again").disabled).toBe(false);
    expect(buttonWithText("Publish replacement edition")).toBeDefined();
    expect(container.querySelector('[data-testid="badge-viewer"]')?.getAttribute("data-source-url")).toBe(
      "blob:studio-1",
    );
    expect(
      container.querySelector('[data-testid="badge-viewer"]')?.getAttribute("data-accessible-description"),
    ).toContain("user-supplied image");

    await clickButton("Offer current files again");
    expect(mocks.offerPackClosureDownload).toHaveBeenCalledTimes(2);
    expect(mocks.offerPackClosureDownload).toHaveBeenLastCalledWith(
      new Uint8Array([1]),
      new Uint8Array([11]),
    );

    await clickButton("Publish replacement edition");
    await waitFor(() => expect(container.textContent).toContain("This edition is frozen"));

    expect(mocks.publishYosemitePack).toHaveBeenCalledTimes(2);
    expect(mocks.publishYosemitePack.mock.calls[1]?.[0]).toMatchObject({
      provenance: "uploaded",
      accessibleDescription: expect.stringContaining("user-supplied image"),
    });
    expect(mocks.offerPackClosureDownload).toHaveBeenLastCalledWith(
      new Uint8Array([2]),
      new Uint8Array([12]),
    );

    const priorReleaseButton = buttonWithText("Offer prior aaaaaaaa… again");
    expect(priorReleaseButton.getAttribute("aria-label")).toContain(`0.1.0-studio.${"1".repeat(64)}`);
    expect(priorReleaseButton.textContent).not.toContain("1".repeat(64));
    await clickButton("Offer prior aaaaaaaa… again");
    expect(mocks.offerPackClosureDownload).toHaveBeenLastCalledWith(
      new Uint8Array([1]),
      new Uint8Array([11]),
    );

    await chooseFile(uploadInput, new File([PNG_BYTES], "my-memory-again.png", { type: "image/png" }));
    await waitFor(() => expect(container.textContent).toContain("Replacement edition in progress"));
    await clickButton("Publish replacement edition");
    await waitFor(() => expect(container.textContent).toContain("re-offered the same immutable release"));
    expect(container.textContent).toContain("This edition is frozen");
    expect(container.textContent).not.toContain("Publish replacement edition");
    expect(container.querySelectorAll("button.candidate")).toHaveLength(4);
    expect(container.querySelectorAll(".publish-actions button")).toHaveLength(2);
  });

  function buttonWithText(text: string): HTMLButtonElement {
    const button = [...container.querySelectorAll<HTMLButtonElement>("button")].find((entry) =>
      entry.textContent?.includes(text),
    );
    if (!button) throw new Error(`Mounted Studio could not find a button containing ${text}.`);
    return button;
  }

  async function clickButton(text: string): Promise<void> {
    await act(async () => buttonWithText(text).click());
  }
});

async function chooseFile(input: HTMLInputElement, file: File): Promise<void> {
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
}

async function chooseNoFile(input: HTMLInputElement): Promise<void> {
  Object.defineProperty(input, "files", { configurable: true, value: [] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
}

function releaseResult(version: string, digest: string, marker: number) {
  return {
    packRef: { packId: "studio.visited-yosemite", version, packDigest: digest },
    bytes: new Uint8Array([marker]),
    themeDependency: { bytes: new Uint8Array([marker + 10]) },
  };
}

async function fixtureBlob(path: string): Promise<Blob> {
  const bytes = await readFile(new URL(path, import.meta.url));
  return new Blob([new Uint8Array(bytes)], { type: "image/webp" });
}

async function waitFor(assertion: () => void, timeout = 3_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      assertion();
      return;
    } catch {
      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    }
  }
  assertion();
}
