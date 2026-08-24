# Selected national-park source studies

This directory contains one deliberately selected source-art study for each of the 63 entries in the U.S. National Park Service `National Parks (63)` edition dated 2026-07-01.

Every study was generated during the 2026-08-23 local authoring session from its recorded exact `badge-source-art@1` prompt compiled by `packages/catalogue-authoring`; the executable manifests record 2026-08-24 UTC as the campaign date. Prompt and asset digests freeze the recorded association but do not independently prove historical model-call causation.

Every study was inspected individually at native `896 × 896` resolution, on all four edges, and again in a complete contact sheet. That review rejected and replaced ten parks whose first selected bytes hid an incorrect landmark, botanical or geological fact, implausible architecture, or inset work boundary: Big Bend, Cuyahoga Valley, Guadalupe Mountains, Hawai‘i Volcanoes, Hot Springs, Katmai, Mammoth Cave, Pinnacles, Sequoia, and Wind Cave.

The studies are 896 by 896 JPEG files, each no larger than 256 KiB, because they are intentionally promoted compact catalogue inputs rather than ordinary heavyweight Studio drafts.

They are flat, text-free, full-bleed pictures; they do not own badge shape, material, edge, relief, crop, camera, or lighting, which remain structured renderer data.

These files are selected Studio source studies, not proof that an Archive pack has been published or installed.

Run `npm run catalogue:prompts -- yosemite` to print an exact selected prompt, `scripts/prepare-national-park-studies.ps1` to normalize newly generated PNG sources, `npm run catalogue:thumbnails` to derive the bounded `128 × 128` list art, `npm run catalogue:refresh-integrity` to deterministically regenerate those derivatives from the current sources before refreshing the source, thumbnail, and prompt digests, and `scripts/render-national-park-contact-sheet.ps1` to create ignored whole-collection visual evidence.

The source, thumbnail, and recorded exact-prompt SHA-256 bindings live in `packages/catalogue-authoring/src/selected-source-hashes.ts` and are enforced by contract tests.
