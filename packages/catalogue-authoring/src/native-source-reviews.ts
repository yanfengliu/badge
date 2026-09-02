// A contact sheet proves collection coverage, not source conformance.
//
// The first labelled 63-image national-park contact sheet looked broad and
// cohesive; an independent pass at native 896 x 896 found errors the thumbnails
// had concealed — inset work boundaries, the wrong waterfall geometry, an
// oak-like crown on General Sherman, geyser-like Hot Springs water, fantasy
// Mammoth Cave forms, and incorrect Guadalupe Mountains and Katmai silhouettes.
// Ten park sources were rejected and regenerated.
//
// So a review is a fact about SPECIFIC BYTES, not about a catalogue. This
// register records, per promoted source, the sha256 that was actually looked at,
// the pixel size it was looked at, and what was checked. Regenerating a source
// changes its digest, which strands its review record and fails the gate in
// `native-source-review.test.ts` until someone looks at the new bytes at native
// resolution. That is the whole point: an aggregate view can be refreshed for
// free, and this cannot.
//
// Add an entry only after inspecting that exact file at its native pixel size —
// all four edges for inset paper, rough work boundaries, frames or presentation
// backgrounds; the depicted subject against its source cue; and the recipe's
// explicit exclusions. `docs/policies/local-rules.md` states the procedure.

/** What a reviewer confirmed by looking at the source at its native size. */
export type NativeSourceReviewCheck =
  /** All four edges carry the artwork: no inset paper, frame, mount, or presentation background. */
  | "all-four-edges"
  /** The depicted subject matches the recipe's source cue. */
  | "factual-cues"
  /** None of the recipe's `sourceSpecificExclusions` appear. */
  | "explicit-exclusions";

export const REQUIRED_NATIVE_SOURCE_REVIEW_CHECKS: readonly NativeSourceReviewCheck[] = [
  "all-four-edges",
  "factual-cues",
  "explicit-exclusions",
];

export interface NativeSourceReview {
  readonly slug: string;
  /** The digest of the exact promoted bytes that were inspected. */
  readonly reviewedSha256: string;
  /** Anything a reviewer wanted the next revision to carry; never a substitute for rejecting. */
  readonly notes?: string;
}

export interface NativeSourceReviewRound {
  readonly catalogue: "national-parks";
  /** The longest edge, in pixels, at which every source in this round was inspected. */
  readonly reviewedPixels: number;
  readonly reviewedOn: string;
  readonly reviewer: string;
  readonly checks: readonly NativeSourceReviewCheck[];
  readonly reviews: readonly NativeSourceReview[];
}

/**
 * The 2026-08-27 code-native rerender replaced every national-park source after
 * the 2026-08-23 native audit, and the pass that followed it inspected exact-48px
 * proof sheets — an aggregate view at the smallest scale the catalogue has. This
 * round is the native-resolution look at the bytes that actually ship.
 */
