import { nationalParksAThroughG } from "./national-parks-a-g";
import { nationalParksGrandTetonThroughMountRainier } from "./national-parks-g-m";
import { nationalParksNThroughZ } from "./national-parks-n-z";

export const nationalParkCatalogueRelease = {
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
} as const;

export const usNationalParks = [
  ...nationalParksAThroughG,
  ...nationalParksGrandTetonThroughMountRainier,
  ...nationalParksNThroughZ,
] as const;

export const allNationalParksComposite = {
  definitionId: "visited-all-us-national-parks",
  title: "Every U.S. national park",
  criterion: "Visit every park in the 2026-07-01 NPS National Parks catalogue edition",
  ruleVersion: 1,
  requiredDefinitionIds: usNationalParks.map((park) => park.definitionId),
} as const;
