# Gate proofs

Every lesson this repo retired into a gate, with the mutation that was actually run to make that gate go red.

A gate is only real once it has been made to fail by reintroducing the defect. This file records the product-code edit that reintroduced it, the failure line it produced, and that the gate went green again after the edit was reverted. It stays after the lesson prose is deleted.

## A contact sheet proves collection coverage, not source conformance; inspect every promoted generated source at native resolution against factual cues, explicit exclusions, and all four edges.

- **Gate:** `packages/catalogue-authoring/src/native-source-review.test.ts` :: `promoted national-park sources carry a native-resolution review` (5 cases) — run by `npm test`.
- **Mechanism:** `packages/catalogue-authoring/src/native-source-reviews.ts` records, per promoted source, the sha256 of the exact bytes inspected, the pixel size they were inspected at, and what was checked. The gate binds that register to the live catalogue, so a source cannot be promoted without a native-resolution review of the bytes that actually ship.

### The gate the anchor named does not cover this lesson

The evidence anchor named `us-national-parks.test.ts` as verifying all 63 source and thumbnail hashes and dimensions. Measured, that test is a false green for this lesson.

- **Mutation:** copied `kings-canyon.jpg` over `national-parks/sequoia.jpg` and updated `selected-source-hashes.ts:57` to the new digest — exactly what a regeneration plus `catalogue:refresh-integrity` produces. Sequoia now ships Kings Canyon's artwork.
- **Result:** `us-national-parks.test.ts` — **4 passed / 4, green.** The recorded hash matches the on-disk bytes, the JPEG is 896 × 896, the byte ceiling holds, so every assertion it makes is satisfied by an image of the wrong park.

That is the shape of the whole lesson: hashes and dimensions prove the bytes are the recorded bytes, never that anyone looked at them.

### Mutation 1 — a regenerated source whose review was not redone

- **Mutation:** as above (source file replaced, digest refreshed).
- **Red:** `reviews the exact bytes that ship, so regenerating a source strands its review` →
  `AssertionError: sequoia ships bytes that no native-resolution review covers: reviewed 875acb498abf323283ed431060e7bc39fd3bca9dc9c2dff6475f91ae9a17ed74, promoted b3965803988818d5cd85a9c2675fa34ae00cfc24c32a3af31a0e1736137d4d4e`
  1 failed / 4 passed.
- **Green after revert:** yes — `sequoia.jpg` and `selected-source-hashes.ts` restored byte-for-byte (md5 `23a7275a92a9ea594f541a109c66bc99` and `4252b9276df6dca1fc424c88096fe3d6`), both test files green, 9 tests.

### Mutation 2 — a source promoted with no review at all

- **Mutation:** deleted the `katmai` entry from the register in `native-source-reviews.ts`.
- **Red:** `AssertionError: katmai is promoted with no native-resolution review record — a contact sheet does not count: expected undefined to be defined`, plus `expected [ … ] to have a length of 63 but got 62`. 2 failed / 3 passed.
- **Green after revert:** yes.

### Mutation 3 — a review conducted at aggregate scale

- **Mutation:** changed `reviewedPixels` from `896` to `128`, the list-derivative size — the scale a contact sheet or proof sheet actually shows.
- **Red:** `AssertionError: sources are 896px but the review was recorded at 128px: expected 128 to be 896`. 1 failed / 4 passed.
- **Green after revert:** yes — 5 passed.

### The review this gate records

Seeding the register required doing the thing the lesson demands, so all 63 promoted national-park sources were inspected on 2026-09-02 at native `896 × 896`, one at a time, against each recipe's source cue and `sourceSpecificExclusions` and across all four edges.

Findings: all 63 are full-bleed — the background colour reaches all four edges, with no inset paper, frame, mount, or presentation background anywhere — and all 63 are free of typography, insignia, map labels, souvenir emblems, signatures, repeated microdetail, and baked-in badge construction. Three carry recorded notes rather than rejections: `gateway-arch` renders the stainless catenary as a solid triangle over a subordinate pale arc; `mammoth-cave`'s cue specifies a _dry_ passage while blue basal ribbons read as water; `voyageurs` shows no legible aurora band. None violates an explicit exclusion, so none was rejected, and each note is carried in the register for the next recipe revision.

### What bounds this gate

- It covers the **national-parks catalogue only** — 63 of the repo's 347 promoted sources. `us-states`, `books-read`, `life-milestones`, `michelin-dining` and `video-games` carry no native-resolution review record, and nothing yet stops one of those being promoted unlooked-at. This is a known, stated gap, not an oversight.
- It gates that a native-resolution review of the shipped bytes **happened**, not that the reviewer was right. The judgement itself has no mechanical trigger; that half is staged in `canon-candidates.md`.
- The register is data a person edits. Its defence against rubber-stamping is the digest binding: a review can be granted cheaply once, but it cannot survive the next regeneration without someone looking again.
