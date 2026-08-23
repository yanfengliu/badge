import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical-json.js";

describe("canonicalJson", () => {
  it("sorts object keys recursively without reordering arrays", () => {
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 }, list: [{ z: 4, a: 5 }, 6] })).toBe(
      '{"a":{"b":3,"y":2},"list":[{"a":5,"z":4},6],"z":1}',
    );
  });

  it("rejects values outside canonical JSON", () => {
    expect(() => canonicalJson({ invalid: undefined })).toThrow(/invalid/i);
    expect(() => canonicalJson(Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });
});
