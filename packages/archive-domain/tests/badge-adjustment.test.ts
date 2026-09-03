import { describe, expect, it } from "vitest";

import {
  ArchiveDomainError,
  activateAchievement,
  adjustBadge,
  archiveStateSchema,
  createSeededArchiveState,
  displayedVisual,
  effectiveCollectionRefs,
  effectiveTags,
  effectiveVisual,
  isCatalogueDefaultBadge,
  MAX_BADGE_TAGS,
  recordSourceHashes,
  type ArchiveState,
  type BadgeAdjustmentInput,
  type PublishedVisual,
} from "../src/index.js";

const publishedVisual: PublishedVisual = {
  packRef: { packId: "parks", version: "1.0.0", packDigest: "a".repeat(64) },
  visualEditionId: "yosemite-metal-v1",
  sourceAssetHash: "b".repeat(64),
  accessibleDescription: "A crafted Yosemite badge showing granite walls after rain.",
  renderRecipeVersion: 1,
  renderRecipe: {
    version: 1,
    shape: "circle",
    material: "metal",
    borderColor: "#b87333",
    borderWidth: 0.08,
    thickness: 0.1,
    relief: 0.03,
    crop: { x: 0.5, y: 0.5, scale: 1 },
  },
};

const sourceCheckedSaying =
  "“It is by far the grandest of all the special temples of Nature I was ever permitted to enter.” — John Muir, Letters to a Friend, July 26, 1868";

const OWN_IMAGE_HASH = "c".repeat(64);
const NOW = "2026-09-02T10:00:00.000Z";

function seedState(): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: { namespace: "pack", packId: "parks", definitionId: "visited-yosemite" },
        collectionRefs: [{ namespace: "pack", packId: "parks", collectionId: "us-national-parks" }],
        title: "Yosemite",
        criterion: "Visit Yosemite National Park",
        description: null,
        lifecycle: "planned",
        publishedVisual,
        acceptedSaying: sourceCheckedSaying,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
  });
}

const emptyInput: BadgeAdjustmentInput = {
  appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
  source: null,
  tags: [],
  collectionRefs: null,
};

function recordOf(state: ArchiveState) {
  return state.records[0];
}

describe("badge adjustment overlay", () => {
  it("seeds every catalogue record with no adjustment and resolves the shipped visual", () => {
    const record = recordOf(seedState());
    expect(record.adjustment).toBeNull();
    expect(effectiveVisual(record)).toEqual(publishedVisual);
    expect(effectiveTags(record)).toEqual([]);
    expect(effectiveCollectionRefs(record)).toEqual(record.collectionRefs);
    expect(isCatalogueDefaultBadge(record)).toBe(true);
  });

  it("reads a stored record written before adjustments existed", () => {
    const legacy = JSON.parse(JSON.stringify(seedState())) as Record<string, unknown>;
    for (const record of (legacy as { records: Record<string, unknown>[] }).records) {
      delete record.adjustment;
    }
    const parsed = archiveStateSchema.parse(legacy);
    expect(recordOf(parsed).adjustment).toBeNull();
  });

  it("overlays only the fields the owner changed and leaves publishedVisual untouched", () => {
    const next = adjustBadge(
      seedState(),
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "shield", material: null, borderColor: "#101010", borderWidth: null },
      },
      NOW,
    );
    const record = recordOf(next);
    expect(record.publishedVisual).toEqual(publishedVisual);
    expect(effectiveVisual(record).renderRecipe).toEqual({
      ...publishedVisual.renderRecipe,
      shape: "shield",
      borderColor: "#101010",
    });
    expect(isCatalogueDefaultBadge(record)).toBe(false);
  });

  it("substitutes the owner's own image and its accessible description", () => {
    const next = adjustBadge(
      seedState(),
      "record-yosemite",
      {
        ...emptyInput,
        source: { sourceAssetHash: OWN_IMAGE_HASH, accessibleDescription: "A photo I took of the valley." },
      },
      NOW,
    );
    const visual = effectiveVisual(recordOf(next));
    expect(visual.sourceAssetHash).toBe(OWN_IMAGE_HASH);
    expect(visual.accessibleDescription).toBe("A photo I took of the valley.");
    expect(recordSourceHashes(recordOf(next))).toContain(OWN_IMAGE_HASH);
  });

  it("clears back to the exact catalogue default when every adjustment is removed", () => {
    const adjusted = adjustBadge(
      seedState(),
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "square", material: "wool", borderColor: null, borderWidth: 0.2 },
      },
      NOW,
    );
    const cleared = adjustBadge(adjusted, "record-yosemite", emptyInput, NOW);
    expect(recordOf(cleared).adjustment).toBeNull();
    expect(effectiveVisual(recordOf(cleared))).toEqual(publishedVisual);
  });

  it("keeps tags and replaces collection membership without touching the record's own refs", () => {
    const next = adjustBadge(
      seedState(),
      "record-yosemite",
      {
        ...emptyInput,
        tags: ["granite", "with dad"],
        collectionRefs: [{ namespace: "local", collectionId: "road-trips" }],
      },
      NOW,
    );
    const record = recordOf(next);
    expect(effectiveTags(record)).toEqual(["granite", "with dad"]);
    expect(effectiveCollectionRefs(record)).toEqual([{ namespace: "local", collectionId: "road-trips" }]);
    expect(record.collectionRefs).toEqual([
      { namespace: "pack", packId: "parks", collectionId: "us-national-parks" },
    ]);
  });

  it("refuses a repeated tag by name, caselessly", () => {
    expect(() =>
      adjustBadge(seedState(), "record-yosemite", { ...emptyInput, tags: ["Granite", "granite"] }, NOW),
    ).toThrow(/already on Yosemite/u);
  });

  it("names the field and the limit when a tag list is too long", () => {
    const tags = Array.from({ length: MAX_BADGE_TAGS + 1 }, (_value, index) => `tag-${index}`);
    expect(() => adjustBadge(seedState(), "record-yosemite", { ...emptyInput, tags }, NOW)).toThrow(
      /Adjustment for Yosemite is invalid at tags/u,
    );
  });

  it("leaves the state unchanged when the submitted adjustment matches what is stored", () => {
    const state = seedState();
    expect(adjustBadge(state, "record-yosemite", emptyInput, NOW)).toStrictEqual(state);
    const tagged = adjustBadge(state, "record-yosemite", { ...emptyInput, tags: ["granite"] }, NOW);
    const resubmitted = adjustBadge(
      tagged,
      "record-yosemite",
      { ...emptyInput, tags: ["granite"] },
      "2026-09-03T00:00:00.000Z",
    );
    expect(resubmitted.records[0].adjustment?.adjustedAt).toBe(NOW);
  });

  it("names the badge when the record is unknown", () => {
    expect(() => adjustBadge(seedState(), "record-missing", emptyInput, NOW)).toThrow(
      /Archive record record-missing was not found/u,
    );
  });
});

