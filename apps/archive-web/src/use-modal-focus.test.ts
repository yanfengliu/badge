import { describe, expect, it } from "vitest";

import { shouldDismissModalForKey } from "./use-modal-focus.js";

describe("modal dismissal policy", () => {
  it("contains Escape while a destructive operation is busy", () => {
    expect(shouldDismissModalForKey("Escape", false)).toBe(false);
  });

  it("allows Escape only for an idle dismissible modal", () => {
    expect(shouldDismissModalForKey("Escape", true)).toBe(true);
    expect(shouldDismissModalForKey("Enter", true)).toBe(false);
  });
});
