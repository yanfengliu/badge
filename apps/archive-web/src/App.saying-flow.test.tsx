// @vitest-environment happy-dom

import "fake-indexeddb/auto";

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARCHIVE_DATABASE_NAME,
  ArchiveApplication,
  IndexedDbArchiveRepository,
} from "@badge/archive-application";
import { starterBadges } from "@badge/catalogue-fixtures/archive";

import { formatFixtureQuotation } from "./fixture-quotations";
import type * as ArchiveStateExports from "./archive-state";
import type * as SayingRuntimeExports from "./saying-runtime";

const testSource = vi.hoisted(() => ({
  hash: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
  bytes: Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0, 0, 181,
    28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100, 248, 15, 0, 1, 5, 1, 1, 39, 24, 227, 102, 0, 0,
    0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
  ]),
}));

const providerRequests = vi.hoisted((): string[] => []);

vi.mock("./archive-state", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof ArchiveStateExports;
  return {
    ...actual,
    createStarterArchiveState() {
      const state = actual.createStarterArchiveState();
      return {
        ...state,
        records: state.records.map((record) => ({
          ...record,
          publishedVisual: { ...record.publishedVisual, sourceAssetHash: testSource.hash },
        })),
      };
    },
  };
});

vi.mock("./starter-assets", () => ({
  loadStarterSourceAssets: async () => [
    { hash: testSource.hash, mimeType: "image/png" as const, bytes: testSource.bytes },
  ],
}));

vi.mock("@badge/renderer-web", () => ({
  BadgeViewer: ({ presentation = "interactive" }: { presentation?: "interactive" | "single-turn" }) => (
    <div data-testid="badge-viewer" data-presentation={presentation} />
  ),
}));

vi.mock("./saying-runtime", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof SayingRuntimeExports;
  const contract = await import("@badge/saying-live-contract");

  return {
    ...actual,
    createSayingRuntime(_mode: string, sources: Parameters<typeof actual.createSayingRuntime>[1]) {
      return actual.createSayingRuntime("production", sources, async (input, init) => {
        const path = String(input);
        providerRequests.push(path);
        const json = (value: unknown) =>
          new Response(JSON.stringify(value), {
            status: 200,
            headers: { "Content-Type": contract.SAYING_JSON_MEDIA_TYPE },
          });

        if (path === contract.SAYING_DISCLOSURE_PATH) return json(contract.SAYING_DISCLOSURE);

        expect(path).toBe(contract.SAYING_GENERATION_PATH);
        expect(new Headers(init?.headers).get(contract.SAYING_DISCLOSURE_HEADER)).toBe(
          contract.SAYING_DISCLOSURE_FINGERPRINT,
        );
        const request = JSON.parse(String(init?.body)) as {
          allowedQuotations: (typeof starterBadges)[number]["historicalQuotations"];
        };
        const quotation = request.allowedQuotations[0]!;
        return json({
          response: { kind: "quotation", saying: quotation.text, quotation },
          provenance: {
            provider: contract.SAYING_PROVIDER_ID,
            model: contract.SAYING_MODEL_ID,
            promptVersion: contract.SAYING_DISCLOSURE.promptVersion,
            generatedAt: "2026-08-24T12:00:00.000Z",
          },
        });
      });
    },
  };
});

