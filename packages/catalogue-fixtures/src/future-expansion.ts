import { lifeMilestoneCategories, lifeMilestoneTemplates } from "./future-life-milestones.js";

export const FUTURE_EXPANSION_SCHEMA_VERSION = 1;
export const FUTURE_EXPANSION_EDITION = "2026-08-24.future-expansion-brief@1";

export type FutureExpansionStatus = "planning-only";

export interface PlanningSource {
  readonly publisher: string;
  readonly title: string;
  readonly url: `https://${string}`;
  readonly observedOn: string;
  readonly sourceEdition: string;
  readonly role: "boundary" | "methodology" | "rights" | "editorial-input";
  readonly usageBoundary: string;
}

export interface MunicipalityExpansionPlan {
  readonly planId: string;
  readonly status: FutureExpansionStatus;
  readonly jurisdiction: "Washington" | "California";
  readonly edition: string;
  readonly expectedItemCount: number;
  readonly included: string;
  readonly excluded: readonly string[];
  readonly stableIdentityPlan: string;
  readonly refreshPlan: string;
  readonly sources: readonly PlanningSource[];
}

const washingtonMunicipalitySources = [
  {
    publisher: "Washington State Office of Financial Management",
    title: "April 1 official population estimates",
    url: "https://ofm.wa.gov/data-research/population-demographics/estimates/april-1-official/",
    observedOn: "2026-08-24",
    sourceEdition: "April 1, 2026 official estimates",
    role: "boundary",
    usageBoundary:
      "Use the official city-and-town membership and factual fields; do not reproduce source prose or imagery.",
  },
  {
    publisher: "Washington State Office of Financial Management",
    title: "Population estimate frequently asked questions",
    url: "https://ofm.wa.gov/data-research/frequently-asked-questions/",
    observedOn: "2026-08-24",
    sourceEdition: "2026 release guidance",
    role: "methodology",
    usageBoundary: "Use only to explain the annual estimate and release cadence.",
  },
] as const satisfies readonly PlanningSource[];

const californiaMunicipalitySources = [
  {
    publisher: "California Secretary of State",
    title: "2026 California Roster: Incorporated Cities and Towns",
    url: "https://admin.cdn.sos.ca.gov/ca-roster/2026/cities-towns.pdf",
    observedOn: "2026-08-24",
    sourceEdition: "2026 California Roster",
    role: "boundary",
    usageBoundary:
      "Use municipality names, legal designations, and incorporation facts; omit officials and contact details.",
  },
  {
    publisher: "California Department of Finance",
    title: "E-1 Population Estimates for Cities, Counties, and the State",
    url: "https://dof.ca.gov/forecasting/demographics/estimates-e1/",
    observedOn: "2026-08-24",
    sourceEdition: "January 1, 2026 provisional estimates",
    role: "methodology",
    usageBoundary:
      "Use as the annual population and municipality cross-check with the department's requested citation.",
  },
] as const satisfies readonly PlanningSource[];

export const municipalityExpansionPlans = [
  {
    planId: "washington-incorporated-municipalities",
    status: "planning-only",
    jurisdiction: "Washington",
    edition: "2026-04-01.wa-ofm",
    expectedItemCount: 281,
    included: "Every incorporated Washington city and town in the official April 1, 2026 release.",
    excluded: ["Census-designated places", "Unincorporated communities", "Neighborhoods"],
    stableIdentityPlan:
      "Reconcile each municipality to its Census place FIPS code while retaining its legal city-or-town designation.",
    refreshPlan:
      "Refresh annually after the June 30 OFM release; retire removed entries instead of deleting prior identity.",
    sources: washingtonMunicipalitySources,
  },
  {
    planId: "california-incorporated-municipalities",
    status: "planning-only",
    jurisdiction: "California",
    edition: "2026.ca-roster+2026-01-01.ca-dof-e1",
    expectedItemCount: 483,
    included: "Every incorporated California city and town in the 2026 state roster.",
    excluded: ["Census-designated places", "Unincorporated communities", "Neighborhoods"],
    stableIdentityPlan:
      "Reconcile each municipality to its Census place FIPS code while retaining the state roster's legal name.",
    refreshPlan:
      "Refresh annually after the state May-to-July releases; retire removed entries instead of deleting prior identity.",
    sources: californiaMunicipalitySources,
  },
] as const satisfies readonly MunicipalityExpansionPlan[];

