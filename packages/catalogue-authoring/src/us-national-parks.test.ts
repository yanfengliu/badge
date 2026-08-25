import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  allNationalParksComposite,
  nationalParkCatalogueRelease,
  usNationalParks,
} from "./us-national-parks.js";
import { nationalParkCampaign } from "./national-parks-campaign.js";
import { compileCandidatePrompt } from "./prompt-recipe.js";

const OFFICIAL_NAMES = [
  "Acadia National Park",
  "Arches National Park",
  "Badlands National Park",
  "Big Bend National Park",
  "Biscayne National Park",
  "Black Canyon of the Gunnison National Park",
  "Bryce Canyon National Park",
  "Canyonlands National Park",
  "Capitol Reef National Park",
  "Carlsbad Caverns National Park",
  "Channel Islands National Park",
  "Congaree National Park",
  "Crater Lake National Park",
  "Cuyahoga Valley National Park",
  "Death Valley National Park",
  "Denali National Park",
  "Dry Tortugas National Park",
  "Everglades National Park",
  "Gates of the Arctic National Park",
  "Gateway Arch National Park",
  "Glacier Bay National Park",
  "Glacier National Park",
  "Grand Canyon National Park",
  "Grand Teton National Park",
  "Great Basin National Park",
  "Great Sand Dunes National Park",
  "Great Smoky Mountains National Park",
  "Guadalupe Mountains National Park",
  "Haleakalā National Park",
  "Hawai'i Volcanoes National Park",
  "Hot Springs National Park",
  "Indiana Dunes National Park",
  "Isle Royale National Park",
  "Joshua Tree National Park",
  "Katmai National Park",
  "Kenai Fjords National Park",
  "Kings Canyon National Park",
  "Kobuk Valley National Park",
  "Lake Clark National Park",
  "Lassen Volcanic National Park",
  "Mammoth Cave National Park",
  "Mesa Verde National Park",
  "Mount Rainier National Park",
  "National Park of American Samoa",
  "New River Gorge National Park and Preserve",
  "North Cascades National Park",
  "Olympic National Park",
  "Petrified Forest National Park",
  "Pinnacles National Park",
  "Redwood National Park",
  "Rocky Mountain National Park",
  "Saguaro National Park",
  "Sequoia National Park",
  "Shenandoah National Park",
  "Theodore Roosevelt National Park",
  "Virgin Islands National Park",
  "Voyageurs National Park",
  "White Sands National Park",
  "Wind Cave National Park",
  "Wrangell-St. Elias National Park",
  "Yellowstone National Park",
  "Yosemite National Park",
  "Zion National Park",
] as const;

describe("the sourced U.S. National Parks authoring catalogue", () => {
  it("freezes the exact NPS National Parks (63) edition without confusing all NPS units", () => {
    expect(nationalParkCatalogueRelease).toMatchObject({
      catalogueId: "us-national-parks",
      edition: "2026-07-01.nps",
      declaredCount: 63,
      source: {
        authority: "U.S. National Park Service",
        url: "https://www.nps.gov/aboutus/national-park-system.htm",
        section: "National Parks (63)",
        pageLastUpdated: "2026-07-01",
        retrievedAt: "2026-08-23",
      },
    });
    expect(usNationalParks.map((park) => park.officialName)).toEqual(OFFICIAL_NAMES);
  });

  it("uses unique stable definition IDs independently from mutable or shared NPS site codes", () => {
    expect(new Set(usNationalParks.map((park) => park.definitionId)).size).toBe(63);
    expect(usNationalParks.every((park) => /^visited-[a-z0-9-]+$/u.test(park.definitionId))).toBe(true);
    expect(usNationalParks.every((park) => park.npsUrl === `https://www.nps.gov/${park.npsSiteCode}/`)).toBe(
      true,
    );
    expect(usNationalParks.filter((park) => park.npsSiteCode === "seki").map((park) => park.slug)).toEqual([
      "kings-canyon",
      "sequoia",
    ]);
  });

  it("makes the all-parks rule equal all and only the individual park definitions", () => {
    expect(allNationalParksComposite.requiredDefinitionIds).toEqual(
      usNationalParks.map((park) => park.definitionId),
    );
    expect(new Set(allNationalParksComposite.requiredDefinitionIds).size).toBe(63);
  });

  it("binds every selected source study to a real compact immutable asset", async () => {
    for (const [index, park] of usNationalParks.entries()) {
      expect(park.selectedSource).toMatchObject({
        status: "selected-source-study",
        mimeType: "image/jpeg",
        width: 896,
        height: 896,
        generatedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
        provenance: {
          generationWorkflow: "openai-image-generation-via-codex-imagegen",
          contentOrigin: "trained-algorithm",
          promptBinding: "recorded-exact-canonical-prompt",
          rightsBasis: "owner-directed-original-generation-for-badge",
          normalization: {
            recipe: { id: "national-park-study-jpeg", revision: 1 },
            tool: "system-drawing",
            targetWidth: 896,
            targetHeight: 896,
            maximumBytes: 262144,
          },
        },
        thumbnail: {
          mimeType: "image/jpeg",
          width: 128,
          height: 128,
          derivationRecipe: { id: "catalogue-list-thumbnail", revision: 1 },
        },
      });
      expect(park.selectedSource.accessibleDescription, park.slug).toContain(park.artBrief.themeCues[0]);
      const assetUrl = new URL(`../assets/national-parks/${park.selectedSource.fileName}`, import.meta.url);
      const bytes = await readFile(fileURLToPath(assetUrl));
      expect(bytes.byteLength, park.slug).toBeLessThanOrEqual(256 * 1024);
      expect(createHash("sha256").update(bytes).digest("hex"), park.slug).toBe(park.selectedSource.sha256);
      expect(readJpegHeaderSize(bytes), park.slug).toEqual({ width: 896, height: 896 });
      const thumbnailUrl = new URL(
        `../assets/national-parks/thumbnails/${park.selectedSource.thumbnail.fileName}`,
        import.meta.url,
      );
      const thumbnailBytes = await readFile(fileURLToPath(thumbnailUrl));
      expect(thumbnailBytes.byteLength, `${park.slug} thumbnail`).toBeLessThanOrEqual(16 * 1024);
      expect(readJpegHeaderSize(thumbnailBytes), `${park.slug} thumbnail`).toEqual({
        width: 128,
        height: 128,
      });
      expect(createHash("sha256").update(thumbnailBytes).digest("hex"), `${park.slug} thumbnail`).toBe(
        park.selectedSource.thumbnail.sha256,
      );
      const project = nationalParkCampaign[index];
      const selectedCandidate = project.candidates.find(
        (candidate) => candidate.candidateKey === project.selectedCandidateKey,
      );
      if (!selectedCandidate) throw new Error(`Selected candidate is missing for ${park.slug}.`);
      const prompt = compileCandidatePrompt(project.brief, selectedCandidate).prompt;
      expect(createHash("sha256").update(prompt, "utf8").digest("hex"), park.slug).toBe(
        park.selectedSource.promptSha256,
      );
    }
  });
});

function readJpegHeaderSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Selected source is not a JPEG image.");
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error(`Malformed JPEG marker at byte ${offset}.`);
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw new Error(`Malformed JPEG segment at byte ${offset}.`);
    }
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += segmentLength;
  }
  throw new Error("Selected source JPEG has no baseline size marker.");
}
