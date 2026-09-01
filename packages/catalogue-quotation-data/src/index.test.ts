import { createHash } from "node:crypto";

import {
  canonicalQuotationTextKey,
  sayingRequestSchema,
  tooCloselyMatchesQuotation,
} from "@badge/saying-contract";
import { describe, expect, it } from "vitest";

import { CATALOGUE_QUOTATIONS_CHECKED_AT, catalogueQuotationBanksByDefinitionId } from "./index.js";
import { catalogueQuotationVariantRetirements } from "./editorial-variant-retirements.js";

const LEGACY_RELEASE_QUOTATION_TEXTS = [
  "It is by far the grandest of all the special temples of Nature I was ever permitted to enter.",
  "Therefore we are all, in some sense, mountaineers, and going to the mountains is going home.",
  "The mountains are calling and I must go.",
  "Reading maketh a full man; conference a ready man; and writing an exact man.",
  "Histories make men wise; poets witty; the mathematics subtile; natural philosophy deep; moral grave; logic and rhetoric able to contend.",
  "I cannot live without books; but fewer will suffice where amusement, and not use, is the only future object.",
  "If there is no struggle, there is no progress.",
  "I have learned that success is to be measured not so much by the position that one has reached in life as by the obstacles which he has overcome while trying to succeed.",
  "It is hard to fail, but it is worse never to have tried to succeed.",
  "But in every walk with Nature one receives far more than he seeks.",
  "There is nothing so American as our national parks.",
  "The whole country is a region of naked rock of many colors, with cliffs and buttes about us and towering mountains in the distance.",
  "In Wildness is the preservation of the World.",
  "Travel is fatal to prejudice, bigotry and narrow-mindedness, and many of our people need it sorely on these accounts.",
  "It's always sunrise somewhere; the dew is never all dried at once; a shower is forever falling; vapor is ever rising.",
  "The play’s the thing Wherein I’ll catch the conscience of the King.",
  "After a good dinner one can forgive anybody, even one’s own relations.",
] as const;

describe("record-private catalogue quotation data", () => {
  const banks = Object.entries(catalogueQuotationBanksByDefinitionId);
  const records = banks.flatMap(([, bank]) => bank);

  it("covers exactly 350 badges with two contract-valid source-checked quotations each", () => {
    expect(CATALOGUE_QUOTATIONS_CHECKED_AT).toBe("2026-08-31");
    expect(banks).toHaveLength(350);
    expect(records).toHaveLength(700);
    for (const [definitionId, bank] of banks) {
      expect(
        bank.map(({ slot }) => slot),
        definitionId,
      ).toEqual([1, 2]);
      expect(
        sayingRequestSchema.safeParse({
          title: definitionId,
          criterion: `Complete ${definitionId}`,
          allowedQuotations: bank.map((quotation) => ({
            id: quotation.quotationId.replace(/^historic-quotation\//u, ""),
            text: quotation.text,
            person: quotation.personName,
            personWikipediaUrl: quotation.personWikipediaUrl,
            sourceTitle: quotation.sourceTitle,
            sourceUrl: quotation.sourceUrl,
          })),
        }).success,
        definitionId,
      ).toBe(true);
    }
  });

  it("keeps the complete reviewed release behind one exact-content digest", () => {
    const digest = createHash("sha256").update(JSON.stringify(records)).digest("hex");
    expect(digest).toBe("80833d1083fd3ebe58fc899ae7cc47ba8013f39573451a78192c6f0c59916362");
  });

  it("does not reissue wording from the duplicate-prone legacy release", () => {
    const currentKeys = new Set(records.map(({ text }) => canonicalQuotationTextKey(text)));
    for (const text of LEGACY_RELEASE_QUOTATION_TEXTS) {
      expect(currentKeys.has(canonicalQuotationTextKey(text)), text).toBe(false);
    }
  });

  it("does not assign editorial variants of the same quotation to different badges", () => {
    const nearMatches: string[] = [];
    for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
        const left = records[leftIndex]!;
        const right = records[rightIndex]!;
        if (
          tooCloselyMatchesQuotation(left.text, right.text) ||
          tooCloselyMatchesQuotation(right.text, left.text)
        ) {
          nearMatches.push(`${left.quotationId} <> ${right.quotationId}`);
        }
      }
    }
    expect(nearMatches).toEqual([]);
  }, 15_000);

  it("keeps every independently adjudicated editorial variant on exactly its retained side", () => {
    const currentTexts = new Set(records.map(({ text }) => text));
    for (const retirement of catalogueQuotationVariantRetirements) {
      expect(currentTexts.has(retirement.retiredText), retirement.retiredDefinitionId).toBe(false);
      expect(currentTexts.has(retirement.retainedText), retirement.retainedDefinitionId).toBe(true);
    }
  });
});
