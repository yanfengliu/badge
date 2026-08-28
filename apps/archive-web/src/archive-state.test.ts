import { describe, expect, it } from "vitest";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import { cataloguePackBadges, cataloguePackRef } from "@badge/catalogue-fixtures/catalogue-pack";

import { createStarterArchiveState, createStarterQuotationRequests } from "./archive-state";

const fixtureBanks = new Map([
  ...starterBadges.map((badge) => [`starter:${badge.definitionId}`, badge.historicalQuotations] as const),
  ...cataloguePackBadges.map((badge) => [badge.recordId, badge.historicalQuotations] as const),
]);

describe("seeded Archive saying defaults", () => {
  it("creates every starter and catalogue badge with a source-checked attributed quotation", () => {
    const state = createStarterArchiveState();

    expect(state.records).toHaveLength(starterBadges.length + cataloguePackBadges.length);
    expect(state.records.filter((record) => record.recordId.startsWith("starter:"))).toHaveLength(4);
    expect(state.records.filter((record) => record.recordId.startsWith("catalogue:"))).toHaveLength(346);
    expect(cataloguePackRef.version).toBe("1.0.0-alpha.2");
    expect(
      state.records.filter((record) =>
        record.collectionRefs.some((collection) => collection.collectionId === "video-games-played"),
      ),
    ).toHaveLength(50);
    for (const record of state.records) {
      const bank = fixtureBanks.get(record.recordId);
      expect(bank, record.recordId).toBeDefined();
      expect(record.acceptedSaying).not.toBeNull();
      expect(
        bank?.some(
          (quotation) =>
            record.acceptedSaying === `“${quotation.text}” — ${quotation.person}, ${quotation.sourceTitle}`,
        ),
        record.recordId,
      ).toBe(true);
      expect(record.activation).toBeNull();
      expect(record.definitionRef.namespace).toBe("pack");
      if (record.recordId.startsWith("catalogue:")) {
        expect(record.publishedVisual.packRef).toEqual(cataloguePackRef);
      }
    }
  });

  it("binds every trusted quotation bank to its exact seeded record wording", () => {
    const state = createStarterArchiveState();
    const requests = createStarterQuotationRequests();

    expect(Object.keys(requests).sort()).toEqual(state.records.map((record) => record.recordId).sort());
    for (const record of state.records) {
      expect(requests[record.recordId]).toMatchObject({
        title: record.title,
        criterion: record.criterion,
      });
      expect(requests[record.recordId]!.allowedQuotations.length).toBeGreaterThan(0);
    }
  });
});
