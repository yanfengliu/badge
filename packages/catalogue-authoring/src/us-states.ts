import type { CatalogueEdition, UsStateAuthoringRecord } from "./types";
import { usStatesAlabamaThroughMissouri } from "./us-states-a-m";
import { usStatesMontanaThroughWyoming } from "./us-states-m-z";

export const usStateCatalogueEdition: CatalogueEdition = {
  schemaVersion: 1,
  catalogueId: "us-states",
  edition: "2021-10-08.census-ansi",
  declaredCount: 50,
  source: {
    authority: "U.S. Census Bureau",
    url: "https://www.census.gov/library/reference/code-lists/ansi/ansi-codes-for-states.html",
    section: "FIPS Codes for the States and District of Columbia",
    pageLastUpdated: "2021-10-08",
    retrievedAt: "2026-08-24",
    scope: "The 50 U.S. states; excludes the District of Columbia, Puerto Rico, and insular areas.",
  },
};

export const usStates: readonly UsStateAuthoringRecord[] = [
  ...usStatesAlabamaThroughMissouri,
  ...usStatesMontanaThroughWyoming,
];
