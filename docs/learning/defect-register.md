# Defect Register

## 2026-08-23 — Archive stayed on “Opening your private archive…” for about 24.5 seconds

**Symptom:** A fresh or reloaded Archive showed only “Opening your private archive…” for about 24.5 seconds before the four-badge collection appeared, despite all unit, build, and integrity gates passing.

**Investigation:** A headless Chromium reload measured 24,516 ms to the collection heading. A focused Node benchmark then measured 7,437 ms to fully validate the four generated starter PNGs and 2,222 ms for one image, while exact DEFLATE framing alone took about 68 ms.

**Root cause:** The bounded `fflate` decoder was fed 64 compressed bytes at a time, creating tens of thousands of streaming calls for each 1.6–2.0 MB PNG. The exact-sized output buffer, decoded-length checks, DEFLATE framing, CRC, Adler-32, dimensions, chunk allowlist, and filter checks already supplied the integrity and expansion bounds, so the tiny input slice added overhead without strengthening the boundary.

**Standing gate:** `generate-archive-fixtures.test.mjs` fully validates all four exact starter derivatives within a 4,000 ms Node budget after its sequential determinism and pixel-equivalence checks. The input chunk is now a still-bounded 64 KiB; the gate measures about 518 ms locally, and headless Chromium reaches the collection in about 1,352 ms while the hostile corruption tests remain unchanged.
