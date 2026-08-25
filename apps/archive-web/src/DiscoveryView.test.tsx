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
  it("introduces one exhaustive catalogue with truthful availability counts", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={discoveryBadges}
        onOpenAvailableBadge={() => undefined}
        resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
      />,
    );

    expect(html).toContain("Discover every badge");
    expect(html).toContain("66 badges");
    expect(html).toContain("4 available");
    expect(html).toContain("62 selected studies");
    expect(html).toContain(available.title);
    expect(html).toContain(sourceStudy.title);
  });

  it("searches across titles, criteria, and places without locale-sensitive casing", () => {
    expect(filterDiscoveryBadges(discoveryBadges, "YOSEMITE", "all").map((badge) => badge.title)).toEqual([
      "Yosemite",
    ]);
    expect(filterDiscoveryBadges(discoveryBadges, sourceStudy.locationLabel, "all")).toContain(sourceStudy);
    expect(filterDiscoveryBadges(discoveryBadges, "no badge has this phrase", "all")).toEqual([]);
  });

  it("filters availability without losing any matching entry type", () => {
    expect(filterDiscoveryBadges(discoveryBadges, "", "available")).toHaveLength(4);
    expect(filterDiscoveryBadges(discoveryBadges, "", "source-study")).toHaveLength(62);
  });

  it("offers Collection navigation only for available badges", () => {
    const badges: readonly DiscoveryBadge[] = [available, sourceStudy];
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={badges}
        onOpenAvailableBadge={() => undefined}
        resolveThumbnail={(fileName) => `/thumbnails/${fileName}`}
      />,
    );

    expect(html.match(/Open in Collection/gu) ?? []).toHaveLength(1);
    expect(html).toContain(`aria-label="Open ${available.title} in Collection"`);
    expect(html).toContain("Available");
    expect(html).toContain('<span class="visually-hidden"> in Archive</span>');
    expect(html).toContain("Selected study");
    expect(html).toContain("Not yet published");
    expect(html).not.toContain("Activate");
    expect(html).not.toContain("Regenerate quote");
  });

  it("keeps a missing reviewed thumbnail discoverable with an explicit fallback", () => {
    const html = renderToStaticMarkup(
      <DiscoveryView
        badges={[sourceStudy]}
        onOpenAvailableBadge={() => undefined}
        resolveThumbnail={() => null}
      />,
    );

    expect(html).toContain(sourceStudy.title);
    expect(html).toContain("Preview unavailable");
    expect(html).not.toContain("<img");
  });
});
