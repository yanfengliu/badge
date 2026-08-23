import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import { BadgeRail } from "./BadgeRail.js";

describe("BadgeRail", () => {
  it("renders restored earned semantics from the frozen record rather than the current fixture", () => {
    const seeded = createStarterArchiveState();
    const historicalRecord = {
      ...seeded.records[0],
      title: "Old Valley Visit",
      lifecycle: "earned" as const,
    };
    const state = { ...seeded, records: [historicalRecord, ...seeded.records.slice(1)] };

    const markup = renderToStaticMarkup(
      <BadgeRail
        state={state}
        selectedRecordId={historicalRecord.recordId}
        earnedSourceUrls={{ [historicalRecord.recordId]: "blob:historical-yosemite" }}
        onSelect={() => undefined}
      />,
    );

    expect(markup).toContain("Old Valley Visit");
    expect(markup).not.toContain(">Yosemite</strong>");
  });
});
