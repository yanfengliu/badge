import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SayingProposalSnapshot } from "@badge/archive-application";
import type { ArchiveLifecycle } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import type { HistoricalQuotation } from "@badge/saying-contract";

import { formatFixtureQuotation } from "./fixture-quotations";
import { SayingActivationControl, SayingComposer } from "./SayingComposer";

const yosemite = starterBadges[0]!;
const defaultQuotation = yosemite.historicalQuotations.find(
  (quotation) => quotation.id === yosemite.defaultQuotationId,
)!;

interface RenderOverrides {
  readonly acceptedSaying?: string | null;
  readonly acceptedQuotation?: HistoricalQuotation | null;
  readonly generationBlocked?: boolean;
  readonly hasAlternatives?: boolean;
  readonly lifecycle?: ArchiveLifecycle;
  readonly saving?: boolean;
  readonly successAnnouncement?: string | null;
}

function renderComposer(proposal: SayingProposalSnapshot, overrides: RenderOverrides = {}): string {
  return renderToStaticMarkup(
    <SayingComposer
      lifecycle={overrides.lifecycle ?? "planned"}
      acceptedSaying={
        overrides.acceptedSaying === undefined
          ? formatFixtureQuotation(defaultQuotation)
          : overrides.acceptedSaying
      }
      acceptedQuotation={
        overrides.acceptedQuotation === undefined ? defaultQuotation : overrides.acceptedQuotation
      }
      proposal={proposal}
      saving={overrides.saving ?? false}
      generationBlocked={overrides.generationBlocked ?? false}
      hasAlternatives={overrides.hasAlternatives ?? true}
      providerNote="Fixture mode rotates only source-checked historical quotations."
      successAnnouncement={overrides.successAnnouncement ?? null}
      focusTargetRef={{ current: null }}
      onGenerate={() => undefined}
    />,
  );
}

const idleProposal: SayingProposalSnapshot = {
  recordId: "starter:visited-yosemite",
  expectedQuotationRevision: "00000000-0000-4000-8000-000000000000",
  status: "idle",
  request: null,
  proposal: null,
  provenance: null,
  error: null,
};

describe("SayingComposer", () => {
  it("offers no regeneration action when a record's bank has a single source-checked quotation", () => {
    const html = renderComposer(idleProposal, { hasAlternatives: false });

    expect(html).not.toContain("Regenerate quote");
    expect(html).toContain("Verified historical quotation");
  });

  it("shows a preselected sourced quotation with one regeneration action and no authoring UI", () => {
    const html = renderComposer(idleProposal);

    expect(html).toContain("Verified historical quotation");
    expect(html).toContain(defaultQuotation.text);
    expect(html).toContain("Historical figure");
    expect(html).toContain(defaultQuotation.person);
    expect(html).toContain("Quote source");
    expect(html).toContain(defaultQuotation.sourceTitle);
    expect(html).toContain(`href="${defaultQuotation.sourceUrl}"`);
    expect(html).toContain("View quote source");
    expect(html).toContain('href="https://en.wikipedia.org/wiki/John_Muir"');
    expect(html).toContain("Wikipedia");
    expect(html).toContain("Regenerate quote");
    expect(html.match(/<button/gu)).toHaveLength(1);
    expect(html).not.toContain("Generate saying");
    expect(html).not.toContain("Use this saying");
    expect(html).not.toContain("Write my own");
    expect(html).not.toContain("Replace with my own");
    expect(html).not.toContain("<textarea");
  });

  it("omits the optional biography link without weakening quotation provenance", () => {
    const quotationWithoutWikipedia: HistoricalQuotation = {
      id: defaultQuotation.id,
      text: defaultQuotation.text,
      person: defaultQuotation.person,
      sourceTitle: defaultQuotation.sourceTitle,
      sourceUrl: defaultQuotation.sourceUrl,
    };
    const html = renderComposer(idleProposal, { acceptedQuotation: quotationWithoutWikipedia });

    expect(html).toContain("Historical figure");
    expect(html).toContain(defaultQuotation.person);
    expect(html).toContain("Quote source");
    expect(html).toContain(`href="${defaultQuotation.sourceUrl}"`);
    expect(html).not.toContain("Wikipedia");
  });

  it("keeps the accepted quote visible and announces regeneration while a request is pending", () => {
    const html = renderComposer({ ...idleProposal, status: "requesting" });

    expect(html).toContain(defaultQuotation.text);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Finding another source-checked quotation.");
    expect(html).toContain("Regenerating…");
  });

  it("keeps the accepted quote visible and exposes a retry after failure", () => {
    const html = renderComposer({
      ...idleProposal,
      status: "error",
      error: "Preview source unavailable.",
    });

    expect(html).toContain(defaultQuotation.text);
    expect(html).toContain("Could not regenerate the quote.");
    expect(html).toContain("The current quote remains selected.");
    expect(html).toContain("Preview source unavailable.");
    expect(html).toContain("Regenerate quote");
  });

  it("announces a persisted replacement to assistive technology", () => {
    const html = renderComposer(idleProposal, {
      successAnnouncement: "Quote regenerated. The mountains are calling — John Muir.",
    });

    expect(html).toContain("Quote regenerated. The mountains are calling — John Muir.");
    expect(html).toContain('aria-live="polite"');
  });

  it("keeps the sole regeneration action disabled while provider disclosure is open", () => {
    const html = renderComposer(idleProposal, { generationBlocked: true });

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Review Claude access…<\/button>/u);
    expect(html.match(/<button/gu)).toHaveLength(1);
  });

  it("does not offer regeneration after the memory is sealed", () => {
    const html = renderComposer(idleProposal, { lifecycle: "earned" });

    expect(html).toContain(defaultQuotation.text);
    expect(html).not.toContain("Regenerate quote");
    expect(html).not.toContain("<button");
  });

  it("labels preserved prose as source-unverified instead of a historical quote", () => {
    const html = renderComposer(idleProposal, {
      acceptedSaying: "A preserved legacy saying.",
      acceptedQuotation: null,
    });

    expect(html).toContain("Legacy saying · source unverified");
    expect(html).toContain("A preserved legacy saying.");
    expect(html).toContain("Regenerate quote");
  });
});

describe("SayingActivationControl", () => {
  it("blocks activation while an automatically selected quote is saving", () => {
    const html = renderToStaticMarkup(
      <SayingActivationControl
        buttonRef={{ current: null }}
        acceptedSaying={formatFixtureQuotation(defaultQuotation)}
        sourceChecked
        activating={false}
        saving
      />,
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Saving quote….*<\/button>/u);
  });

  it("explains the missing-quote activation gate", () => {
    const html = renderToStaticMarkup(
      <SayingActivationControl
        buttonRef={{ current: null }}
        acceptedSaying={null}
        sourceChecked={false}
        activating={false}
        saving={false}
      />,
    );

    expect(html).toContain("A source-checked historical quotation is required before activation.");
  });

  it("blocks a preserved legacy saying until it is regenerated from a verified source", () => {
    const html = renderToStaticMarkup(
      <SayingActivationControl
        buttonRef={{ current: null }}
        acceptedSaying="A preserved legacy saying."
        sourceChecked={false}
        activating={false}
        saving={false}
      />,
    );

    expect(html).toMatch(/<button[^>]*disabled=""/u);
    expect(html).toContain("This preserved legacy saying has no verified source.");
  });
});
