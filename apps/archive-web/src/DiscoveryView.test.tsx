import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  discoveryBadges,
  discoverySets,
  type DiscoveryBadge,
  type SourceStudyDiscoveryBadge,
} from "@badge/catalogue-fixtures/discovery";

import { filterDiscoveryBadges } from "./discovery-filter.js";
import { DiscoveryView } from "./DiscoveryView.js";

const available = discoveryBadges.find((badge) => badge.availability === "available");
const sourceStudy = discoveryBadges.find((badge) => badge.availability === "source-study");
const restaurantStudy = discoveryBadges.find(
  (badge): badge is SourceStudyDiscoveryBadge =>
    badge.availability === "source-study" && badge.setIds.includes("michelin-dining"),
);

if (!available || !sourceStudy || !restaurantStudy) {
  throw new Error("Discovery fixtures must cover available and source-study states.");
}

describe("DiscoveryView", () => {
  it("bounds the initial all-sets result DOM and offers progressive disclosure", () => {
    const manyBadges = Array.from({ length: 31 }, (_, index) => ({
      ...sourceStudy,
      discoveryId: `scale-study-${index}`,
      recordId: `catalogue:scale-study-${index}`,
      title: `Scale study ${index}`,
    }));
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={manyBadges}
        collectedRecordIds={new Set()}
        resolvedSourceUrls={{}}
        selectedSetId={null}
        query=""
        onSetChange={() => undefined}
        onQueryChange={() => undefined}
        onOpenAvailableBadge={() => undefined}
        onOpenCollectedBadge={() => undefined}
        resolveThumbnail={(thumbnailKey) => `/thumbnails/${thumbnailKey}`}
      />,
    );

    expect(html.match(/<article class="discovery-card/g)).toHaveLength(24);
    expect(html).toContain("Showing 24 of 31 results");
    expect(html).toContain("Show 7 more");
  });

  it("introduces one exhaustive catalogue organized into browsable sets", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={discoveryBadges}
        collectedRecordIds={new Set()}
        resolvedSourceUrls={{}}
        selectedSetId={null}
        query=""
        onSetChange={() => undefined}
        onQueryChange={() => undefined}
        onOpenAvailableBadge={() => undefined}
        onOpenCollectedBadge={() => undefined}
        resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
      />,
    );

    expect(html).toContain("Discover sets");
    expect(html).toContain("All sets");
    expect(html).toContain("U.S. National Parks");
    expect(html).toContain("U.S. States");
    expect(html).toContain("0 / 64 collected");
    expect(html).toContain("0 / 50 collected");
    expect(html).toContain("<strong>Books Read</strong><span>0 / 51 collected</span>");
    expect(html).toContain("<strong>Life Milestones</strong><span>0 / 3 collected</span>");
    expect(html).toContain("<strong>Michelin Dining</strong><span>0 / 132 collected</span>");
    expect(html).toContain(available.title);
    expect(html).toContain(sourceStudy.title);
    expect(html).not.toContain("66 badges");
  });

  it("keeps every set in one bounded native-button rail with explicit interaction states", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={discoveryBadges}
        collectedRecordIds={new Set()}
        resolvedSourceUrls={{}}
        selectedSetId={null}
        query=""
        onSetChange={() => undefined}
        onQueryChange={() => undefined}
        onOpenAvailableBadge={() => undefined}
        onOpenCollectedBadge={() => undefined}
        resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
      />,
    );
    const css = readFileSync(new URL("./discovery.css", import.meta.url), "utf8");

    expect(html.match(/<button class="discovery-set-button" type="button"/gu)).toHaveLength(
      discoverySets.length + 1,
    );
    expect(html).toContain('<nav class="discovery-set-browser" aria-label="Badge sets">');
    expect(css).toMatch(
      /\.discovery-set-browser\s*\{[^}]*display:\s*grid[^}]*grid-auto-flow:\s*column[^}]*overflow-x:\s*auto/su,
    );
    expect(css).toMatch(/\.discovery-set-button:hover/);
    expect(css).toMatch(/\.discovery-set-button:focus-visible/);
    expect(css).toMatch(/\.discovery-set-button\[aria-pressed="true"\]/);
  });

  it("searches across titles, criteria, and places without locale-sensitive casing", () => {
    expect(filterDiscoveryBadges(discoveryBadges, "YOSEMITE", null).map((badge) => badge.title)).toEqual([
      "Yosemite",
    ]);
    expect(filterDiscoveryBadges(discoveryBadges, sourceStudy.locationLabel, null)).toContain(sourceStudy);
    expect(filterDiscoveryBadges(discoveryBadges, "no badge has this phrase", null)).toEqual([]);
  });

  it("filters the named dining edition by its structured region instead of search-copy inference", () => {
    const publishedBayBadge = {
      ...available,
      discoveryId: "published-bay",
      setIds: ["michelin-dining"],
      regionId: "bay-area",
    } as const;
    const regionBadges = [
      publishedBayBadge,
      { ...restaurantStudy, discoveryId: "bay", regionId: "bay-area" },
      { ...restaurantStudy, discoveryId: "nyc", regionId: "new-york-city" },
      { ...restaurantStudy, discoveryId: "dc", regionId: "washington-dc" },
    ] as const;

    expect(
      filterDiscoveryBadges(regionBadges, "", "michelin-dining", "bay-area").map(
        ({ discoveryId }) => discoveryId,
      ),
    ).toEqual(["published-bay", "bay"]);
    expect(
      filterDiscoveryBadges(regionBadges, "", "michelin-dining", "bay-area").map(
        ({ availability }) => availability,
      ),
    ).toEqual(["available", "source-study"]);
    expect(
      filterDiscoveryBadges(regionBadges, "", "michelin-dining", "washington-dc").map(
        ({ discoveryId }) => discoveryId,
      ),
    ).toEqual(["dc"]);
  });

  it("shows dining location context with accessible region controls", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={[restaurantStudy]}
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
    );

    expect(html).toContain(restaurantStudy.locationLabel);
    expect(html).toContain('aria-label="Michelin dining regions"');
    expect(html).toContain("Bay Area");
    expect(html).toContain("New York City");
    expect(html).toContain("Washington, DC &amp; surroundings");
  });

  it("filters one set without losing published or study entries", () => {
    const parks = filterDiscoveryBadges(discoveryBadges, "", "us-national-parks");
    expect(parks).toHaveLength(64);
    expect(parks.some((badge) => badge.availability === "available")).toBe(true);
    expect(parks.some((badge) => badge.availability === "source-study")).toBe(true);
  });

  it("discovers the complete state edition by state, USPS code, or set title", () => {
    const states = filterDiscoveryBadges(discoveryBadges, "", "us-states");
    expect(states).toHaveLength(50);
    expect(filterDiscoveryBadges(states, "Washington", "us-states").map((badge) => badge.title)).toEqual([
      "Washington",
    ]);
    expect(filterDiscoveryBadges(states, "WA Census FIPS 53", null).map((badge) => badge.title)).toEqual([
      "Washington",
    ]);
    expect(filterDiscoveryBadges(states, "WA", null).map((badge) => badge.title)).toEqual(["Washington"]);
    expect(filterDiscoveryBadges(states, "CA", null).map((badge) => badge.title)).toEqual(["California"]);
    expect(filterDiscoveryBadges(states, "OR", null).map((badge) => badge.title)).toEqual(["Oregon"]);
  });

  it("labels a multi-set card with the selected set rather than its primary set", () => {
    const multiSetBadge: DiscoveryBadge = {
      ...available,
      setIds: ["us-national-parks", "books-read"],
    };
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={[multiSetBadge]}
        collectedRecordIds={new Set()}
        resolvedSourceUrls={{}}
        selectedSetId="books-read"
        query=""
        onSetChange={() => undefined}
        onQueryChange={() => undefined}
        onOpenAvailableBadge={() => undefined}
        onOpenCollectedBadge={() => undefined}
        resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
      />,
    );

    expect(html).toContain(
      `<div class="discovery-card__copy"><p>Books Read</p><h3>${multiSetBadge.title}</h3>`,
    );
    expect(html).not.toContain(
      `<div class="discovery-card__copy"><p>U.S. National Parks</p><h3>${multiSetBadge.title}</h3>`,
    );
  });

  it("shows exactly two card states — colorized collected and greyed not-yet-collected — with no status words", () => {
    const badges: readonly DiscoveryBadge[] = [available, sourceStudy];
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={badges}
        collectedRecordIds={new Set([available.recordId])}
        resolvedSourceUrls={{ [available.recordId]: "blob:earned-art" }}
        selectedSetId={null}
        query=""
        onSetChange={() => undefined}
        onQueryChange={() => undefined}
        onOpenAvailableBadge={() => undefined}
        onOpenCollectedBadge={() => undefined}
        resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
      />,
    );
    const css = readFileSync(new URL("./discovery.css", import.meta.url), "utf8");

    expect(html.match(/discovery-card--collected/g)).toHaveLength(1);
    expect(html.match(/discovery-card--uncollected/g)).toHaveLength(1);
    expect(html).toContain(`aria-label="Open collected memory ${available.title}"`);
    expect(html).toContain(`aria-label="Open ${sourceStudy.title} to collect it"`);
    expect(html).toContain("blob:earned-art");
    expect(html).not.toContain("discovery-card__status");
    expect(html).not.toContain("Ready to collect");
    expect(html).not.toContain(">Potential<");
    expect(html).not.toContain("Not yet published");
    expect(html).not.toContain("View study");
    expect(html).not.toContain("View memory");
    expect(html).not.toContain("Prepare badge");
    expect(css).toMatch(/\.discovery-card--uncollected \.discovery-card__art img\s*\{[^}]*grayscale/su);
    expect(css).not.toContain("discovery-card__status");
  });

  it("marks every not-yet-collected card as a preparation trigger, studies included", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={[available, sourceStudy]}
        collectedRecordIds={new Set()}
        resolvedSourceUrls={{}}
        selectedSetId={null}
        query=""
        onSetChange={() => undefined}
        onQueryChange={() => undefined}
        onOpenAvailableBadge={() => undefined}
        onOpenCollectedBadge={() => undefined}
        resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
      />,
    );

    expect(html).toContain(`data-prepare-record-id="${available.recordId}"`);
    expect(html).toContain(`data-prepare-record-id="${sourceStudy.recordId}"`);
    expect(html).not.toContain("Open in Collection");
  });

  it("covers each actionable card with one native button and visible hover and keyboard focus", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={[available, sourceStudy]}
        collectedRecordIds={new Set()}
        resolvedSourceUrls={{}}
        selectedSetId={null}
        query=""
        onSetChange={() => undefined}
        onQueryChange={() => undefined}
        onOpenAvailableBadge={() => undefined}
        onOpenCollectedBadge={() => undefined}
        resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
      />,
    );
    const css = readFileSync(new URL("./discovery.css", import.meta.url), "utf8");

    expect(html.match(/class="discovery-card__action"/g)).toHaveLength(2);
    expect(html.match(/discovery-card--actionable/g)).toHaveLength(2);
    expect(css).toMatch(/\.discovery-card__action\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/su);
    expect(css).toMatch(/\.discovery-card--actionable:hover/);
    expect(css).toMatch(/\.discovery-card__action:focus-visible/);
  });

  it("keeps a missing reviewed thumbnail discoverable with an explicit fallback", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={[sourceStudy]}
        collectedRecordIds={new Set()}
        resolvedSourceUrls={{}}
        selectedSetId={null}
        query=""
        onSetChange={() => undefined}
        onQueryChange={() => undefined}
        onOpenAvailableBadge={() => undefined}
        onOpenCollectedBadge={() => undefined}
        resolveThumbnail={() => null}
      />,
    );

    expect(html).toContain(sourceStudy.title);
    expect(html).toContain("Preview unavailable");
    expect(html).not.toContain("<img");
  });
});
