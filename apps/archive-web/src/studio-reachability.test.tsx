import { renderToStaticMarkup } from "react-dom/server";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { createSeededArchiveState, type ArchiveRecord, type ArchiveState } from "@badge/archive-domain";

import { BadgePreparationView } from "./BadgePreparationView";
import { MemoryReplayDialog } from "./MemoryReplayDialog";
import type { CollectedArchiveRecord } from "./collection-view-model";
import { defaultActivationDraft } from "./app-types";

vi.mock("./LazyBadgeViewer", () => ({ LazyBadgeViewer: () => null }));

/**
 * Badge Studio adjusts one badge, so the only way in is from that badge. Every badge therefore
 * needs one: an uncollected badge opens preparation and a collected one opens replay, and if
 * either lacked the action then some badge in the archive could not be adjusted at all. The
 * collected half is the one that was missing — its tags and collections stay editable, which is
 * a promise nobody could reach.
 */
const publishedVisual = {
  packRef: { packId: "badge.catalogue.starter", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: "b".repeat(64),
  accessibleDescription: "A crafted Yosemite badge.",
  renderRecipeVersion: 1,
  renderRecipe: {
    version: 1 as const,
    shape: "circle" as const,
    material: "metal" as const,
    borderColor: "#b87333",
    borderWidth: 0.08,
    thickness: 0.1,
    relief: 0.03,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};

const activation = {
  occurredStart: "2026-05-01",
  occurredEnd: "2026-05-01",
  recordedAt: "2026-05-02T00:00:00.000Z",
  activatedAt: "2026-05-02T00:00:00.000Z",
  visualPin: publishedVisual,
};

function seed(collected: boolean, tags: readonly string[] = []): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "starter:visited-yosemite",
        definitionRef: {
          namespace: "pack",
          packId: "badge.catalogue.starter",
          definitionId: "visited-yosemite",
        },
        collectionRefs: [
          { namespace: "pack", packId: "badge.catalogue.starter", collectionId: "us-national-parks" },
        ],
        title: "Yosemite",
        criterion: "Visit Yosemite National Park",
        description: null,
        lifecycle: collected ? "earned" : "planned",
        publishedVisual,
        acceptedSaying: collected ? "“The mountains are calling.” — John Muir, Letter, 1873" : null,
        note: null,
        visibility: "inherit",
        adjustment:
          tags.length === 0
            ? null
            : {
                adjustedAt: "2026-09-02T10:00:00.000Z",
                appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
                source: null,
                tags: [...tags],
                collectionRefs: null,
              },
        activation: collected ? activation : null,
      },
    ],
  });
}

function recordOf(state: ArchiveState): ArchiveRecord {
  return state.records[0];
}

describe("every badge can reach Badge Studio", () => {
  it("offers the action on an uncollected badge's page, with its tags", () => {
    const html = renderToStaticMarkup(
      <BadgePreparationView
        record={recordOf(seed(false, ["granite"]))}
        visual={null}
        draft={defaultActivationDraft()}
        saying={
          {
            acceptedQuotation: null,
            proposal: { status: "idle" },
            saving: false,
            disclosure: { phase: "idle" },
            providerNote: "",
            successAnnouncement: null,
            hasAlternatives: false,
            request: () => undefined,
          } as never
        }
        activating={false}
        forceFallback
        pager={null}
        actionButtonRef={createRef()}
        headingRef={createRef()}
        sayingFocusRef={createRef()}
        onBack={() => undefined}
        onPagerStep={() => undefined}
        onDraftChange={() => undefined}
        onActivate={() => undefined}
        onAdjustInStudio={() => undefined}
        onReplay={() => undefined}
      />,
    );

    expect(html).toContain("Adjust in Badge Studio");
    expect(html).toContain("granite");
  });

  it("offers the action on a collected badge's memory, and says what is sealed", () => {
    const html = renderToStaticMarkup(
      <MemoryReplayDialog
        record={recordOf(seed(true, ["with dad"])) as CollectedArchiveRecord}
        sourceUrl="/yosemite.png"
        quotation={null}
        sets={[
          { key: "pack:starter:us-national-parks", setId: "us-national-parks", title: "U.S. National Parks" },
        ]}
        forceFallback
        returnFocus={createRef()}
        onBrowseSet={() => undefined}
        onAdjustInStudio={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("Adjust in Badge Studio");
    expect(html).toContain("with dad");
    // The action must not imply the memory itself can be rewritten.
    expect(html).toContain("Its tags and collections still can.");
  });
});
