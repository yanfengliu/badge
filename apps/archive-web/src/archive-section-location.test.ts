// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { archiveSectionFromHash, writeArchiveSectionHash } from "./archive-section-location.js";

describe("archive section location", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));

  it("accepts only navigable Archive section hashes", () => {
    expect(archiveSectionFromHash("#timeline")).toBe("timeline");
    expect(archiveSectionFromHash("#discover")).toBe("discover");
    expect(archiveSectionFromHash("#collection")).toBe("collection");
    expect(archiveSectionFromHash("#unknown")).toBe("collection");
    expect(archiveSectionFromHash("")).toBe("collection");
  });

  it("pushes canonical section entries and ignores the current location", () => {
    const pushState = vi.spyOn(window.history, "pushState");

    expect(writeArchiveSectionHash("discover")).toBe(true);
    expect(window.location.hash).toBe("#discover");
    expect(pushState).toHaveBeenCalledTimes(1);

    expect(writeArchiveSectionHash("discover")).toBe(false);
    expect(pushState).toHaveBeenCalledTimes(1);

    expect(writeArchiveSectionHash("collection")).toBe(true);
    expect(window.location.hash).toBe("");
    expect(pushState).toHaveBeenCalledTimes(2);
  });
});
