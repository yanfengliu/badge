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
});