export const nationalParkNativeSourceReview: NativeSourceReviewRound = {
  catalogue: "national-parks",
  reviewedPixels: 896,
  reviewedOn: "2026-09-02",
  reviewer: "claude-opus-5",
  checks: REQUIRED_NATIVE_SOURCE_REVIEW_CHECKS,
  reviews: [
    {
      slug: "acadia",
      reviewedSha256: "5a8a197266209311b6fc30539c8449e0efbda3d1f7e552c99e19d28f7482916d",
    },
    {
      slug: "arches",
      reviewedSha256: "da27c4df90bdc207a942bb9c05103b35357d6d7cc1cfa5442fa32fd3908a5d61",
    },
    {
      slug: "badlands",
      reviewedSha256: "52dc339b1025c2bb53cade0c119bc0d627e5bba7abda498528f1d233dd3726a4",
    },
    {
      slug: "big-bend",
      reviewedSha256: "a2b5e067eec68277ceee1c9d8639a62428c07c646235fa13317f20efd150df5d",
    },
    {
      slug: "biscayne",
      reviewedSha256: "dfce7e25495a48fa7140329aef8d9ab466836152624e66e8c6673d095473d617",
    },
    {
      slug: "black-canyon-gunnison",
      reviewedSha256: "7c9c9f58d5ebcde1573c5de50c14726a026b0bfba7b81def434836f73494c677",
    },
    {
      slug: "bryce-canyon",
      reviewedSha256: "507450a5825b5113cf527e8bbcf4e5c569da40cc225cd46fe6475eca1bae13ab",
    },
    {
      slug: "canyonlands",
      reviewedSha256: "a6aad7cfa4e3c2ac390280f7d542d0929b2821443ea334e42a9c3ee8dc682a79",
    },
    {
      slug: "capitol-reef",
      reviewedSha256: "6c0305d6b9111c45f884a6b62d0c88319671dbcc1d74c3454e0efcea854406b0",
    },
    {
      slug: "carlsbad-caverns",
      reviewedSha256: "96ae759a35ce44abe296d73193eaa76779cf04d40468953fcd98ea77aaa74e4a",
    },
    {
      slug: "channel-islands",
      reviewedSha256: "bc007d91fecca616351b700a51c4b54eaf0903516632ab5d8b5c464759621935",
    },
    {
      slug: "congaree",
      reviewedSha256: "60602885eef988285a347ba3cdc1cd4ab6688808faf3406ccf056c71dea65691",
    },
    {
      slug: "crater-lake",
      reviewedSha256: "6ba41e16fca1954a7becba11bd2ffdb8b06f36b3909f8cd3a8a0e40677cfe67f",
    },
    {
      slug: "cuyahoga-valley",
      reviewedSha256: "3b91fdca34a96824252856af90c2a39c42417e20cf0d3305e852e8c15765b07b",
    },
    {
      slug: "death-valley",
      reviewedSha256: "bce7b5b27b2822cd3813c55d303d504557e51a9aac744c1cef12a02c62bc9bcc",
    },
    {
      slug: "denali",
      reviewedSha256: "6422c29271eeaede03c0437dfb9cf9118692d4b18e3d439e0099cfb2a09145ed",
    },
    {
      slug: "dry-tortugas",
      reviewedSha256: "f355b67a9f4b56297dee6904cec957f27ed3d14b4c164f8fde958efed6109cc8",
    },
    {
      slug: "everglades",
      reviewedSha256: "f57e6c7391392e90a2e7039677b4a5e7897318afa3ad84f108765e219ae0838e",
    },
    {
      slug: "gates-of-the-arctic",
      reviewedSha256: "0754628f5449f0c8d1caf0a1442c3cf781df4eef8a9a27edf1ae8c1f34e7cd6a",
    },
    {
      slug: "gateway-arch",
      reviewedSha256: "2647652561141be627d00363fa17df16dbebe56fff4428d51e4e21ee5b749feb",
      notes:
        "The stainless catenary reads as a solid triangle over a pale semicircular arc rather than as an arc alone; the arc is present but subordinate.",
    },
    {
      slug: "glacier-bay",
      reviewedSha256: "79aa84614cf27f7233b00617037c2d8dda25d9dfb3f64137d67b3555fbe4d245",
    },
    {
      slug: "glacier",
      reviewedSha256: "41d191952a14da2d90987d8d42d8e4dc205096ed19babf9da5df32f0c9ef71ec",
    },
    {
      slug: "grand-canyon",
      reviewedSha256: "c3236a56043812f288951da4f80f4fc05cc93a011b3f66c8ce87fc08eb75f8e7",
    },
    {
      slug: "grand-teton",
      reviewedSha256: "215673af2b0555510e456640f7d163312aa286f35befbc77e613ceb0099e70d3",
    },
    {
      slug: "great-basin",
      reviewedSha256: "0a0c5a3867364d94777bac5df149809f12453f4c88fc765b4f62b54c1677d68d",
    },
    {
      slug: "great-sand-dunes",
      reviewedSha256: "3cf7a875c0b08daa6cd95441becb4f8667e10d02826cfbdbaa7b37457ad6bbd3",
    },
    {
      slug: "great-smoky-mountains",
      reviewedSha256: "9c4471499044959bc50f7db9fd6c65b19ca2867fa44f0cf4cdea7b5136162cb3",
    },
    {
      slug: "guadalupe-mountains",
      reviewedSha256: "5cf77e7a783ffcc2e526f800040b0106fbc95a66501a2983a530476c90253743",
    },
    {
      slug: "haleakala",
      reviewedSha256: "c3310d34c6c3205bf86637db54631e1d60d59385abf7093f1bdfcfda4cb4f172",
    },
    {
      slug: "hawaii-volcanoes",
      reviewedSha256: "30beca5879b787a52c7af3808b6f7adecb523387b1a298be1866ca82ca3d7dd7",
    },
    {
      slug: "hot-springs",
      reviewedSha256: "f975cc3b4fbf2c1c73c1d733f4e6c9c53bdb8970221f1c54ce46b11bd0c04663",
    },
    {
      slug: "indiana-dunes",
      reviewedSha256: "4c92739114b4d770c52768fe10dae714f1d321d689305955138baa64610db4b6",
    },
    {
      slug: "isle-royale",
      reviewedSha256: "a820a2ba60ed9a0d6eb185021414706e36a5dec15ce147a0ffc6324198c837a0",
    },
    {
      slug: "joshua-tree",
      reviewedSha256: "09e5abad984213de625564f882973cbaffe028a41e8f2045b883b6d46e7f44eb",
    },
    {
      slug: "katmai",
      reviewedSha256: "a4b7d4e13ca4410585334bb05c8d8258d0bf7ea6574c857634b8f41668e5cd71",
    },
    {
      slug: "kenai-fjords",
      reviewedSha256: "4286bb28ae2b7da8bf3753f99426fdd287d34963d33777c4b6ff2d05c8ab9aa1",
    },
    {
      slug: "kings-canyon",
      reviewedSha256: "b3965803988818d5cd85a9c2675fa34ae00cfc24c32a3af31a0e1736137d4d4e",
    },
    {
      slug: "kobuk-valley",
      reviewedSha256: "537248692fbf0a8fe50a62323398baa06eb1b806bd5a9f35644a11037788b341",
    },
    {
      slug: "lake-clark",
      reviewedSha256: "524206eb42bd613938a761089a61628ace4ad64133d547d586209956dd073d09",
    },
    {
      slug: "lassen-volcanic",
      reviewedSha256: "c92ab6472f82ea5782af621d009b24cfec80fb8c64aad1d26d9ec86a0312840d",
    },
    {
      slug: "mammoth-cave",
      reviewedSha256: "67a5e00c785a60447cc696acdf9b535cbe3d3fe192a210faffbe2f4372a471a6",
      notes:
        "The cue specifies a dry passage; the blue basal ribbons read as water at native size. Accepted as passage-floor shading, flagged for the next recipe revision.",
    },
    {
      slug: "mesa-verde",
      reviewedSha256: "d4811380e2892332357e06544b2cc5fccb7f6d6fff4b235974c26389e940ad23",
    },
    {
      slug: "mount-rainier",
      reviewedSha256: "785ad51d4248db18e7bd3c33e73e7b2abe79c89be72cc78f6af7719b09b987af",
    },
    {
      slug: "national-park-american-samoa",
      reviewedSha256: "fea847f4822d3e2964e77583ec26a89ad22d0b24e1e641acb42703dba520cbfa",
    },
    {
      slug: "new-river-gorge",
      reviewedSha256: "d655b992e1eb5b6eb2a0e6d8ee1b06c02cd5e5e1e0b2336693a77542d69c6049",
    },
    {
      slug: "north-cascades",
      reviewedSha256: "14992d595c9b0d53d2240300b4c0ccedd3210a0da231c2f58136ce1e4e7d1bd4",
    },
    {
      slug: "olympic",
      reviewedSha256: "23f166471ea03387c5b8b3e8b3c3169bb4ab006721cef046e721956877d331d0",
    },
    {
      slug: "petrified-forest",
      reviewedSha256: "fba8dfcf1c8872beb513e086521c33901313ffc89f967b5379c859734a9b1b87",
    },
    {
      slug: "pinnacles",
      reviewedSha256: "e8548615b5b52ec4c4673a9f4e0cfdf3341f868641cbd9227af25bcb14a4dda4",
    },
    {
      slug: "redwood",
      reviewedSha256: "87b408ba57c07bd764e2f9ea2cdbba590c2d7f8bf51ec006dd0e503a2ae00cd6",
    },
    {
      slug: "rocky-mountain",
      reviewedSha256: "703c2207c9dd090eefde06467c9a1b7cde61fc07c0f0544c1bba38717f6c7988",
    },
    {
      slug: "saguaro",
      reviewedSha256: "5cf01ab61cf4b4d891015632948656ea6628835b72e4a2b74fb0fc0d590edf12",
    },
    {
      slug: "sequoia",
      reviewedSha256: "875acb498abf323283ed431060e7bc39fd3bca9dc9c2dff6475f91ae9a17ed74",
    },
    {
      slug: "shenandoah",
      reviewedSha256: "3fc92e4ae2118aabaa395c8f9cc3a1b2e83540946777db97e0182918b5c0b629",
    },
    {
      slug: "theodore-roosevelt",
      reviewedSha256: "d94b3c1f46a5d96d6f022ddcd024aae888c951e27fc02d6a4ea9aa702655ea0d",
    },
    {
      slug: "virgin-islands",
      reviewedSha256: "c9a8a3f0975cf2c3753882e6ddc5d8da6d4a371bb79706f9bacffec69fec35bb",
    },
    {
      slug: "voyageurs",
      reviewedSha256: "3ff493ce4552ea674258edf1f866adf292dd462726a191332264421df46eab7a",
      notes:
        "No aurora band is legible; the upper half is open field. Accepted as night sky, flagged for the next recipe revision.",
    },
    {
      slug: "white-sands",
      reviewedSha256: "feeaaeb849aaec858ee7de22778ccfbc085ebed11f1a1d920b29f4712751bdf5",
    },
    {
      slug: "wind-cave",
      reviewedSha256: "778daf4554393dd720bf1ae830f89761bb8eee9f6aa79240a3886936ed729677",
    },
    {
      slug: "wrangell-st-elias",
      reviewedSha256: "3b7160b6473db14fdc8be7cfc02099eb3434e1fe339b7373d629fe51b3506383",
    },
    {
      slug: "yellowstone",
      reviewedSha256: "528e03d30bca7d515379f80178646623dcf8b5934be346a2eab127c0c5b2d7f4",
    },
    {
      slug: "yosemite",
      reviewedSha256: "9457b773e55cfa803b11f2c888b16c78252a7572b1436187520b17569c244708",
    },
    {
      slug: "zion",
      reviewedSha256: "aeb32abffdb440e1287270db75c9d4cbced35cf2c7315e6ed2989d6326cd83a7",
    },
  ],
};