export const greatAmericanReadPlan = {
  planId: "pbs-great-american-read-100",
  status: "planning-only",
  edition: "2018.pbs-great-american-read",
  expectedItemCount: 100,
  sourceBoundaryComplete: true,
  claimsUniversalCanon: false,
  included:
    "The exact 100 novels or series selected for the 2018 PBS Great American Read, preserved as a fixed recognition-oriented snapshot.",
  excluded: ["PBS descriptions and graphics", "Publisher cover art", "Blurbs", "Quoted book text"],
  seriesHandling:
    "Preserve whether PBS listed a single work or a series; one volume must not silently complete a series-level entry.",
  refreshPlan:
    "Do not refresh as a popularity ranking; supersede only with a separately named editorial edition.",
  sources: [
    {
      publisher: "PBS",
      title: "The Great American Read results",
      url: "https://www.pbs.org/the-great-american-read/results",
      observedOn: "2026-08-24",
      sourceEdition: "2018 final results",
      role: "boundary",
      usageBoundary: "Use only factual title, author, list placement, and single-work-or-series scope.",
    },
    {
      publisher: "PBS",
      title: "The Great American Read methodology",
      url: "https://www.pbs.org/the-great-american-read/about/show/index.html",
      observedOn: "2026-08-24",
      sourceEdition: "2018 program methodology",
      role: "methodology",
      usageBoundary: "Use to describe the survey-derived list honestly; never call it a universal canon.",
    },
  ],
} as const;

export type TokyoEssentialCategory =
  | "heritage-and-sacred"
  | "gardens-and-nature"
  | "views-and-landmarks"
  | "museums-and-culture"
  | "neighborhoods-and-experiences";

export interface TokyoEssentialPlace {
  readonly placeId: string;
  readonly label: string;
  readonly category: TokyoEssentialCategory;
}

export const tokyoEssentialPlaces = [
  { placeId: "sensoji", label: "Sensoji", category: "heritage-and-sacred" },
  { placeId: "meiji-jingu", label: "Meiji Jingu", category: "heritage-and-sacred" },
  {
    placeId: "imperial-palace-east-gardens",
    label: "Imperial Palace East Gardens",
    category: "heritage-and-sacred",
  },
  { placeId: "zojoji", label: "Zojoji", category: "heritage-and-sacred" },
  { placeId: "nezu-shrine", label: "Nezu Shrine", category: "heritage-and-sacred" },
  { placeId: "hamarikyu", label: "Hamarikyu Gardens", category: "gardens-and-nature" },
  { placeId: "shinjuku-gyoen", label: "Shinjuku Gyoen", category: "gardens-and-nature" },
  { placeId: "rikugien", label: "Rikugien Gardens", category: "gardens-and-nature" },
  {
    placeId: "koishikawa-korakuen",
    label: "Koishikawa Korakuen Gardens",
    category: "gardens-and-nature",
  },
  { placeId: "ueno-park", label: "Ueno Park", category: "gardens-and-nature" },
  { placeId: "mount-takao", label: "Mount Takao", category: "gardens-and-nature" },
  { placeId: "tokyo-skytree", label: "Tokyo Skytree", category: "views-and-landmarks" },
  { placeId: "tokyo-tower", label: "Tokyo Tower", category: "views-and-landmarks" },
  {
    placeId: "tokyo-metropolitan-government-observatories",
    label: "Tokyo Metropolitan Government Observatories",
    category: "views-and-landmarks",
  },
  { placeId: "shibuya-sky", label: "Shibuya Sky", category: "views-and-landmarks" },
  {
    placeId: "rainbow-bridge-and-odaiba",
    label: "Rainbow Bridge and Odaiba",
    category: "views-and-landmarks",
  },
  {
    placeId: "tokyo-national-museum",
    label: "Tokyo National Museum",
    category: "museums-and-culture",
  },
  {
    placeId: "national-museum-of-nature-and-science",
    label: "National Museum of Nature and Science",
    category: "museums-and-culture",
  },
  {
    placeId: "edo-tokyo-open-air-architectural-museum",
    label: "Edo-Tokyo Open Air Architectural Museum",
    category: "museums-and-culture",
  },
  { placeId: "ghibli-museum", label: "Ghibli Museum", category: "museums-and-culture" },
  {
    placeId: "teamlab-borderless",
    label: "teamLab Borderless",
    category: "museums-and-culture",
  },
  { placeId: "mori-art-museum", label: "Mori Art Museum", category: "museums-and-culture" },
  {
    placeId: "national-art-center-tokyo",
    label: "The National Art Center, Tokyo",
    category: "museums-and-culture",
  },
  {
    placeId: "sumida-hokusai-museum",
    label: "The Sumida Hokusai Museum",
    category: "museums-and-culture",
  },
  { placeId: "miraikan", label: "Miraikan", category: "museums-and-culture" },
  {
    placeId: "shibuya-scramble-crossing",
    label: "Shibuya Scramble Crossing",
    category: "neighborhoods-and-experiences",
  },
  {
    placeId: "harajuku-and-takeshita-street",
    label: "Harajuku and Takeshita Street",
    category: "neighborhoods-and-experiences",
  },
  { placeId: "akihabara", label: "Akihabara", category: "neighborhoods-and-experiences" },
  { placeId: "ginza", label: "Ginza", category: "neighborhoods-and-experiences" },
  {
    placeId: "tsukiji-outer-market",
    label: "Tsukiji Outer Market",
    category: "neighborhoods-and-experiences",
  },
  {
    placeId: "toyosu-market",
    label: "Toyosu Market",
    category: "neighborhoods-and-experiences",
  },
  { placeId: "yanaka-ginza", label: "Yanaka Ginza", category: "neighborhoods-and-experiences" },
  {
    placeId: "kichijoji-and-harmonica-yokocho",
    label: "Kichijoji and Harmonica Yokocho",
    category: "neighborhoods-and-experiences",
  },
  {
    placeId: "ryogoku-kokugikan",
    label: "Ryogoku Kokugikan",
    category: "neighborhoods-and-experiences",
  },
] as const satisfies readonly TokyoEssentialPlace[];