describe("adjustment and activation", () => {
  function activateAdjusted(state: ArchiveState) {
    const record = recordOf(state);
    return activateAchievement(
      state,
      {
        recordId: "record-yosemite",
        occurredStart: "2026-05-01",
        occurredEnd: "2026-05-03",
        note: null,
        visibility: "inherit",
        visualPin: effectiveVisual(record),
      },
      NOW,
    );
  }

  it("pins the adjusted visual and folds it into the record so the pin and the record agree", () => {
    const adjusted = adjustBadge(
      seedState(),
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "shield", material: "enamel", borderColor: null, borderWidth: null },
        source: { sourceAssetHash: OWN_IMAGE_HASH, accessibleDescription: "My own valley photo." },
      },
      NOW,
    );
    const result = activateAdjusted(adjusted);
    const record = result.state.records[0];
    expect(record.activation?.visualPin.renderRecipe.shape).toBe("shield");
    expect(record.activation?.visualPin.sourceAssetHash).toBe(OWN_IMAGE_HASH);
    expect(record.publishedVisual).toEqual(record.activation?.visualPin);
    expect(displayedVisual(record)).toEqual(record.activation?.visualPin);
  });

  it("keeps folding idempotent so the overlay cannot drift the sealed memory", () => {
    const adjusted = adjustBadge(
      seedState(),
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "square", material: null, borderColor: null, borderWidth: null },
      },
      NOW,
    );
    const record = activateAdjusted(adjusted).state.records[0];
    expect(effectiveVisual(record)).toEqual(record.activation?.visualPin);
  });

  it("rejects an activation that pins the catalogue visual after the owner adjusted the badge", () => {
    const adjusted = adjustBadge(
      seedState(),
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "square", material: null, borderColor: null, borderWidth: null },
      },
      NOW,
    );
    expect(() =>
      activateAchievement(
        adjusted,
        {
          recordId: "record-yosemite",
          occurredStart: "2026-05-01",
          occurredEnd: "2026-05-03",
          note: null,
          visibility: "inherit",
          visualPin: publishedVisual,
        },
        NOW,
      ),
    ).toThrow(ArchiveDomainError);
  });

  it("seals the badge face once collected but still allows tags and collections", () => {
    const collected = activateAdjusted(seedState()).state;
    expect(() =>
      adjustBadge(
        collected,
        "record-yosemite",
        {
          ...emptyInput,
          appearance: { shape: "square", material: null, borderColor: null, borderWidth: null },
        },
        NOW,
      ),
    ).toThrow(/already collected, so its badge face is sealed/u);
    expect(() =>
      adjustBadge(
        collected,
        "record-yosemite",
        { ...emptyInput, source: { sourceAssetHash: OWN_IMAGE_HASH, accessibleDescription: "Swap." } },
        NOW,
      ),
    ).toThrow(/already collected, so its badge face is sealed/u);
    const tagged = adjustBadge(collected, "record-yosemite", { ...emptyInput, tags: ["with dad"] }, NOW);
    expect(effectiveTags(tagged.records[0])).toEqual(["with dad"]);
    expect(tagged.records[0].activation?.visualPin).toEqual(collected.records[0].activation?.visualPin);
  });

  it("keeps an already-folded face adjustable in place without re-sealing it", () => {
    const adjusted = adjustBadge(
      seedState(),
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "shield", material: null, borderColor: null, borderWidth: null },
      },
      NOW,
    );
    const collected = activateAdjusted(adjusted).state;
    const tagged = adjustBadge(
      collected,
      "record-yosemite",
      {
        ...emptyInput,
        appearance: { shape: "shield", material: null, borderColor: null, borderWidth: null },
        tags: ["granite"],
      },
      NOW,
    );
    expect(effectiveTags(tagged.records[0])).toEqual(["granite"]);
    expect(tagged.records[0].publishedVisual).toEqual(collected.records[0].publishedVisual);
  });
});
