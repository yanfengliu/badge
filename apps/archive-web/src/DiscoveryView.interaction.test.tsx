// @vitest-environment happy-dom

import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoveryBadges, type SourceStudyDiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

import { focusPreparedBadgeTrigger } from "./archive-section-focus.js";
import { DiscoveryView } from "./DiscoveryView.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const available = discoveryBadges.find((badge) => badge.availability === "available");
const sourceStudy = discoveryBadges.find((badge) => badge.availability === "source-study");
const restaurantStudy = discoveryBadges.find(
  (badge): badge is SourceStudyDiscoveryBadge =>
    badge.availability === "source-study" && badge.setIds.includes("michelin-dining"),
);
const restaurantEvidenceStudy = discoveryBadges.find(
  (badge): badge is SourceStudyDiscoveryBadge =>
    badge.availability === "source-study" &&
    badge.setIds.includes("michelin-dining") &&
    Boolean(badge.visualEvidenceUrl),
);

if (!available || !sourceStudy || !restaurantStudy?.referenceUrl || !restaurantEvidenceStudy?.referenceUrl) {
  throw new Error("Discovery interaction fixtures are incomplete.");
}
const searchableBadges = [available, sourceStudy] as const;

describe("DiscoveryView mounted interactions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it("opens every badge from one full-card action and returns focus after a study preview", async () => {
    const prepared: Array<{ recordId: string; trigger: HTMLButtonElement }> = [];
    const replayed: string[] = [];
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={searchableBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query=""
          onSetChange={() => undefined}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={(recordId, trigger) => prepared.push({ recordId, trigger })}
          onOpenCollectedBadge={(recordId) => replayed.push(recordId)}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );

    const button = container.querySelector<HTMLButtonElement>(
      `.discovery-card [aria-label="Prepare ${available.title} to collect"]`,
    );
    expect(button?.classList.contains("discovery-card__action")).toBe(true);
    await act(async () => button?.click());
    expect(prepared).toEqual([{ recordId: available.recordId, trigger: button }]);
    expect(replayed).toEqual([]);

    const sourceCard = [...container.querySelectorAll<HTMLElement>(".discovery-card")].find((card) =>
      card.textContent?.includes(sourceStudy.title),
    );
    const studyAction = sourceCard?.querySelector<HTMLButtonElement>(
      `[aria-label="Inspect potential badge ${sourceStudy.title}"]`,
    );
    expect(studyAction?.classList.contains("discovery-card__action")).toBe(true);
    studyAction?.focus();
    await act(async () => studyAction?.click());
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(sourceStudy.criterion);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      sourceStudy.accessibleDescription,
    );
    expect(document.activeElement).toBe(
      container.querySelector<HTMLButtonElement>('[aria-label="Close potential badge preview"]'),
    );
    expect(sourceCard?.closest("section")?.hasAttribute("inert")).toBe(true);
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })));
    expect(document.activeElement).toBe(
      container.querySelector<HTMLButtonElement>('[aria-label="Close potential badge preview"]'),
    );
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(studyAction);
    expect(sourceCard?.closest("section")?.hasAttribute("inert")).toBe(false);

    await act(async () => studyAction?.click());
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Close potential badge preview"]')?.click(),
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(studyAction);

    await act(async () =>
      root.render(
        <DiscoveryView
          badges={searchableBadges}
          collectedRecordIds={new Set([available.recordId])}
          resolvedSourceUrls={{ [available.recordId]: "blob:earned" }}
          selectedSetId={null}
          query=""
          onSetChange={() => undefined}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={(recordId, trigger) => prepared.push({ recordId, trigger })}
          onOpenCollectedBadge={(recordId) => replayed.push(recordId)}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );
    const replayButton = container.querySelector<HTMLButtonElement>(
      `.discovery-card [aria-label="Replay collected memory ${available.title}"]`,
    );
    expect(replayButton?.classList.contains("discovery-card__action")).toBe(true);
    await act(async () => replayButton?.click());
    expect(replayed).toEqual([available.recordId]);
  });

  it("updates result state from search and availability controls", async () => {
    function SearchHarness() {
      const [query, setQuery] = useState("");
      return (
        <DiscoveryView
          badges={searchableBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query={query}
          onSetChange={() => undefined}
          onQueryChange={setQuery}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />
      );
    }
    await act(async () => root.render(<SearchHarness />));

    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error("Discovery search input is missing.");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "no badge has this phrase");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.textContent).toContain("No badges match this search.");

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.textContent).toContain(sourceStudy.title);
    expect(container.textContent).toContain(available.title);
    expect(container.textContent).toContain("2 results");
  });

  it("separates a named dining study's official Michelin listing from reviewed visual evidence", async () => {
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={[restaurantEvidenceStudy]}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId="michelin-dining"
          query=""
          onSetChange={() => undefined}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
          resolveDetail={async (fileName) => `/details/${fileName}`}
        />,
      ),
    );

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          `[aria-label="Inspect potential badge ${restaurantEvidenceStudy.title}"]`,
        )
        ?.click(),
    );
    const guideLink = container.querySelector<HTMLAnchorElement>(
      '[role="dialog"] a[href^="https://guide.michelin.com/"]',
    );
    expect(guideLink?.href).toBe(restaurantEvidenceStudy.referenceUrl);
    expect(guideLink?.textContent).toContain("Michelin Guide");
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Official Michelin listing");
    const visualEvidenceLink = container.querySelector<HTMLAnchorElement>(
      '[role="dialog"] a[href]:not([href^="https://guide.michelin.com/"])',
    );
    expect(visualEvidenceLink?.href).toBe(restaurantEvidenceStudy.visualEvidenceUrl);
    expect(visualEvidenceLink?.textContent).toContain("visual cue");
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Reviewed visual evidence");
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      restaurantEvidenceStudy.locationLabel,
    );
    expect(container.querySelector<HTMLImageElement>('[role="dialog"] img')?.src).toContain(
      `/details/${restaurantEvidenceStudy.thumbnailKey}`,
    );
  });

  it("browses the large dining set with accessible region filters", async () => {
    const regionBadges = [
      { ...restaurantStudy, discoveryId: "bay-study", title: "Bay study", regionId: "bay-area" },
      { ...restaurantStudy, discoveryId: "nyc-study", title: "NYC study", regionId: "new-york-city" },
      { ...restaurantStudy, discoveryId: "dc-study", title: "DC study", regionId: "washington-dc" },
    ] as const;
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={regionBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId="michelin-dining"
          query=""
          onSetChange={() => undefined}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );

    const regionGroup = container.querySelector('[role="group"][aria-label="Michelin dining regions"]');
    const bayButton = [...(regionGroup?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(
      (button) => button.textContent === "Bay Area",
    );
    await act(async () => bayButton?.click());
    expect(container.textContent).toContain("Bay study");
    expect(container.textContent).not.toContain("NYC study");
    expect(container.textContent).not.toContain("DC study");
    expect(bayButton?.getAttribute("aria-pressed")).toBe("true");
  });

  it("filters the complete production dining census across all three regions", async () => {
    const restaurantStudies = discoveryBadges.filter(
      (badge): badge is SourceStudyDiscoveryBadge =>
        badge.availability === "source-study" && badge.setIds.includes("michelin-dining"),
    );
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={restaurantStudies}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId="michelin-dining"
          query=""
          onSetChange={() => undefined}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );

    for (const [label, regionId, expectedCount] of [
      ["Bay Area", "bay-area", 41],
      ["New York City", "new-york-city", 69],
      ["Washington, DC & surroundings", "washington-dc", 22],
    ] as const) {
      const button = [
        ...container.querySelectorAll<HTMLButtonElement>(".discovery-region-filter button"),
      ].find((candidate) => candidate.textContent === label);
      await act(async () => button?.click());
      expect(container.textContent).toContain(`${expectedCount} results`);
      const visibleTitles = [...container.querySelectorAll<HTMLElement>(".discovery-card h3")].map(
        ({ textContent }) => textContent,
      );
      expect(visibleTitles.length).toBeGreaterThan(0);
      expect(
        visibleTitles.every((title) =>
          restaurantStudies.some((badge) => badge.title === title && badge.regionId === regionId),
        ),
      ).toBe(true);
    }
  });

  it("requests a controlled set change from the set browser", async () => {
    const requested: Array<string | null> = [];
    await act(async () =>
      root.render(
        <DiscoveryView
          badges={discoveryBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query=""
          onSetChange={(setId) => requested.push(setId)}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />,
      ),
    );

    const parksButton = [...container.querySelectorAll<HTMLButtonElement>(".discovery-set-button")].find(
      (button) => button.textContent?.includes("U.S. National Parks"),
    );
    await act(async () => parksButton?.click());
    expect(requested).toEqual(["us-national-parks"]);
  });

  it("reveals at most 24 more results at a time and resets after the query changes", async () => {
    const manyBadges = Array.from({ length: 55 }, (_, index) => ({
      ...sourceStudy,
      discoveryId: `scale-study-${index}`,
      title: `Scale study ${index}`,
    }));

    function ScaleHarness() {
      const [query, setQuery] = useState("");
      return (
        <DiscoveryView
          badges={manyBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query={query}
          onSetChange={() => undefined}
          onQueryChange={setQuery}
          onOpenAvailableBadge={() => undefined}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />
      );
    }

    await act(async () => root.render(<ScaleHarness />));
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(24);

    const showMore = () =>
      [...container.querySelectorAll<HTMLButtonElement>(".discovery-pagination button")][0];
    expect(showMore()?.textContent).toContain("Show 24 more");
    await act(async () => showMore()?.click());
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(48);
    expect(showMore()?.textContent).toContain("Show 7 more");
    await act(async () => showMore()?.click());
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(55);
    expect(showMore()).toBeUndefined();

    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error("Discovery search input is missing.");
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setInput?.call(input, "Scale study 54");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(1);
    await act(async () => {
      setInput?.call(input, "");
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(container.querySelectorAll(".discovery-card")).toHaveLength(24);
    expect(showMore()?.textContent).toContain("Show 24 more");
  });

  it("keeps a revealed preparation card mounted and restores its focus after returning", async () => {
    const revealedAvailable = {
      ...available,
      discoveryId: "revealed-available",
      title: "Revealed preparation badge",
    };
    const manyBadges = [
      ...Array.from({ length: 24 }, (_, index) => ({
        ...sourceStudy,
        discoveryId: `preceding-study-${index}`,
        title: `Preceding study ${index}`,
      })),
      revealedAvailable,
    ];

    function PreparationHarness() {
      const [visibleLimit, setVisibleLimit] = useState(24);
      const [preparing, setPreparing] = useState(false);
      const returnFocus = useRef<HTMLButtonElement | null>(null);
      if (preparing) {
        return (
          <button
            type="button"
            onClick={() => {
              setPreparing(false);
              requestAnimationFrame(() => focusPreparedBadgeTrigger(returnFocus.current));
            }}
          >
            Back to Discover
          </button>
        );
      }
      return (
        <DiscoveryView
          badges={manyBadges}
          collectedRecordIds={new Set()}
          resolvedSourceUrls={{}}
          selectedSetId={null}
          query=""
          visibleLimit={visibleLimit}
          onVisibleLimitChange={setVisibleLimit}
          onSetChange={() => undefined}
          onQueryChange={() => undefined}
          onOpenAvailableBadge={(_recordId, trigger) => {
            returnFocus.current = trigger;
            setPreparing(true);
          }}
          onOpenCollectedBadge={() => undefined}
          resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
        />
      );
    }

    await act(async () => root.render(<PreparationHarness />));
    await act(async () =>
      container.querySelector<HTMLButtonElement>(".discovery-pagination button")?.click(),
    );
    const revealedAction = container.querySelector<HTMLButtonElement>(
      `[aria-label="Prepare ${revealedAvailable.title} to collect"]`,
    );
    expect(revealedAction).not.toBeNull();
    await act(async () => revealedAction?.click());
    expect(container.textContent).toContain("Back to Discover");

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")?.click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    const restoredAction = container.querySelector<HTMLButtonElement>(
      `[aria-label="Prepare ${revealedAvailable.title} to collect"]`,
    );
    expect(restoredAction).not.toBeNull();
    expect(restoredAction).not.toBe(revealedAction);
    expect(document.activeElement).toBe(restoredAction);
  });
});
