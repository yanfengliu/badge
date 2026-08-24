import { describe, expect, it } from "vitest";
import { manualSayingEditorStartValue, protectAcceptedSaying } from "./accepted-saying-attribution";

describe("accepted saying attribution protection", () => {
  it("protects the persisted quote-and-attribution string after reload without inferring a source", () => {
    const acceptedSaying =
      "“It is by far the grandest of all the special temples of Nature I was ever permitted to enter.” — John Muir, Letters to a Friend, July 26, 1868";
    const reloadedValue = structuredClone(acceptedSaying);

    expect(protectAcceptedSaying(reloadedValue)).toEqual({ kind: "attributed" });
    expect(manualSayingEditorStartValue(reloadedValue, protectAcceptedSaying(reloadedValue))).toBe("");
  });

  it("does not treat ordinary prose or punctuation as an attributed quotation", () => {
    expect(protectAcceptedSaying('"Read not to contradict." — Francis Bacon, Of Studies')).toEqual({
      kind: "attributed",
    });
    expect(protectAcceptedSaying("“Read not to contradict.” — Francis Bacon")).toEqual({
      kind: "attributed",
    });
    expect(protectAcceptedSaying("A personal line.")).toBeNull();
    expect(protectAcceptedSaying("A thought — held, gently.")).toBeNull();
  });
});
