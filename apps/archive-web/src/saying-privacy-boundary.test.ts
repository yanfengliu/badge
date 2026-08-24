import { describe, expect, it } from "vitest";

import { archiveRecordSchema } from "@badge/archive-domain";
import { SAYING_EXCLUDED_FIELDS, SAYING_REQUIRED_FIELDS } from "@badge/saying-live-contract";

describe("Archive saying privacy boundary", () => {
  it("classifies every current Archive record field as sent or explicitly excluded", () => {
    const recordKeys = [...archiveRecordSchema.keyof().options];
    const recordKeySet = new Set<string>(recordKeys);
    const sentFieldSet = new Set<string>(SAYING_REQUIRED_FIELDS);
    const excludedFieldSet = new Set<string>(SAYING_EXCLUDED_FIELDS);
    const sentRecordKeys = recordKeys.filter((key) => sentFieldSet.has(key));
    const excludedRecordKeys = recordKeys.filter((key) => excludedFieldSet.has(key));
    const transportOnlyExclusions = SAYING_EXCLUDED_FIELDS.filter((key) => !recordKeySet.has(key));

    expect(sentRecordKeys.sort()).toEqual(["criterion", "title"]);
    expect(excludedRecordKeys.length + sentRecordKeys.length).toBe(recordKeys.length);
    expect(new Set([...excludedRecordKeys, ...sentRecordKeys]).size).toBe(recordKeys.length);
    expect(transportOnlyExclusions).toEqual(["requestId", "signal"]);
  });
});
