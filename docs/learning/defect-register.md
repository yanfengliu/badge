# Defect Register

## 2026-08-23 — The startup gate printed success and then kept running

**Symptom:** `npm run check:local-startup` printed that the task-owned Archive and Studio listener passed, released port `4180`, and then remained alive instead of returning to the verification chain.

**Investigation:** Instrumenting the exact finalizer proved that both launcher handles closed while native `FSWatcher` handles remained. Instrumenting `server.watcher.add` then captured Vite adding `apps/studio-web/src/main.tsx` after `server.close()`, through `ensureWatchedFile` and `loadAndTransform`; the watcher changed from closed back to open and retained two native handles. Vite's HTML transform starts that direct-import warmup without awaiting it, while its server shutdown closes the watcher and client environment concurrently. Disabling Vite's supported speculative direct-import pre-transform option removed the traced producer. After making the success marker wait for every cleanup result, the fixed serial benchmark completed three exact npm runs in 2,972 ms, 2,727 ms, and 2,970 ms, each with exit code zero, closed port `4180`, and no verification state. The measurement also exposed that `fs.rm` without recursive mode cannot remove an empty directory, so the verification finalizer now uses non-recursive `rmdir` for its shared parent and will not delete another concurrent run.

**Root cause:** Vite returned transformed HTML before its speculative direct-import warmup completed, then closed its watcher concurrently with the environment that was draining that transform. The late transform called Chokidar `add()` after the first close; Chokidar reopened the watcher, but Vite did not close it a second time. A package-import change altered timing and produced a false early diagnosis, while the port-only success marker could not see either retained process handles or leftover verification state.

**Standing gate:** The host contract keeps Vite's speculative direct-import pre-transforms disabled for the shared development host; on-demand transforms and HMR remain enabled. The exact `npm run check:local-startup` process emits its success marker only after the listener and isolated state are released. The one-off three-run serial benchmark remains validation evidence rather than a repository gate.

## 2026-08-23 — An expired Claude token looked like an unexplained generation failure

**Symptom:** After the first explicit `Generate with Claude` approval, the Archive reported only that Claude Code could not complete the request even though `claude auth status` said the local installation was logged in.

**Investigation:** The exact bounded CLI invocation returned exit code `1` with a valid JSON result envelope whose `is_error` flag was true and whose `api_error_status` was `401`; its provider detail said that the OAuth access token had expired. The generator discarded every nonzero result envelope before classifying it, so the middleware could not distinguish this remediable authentication state from an arbitrary provider failure.

**Root cause:** Login-state inspection was treated as proof that a model request could authenticate, and the bounded adapter preserved the provider's failure bytes but never interpreted the one status needed for a safe user action.

**Standing gate:** Generator contracts recognize only a structurally valid failed Claude envelope with numeric API status `401` as expired authentication, never expose its free-form result text, and leave malformed or non-`401` failures generic; middleware contracts map the classified case to a stable `503` instruction to run `claude auth login` and then retry, while preserving proposal and accepted-saying state.

## 2026-08-23 — Startup offered recovery for an installation that never existed

**Symptom:** The launcher and documentation presented a separate pair-recovery mode even though Badge had only just been built and no user installation had ever used that topology.

**Investigation:** The only `.badge-local/ports.json` record came from automated verification in the immediately preceding development session. It contained addresses only, was never a released product contract, and did not prove that Archive or Studio user data existed at either origin.

**Root cause:** Origin-continuity caution was applied without first establishing whether there was real user state to migrate. A task-created artifact was promoted into compatibility scope, which added a command, locking protocol, cross-origin navigation branch, tests, and documentation for a fictional installed population.

**Standing gate:** Runtime-target contracts expose exactly one canonical startup record, `.badge-local/site.json`; a neighboring `ports.json` cannot change startup; package contracts expose only unified local-site start, development, and preview surfaces; a hard-coded current one-site record remains readable; same-origin navigation has no injected companion-origin path; port `4174` is eligible as an ordinary port; and owned shutdown bounds Vite's active-request drain while still attempting listener close after rejection or timeout. D-034 records that compatibility work requires evidence of a released format or real user data rather than development artifacts alone.

## 2026-08-23 — Verification left a remembered port that blocked the user's first real start

**Symptom:** Running `npm start` reported, “Badge remembers Archive at `http://127.0.0.1:4173`, but that port is occupied by another process,” instead of selecting an unused port for the user's first real launch.

