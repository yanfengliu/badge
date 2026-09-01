import { describe, expect, it } from "vitest";

import { canonicalQuotationTextKey, sayingRequestSchema } from "./index";

describe("canonicalQuotationTextKey", () => {
  it.each([
    ["  CAFÉ...\tde\u0301jà-vu!  ", "cafe deja vu"],
    ["I İ ı i", "i i i i"],
    ["Straße STRASSE STRAẞE", "strasse strasse strasse"],
    ["ΟΣ οσ ος", "ος ος ος"],
    ["wi\u200Dsdom kno\u2060wledge lear\u00ADning", "wisdom knowledge learning"],
    ["Badge №24 — 東京", "badge no24 東京"],
    ["rock'n'roll / rhythm___and…blues", "rock n roll rhythm and blues"],
    ["*** — …", ""],
  ])("canonicalizes %j to %j", (text, expected) => {
    expect(canonicalQuotationTextKey(text)).toBe(expected);
  });

  it("gives punctuation, case, whitespace, and composed-Unicode variants one exact key", () => {
    expect(canonicalQuotationTextKey("The Café—road\nLEADS home.")).toBe(
      canonicalQuotationTextKey("the cafe\u0301 road leads HOME!"),
    );
  });

  it("gives expanding and context-sensitive Unicode case variants one caseless key", () => {
    expect(canonicalQuotationTextKey("Die Straße")).toBe(canonicalQuotationTextKey("DIE STRASSE"));
    expect(canonicalQuotationTextKey("Die Straße")).toBe(canonicalQuotationTextKey("DIE STRAẞE"));
    expect(canonicalQuotationTextKey("ΟΣ")).toBe(canonicalQuotationTextKey("οσ"));
  });

  it("deletes invisible default-ignorable characters instead of splitting visible words", () => {
    expect(canonicalQuotationTextKey("wisdom knowledge learning")).toBe(
      canonicalQuotationTextKey("wi\u200Dsdom kno\u2060wledge lear\u00ADning"),
    );
  });

  it("rejects one request whose different quotation records have the same canonical wording", () => {
    const result = sayingRequestSchema.safeParse({
      title: "Canonical uniqueness",
      criterion: "Keep each badge quotation distinct.",
      allowedQuotations: [
        {
          id: "first-wording",
          text: "The Café road—leads home.",
          person: "First Historian",
          sourceTitle: "First Source",
          sourceUrl: "https://example.com/first",
        },
        {
          id: "second-wording",
          text: "THE CAFE road, leads HOME!",
          person: "Second Historian",
          sourceTitle: "Different Source",
          sourceUrl: "https://example.com/second",
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: "Allowed quotation canonical text keys must be unique." }),
        ]),
      );
    }
  });
});
