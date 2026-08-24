# Lesson Evidence

## Contact sheets hide source-level failures

**Date:** 2026-08-23

**War story:** The first labeled 63-image contact sheet looked broad and cohesive, but an independent native `896 × 896` pass found errors the thumbnails concealed: inset work boundaries, the wrong waterfall geometry, an oak-like crown on General Sherman, geyser-like Hot Springs water, fantasy Mammoth Cave forms, and incorrect Guadalupe Mountains and Katmai silhouettes. Ten park sources were rejected and freshly regenerated from corrected exact prompts before a second independent all-63 native and edge audit passed.

**Anchor:** Final source hashes bind Sequoia `f3743d4319406e094f04d45ec0dfa74f5ebc520721a38c6145e7f19655356f47` and Cuyahoga Valley `4fd518862005fa8386a28e2ea97c16f1c0f62185c889e3f98fcc3b192d419b32`; `us-national-parks.test.ts` verifies all `63` source and thumbnail hashes and dimensions, while the measured behavior delta is ten unique park replacements followed by a clean independent all-source review.