**Investigation:** `.badge-local/ports.json` recorded Archive at `4173` and Studio at `4174`; port `4173` served an unrelated AoE2 prototype and `4174` was free. The record had been created by the preceding launcher verification and intentionally retained even though it was ignored task output, so the launcher's correct remembered-origin protection treated verification state as the user's durable choice. The incident also clarified the owner's intended topology: one local website with Archive at `/` and Studio at `/studio/`, not separate websites on adjacent ports.

**Root cause:** Lifecycle and browser verification exercised the production launcher against the canonical machine-local state path, then cleanup confused an ignored task-created address record with user-owned runtime state. The launcher API did not make disposable verification state structurally distinct from canonical interactive state, and the two-listener topology multiplied the state that could leak.

**Standing gate:** Launcher lifecycle and browser verification accept only branded state targets confined to ignored `tmp/local-startup/` paths and never use a generic command-line or environment override for the canonical `.badge-local/site.json`. Contract controls cover absent and byte-exact sentinel canonical records on success and injected failure, while a source-boundary check proves executable verification can call only the verification-target factory and never references `.badge-local`. One-site launcher and route tests cover first-use foreign-port fallback, remembered-port reuse and refusal, Archive-only identity at `/`, Studio-only identity and document deep links under `/studio/`, ambiguous-marker refusal, `/studio` canonicalization, same-origin navigation, second-launch reuse, isolated listener cleanup, surfaced cleanup failure, terminal stop-listener disposal, and the sole-record rule. A headless browser control follows Archive `/` to Studio `/studio/` and back on one fallback origin with no console errors; no gate requires a legitimate canonical record to be absent.

## 2026-08-23 — `npm start` failed when Badge was already using ports 4173 and 4174

**Symptom:** Running `npm start` reported that ports `4173` and `4174` were already in use instead of opening or identifying a usable Archive and Studio.

**Investigation:** `netstat` showed separate Node listeners on both ports, and direct HTTP reads identified their page titles as Badge Archive and Badge Studio. The launcher nevertheless always spawned two new Vite children with hardcoded ports and `--strictPort`; either `EADDRINUSE` failure then stopped the sibling. Cross-application links also hardcoded the same pair, so changing only Vite's fallback behavior would have produced broken navigation and, on every new port, apparently empty origin-scoped IndexedDB stores.

**Root cause:** Startup treated fixed ports as process ownership rather than durable application identity. It had no Badge-specific origin marker, no preflight classification, no remembered pair, no safe first-selection fallback, and no idempotent reuse path.

**Standing gate:** `local-launcher.test.mjs` covers complete-site reuse, first-selection fallback, unresolved and incomplete-listener refusal, slow Badge identity, exact route markers, reserved-port skipping, refusal to abandon a remembered origin, one-record concurrent publication, read-during-publication invisibility, interrupted-publication cleanup, malformed-record preservation, and terminal stop-listener cleanup; `local-origins.test.ts` covers same-origin navigation without a companion-port assumption. The browser control forces an unrelated listener onto `4173`, launches the complete site on one fallback port, loads both applications, follows both links, and observes zero console errors. Separate Windows controls launch the exact `npm start` command, reuse it from a second launcher, send one `Ctrl+C`, observe the launcher process exit, and find the one remembered listener released.

## 2026-08-23 — Archive stayed on “Opening your private archive…” for about 24.5 seconds

**Symptom:** A fresh or reloaded Archive showed only “Opening your private archive…” for about 24.5 seconds before the four-badge collection appeared, despite all unit, build, and integrity gates passing.

**Investigation:** A headless Chromium reload measured 24,516 ms to the collection heading. A focused Node benchmark then measured 7,437 ms to fully validate the four generated starter PNGs and 2,222 ms for one image, while exact DEFLATE framing alone took about 68 ms.

**Root cause:** The bounded `fflate` decoder was fed 64 compressed bytes at a time, creating tens of thousands of streaming calls for each 1.6–2.0 MB PNG. The exact-sized output buffer, decoded-length checks, DEFLATE framing, CRC, Adler-32, dimensions, chunk allowlist, and filter checks already supplied the integrity and expansion bounds, so the tiny input slice added overhead without strengthening the boundary.

**Standing gate:** `generate-archive-fixtures.test.mjs` fully validates all four exact starter derivatives within a 4,000 ms Node budget after its sequential determinism and pixel-equivalence checks. The input chunk is now a still-bounded 64 KiB; the gate measures about 518 ms locally, and headless Chromium reaches the collection in about 1,352 ms while the hostile corruption tests remain unchanged.
