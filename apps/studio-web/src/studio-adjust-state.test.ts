import { describe, expect, it } from "vitest";

import type { StudioBadgeTarget } from "@badge/studio-adjustment-contract";

import {
  catalogueDefaultDraft,
  draftPreviewRecipe,
  draftPreviewUrl,
  initialStudioDraft,
  isCatalogueDefaultDraft,
  isStudioDraftDirty,
  toStudioSubmission,
  usesOwnImage,
  withoutTag,
  withToggledCollection,
  withToggledTag,
  type StudioPendingImage,
} from "./studio-adjust-state";

const catalogueRecipe = {
  version: 1,
  shape: "circle",
  material: "metal",
  borderColor: "#b87333",
  borderWidth: 0.08,
  thickness: 0.1,
  relief: 0.03,
  crop: { x: 0.5, y: 0.5, scale: 1 },
} as const;

const target: StudioBadgeTarget = {
  recordId: "starter:visited-yosemite",
  title: "Yosemite",
  criterion: "Visit Yosemite National Park",
  collected: false,
  sourceUrl: "/yosemite.png",
  catalogueSourceUrl: "/yosemite.png",
  catalogueRecipe,
  appearance: { shape: null, material: null, borderColor: null, borderWidth: null },
  ownImageDescription: null,
  tags: [],
  collections: [
    { key: "pack:starter:us-national-parks", label: "U.S. National Parks", fromCatalogue: true },
    { key: "pack:discovery:books-read", label: "Books Read", fromCatalogue: false },
  ],
  selectedCollectionKeys: ["pack:starter:us-national-parks"],
  quotations: [],
  selectedQuotationId: null,
};

const pendingImage: StudioPendingImage = {
  hash: "c".repeat(64),
  mimeType: "image/png",
  bytes: new Uint8Array([1, 2, 3]),
  accessibleDescription: "A picture you chose for Yosemite.",
  previewUrl: "blob:pending",
  fileName: "valley.png",
};

describe("Studio draft", () => {
  it("opens on the badge's current values and is not dirty", () => {
    const draft = initialStudioDraft(target);
    expect(isStudioDraftDirty(draft, target)).toBe(false);
    expect(isCatalogueDefaultDraft(draft, target)).toBe(true);
    expect(draftPreviewUrl(draft, target)).toBe("/yosemite.png");
    expect(draftPreviewRecipe(draft, target)).toEqual(catalogueRecipe);
  });

  it("lays only the changed fields over the catalogue recipe", () => {
    const draft = {
      ...initialStudioDraft(target),
      appearance: { shape: "shield" as const, material: null, borderColor: null, borderWidth: 0.12 },
    };
    expect(draftPreviewRecipe(draft, target)).toEqual({
      ...catalogueRecipe,
      shape: "shield",
      borderWidth: 0.12,
    });
    expect(isStudioDraftDirty(draft, target)).toBe(true);
  });

  it("refuses a repeated tag caselessly and drops the one the owner removed", () => {
    const once = withToggledTag(initialStudioDraft(target), "Granite");
    expect(withToggledTag(once, "granite").tags).toEqual(["Granite"]);
    expect(withoutTag(once, "Granite").tags).toEqual([]);
    expect(withToggledTag(once, "   ").tags).toEqual(["Granite"]);
  });

  it("never lets the last collection be unchecked", () => {
    const draft = initialStudioDraft(target);
    expect(withToggledCollection(draft, "pack:starter:us-national-parks").collectionKeys).toEqual([
      "pack:starter:us-national-parks",
    ]);
    const two = withToggledCollection(draft, "pack:discovery:books-read");
    expect(two.collectionKeys).toHaveLength(2);
    expect(withToggledCollection(two, "pack:starter:us-national-parks").collectionKeys).toEqual([
      "pack:discovery:books-read",
    ]);
  });

  it("previews a pending image and submits its exact bytes", () => {
    const draft = { ...initialStudioDraft(target), pendingImage };
    expect(draftPreviewUrl(draft, target)).toBe("blob:pending");
    expect(usesOwnImage(draft, target)).toBe(true);
    const submission = toStudioSubmission(draft, target);
    expect(submission.ownImage?.hash).toBe(pendingImage.hash);
    expect(submission.ownImage?.bytes).toBe(pendingImage.bytes);
    expect(submission.useCatalogueImage).toBe(false);
  });

  it("asks for the catalogue image only when there is an owner image to drop", () => {
    const withOwnImage: StudioBadgeTarget = {
      ...target,
      ownImageDescription: "Mine.",
      sourceUrl: "blob:own",
    };
    const draft = initialStudioDraft(withOwnImage);
    expect(usesOwnImage(draft, withOwnImage)).toBe(true);
    expect(isStudioDraftDirty(draft, withOwnImage)).toBe(false);

    const reverted = { ...draft, useCatalogueImage: true };
    expect(usesOwnImage(reverted, withOwnImage)).toBe(false);
    expect(draftPreviewUrl(reverted, withOwnImage)).toBe("/yosemite.png");
    expect(isStudioDraftDirty(reverted, withOwnImage)).toBe(true);
    expect(toStudioSubmission(reverted, withOwnImage).useCatalogueImage).toBe(true);

    // With no owner image there is nothing to revert, so the flag must not fake a change.
    expect(isStudioDraftDirty({ ...initialStudioDraft(target), useCatalogueImage: true }, target)).toBe(
      false,
    );
  });

  it("returns every adjustable value to what the catalogue shipped", () => {
    const adjusted = {
      ...initialStudioDraft(target),
      appearance: {
        shape: "square" as const,
        material: "wool" as const,
        borderColor: null,
        borderWidth: null,
      },
      tags: ["granite"],
      pendingImage,
      collectionKeys: ["pack:discovery:books-read"],
    };
    const reset = catalogueDefaultDraft(target);
    expect(isCatalogueDefaultDraft(adjusted, target)).toBe(false);
    expect(isCatalogueDefaultDraft(reset, target)).toBe(true);
    expect(reset.collectionKeys).toEqual(["pack:starter:us-national-parks"]);
    expect(reset.tags).toEqual([]);
    expect(reset.pendingImage).toBeNull();
  });
});
