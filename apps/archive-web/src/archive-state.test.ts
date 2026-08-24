import { describe, expect, it } from "vitest";
import { starterBadges } from "@badge/catalogue-fixtures/archive";

import { createStarterArchiveState, createStarterQuotationRequests } from "./archive-state";

describe("starter Archive saying defaults", () => {
  it("creates every badge with a source-checked attributed quotation already selected", () => {
    const state = createStarterArchiveState();

    for (const record of state.records) {
      const fixture = starterBadges.find((badge) => `starter:${badge.definitionId}` === record.recordId);
      expect(fixture).toBeDefined();
      expect(record.acceptedSaying).not.toBeNull();
      expect(
        fixture?.historicalQuotations.some(
          (quotation) =>
            record.acceptedSaying === `“${quotation.text}” — ${quotation.person}, ${quotation.sourceTitle}`,
        ),
      ).toBe(true);
    }
  });

  it("binds every trusted quotation bank to its exact starter record wording", () => {
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
