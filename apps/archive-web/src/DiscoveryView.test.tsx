import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { discoveryBadges, type DiscoveryBadge } from "@badge/catalogue-fixtures/discovery";

import { filterDiscoveryBadges } from "./discovery-filter.js";
import { DiscoveryView } from "./DiscoveryView.js";

const available = discoveryBadges.find((badge) => badge.availability === "available");
const sourceStudy = discoveryBadges.find((badge) => badge.availability === "source-study");

if (!available || !sourceStudy) {
  throw new Error("Discovery fixtures must cover available and source-study states.");
}

describe("DiscoveryView", () => {
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
    expect(html).toContain("0 / 64 collected");
    expect(html).toContain("0 / 1 collected");
    expect(html).toContain(available.title);
    expect(html).toContain(sourceStudy.title);
    expect(html).not.toContain("66 badges");
  });

  it("searches across titles, criteria, and places without locale-sensitive casing", () => {
    expect(filterDiscoveryBadges(discoveryBadges, "YOSEMITE", null).map((badge) => badge.title)).toEqual([
      "Yosemite",
    ]);
    expect(filterDiscoveryBadges(discoveryBadges, sourceStudy.locationLabel, null)).toContain(sourceStudy);
    expect(filterDiscoveryBadges(discoveryBadges, "no badge has this phrase", null)).toEqual([]);
  });

  it("filters one set without losing published or study entries", () => {
    const parks = filterDiscoveryBadges(discoveryBadges, "", "us-national-parks");
    expect(parks).toHaveLength(64);
    expect(parks.some((badge) => badge.availability === "available")).toBe(true);
    expect(parks.some((badge) => badge.availability === "source-study")).toBe(true);
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

  it("distinguishes collected, ready-to-collect, and unpublished potential badges without color alone", () => {
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

    expect(html).toContain(`aria-label="Replay collected memory ${available.title}"`);
    expect(html).toContain("Collected");
    expect(html).toContain("Potential");
    expect(html).toContain("Not yet published");
    expect(html).toContain("blob:earned-art");
    expect(html).not.toContain("Regenerate quote");
  });

  it("offers preparation for an uncollected published badge without routing it into Collection", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={[available]}
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

    expect(html).toContain(`aria-label="Prepare ${available.title} to collect"`);
    expect(html).toContain("Ready to collect");
    expect(html).not.toContain("Open in Collection");
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
