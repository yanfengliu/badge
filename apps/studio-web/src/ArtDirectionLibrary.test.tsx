import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtDirectionLibrary } from "./ArtDirectionLibrary.js";
import {
  compileArtDirectionPrompt,
  filterCommonIdeas,
  filterNationalParks,
  formatDirectionCount,
} from "./art-direction-library-model.js";
import { matchesQuery } from "./art-direction-library-utils.js";
import { nationalParkSourceFileNames, nationalParkThumbnailFileNames } from "./national-park-source-urls.js";

describe("ArtDirectionLibrary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("searches park identity and visual cues without invoking a provider", () => {
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);

    expect(filterNationalParks("half dome").map((park) => park.slug)).toEqual(["yosemite"]);
    expect(filterNationalParks("california").some((park) => park.slug === "yosemite")).toBe(true);
    expect(provider).not.toHaveBeenCalled();
  });

  it("searches common achievements and resolves explicit park and idea selection", () => {
    expect(filterCommonIdeas("marathon").map((idea) => idea.id)).toEqual(["finished-marathon"]);
    expect(filterCommonIdeas("shared table").map((idea) => idea.id)).toContain("hosted-family-reunion");

    const park = compileArtDirectionPrompt({
      kind: "park",
      id: "yosemite",
      role: "landmark-witness",
    });
    const idea = compileArtDirectionPrompt({
      kind: "idea",
      id: "first-summit",
      role: "landmark-witness",
    });
    expect(park.subjectTitle).toBe("Yosemite");
    expect(idea.subjectTitle).toBe("Reached a mountain summit");
    expect(park.compiled.recipe).toEqual({ id: "badge-source-art", revision: 2 });
    expect(park.promptStatus).toBe("manufacturable-candidate");
    expect(park.compiled.prompt).toContain("SMALL-BADGE MANUFACTURING CONTRACT");
    expect(idea.compiled.recipe).toEqual({ id: "badge-source-art", revision: 2 });
    expect(idea.promptStatus).toBe("manufacturable-candidate");
    expect(idea.compiled.prompt).toContain("SMALL-BADGE MANUFACTURING CONTRACT");
  });

  it("uses locale-independent case folding for catalogue search", () => {
    const localeLowerCase = String.prototype.toLocaleLowerCase;
    vi.spyOn(String.prototype, "toLocaleLowerCase").mockImplementation(function (this: string) {
      return localeLowerCase.call(this, "tr");
    });

    expect(matchesQuery("istanbul", ["Istanbul travel memory"])).toBe(true);
  });

  it("uses polished singular and plural result counts", () => {
    expect(formatDirectionCount(0)).toBe("0 directions");
    expect(formatDirectionCount(1)).toBe("1 direction");
    expect(formatDirectionCount(63)).toBe("63 directions");
  });

  it("changes candidate role and compiles an exact style override", () => {
    const preview = compileArtDirectionPrompt({
      kind: "park",
      id: "yosemite",
      role: "terrain-memory",
      styleId: "thread-painted-embroidery",
    });

    expect(preview.subjectTitle).toBe("Yosemite");
    expect(preview.role).toBe("terrain-memory");
    expect(preview.style.id).toBe("thread-painted-embroidery");
    expect(preview.compiled.prompt).toContain("Thread-painted embroidery");
    expect(preview.compiled.prompt).toContain("SMALL-BADGE MANUFACTURING CONTRACT");
    expect(preview.compiled.prompt).toContain("48 × 48 pixels");
    expect(preview.compiled.prompt).toContain("No finished badge, patch, coin, medallion");
    expect(preview.compiled.recipe).toEqual({ id: "badge-source-art", revision: 2 });
    expect(preview.sourceStudyDescription).toMatch(/El Capitan.*Half Dome.*Yosemite Valley/iu);
  });

  it("renders keyboard tabs and an honest no-call, not-published status", () => {
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);

    const html = renderToStaticMarkup(<ArtDirectionLibrary />);

    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*tabindex="0"/u);
    expect(html).toContain("63 national parks");
    expect(html).toContain("Source studies are not published Archive badges");
    expect(html).toContain("Browsing and changing art direction makes zero provider or model calls");
    expect(html).toContain('<details class="art-direction-library__prompt-disclosure">');
    expect(html).toContain("<summary");
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/u);
    expect(html).toContain("Copy prompt");
    expect(html).toContain(
      "source study using large stepped pixel clusters, showing dawn over Cadillac Mountain",
    );
    expect(html).toContain("<legend>Candidate role</legend>");
    expect(html).not.toContain('aria-label="Candidate role"');
    expect(provider).not.toHaveBeenCalled();
  });

  it("makes all 63 selected park studies available to the Studio bundle", () => {
    expect(nationalParkSourceFileNames()).toHaveLength(63);
    expect(nationalParkSourceFileNames()).toContain("yosemite.jpg");
    expect(nationalParkThumbnailFileNames()).toEqual(nationalParkSourceFileNames());
  });
});
