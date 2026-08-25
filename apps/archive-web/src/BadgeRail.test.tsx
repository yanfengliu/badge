import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import { BadgeRail } from "./BadgeRail.js";

describe("BadgeRail", () => {
  it("keeps empty artwork spans dimensional when compact layout leaves CSS grid", () => {
    const styles = readFileSync(new URL("./artifact.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\.thumb-art\s*\{[^}]*display:\s*block;/su);
  });

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
    expect(markup).toContain('aria-label="Old Valley Visit, earned"');
    expect(markup).not.toContain(">Yosemite</strong>");
  });
});
