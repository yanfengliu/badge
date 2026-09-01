import type { FixtureCollection, PublishedBadgeFixture } from "./types";

import { fixtureQuotationBankForDefinition } from "@badge/catalogue-fixtures/catalogue-quotations";

export const STARTER_PACK_ID = "badge.catalogue.starter";

const starterPackRef = {
  packId: STARTER_PACK_ID,
  version: "1.0.0-alpha.4",
  packDigest: "cb3e08d6ef3067cec797529368bdc1dc876f7b6aa483e38b43160033f416cf9f",
} as const;

const starterQuotationBanks = {
  "visited-yosemite": fixtureQuotationBankForDefinition("visited-yosemite"),
  "read-sapiens": fixtureQuotationBankForDefinition("read-sapiens"),
  "finished-bachelors-degree": fixtureQuotationBankForDefinition("finished-bachelors-degree"),
  "visited-all-us-national-parks": fixtureQuotationBankForDefinition("visited-all-us-national-parks"),
} as const;

export const starterBadges: readonly PublishedBadgeFixture[] = [
  {
    definitionId: "visited-yosemite",
    collectionId: "us-national-parks",
    title: "Yosemite",
    shortTitle: "Yosemite",
    criterion: "Visit Yosemite National Park",
    description: "Granite, river, and wonder—kept as one honest memory.",
    accessibleDescription:
      "Broad cloisonné-style fields show El Capitan, three pines, a gold sun, and a turquoise river.",
    sourceAssetHash: "a4fae2312feca2c2da6407eeed7ecda32bccd8936c6b190c1082c4523a12841c",
    sourceUrl: "/yosemite-literal.png",
    visualEditionId: "visual.yosemite.cloisonne.png.v2",
    renderRecipe: {
      version: 1,
      shape: "circle",
      material: "enamel",
      borderColor: "#514637",
      borderWidth: 0.075,
      thickness: 0.13,
      relief: 0.032,
      crop: { x: 0.5, y: 0.5, scale: 1.03 },
    },
    packRef: starterPackRef,
    initialLifecycle: "planned",
    defaultQuotationId: starterQuotationBanks["visited-yosemite"][0].id,
    historicalQuotations: starterQuotationBanks["visited-yosemite"],
  },
  {
    definitionId: "read-sapiens",
    collectionId: "books-read",
    title: "Read Sapiens",
    shortTitle: "Sapiens",
    criterion: "Finish reading Sapiens",
    description: "A long view of the stories people build together.",
    accessibleDescription:
      "Four large embroidered human profiles face a gold path and sun across broad teal and rust fields.",
    sourceAssetHash: "8bc3dd807fe4447bfad073437d00e01738c81248ade14c712af23ee8e5e319e4",
    sourceUrl: "/sapiens.png",
    visualEditionId: "visual.sapiens.embroidered.png.v2",
    renderRecipe: {
      version: 1,
      shape: "rectangle",
      material: "wool",
      borderColor: "#a65c3e",
      borderWidth: 0.055,
      thickness: 0.075,
      relief: 0.018,
      crop: { x: 0.5, y: 0.52, scale: 1.05 },
    },
    packRef: starterPackRef,
    initialLifecycle: "suggested",
    defaultQuotationId: starterQuotationBanks["read-sapiens"][0].id,
    historicalQuotations: starterQuotationBanks["read-sapiens"],
  },
  {
    definitionId: "finished-bachelors-degree",
    collectionId: "life-milestones",
    title: "Bachelor's degree",
    shortTitle: "Degree",
    criterion: "Complete a bachelor's degree",
    description: "Years of patient work resolving into an open threshold.",
    accessibleDescription:
      "Three broad marquetry steps rise between dark wood planes toward an open gold doorway.",
    sourceAssetHash: "450f283bfb5f2706ef1b89d6eff82694ea3a92a44f22884a5254ff0a534ba926",
    sourceUrl: "/bachelors-degree.png",
    visualEditionId: "visual.degree.marquetry.png.v2",
    renderRecipe: {
      version: 1,
      shape: "shield",
      material: "enamel",
      borderColor: "#b8aa8e",
      borderWidth: 0.065,
      thickness: 0.11,
      relief: 0.026,
      crop: { x: 0.5, y: 0.48, scale: 1.08 },
    },
    packRef: starterPackRef,
    initialLifecycle: "suggested",
    defaultQuotationId: starterQuotationBanks["finished-bachelors-degree"][0].id,
    historicalQuotations: starterQuotationBanks["finished-bachelors-degree"],
  },
  {
    definitionId: "visited-all-us-national-parks",
    collectionId: "us-national-parks",
    title: "Every national park",
    shortTitle: "All parks",
    criterion: "Visit every park in the active U.S. National Parks catalogue",
    description: "A composite journey whose final picture was published before the last activation.",
    accessibleDescription:
      "Large cut-paper forms combine a redwood, mountain, desert arch, sun, trail, and ocean wave.",
    sourceAssetHash: "8923a01460dc2f0ce42cc746720c36ca43c7fb8cd6959c8dea749df99095a20e",
    sourceUrl: "/all-parks.png",
    visualEditionId: "visual.all-parks.cut-paper.png.v2",
    renderRecipe: {
      version: 1,
      shape: "circle",
      material: "enamel",
      borderColor: "#6f6657",
      borderWidth: 0.09,
      thickness: 0.14,
      relief: 0.035,
      crop: { x: 0.5, y: 0.5, scale: 1.02 },
    },
    packRef: starterPackRef,
    initialLifecycle: "suggested",
    defaultQuotationId: starterQuotationBanks["visited-all-us-national-parks"][0].id,
    historicalQuotations: starterQuotationBanks["visited-all-us-national-parks"],
  },
] as const;

export const starterCollection: FixtureCollection = {
  collectionId: "personal-field-archive",
  title: "The Field Archive",
  eyebrow: "A private collection of places, pages, and passages",
  description: "Four finished artifacts to begin with. Only you decide when they become memories.",
  badges: starterBadges,
};

export type { FixtureCollection, FixtureHistoricalQuotation, PublishedBadgeFixture } from "./types";
