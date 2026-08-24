import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SAYING_SYSTEM_PROMPT_V2 } from "@badge/saying-contract";
import { SAYING_DISCLOSURE, buildSayingDisclosureReview } from "@badge/saying-live-contract";

import { SayingDisclosureDialog } from "./SayingDisclosureDialog";

const noOp = () => undefined;

describe("SayingDisclosureDialog", () => {
  it("server-renders the exact provider, destination, prompt, and outbound values accessibly", () => {
    const review = buildSayingDisclosureReview({
      title: "Yosemite",
      criterion: "Visit Yosemite National Park",
      direction: { userDirection: "Dry wit, please" },
      allowedQuotations: [
        {
          id: "john-muir-every-walk-nature",
          text: "But in every walk with Nature one receives far more than he seeks.",
          person: "John Muir",
          sourceTitle: "Steep Trails",
          sourceUrl: "https://www.nps.gov/jomu/learn/historyculture/john-muir-quotes.htm",
        },
      ],
    });
    const html = renderToStaticMarkup(
      <SayingDisclosureDialog
        state={{ phase: "review", review, error: null }}
        returnFocus={{ current: null }}
        onClose={noOp}
        onApprove={noOp}
        onRetry={noOp}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="saying-disclosure-title"');
    expect(html).toContain(SAYING_DISCLOSURE.providerLabel);
    expect(html).toContain(SAYING_DISCLOSURE.model);
    expect(html).toContain(SAYING_DISCLOSURE.destination);
    expect(html).toContain("Yosemite");
    expect(html).toContain("Visit Yosemite National Park");
    expect(html).toContain("Dry wit, please");
    expect(html).toContain("john-muir-every-walk-nature");
    expect(html).toContain(SAYING_SYSTEM_PROMPT_V2.split("\n")[0]!);
    expect(html).toContain("Exact outbound values for this request");
    expect(html).toContain("These are the exact values for this first request");
    expect(html).toContain("later explicit requests may use a different badge title");
    expect(html).toContain("criterion, direction, or quotation shortlist without reopening this sheet");
    expect(html).toContain(
      "Reloading or a provider, destination, model, prompt, field, quotation contract, normalization, or limit change asks again",
    );
    expect(html).toContain("Quotation contract");
    expect(html).toContain("Close without generating");
    expect(html).toContain("Generate with Claude");
    for (const excludedField of SAYING_DISCLOSURE.scope.excludedFields) {
      expect(html).toContain(`>${excludedField}</li>`);
    }
    expect(html).toContain(SAYING_DISCLOSURE.scope.normalization);
    expect(html).toContain("canonicalUtf8Bytes");
  });

  it("states that no achievement text was sent while disclosure is loading", () => {
    const html = renderToStaticMarkup(
      <SayingDisclosureDialog
        state={{ phase: "loading", review: null, error: null }}
        returnFocus={{ current: null }}
        onClose={noOp}
        onApprove={noOp}
        onRetry={noOp}
      />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("No achievement text has been sent to Claude");
    expect(html).toContain("Close saying provider review without generating");
  });

  it("renders disclosure failures as alerts with retry and no generation action", () => {
    const html = renderToStaticMarkup(
      <SayingDisclosureDialog
        state={{ phase: "error", review: null, error: "Disclosure response was invalid." }}
        returnFocus={{ current: null }}
        onClose={noOp}
        onApprove={noOp}
        onRetry={noOp}
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Disclosure response was invalid.");
    expect(html).toContain("Retry disclosure");
    expect(html).not.toContain("Generate with Claude");
  });
});
