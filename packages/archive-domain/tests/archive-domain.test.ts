import { describe, expect, it } from "vitest";

import {
  ArchiveDomainError,
  SAYING_CODE_POINT_LIMIT,
  activateAchievement,
  archiveStateSchema,
  SAYING_GRAPHEME_LIMIT,
  SAYING_RAW_UTF16_CODE_UNIT_LIMIT,
  SAYING_UTF8_LIMIT,
  acceptedSayingSchema,
  countSayingGraphemes,
  createSeededArchiveState,
  normalizeSaying,
  setRecordLifecycle,
  updateAcceptedSaying,
  validateSaying,
  type ActivationInput,
  type ArchiveState,
  type PublishedVisual,
} from "../src/index.js";

const publishedVisual: PublishedVisual = {
  packRef: {
    packId: "parks",
    version: "1.0.0",
    packDigest: "a".repeat(64),
  },
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
const replacementSourceCheckedSaying =
  "“The mountains are calling and I must go.” — John Muir, Letter to Sarah Muir Galloway, September 3, 1873";

function seedState(overrides: Partial<ArchiveState> = {}): ArchiveState {
  return createSeededArchiveState({
    ownerId: "local-owner",
    records: [
      {
        recordId: "record-yosemite",
        definitionRef: {
          namespace: "pack",
          packId: "parks",
          definitionId: "visited-yosemite",
        },
        collectionRefs: [
          {
            namespace: "pack",
            packId: "parks",
            collectionId: "national-parks",
          },
        ],
        title: "Visited Yosemite National Park",
        criterion: "Visit Yosemite National Park honestly.",
        description: "A granite-walled landmark.",
        lifecycle: "suggested",
        publishedVisual,
        acceptedSaying: sourceCheckedSaying,
        note: null,
        visibility: "inherit",
        activation: null,
      },
    ],
    ...overrides,
  });
}

function activationInput(overrides: Partial<ActivationInput> = {}): ActivationInput {
  return {
    recordId: "record-yosemite",
    occurredStart: "2026-06-12",
    occurredEnd: "2026-06-14",
    note: "Granite after rain.",
    visibility: "private",
    visualPin: {
      packRef: publishedVisual.packRef,
      visualEditionId: publishedVisual.visualEditionId,
      sourceAssetHash: publishedVisual.sourceAssetHash,
      accessibleDescription: publishedVisual.accessibleDescription,
      renderRecipeVersion: publishedVisual.renderRecipeVersion,
      renderRecipe: publishedVisual.renderRecipe,
    },
    ...overrides,
  };
}

describe("ArchiveState v1", () => {
  it("validates seeded catalogue records with qualified identities", () => {
    const firstPack = seedState();
    const secondPack = createSeededArchiveState({
      ownerId: "local-owner",
      records: [
        {
          ...firstPack.records[0],
          recordId: "record-other-yosemite",
          definitionRef: {
            namespace: "pack",
            packId: "other-parks",
            definitionId: "visited-yosemite",
          },
          publishedVisual: {
            ...publishedVisual,
            packRef: { ...publishedVisual.packRef, packId: "other-parks" },
          },
        },
      ],
    });

    expect(firstPack.schemaVersion).toBe(1);
    expect(secondPack.records[0].definitionRef).not.toEqual(firstPack.records[0].definitionRef);
  });

  it("rejects unknown fields and inconsistent earned records", () => {
    const state = seedState();

    expect(archiveStateSchema.safeParse({ ...state, unexpected: true }).success).toBe(false);
    expect(
      archiveStateSchema.safeParse({
        ...state,
        records: [{ ...state.records[0], unexpected: true }],
      }).success,
    ).toBe(false);
    expect(
      archiveStateSchema.safeParse({
        ...state,
        records: [{ ...state.records[0], lifecycle: "earned" }],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate record IDs without enforcing one record per definition", () => {
    const state = seedState();
    const duplicateId = { ...state.records[0] };
    const repeatedDefinition = { ...state.records[0], recordId: "record-yosemite-return" };

    expect(archiveStateSchema.safeParse({ ...state, records: [state.records[0], duplicateId] }).success).toBe(
      false,
    );
    expect(
      archiveStateSchema.safeParse({ ...state, records: [state.records[0], repeatedDefinition] }).success,
    ).toBe(true);
  });
});

describe("saying validation", () => {
  it("normalizes pasted whitespace to one logical paragraph", () => {
    expect(normalizeSaying("  Carved\nby\tcuriosity.  ")).toBe("Carved by curiosity.");
    expect(validateSaying("  Carved\nby\tcuriosity.  ")).toEqual({
      ok: true,
      value: "Carved by curiosity.",
      graphemeCount: 20,
    });
  });

  it("accepts 800 Unicode graphemes and rejects 801 without truncating", () => {
    const accepted = "🏞️".repeat(800);
    const rejected = "🏞️".repeat(801);

    expect(validateSaying(accepted)).toMatchObject({ ok: true, graphemeCount: 800 });
    expect(validateSaying(rejected)).toEqual({
      ok: false,
      code: "TOO_LONG",
      value: rejected,
      graphemeCount: 801,
      limit: 800,
    });
  });

  it("rejects oversized raw representations before grapheme segmentation", () => {
    const utf16Bomb = `a${"\u0301".repeat(SAYING_RAW_UTF16_CODE_UNIT_LIMIT)}`;
    const codePointBomb = `a${"\u0301".repeat(SAYING_CODE_POINT_LIMIT)}`;
    const utf8Bomb = "😀".repeat(SAYING_UTF8_LIMIT / 4 + 1);

    expect(validateSaying(utf16Bomb)).toEqual({
      ok: false,
      code: "TOO_LARGE_TO_INSPECT",
      value: utf16Bomb,
      graphemeCount: null,
      metric: "UTF16_CODE_UNITS",
      count: SAYING_RAW_UTF16_CODE_UNIT_LIMIT + 1,
      limit: SAYING_RAW_UTF16_CODE_UNIT_LIMIT,
    });
    expect(validateSaying(codePointBomb)).toEqual({
      ok: false,
      code: "TOO_LARGE_TO_INSPECT",
      value: codePointBomb,
      graphemeCount: null,
      metric: "UNICODE_CODE_POINTS",
      count: SAYING_CODE_POINT_LIMIT + 1,
      limit: SAYING_CODE_POINT_LIMIT,
    });
    expect(validateSaying(utf8Bomb)).toEqual({
      ok: false,
      code: "TOO_LARGE_TO_INSPECT",
      value: utf8Bomb,
      graphemeCount: null,
      metric: "UTF8_BYTES",
      count: SAYING_UTF8_LIMIT + 4,
      limit: SAYING_UTF8_LIMIT,
    });
    expect(acceptedSayingSchema.safeParse(utf16Bomb).error?.issues[0]?.message).toMatch(
      /too large to inspect safely.*UTF-16 code units/u,
    );
  });

  it("admits a near-limit formatted historical quotation", () => {
    const formattedQuotation = `“${"Q".repeat(600)}” — ${"P".repeat(64)}, ${"S".repeat(100)}`;

    expect(countSayingGraphemes(formattedQuotation)).toBe(771);
    expect(countSayingGraphemes(formattedQuotation)).toBeLessThan(SAYING_GRAPHEME_LIMIT);
    expect(validateSaying(formattedQuotation)).toMatchObject({
      ok: true,
      value: formattedQuotation,
      graphemeCount: 771,
    });
  });

  it("rejects an empty normalized value", () => {
    expect(validateSaying(" \n\t ")).toEqual({
      ok: false,
      code: "EMPTY",
      value: "",
      graphemeCount: 0,
      limit: 800,
    });
  });
});

describe("archive transitions", () => {
  it("activates immutably with the preselected quote and exact visual pins", () => {
    const original = seedState();
    const result = activateAchievement(original, activationInput(), "2026-08-23T17:00:00.000Z");

    expect(original.records[0].lifecycle).toBe("suggested");
    expect(result.record).toMatchObject({
      lifecycle: "earned",
      acceptedSaying: sourceCheckedSaying,
      note: "Granite after rain.",
      visibility: "private",
    });
    expect(result.activation).toEqual({
      occurredStart: "2026-06-12",
      occurredEnd: "2026-06-14",
      recordedAt: "2026-08-23T17:00:00.000Z",
      activatedAt: "2026-08-23T17:00:00.000Z",
      visualPin: activationInput().visualPin,
    });
    expect(result.state.records[0].activation).toEqual(result.activation);
  });

  it("refuses activation until the record already contains an accepted quote", () => {
    const quoted = seedState();
    const missingQuote = archiveStateSchema.parse({
      ...quoted,
      records: [{ ...quoted.records[0], acceptedSaying: null }],
    });

    expect(() =>
      activateAchievement(missingQuote, activationInput(), "2026-08-23T17:00:00.000Z"),
    ).toThrowError(expect.objectContaining({ code: "INVALID_SAYING" }));
  });

  it("refuses stale visual pins, invalid ranges, and duplicate activation", () => {
    const state = seedState();
    const stalePin = activationInput({
      visualPin: {
        ...activationInput().visualPin,
        sourceAssetHash: "c".repeat(64),
      },
    });

    expect(() => activateAchievement(state, stalePin, "2026-08-23T17:00:00.000Z")).toThrowError(
      expect.objectContaining({ code: "VISUAL_PIN_MISMATCH" }),
    );
    expect(() =>
      activateAchievement(
        state,
        activationInput({ occurredStart: "2026-06-15", occurredEnd: "2026-06-14" }),
        "2026-08-23T17:00:00.000Z",
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_ACTIVATION" }));

    const earned = activateAchievement(state, activationInput(), "2026-08-23T17:00:00.000Z").state;
    expect(() => activateAchievement(earned, activationInput(), "2026-08-24T17:00:00.000Z")).toThrowError(
      expect.objectContaining({ code: "ALREADY_EARNED" }),
    );
  });

  it("treats every RenderRecipe field as part of the immutable activation pin", () => {
    const state = seedState();
    const recipeVariants = [
      { ...publishedVisual.renderRecipe, shape: "shield" as const },
      { ...publishedVisual.renderRecipe, material: "wool" as const },
      { ...publishedVisual.renderRecipe, borderColor: "#ffffff" },
      { ...publishedVisual.renderRecipe, borderWidth: 0.12 },
      { ...publishedVisual.renderRecipe, thickness: 0.12 },
      { ...publishedVisual.renderRecipe, relief: 0.04 },
      {
        ...publishedVisual.renderRecipe,
        crop: { ...publishedVisual.renderRecipe.crop, x: 0.4 },
      },
      {
        ...publishedVisual.renderRecipe,
        crop: { ...publishedVisual.renderRecipe.crop, y: 0.4 },
      },
      {
        ...publishedVisual.renderRecipe,
        crop: { ...publishedVisual.renderRecipe.crop, scale: 1.2 },
      },
    ];

    for (const renderRecipe of recipeVariants) {
      expect(() =>
        activateAchievement(
          state,
          activationInput({
            visualPin: { ...activationInput().visualPin, renderRecipe },
          }),
          "2026-08-23T17:00:00.000Z",
        ),
      ).toThrowError(expect.objectContaining({ code: "VISUAL_PIN_MISMATCH" }));
    }

    const earned = activateAchievement(state, activationInput(), "2026-08-23T17:00:00.000Z").state;
    expect(
      archiveStateSchema.safeParse({
        ...earned,
        records: [
          {
            ...earned.records[0],
            activation: {
              ...earned.records[0].activation!,
              visualPin: {
                ...earned.records[0].activation!.visualPin,
                renderRecipe: { ...publishedVisual.renderRecipe, shape: "shield" },
              },
            },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("treats the accessible description as part of the immutable activation pin", () => {
    const state = seedState();
    expect(() =>
      activateAchievement(
        state,
        activationInput({
          visualPin: {
            ...activationInput().visualPin,
            accessibleDescription: "Mutable catalogue replacement text.",
          },
        }),
        "2026-08-23T17:00:00.000Z",
      ),
    ).toThrowError(expect.objectContaining({ code: "VISUAL_PIN_MISMATCH" }));
  });

  it("updates pre-earned quotations and lifecycle without mutating the input", () => {
    const state = seedState();
    const planned = setRecordLifecycle(state, "record-yosemite", "planned");
    const withSaying = updateAcceptedSaying(
      planned,
      "record-yosemite",
      replacementSourceCheckedSaying,
      "11111111-1111-4111-8111-111111111111",
    );

    expect(state.records[0].lifecycle).toBe("suggested");
    expect(planned.records[0].lifecycle).toBe("planned");
    expect(withSaying.records[0].acceptedSaying).toBe(replacementSourceCheckedSaying);
    expect(() => setRecordLifecycle(withSaying, "record-yosemite", "earned")).toThrowError(
      ArchiveDomainError,
    );
  });

  it("seals the accepted quotation after activation", () => {
    const earned = activateAchievement(seedState(), activationInput(), "2026-08-23T17:00:00.000Z").state;

    expect(() =>
      updateAcceptedSaying(
        earned,
        "record-yosemite",
        replacementSourceCheckedSaying,
        "11111111-1111-4111-8111-111111111111",
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_LIFECYCLE" }));
    expect(earned.records[0].acceptedSaying).toBe(sourceCheckedSaying);
  });
});