import { App } from "./App";
import { createStarterQuotationRequests } from "./archive-state";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("mounted historical-quotation flow", () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalCreateObjectUrl: PropertyDescriptor | undefined;
  let originalRevokeObjectUrl: PropertyDescriptor | undefined;

  beforeEach(async () => {
    providerRequests.length = 0;
    window.history.replaceState(null, "", "/");
    container = document.createElement("div");
    document.body.replaceChildren(container);
    originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:mounted-quotation-flow"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    root = createRoot(container);
    await act(async () => root.render(<App onShowStudio={() => undefined} />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    await deleteDB(ARCHIVE_DATABASE_NAME);
    restoreProperty(URL, "createObjectURL", originalCreateObjectUrl);
    restoreProperty(URL, "revokeObjectURL", originalRevokeObjectUrl);
    vi.restoreAllMocks();
  });

  it("shows a seeded source, discloses regeneration, persists the replacement, and seals it", async () => {
    const yosemite = starterBadges[0]!;
    const original = yosemite.historicalQuotations[0]!;
    const replacement = yosemite.historicalQuotations[1]!;
    const rejectedAfterActivation = yosemite.historicalQuotations[2]!;
    const recordId = `starter:${yosemite.definitionId}`;

    await waitFor(() => expect(container.textContent).toContain("The Field Archive"));
    await clickButton("Discover");
    await waitFor(() => expect(container.textContent).toContain("Discover sets"));
    const discoverySearch = container.querySelector<HTMLInputElement>('input[type="search"]');
    if (!discoverySearch) throw new Error("Mounted Archive test could not find Discover search.");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(discoverySearch, "Yosemite");
      discoverySearch.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    await waitFor(() => expect(container.textContent).toContain("1 result"));
    const prepareYosemite = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Prepare Yosemite to collect"]',
    );
    if (!prepareYosemite) throw new Error("Mounted Archive test could not prepare Yosemite from Discover.");
    await act(async () => prepareYosemite.click());
    await waitFor(() => expect(container.textContent).toContain(original.text));
    expect(container.textContent).toContain(`Historical figure${original.person}Wikipedia`);
    expect(container.textContent).toContain(`Quote source${original.sourceTitle}View quote source`);
    expect(sourceLink().href).toBe(original.sourceUrl);
    expect(wikipediaLink().href).toBe(original.personWikipediaUrl);
    expect(buttonWithText("Regenerate quote").disabled).toBe(false);

    await clickButton("Regenerate quote");
    await waitFor(() => expect(container.textContent).toContain("Review what leaves Badge"));
    expect(container.textContent).toContain(replacement.id);
    expect(container.textContent).not.toContain(original.id);
    expect(providerRequests).toEqual(["/api/archive/sayings/disclosure"]);

    await clickButton("Regenerate with Claude");
    await waitFor(() => expect(container.textContent).toContain(replacement.text));
    expect(container.textContent).toContain(`Historical figure${replacement.person}Wikipedia`);
    expect(container.textContent).toContain(`Quote source${replacement.sourceTitle}View quote source`);
    expect(sourceLink().href).toBe(replacement.sourceUrl);
    expect(wikipediaLink().href).toBe(replacement.personWikipediaUrl);
    expect(container.textContent).toContain(`Quote regenerated. “${replacement.text}”`);
    expect(providerRequests).toEqual(["/api/archive/sayings/disclosure", "/api/archive/sayings"]);

    const persistedBeforeActivation = await readArchiveRecord(recordId);
    expect(persistedBeforeActivation.acceptedSaying).toBe(formatFixtureQuotation(replacement));
    expect(persistedBeforeActivation.lifecycle).toBe("planned");

    await setDate("2026-08-24");
    await clickButton("Activate this badge");
    await waitFor(() =>
      expect(container.querySelector('.ceremony [data-presentation="interactive"]')).not.toBeNull(),
    );

    const closeCeremony = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Close activation ceremony"]',
    );
    if (!closeCeremony) throw new Error("Mounted Archive test could not close the activation ceremony.");
    await act(async () => closeCeremony.click());
    await waitFor(() => expect(container.textContent).toContain("1 / 64 collected"));
    const replayYosemite = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Replay Yosemite activation"]',
    );
    if (!replayYosemite) throw new Error("Mounted Archive test could not replay Yosemite from Collection.");
    await act(async () => replayYosemite.click());
    await waitFor(() =>
      expect(container.querySelector('.memory-replay [data-presentation="single-turn"]')).not.toBeNull(),
    );
    expect(container.textContent).toContain(replacement.text);
    expect(container.textContent).toContain("U.S. National Parks");
    expect(container.querySelector(`a[href="${replacement.sourceUrl}"]`)).not.toBeNull();
    expect(container.querySelector(`a[href="${replacement.personWikipediaUrl}"]`)).not.toBeNull();
    const parksSetLink = container.querySelector<HTMLButtonElement>('[data-set-link="true"]');
    if (!parksSetLink) throw new Error("Mounted Archive test could not open Yosemite's set.");
    await act(async () => parksSetLink.click());
    await waitFor(() =>
      expect(container.querySelector("#discovery-set-heading")?.textContent).toBe("U.S. National Parks"),
    );
    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe("");
    expect(container.textContent).toContain("1 / 64 collected");
    const discoverReplay = container.querySelector<HTMLButtonElement>(
      '.discovery-card--collected [aria-label="Replay collected memory Yosemite"]',
    );
    expect(discoverReplay?.classList.contains("discovery-card__action")).toBe(true);
    expect(container.querySelector(".discovery-card--potential")).not.toBeNull();

    discoverReplay?.focus();
    await act(async () => discoverReplay?.click());
    await waitFor(() => expect(container.querySelector(".memory-replay")).not.toBeNull());
    const closeDiscoverReplay = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Close memory replay"]',
    );
    await act(async () => closeDiscoverReplay?.click());
    await waitFor(() => expect(container.querySelector(".memory-replay")).toBeNull());
    expect(document.activeElement).toBe(discoverReplay);

    const reader = new IndexedDbArchiveRepository({
      trustedQuotationRequests: createStarterQuotationRequests(),
    });
    const archive = new ArchiveApplication(reader);
    try {
      const earned = (await archive.state()).records.find((record) => record.recordId === recordId)!;
      expect(earned.lifecycle).toBe("earned");
      expect(earned.acceptedSaying).toBe(formatFixtureQuotation(replacement));
      await expect(
        archive.updateQuotation(
          recordId,
          {
            kind: "quotation",
            saying: rejectedAfterActivation.text,
            quotation: rejectedAfterActivation,
          },
          earned.quotationRevision,
        ),
      ).rejects.toMatchObject({ code: "INVALID_LIFECYCLE" });
      expect((await archive.state()).records.find((record) => record.recordId === recordId)).toMatchObject({
        lifecycle: "earned",
        acceptedSaying: formatFixtureQuotation(replacement),
      });
    } finally {
      reader.close();
    }
  });

  it("opens an uncollected published badge for preparation inside Discover", async () => {
    await waitFor(() => expect(container.textContent).toContain("The Field Archive"));

    await clickButton("Discover");
    await waitFor(() => expect(container.textContent).toContain("Discover sets"));
    const search = container.querySelector<HTMLInputElement>('input[type="search"]');
    if (!search) throw new Error("Mounted Archive test could not find Discovery search.");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(search, "Sapiens");
      search.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.textContent).toContain("1 result");
    const openSapiens = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Prepare Read Sapiens to collect"]',
    );
    if (!openSapiens) throw new Error("Mounted Archive test could not find Read Sapiens in Discovery.");

    await act(async () => {
      openSapiens.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => expect(container.querySelector(".story-title")?.textContent).toBe("Read Sapiens"));
    expect(container.textContent).not.toContain("Discover sets");
    expect(container.querySelector('#archive-section-discover[aria-current="page"]')).not.toBeNull();
    expect(document.activeElement).toBe(container.querySelector("#badge-preparation-heading"));
    await clickButton("Back to set");
    await waitFor(() => expect(container.textContent).toContain("Discover sets"));
    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe("Sapiens");
    expect(container.textContent).toContain("1 result");
    expect(document.activeElement).toBe(
      container.querySelector('button[aria-label="Prepare Read Sapiens to collect"]'),
    );
  });

  it("preserves a revealed result window across preparation and Back", async () => {
    await waitFor(() => expect(container.textContent).toContain("The Field Archive"));
    await clickButton("Discover");
    await waitFor(() => expect(container.textContent).toContain("Discover sets"));

    await clickButton("Show 24 more");
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(48);
    const openSapiens = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Prepare Read Sapiens to collect"]',
    );
    if (!openSapiens) throw new Error("Mounted Archive test could not prepare Sapiens after reveal.");
    await act(async () => openSapiens.click());
    await waitFor(() => expect(container.querySelector(".story-title")?.textContent).toBe("Read Sapiens"));

    await clickButton("Back to set");
    await waitFor(() => expect(container.querySelectorAll(".discovery-card")).toHaveLength(48));
    expect(document.activeElement).toBe(
      container.querySelector('button[aria-label="Prepare Read Sapiens to collect"]'),
    );
  });

  it("follows live location changes and records internal section navigation without loops", async () => {
    await waitFor(() => expect(container.textContent).toContain("The Field Archive"));
    const pushState = vi.spyOn(window.history, "pushState");

    window.history.replaceState(null, "", "/#timeline");
    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    await waitFor(() =>
      expect(container.querySelector('#archive-section-timeline[aria-current="page"]')).not.toBeNull(),
    );
    expect(pushState).not.toHaveBeenCalled();

    window.history.replaceState(null, "", "/#discover");
    await act(async () => window.dispatchEvent(new HashChangeEvent("hashchange")));
    await waitFor(() =>
      expect(container.querySelector('#archive-section-discover[aria-current="page"]')).not.toBeNull(),
    );
    expect(pushState).not.toHaveBeenCalled();

    await clickButton("Collection");
    expect(window.location.hash).toBe("");
    expect(pushState).toHaveBeenCalledTimes(1);

    await clickButton("Collection");
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  function buttonWithText(text: string): HTMLButtonElement {
    const button = [...container.querySelectorAll<HTMLButtonElement>("button")].find((candidate) =>
      candidate.textContent?.includes(text),
    );
    if (!button) throw new Error(`Mounted Archive test could not find button containing ${text}.`);
    return button;
  }

  async function clickButton(text: string): Promise<void> {
    await act(async () => {
      buttonWithText(text).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  function sourceLink(): HTMLAnchorElement {
    const link = [...container.querySelectorAll<HTMLAnchorElement>("a")].find(
      (candidate) => candidate.textContent === "View quote source",
    );
    if (!link) throw new Error("Mounted Archive test could not find the quotation source link.");
    return link;
  }

  function wikipediaLink(): HTMLAnchorElement {
    const link = [...container.querySelectorAll<HTMLAnchorElement>("a")].find(
      (candidate) => candidate.textContent === "Wikipedia",
    );
    if (!link) throw new Error("Mounted Archive test could not find the historical figure Wikipedia link.");
    return link;
  }

  async function setDate(value: string): Promise<void> {
    const input = container.querySelector<HTMLInputElement>('input[type="date"][required]');
    if (!input) throw new Error("Mounted Archive test could not find the required activation date.");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    });
    expect(input.value).toBe(value);
  }
});

async function readArchiveRecord(recordId: string) {
  const reader = new IndexedDbArchiveRepository();
  try {
    const state = await new ArchiveApplication(reader).state();
    const record = state.records.find((candidate) => candidate.recordId === recordId);
    if (!record) throw new Error(`Mounted Archive test could not reread record ${recordId}.`);
    return record;
  } finally {
    reader.close();
  }
}

function restoreProperty(
  target: typeof URL,
  key: "createObjectURL" | "revokeObjectURL",
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
}

async function waitFor(assertion: () => void): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
    }
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  }
  throw lastError;
}
