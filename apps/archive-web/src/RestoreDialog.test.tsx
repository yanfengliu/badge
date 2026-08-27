import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createStarterArchiveState } from "./archive-state.js";
import { RestoreDialog } from "./RestoreDialog.js";
import type { PendingArchiveRestore } from "./restore-flow.js";

describe("RestoreDialog state-rescue reasons", () => {
  it("describes a missing sealed quotation without claiming the artwork is damaged", () => {
    const restore: PendingArchiveRestore = {
      fileName: "compatible.badgearchive",
      bytes: new Uint8Array([1]),
      exportedAt: "2026-08-24T17:00:00.000Z",
      incomingState: createStarterArchiveState(),
      incomingEarnedCount: 1,
      recoveryMode: "replace-incompatible-readable-state",
      safetyBackupOffered: false,
      safetyCheckpointState: null,
      safetyHandoff: "state-rescue",
      stateRescueReason: "earned-quotation-missing",
      stateRescueAffectedRecordIds: null,
    };

    const html = renderToStaticMarkup(
      <RestoreDialog
        restore={restore}
        currentEarnedCount={1}
        busy={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain("earned memory that has no sealed quotation");
    expect(html).toContain("affected record IDs");
    expect(html).not.toContain("damaged historical art makes");
  });
});
