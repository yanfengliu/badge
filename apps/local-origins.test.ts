import { describe, expect, it } from "vitest";

import { companionAppHref } from "./local-origins.js";

describe("Archive and Studio origin navigation", () => {
  it("links from Archive to Studio on the same origin", () => {
    expect(companionAppHref("http://127.0.0.1:4173/?fallback", "studio")).toBe(
      "http://127.0.0.1:4173/studio/",
    );
  });

  it("links from a Studio screen back to Archive on the same origin", () => {
    expect(companionAppHref("http://127.0.0.1:4173/studio/project?draft=1#candidate", "archive")).toBe(
      "http://127.0.0.1:4173/",
    );
  });

  it("works on any launcher-selected origin without assuming a companion port", () => {
    expect(companionAppHref("http://localhost:53127/?launch=fallback", "studio")).toBe(
      "http://localhost:53127/studio/",
    );
    expect(companionAppHref("http://localhost:53127/studio/", "archive")).toBe("http://localhost:53127/");
  });

  it("clears source search and hash fragments", () => {
    expect(companionAppHref("https://badge.test/studio/?draft=one#candidate", "studio")).toBe(
      "https://badge.test/studio/",
    );
  });
});