export const tokyoEssentialsPlan = {
  planId: "tokyo-essentials",
  status: "planning-only",
  edition: "2026-08-24.badge-editorial@1",
  expectedItemCount: 34,
  exhaustive: false,
  itemProvenanceStatus: "required-before-authoring",
  included:
    "A Badge-editorial seed of durable Tokyo places informed by the official tourism guide, not every attraction in Tokyo.",
  excluded: [
    "Temporary events and festivals",
    "Operational hours and prices",
    "Tokyo Disneyland and DisneySea, which are in Chiba Prefecture",
    "Official guide prose and photography",
  ],
  refreshPlan: "Review annually and before publication; retire closures instead of rewriting prior identity.",
  authoringGate:
    "Bind every place to its own current GO TOKYO or venue-authority URL before creating an authoring record; the landing-page sources below do not establish item-level provenance.",
  places: tokyoEssentialPlaces,
  sources: [
    {
      publisher: "Tokyo Convention & Visitors Bureau",
      title: "GO TOKYO attractions",
      url: "https://www.gotokyo.org/en/see-and-do/attractions/",
      observedOn: "2026-08-24",
      sourceEdition: "Official Tokyo Travel Guide, 2026 observation",
      role: "editorial-input",
      usageBoundary: "Use factual place names and original Badge editorial selection and copy.",
    },
    {
      publisher: "Tokyo Convention & Visitors Bureau",
      title: "About this site",
      url: "https://www.gotokyo.org/en/about-tcvb/index.html",
      observedOn: "2026-08-24",
      sourceEdition: "2026 site policy",
      role: "rights",
      usageBoundary: "Do not reproduce GO TOKYO text, graphics, or photography without permission.",
    },
  ],
} as const;

