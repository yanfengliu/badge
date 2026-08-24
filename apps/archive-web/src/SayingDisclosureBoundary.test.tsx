import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SayingDisclosureBoundary } from "./SayingDisclosureBoundary";
import { containDisclosureBackgroundInteraction } from "./disclosure-background";

const noOp = () => undefined;
const returnFocus = { current: null };

describe("SayingDisclosureBoundary", () => {
  it("makes the complete Archive surface inert and hidden from assistive tech during review", () => {
    const html = renderToStaticMarkup(
      <SayingDisclosureBoundary
        state={{ phase: "loading", review: null, error: null }}
        returnFocus={returnFocus}
        onClose={noOp}
        onApprove={noOp}
        onRetry={noOp}
      >
        <button type="button">Background action</button>
      </SayingDisclosureBoundary>,
    );

    expect(html).toMatch(/<div class="archive-shell" inert="" aria-hidden="true">/u);
    expect(html).toContain('role="dialog"');
  });

  it("contains a captured background action before its target can run", () => {
    const action = vi.fn();
    let stopped = false;
    containDisclosureBackgroundInteraction({
      preventDefault: vi.fn(),
      stopPropagation: () => {
        stopped = true;
      },
    });
    if (!stopped) action();

    expect(stopped).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });

  it("leaves the Archive surface exposed when no disclosure is open", () => {
    const html = renderToStaticMarkup(
      <SayingDisclosureBoundary
        state={{ phase: "idle", review: null, error: null }}
        returnFocus={returnFocus}
        onClose={noOp}
        onApprove={noOp}
        onRetry={noOp}
      >
        <button type="button">Background action</button>
      </SayingDisclosureBoundary>,
    );

    expect(html).not.toContain(" inert");
    expect(html).not.toContain("aria-hidden");
    expect(html).not.toContain('role="dialog"');
  });
});
