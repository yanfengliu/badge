import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  selectedBookStudies,
  selectedEducationMilestoneStudies,
  selectedMichelinDiningStudies,
  selectedUsStateStudies,
  selectedVideoGameStudies,
  usNationalParks,
} from "@badge/catalogue-authoring";
import {
  CATALOGUE_QUOTATIONS_CHECKED_AT,
  catalogueQuotationBanksByDefinitionId as sourceQuotationBanksByDefinitionId,
} from "@badge/catalogue-quotation-data";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import {
  cataloguePackBadges,
  cataloguePackRef,
  catalogueQuotationBanksByDefinitionId,
} from "@badge/catalogue-fixtures/catalogue-pack";
import { discoveryBadges } from "@badge/catalogue-fixtures/discovery";
import { validateArchiveSourceJpeg } from "@badge/archive-application";
import { canonicalJson } from "@badge/pack-contract";
import { renderRecipeSchema } from "@badge/render-recipe";
import { canonicalQuotationTextKey, sayingRequestSchema } from "@badge/saying-contract";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const assetsRoot = path.join(repositoryRoot, "packages/catalogue-authoring/assets");
const identifierPattern = /^[a-z0-9][a-z0-9._:-]*$/u;

const MAX_SOURCE_BYTES = 262_144;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stripPrefix(quotationId) {
  return quotationId.replace(/^historic-quotation\//u, "");
}

function normalizedSourceQuotation(entry) {
  return {
    id: stripPrefix(entry.quotationId),
    text: entry.text,
    person: entry.personName,
    sourceTitle: entry.sourceTitle,
    sourceUrl: entry.sourceUrl,
    ...(entry.personWikipediaUrl ? { personWikipediaUrl: entry.personWikipediaUrl } : {}),
  };
}

describe("discovery catalogue pack fixture", () => {
  const studies = discoveryBadges.filter((badge) => badge.availability === "source-study");
  const badgesByRecordId = new Map(cataloguePackBadges.map((badge) => [badge.recordId, badge]));

  it("covers exactly the projected source-study concepts with unique pack-qualified records", () => {
    expect(cataloguePackBadges).toHaveLength(346);
    expect(badgesByRecordId.size).toBe(cataloguePackBadges.length);
    expect(new Set(studies.map((study) => study.recordId)).size).toBe(studies.length);
    expect([...badgesByRecordId.keys()].sort()).toEqual(studies.map((study) => study.recordId).sort());

    const starterRecordIds = new Set(starterBadges.map((badge) => `starter:${badge.definitionId}`));
    for (const recordId of badgesByRecordId.keys()) {
      expect(starterRecordIds.has(recordId)).toBe(false);
      expect(identifierPattern.test(recordId)).toBe(true);
    }

    const countsBySet = new Map();
    for (const badge of cataloguePackBadges) {
      countsBySet.set(badge.setId, (countsBySet.get(badge.setId) ?? 0) + 1);
    }
    expect(Object.fromEntries(countsBySet)).toEqual({
      "us-national-parks": 62,
      "us-states": 50,
      "books-read": 50,
      "video-games-played": 50,
      "life-milestones": 2,
      "michelin-dining": 132,
    });
  });

  it("keeps every card field aligned with the discovery projection", () => {
    for (const study of studies) {
      const badge = badgesByRecordId.get(study.recordId);
      expect(badge, `pack badge for ${study.discoveryId}`).toBeDefined();
      expect(badge.definitionId).toBe(study.discoveryId);
      expect(badge.title).toBe(study.title);
      expect(badge.criterion).toBe(study.criterion);
      expect(badge.accessibleDescription).toBe(study.accessibleDescription);
      expect(badge.setId).toBe(study.setIds[0]);
      if (study.regionId) expect(badge.regionId).toBe(study.regionId);
    }
  });

  it("pins every canonical source study to its on-disk bytes and the strict durable-JPEG shape", async () => {
    for (const badge of cataloguePackBadges) {
      const assetPath = path.join(assetsRoot, badge.assetKey);
      const bytes = await readFile(assetPath);
      expect(
        bytes.byteLength,
        `${badge.assetKey} stays within the normalized source ceiling`,
      ).toBeLessThanOrEqual(MAX_SOURCE_BYTES);
      expect(sha256(bytes), `${badge.assetKey} matches its pinned hash`).toBe(badge.sourceAssetHash);
      const validated = validateArchiveSourceJpeg(badge.sourceAssetHash, bytes);
      expect(
        { width: validated.width, height: validated.height },
        `${badge.assetKey} passes the strict admission validator at 896×896`,
      ).toEqual({ width: 896, height: 896 });
    }
  }, 120_000);

  it("compiles every source-checked quotation record verbatim into one private fixture bank", () => {
    const allBadges = [...starterBadges, ...cataloguePackBadges];
    expect(Object.keys(sourceQuotationBanksByDefinitionId)).toHaveLength(allBadges.length);
    expect(Object.keys(catalogueQuotationBanksByDefinitionId)).toHaveLength(allBadges.length);
    expect(CATALOGUE_QUOTATIONS_CHECKED_AT).toBe("2026-08-31");

    for (const badge of allBadges) {
      const sourceBank = sourceQuotationBanksByDefinitionId[badge.definitionId];
      const fixtureBank = catalogueQuotationBanksByDefinitionId[badge.definitionId];
      expect(sourceBank, `${badge.definitionId} has reviewed source rows`).toBeDefined();
      expect(fixtureBank, `${badge.definitionId} has a compiled private bank`).toBeDefined();
      expect(fixtureBank).toEqual(sourceBank.map(normalizedSourceQuotation));
      expect(badge.historicalQuotations).toEqual(fixtureBank);
      for (const source of sourceBank) {
        expect(source.sourceSha256, `${source.quotationId} pins reviewed source bytes`).toMatch(
          /^[a-f0-9]{64}$/u,
        );
      }
    }
  });

  it("honors each authoring record's designated default quotation", () => {
    const designatedByDefinitionId = new Map();
    for (const record of [
      ...usNationalParks,
      ...selectedUsStateStudies,
      ...selectedBookStudies,
      ...selectedEducationMilestoneStudies,
      ...selectedMichelinDiningStudies,
      ...selectedVideoGameStudies,
    ]) {
      designatedByDefinitionId.set(record.definitionId, stripPrefix(record.defaultQuotationId));
    }
    for (const badge of cataloguePackBadges) {
      const bankIds = badge.historicalQuotations.map((quotation) => quotation.id);
      expect(bankIds, `${badge.definitionId} default is in its bank`).toContain(badge.defaultQuotationId);
      const designated = designatedByDefinitionId.get(badge.definitionId);
      expect(designated, `${badge.definitionId} has an authoring default`).toBeDefined();
      expect(badge.defaultQuotationId, `${badge.definitionId} designated default`).toBe(designated);
    }
  });

  it("parses every record-bound quotation bank and render recipe", () => {
    for (const badge of cataloguePackBadges) {
      const request = sayingRequestSchema.safeParse({
        title: badge.title,
        criterion: badge.criterion,
        allowedQuotations: badge.historicalQuotations,
      });
      expect(
        request.success,
        `${badge.definitionId} quotation request: ${request.error?.message ?? ""}`,
      ).toBe(true);
      const recipe = renderRecipeSchema.safeParse(badge.renderRecipe);
      expect(recipe.success, `${badge.definitionId} render recipe`).toBe(true);
      expect(identifierPattern.test(badge.visualEditionId)).toBe(true);
      expect(badge.accessibleDescription.length).toBeLessThanOrEqual(500);
      expect(badge.sourceAssetHash).toMatch(/^[a-f0-9]{64}$/u);
    }
  });

  it("gives every badge a globally disjoint source-checked quotation bank", () => {
    const bankOwnersByQuotationText = new Map();
    const bankOwnersByQuotationId = new Map();
    const defaultOwnersByQuotationText = new Map();
    const allBadges = [
      ...starterBadges.map((badge) => ({
        recordId: `starter:${badge.definitionId}`,
        defaultQuotationId: badge.defaultQuotationId,
        historicalQuotations: badge.historicalQuotations,
      })),
      ...cataloguePackBadges,
    ];

    for (const badge of allBadges) {
      expect(
        badge.historicalQuotations.length,
        `${badge.recordId} has regeneration choice`,
      ).toBeGreaterThanOrEqual(2);

      for (const quotation of badge.historicalQuotations) {
        const canonicalText = canonicalQuotationTextKey(quotation.text);
        const previousTextOwner = bankOwnersByQuotationText.get(canonicalText);
        expect(
          previousTextOwner,
          `${badge.recordId} quote ${quotation.id} repeats the wording owned by ${previousTextOwner ?? "no badge"}`,
        ).toBeUndefined();
        bankOwnersByQuotationText.set(canonicalText, badge.recordId);

        const previousIdOwner = bankOwnersByQuotationId.get(quotation.id);
        expect(
          previousIdOwner,
          `${badge.recordId} quote id ${quotation.id} is already owned by ${previousIdOwner ?? "no badge"}`,
        ).toBeUndefined();
        bankOwnersByQuotationId.set(quotation.id, badge.recordId);
      }

      const selected = badge.historicalQuotations.find(
        (quotation) => quotation.id === badge.defaultQuotationId,
      );
      expect(selected, `${badge.recordId} default remains in its private bank`).toBeDefined();
      const canonicalDefault = canonicalQuotationTextKey(selected.text);
      const previousDefaultOwner = defaultOwnersByQuotationText.get(canonicalDefault);
      expect(
        previousDefaultOwner,
        `${badge.recordId} defaults to wording already selected by ${previousDefaultOwner ?? "no badge"}`,
      ).toBeUndefined();
      defaultOwnersByQuotationText.set(canonicalDefault, badge.recordId);
    }

    expect(defaultOwnersByQuotationText.size).toBe(allBadges.length);
  });

  it("binds the pack reference to the exact generated content digest", () => {
    expect(cataloguePackRef.packId).toBe("badge.catalogue.discovery");
    expect(cataloguePackRef.version).toBe("1.0.0-alpha.3");
    const digest = sha256(
      canonicalJson({
        packId: cataloguePackRef.packId,
        version: cataloguePackRef.version,
        badges: cataloguePackBadges,
      }),
    );
    expect(cataloguePackRef.packDigest).toBe(digest);
  });
});
