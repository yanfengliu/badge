# Defect Register

## 2026-08-23 — `npm start` failed when Badge was already using ports 4173 and 4174

**Symptom:** Running `npm start` reported that ports `4173` and `4174` were already in use instead of opening or identifying a usable Archive and Studio.

**Investigation:** `netstat` showed separate Node listeners on both ports, and direct HTTP reads identified their page titles as Badge Archive and Badge Studio. The launcher nevertheless always spawned two new Vite children with hardcoded ports and `--strictPort`; either `EADDRINUSE` failure then stopped the sibling. Cross-application links also hardcoded the same pair, so changing only Vite's fallback behavior would have produced broken navigation and, on every new port, apparently empty origin-scoped IndexedDB stores.

**Root cause:** Startup treated fixed ports as process ownership rather than durable application identity. It had no Badge-specific origin marker, no preflight classification, no remembered pair, no safe first-selection fallback, and no idempotent reuse path.

**Standing gate:** `local-launcher.test.mjs` covers complete and partial Badge reuse, first-selection fallback, unresolved-listener refusal, slow and wrong-role Badge identity, the exact markers shipped by both entry points, every adjacent-start parity, reserved-port skipping and record refusal, refusal to abandon a remembered origin, Badge-versus-foreign-versus-free inspection, same-pair and different-pair concurrent publication, read-during-publication invisibility, interrupted-publication cleanup, malformed-record preservation, and terminal stop-listener cleanup; `local-origins.test.ts` covers preferred, fixture, arbitrary, and maximum adjacent pairs. The browser control forced unrelated listeners onto `4173` and `4174`, launched Archive and Studio at `4180` and `4181`, loaded both applications, followed both companion links, and observed zero console errors. Separate Windows controls launched the exact `npm start` command, reused it from a second launcher, sent one `Ctrl+C`, observed the launcher process exit, and found no listeners left on either remembered port.

## 2026-08-23 — Archive stayed on “Opening your private archive…” for about 24.5 seconds

**Symptom:** A fresh or reloaded Archive showed only “Opening your private archive…” for about 24.5 seconds before the four-badge collection appeared, despite all unit, build, and integrity gates passing.

**Investigation:** A headless Chromium reload measured 24,516 ms to the collection heading. A focused Node benchmark then measured 7,437 ms to fully validate the four generated starter PNGs and 2,222 ms for one image, while exact DEFLATE framing alone took about 68 ms.

**Root cause:** The bounded `fflate` decoder was fed 64 compressed bytes at a time, creating tens of thousands of streaming calls for each 1.6–2.0 MB PNG. The exact-sized output buffer, decoded-length checks, DEFLATE framing, CRC, Adler-32, dimensions, chunk allowlist, and filter checks already supplied the integrity and expansion bounds, so the tiny input slice added overhead without strengthening the boundary.

**Standing gate:** `generate-archive-fixtures.test.mjs` fully validates all four exact starter derivatives within a 4,000 ms Node budget after its sequential determinism and pixel-equivalence checks. The input chunk is now a still-bounded 64 KiB; the gate measures about 518 ms locally, and headless Chromium reaches the collection in about 1,352 ms while the hostile corruption tests remain unchanged.