export const michelinDiningMilestonePlan = {
  planId: "dined-at-a-michelin-starred-restaurant",
  status: "planning-only",
  edition: "2026-08-24.user-entered@1",
  kind: "user-entered-template",
  label: "Dined at a Michelin-starred restaurant",
  restaurantRecordsIncluded: 0,
  currentStatusLookupIncluded: false,
  nominativeTrademarkReferenceIncluded: true,
  brandAssetsIncluded: false,
  userEnteredFields: ["restaurantName", "location", "visitDate", "ratingObservedAtVisit"],
  completionBoundary:
    "The person records the restaurant and the rating they observed for the visit; Badge does not infer or verify current status.",
  redistributionBoundary:
    "Do not ship a scraped Michelin restaurant directory, Michelin descriptions, logos, star pictograms, red trade dress, restaurant logos, or restaurant photography.",
  historyBoundary:
    "A later rating change or closure must not rewrite an existing personal memory; store the observation date with the user-entered fact.",
  sources: [
    {
      publisher: "The MICHELIN Guide",
      title: "United States restaurant selection",
      url: "https://guide.michelin.com/en/us/restaurants",
      observedOn: "2026-08-24",
      sourceEdition: "Live selection observed 2026-08-24",
      role: "boundary",
      usageBoundary: "Reference only to let the person substantiate a date-specific factual entry.",
    },
    {
      publisher: "The MICHELIN Guide",
      title: "Japan restaurant selection",
      url: "https://guide.michelin.com/en/jp/restaurants",
      observedOn: "2026-08-24",
      sourceEdition: "Live selection observed 2026-08-24",
      role: "boundary",
      usageBoundary: "Reference only to let the person substantiate a date-specific factual entry.",
    },
    {
      publisher: "The MICHELIN Guide",
      title: "Terms of use",
      url: "https://guide.michelin.com/en/terms-of-use",
      observedOn: "2026-08-24",
      sourceEdition: "Terms observed 2026-08-24",
      role: "rights",
      usageBoundary: "Treat the guide compilation and brand assets as restricted absent permission.",
    },
  ],
} as const;

export const lifeMilestonesPlan = {
  planId: "optional-life-milestones",
  status: "planning-only",
  edition: "2026-08-24.badge-editorial@1",
  expectedItemCount: 64,
  expectedCategoryCount: 8,
  optional: true,
  normative: false,
  verification: "personal-honesty-only",
  inclusionBoundary:
    "Eight optional reflection-oriented templates in each of eight broad areas; none is a required life stage or externally verified outcome.",
  exclusionBoundary:
    "No age deadlines, hierarchy, score, diagnosis, prescribed family structure, required marriage, required parenthood, or required homeownership.",
  sensitivityBoundary:
    "Templates may involve private health, work, home, or relationship context; future product use must preserve deliberate local privacy choices.",
  categories: lifeMilestoneCategories,
  templates: lifeMilestoneTemplates,
  sources: [
    {
      publisher: "Substance Abuse and Mental Health Services Administration",
      title: "Learn the Eight Dimensions of Wellness",
      url: "https://library.samhsa.gov/sites/default/files/sma16-4953.pdf",
      observedOn: "2026-08-24",
      sourceEdition: "SMA16-4953",
      role: "editorial-input",
      usageBoundary: "Conceptual input only; do not reproduce the framework graphic or imply endorsement.",
    },
    {
      publisher: "World Health Organization",
      title: "WHOQOL: Measuring Quality of Life",
      url: "https://www.who.int/tools/whoqol",
      observedOn: "2026-08-24",
      sourceEdition: "WHOQOL overview observed 2026-08-24",
      role: "editorial-input",
      usageBoundary: "Use only as support for person-defined, cross-domain quality-of-life framing.",
    },
    {
      publisher: "Organisation for Economic Co-operation and Development",
      title: "Current well-being framework",
      url: "https://www.oecd.org/en/data/tools/well-being-data-monitor/current-well-being.html",
      observedOn: "2026-08-24",
      sourceEdition: "Current well-being framework observed 2026-08-24",
      role: "editorial-input",
      usageBoundary: "Use only as broad domain input; the milestone list remains Badge editorial work.",
    },
  ],
} as const;

export const futureExpansionBrief = {
  schemaVersion: FUTURE_EXPANSION_SCHEMA_VERSION,
  edition: FUTURE_EXPANSION_EDITION,
  status: "planning-only",
  planningBoundary:
    "This module records researched future scope. It contains no created badge definitions, selected art, render recipes, quotations, pack references, Archive records, or publication claims.",
  municipalityPlans: municipalityExpansionPlans,
  readingPlan: greatAmericanReadPlan,
  tokyoPlan: tokyoEssentialsPlan,
  michelinDiningPlan: michelinDiningMilestonePlan,
  lifeMilestonesPlan,
} as const;

export {
  lifeMilestoneCategories,
  lifeMilestoneCategoryIds,
  lifeMilestoneTemplates,
} from "./future-life-milestones.js";
export type {
  FutureLifeMilestoneCategory,
  FutureLifeMilestoneTemplate,
  LifeMilestoneCategoryId,
} from "./future-life-milestones.js";
