import { describe, expect, it } from "vitest";

import { companionAppHref } from "./local-origins.js";

describe("Archive and Studio origin navigation", () => {
  it("keeps disposable development links inside the disposable port pair", () => {
    expect(companionAppHref("http://127.0.0.1:5173/?fallback", "studio")).toBe("http://127.0.0.1:5174/");
    expect(companionAppHref("http://127.0.0.1:5174/project", "archive")).toBe("http://127.0.0.1:5173/");
  });

  it("keeps durable links inside the durable port pair", () => {
    expect(companionAppHref("http://127.0.0.1:4173/", "studio")).toBe("http://127.0.0.1:4174/");
    expect(companionAppHref("http://127.0.0.1:4174/", "archive")).toBe("http://127.0.0.1:4173/");
  });

  it("keeps launcher-selected links inside an arbitrary adjacent port pair", () => {
    expect(companionAppHref("http://127.0.0.1:4180/?launch=fallback", "studio")).toBe(
      "http://127.0.0.1:4181/",
    );
    expect(companionAppHref("http://127.0.0.1:4181/project", "archive")).toBe("http://127.0.0.1:4180/");
  });

  it("supports the highest valid adjacent port pair", () => {
    expect(companionAppHref("http://127.0.0.1:65534/", "studio")).toBe("http://127.0.0.1:65535/");
    expect(companionAppHref("http://127.0.0.1:65535/", "archive")).toBe("http://127.0.0.1:65534/");
  });
});
