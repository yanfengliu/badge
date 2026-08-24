# AGENTS.md — badge

## What this is

Badge is a desktop-first, local-first web app for one person to plan, create, activate, and revisit meaningful life achievements.

The first version has no accounts, server, social graph, external verification, or public publishing; those are later possibilities, not implicit scope.

The repository contains a first runnable Node 24 + TypeScript + React + Vite vertical slice with separate Archive and Studio applications, strict shared contracts, browser-local persistence, pack compilation and admission, deterministic fixture art, and a React Three Fiber renderer; distinguish this implemented foundation from later roadmap scope.

Read the repo-specific rules in [docs/policies/local-rules.md](docs/policies/local-rules.md). They bind alongside the fleet constitution and win where they are stricter.

`badge` is not yet in `../fleet/scripts/lib/fleet-repos.mjs`; the constitution below is an unmanaged seed copied from the current fleet source. Compare it with `../fleet/FLEET.md` during documentation checks until a separately scoped fleet change onboards this repo.

<!-- FLEET-CANON:BEGIN sha=5364da321722 seeded from ../fleet/FLEET.md on 2026-08-22; badge is not yet managed by sync-canon — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

- Verify visual work visually: capture the rendered result — screenshot, frame, recording — and look at it, because a passing test says nothing about what the pixels do. Work with no visual surface runs headlessly. One framing is not a check: sweep several camera angles and zoom levels, since a defect the chosen view happens to hide is the normal case. Confirming the change you made is only half of it: every task ends with a sweep of the whole rendered result, looking for what is wrong rather than for what you touched. Defects hide in the parts nobody was working on, and the ones a user finds first are almost always there.
- A defect the user reports is recorded and gated, never only fixed: an entry in `docs/learning/defect-register.md` — symptom as they saw it, investigation, root cause, and how it is checked from now on — plus a check that covers the defect's whole class rather than the one instance. Unlike a lesson, the entry stays after it becomes a gate: the register is the standing list of what the gates could not see, which is where the next defect comes from.
- Commit each verified unit of change to `main` without being asked, and push. Gates pass before any commit that touches code; a dependency change re-runs the audit gate.
- A repo chooses its own language and toolchain — Node, Python, and Rust all run here. Each pins its version where its own tooling reads it (`.nvmrc`, `requires-python`, `rust-toolchain.toml`) and names it in Gates, so a version mismatch is not read as a code failure. Node repos baseline at 24; an older major keeps a CI job proving it.
- Runtime model calls are authorized and already paid for — this fleet has one user, with Claude Code and Codex subscriptions — so a program here may call a model at runtime, vision included.
- The top reasoning tier is rationed: spend it only on the hardest problem, or on directing the workhorse tier that does the work — and only at maximum effort or orchestration.
- Two failed attempts at one problem escalate to the hard-problem skill: a search across deliberately different approaches, run to a result rather than to a report. Spending real budget there is authorized — a third pass at the approach that already failed is the expensive mistake. Return the working result, or the strongest proved part with its exact remaining gap.
- High-risk work — persistence/migrations, security/auth, concurrency, money, supply chain, edits that reach sibling repos — escalates to the multi-cli-review skill. That is a review you run yourself, not permission you ask the user for; nothing in this canon requires asking.
- Error messages are a product surface: audit them as a class, including paths the task did not touch. Each names what happened, which input caused it, and what would satisfy it — never a bare `Validation failed`.
- When blocked, hand over the raw artifact — screenshot, rendered page, log line, data row — as soon as the blocker is named rather than after the analysis: your description of it is filtered through the misunderstanding that caused the block, so it cannot contain what you failed to notice.
- Task-run evidence lives only under ignored paths and is deleted once nothing active needs it; it enters Git only when review promotes it into a repository input — a fixture, golden, snapshot, or contract. Tracked docs keep conclusions and provenance only. Blob ceilings for anything promoted: over 256 KiB needs a stated reason, over 512 KiB binary or 1 MiB of anything never enters ordinary Git, and an asset store or LFS needs the user's approval.
- Write prose one line per paragraph (no hard wrapping).
- Keep a devlog: one short dated line per behaviour-changing session in `docs/devlog/summary.md`, newest first, and a section in `docs/devlog/detailed/` for anything a later session could trip over — what was believed and proved false, what a reviewer caught that the author missed, what number moved and from what. It is history, not status. Both shapes are in `../fleet/docs/devlog-template.md`.
- Read `docs/learning/lessons.md` at session start: the one-line index of what this repo has already paid to learn, with each entry's war story and anchor in `lessons-evidence.md`. A lesson lands the session it is learned, anchored to a measurement, commit, or test id; unanchored, it is folklore. When a lesson becomes a gate — a test, a lint rule, a fixed command — delete both halves. Shape: `../fleet/docs/lessons-template.md`.
- Every unit of work gets an independent harsh critic before it is called done — a subagent that did not do the work, given the diff, the claim, and the measurement, and asked to find why the measurement does not support the claim. Hard problems get several with deliberately different lenses. This is not a courtesy pass: every multi-lane review run so far has found a defect the author missed, including three in a cache its author had already gated and mutation-tested.
- Verify the instrument before trusting the measurement, because a critic is a backstop and not the first line. Confirm the flag took effect, the denominator is the population you meant, the control reproduces, and the claim you are relying on is still true rather than remembered. A whole session's conclusions were built on labels chosen with knowledge of the future, agreement quoted over a population that was 99.8% forced no-ops, a `--eval-episodes` flag silently ignored so every checkpoint was picked by a five-sample lottery, and a review lane declared unavailable from a three-week-old memory that was wrong. Each was one command away from being caught.

- Steering compounds: a direction that outlives the immediate task lands that same session — `../fleet/FLEET.md` if fleet-wide, else this repo's `docs/policies/local-rules.md` — and you say where it went.
- Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`; a model a product itself calls is pinned in the repo that calls it. Never hardcode a model ID anywhere else.
<!-- FLEET-CANON:END -->

## Gates

Use Node 24 (`.nvmrc`). Run `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` · `npm run check:boundaries` · `npm run check:docs` · `npm run format:check` · `npm run audit`; visual changes also require the headless browser-flow and multi-angle screenshot sweep described below.

Before commit, stage the exact unit, then run `node scripts/check-staged-secrets.mjs` and `git diff --cached --check`.

## Session start

Read `docs/learning/lessons.md`, `docs/design/vision.md`, `docs/design/product-spec.md`, `docs/design/visual-direction.md`, `docs/design/art-style-catalogue.md`, `docs/architecture/ARCHITECTURE.md`, `docs/design/roadmap.md`, `docs/policies/local-rules.md`, and `docs/devlog/summary.md` before changing product behavior.

## Invariants & boundaries

- Git owns the application, schemas, migrations, curated catalogue source, computed-goal rules, Studio prompt templates, published renderer manifests, optional small pack registry records, tests, and intentionally promoted small assets; it never owns personal achievement state, heavyweight published pack files, or ordinary Studio drafts and media.
- Archive-local state owns local definitions, issued authoring requests, activations, occurrence dates, notes, sayings, privacy choices, installed packs, and Archive backups; Studio-local state separately owns uploads, generated candidates, selected source art, processing derivatives, drafts, and Studio backups. Preserve unreadable or old data rather than silently resetting it.
- Generated art contains no typography; titles, sayings, dates, and metadata are rendered by the UI. Uploaded originals are immutable, and processing is non-destructive.
- Promoted generated catalogue art records accessible descriptions, sanitized generation and rights provenance, recorded exact-prompt association, deterministic normalization, and integrity-bound list derivatives. Hashes prove association rather than generation causation; list views use bounded derivatives and reserve a full source for the selected detail.
- Shape, material, border color, border width, crop, and positioning are structured appearance data edited only in Badge Studio, frozen by publication, and rendered read-only in the archive.
- A badge is a versioned, engine-neutral 3D render recipe, not a flattened image or CSS tilt; Badge Studio and archive detail provide live rotation, zoom, and dynamic-light inspection, while gallery thumbnails may be cached renders.
- Keep camera orbit, zoom, and light position out of durable badge data unless a later decision adds saved showcase poses. Never persist renderer objects, GPU handles, or engine-specific scene graphs.
- Badge art generation, upload processing, candidate selection, and appearance construction exist only in Badge Studio. The archive consumes validated published packs and never calls an art provider or exposes unresolved art; runtime saying proposals remain separate and never overwrite accepted or user-authored text without explicit action.
- Computed achievements derive deterministically from individual activations. Persistence, migration, and restore work is data-loss-sensitive and receives high-risk review.
- Product changes start with contract tests. Files should stay under 500 lines and must stay under 1000 lines.

## Conventions

- Product direction lives in `docs/design/`; structural changes update `docs/architecture/ARCHITECTURE.md` and append to `docs/architecture/drift-log.md`; non-obvious tradeoffs append to `docs/architecture/decisions.md` and are superseded, never erased.
- Devlog history lives in `docs/devlog/summary.md` plus dated files under `docs/devlog/detailed/`; lessons and evidence follow the fleet templates in `docs/learning/`.
- Visual work includes separate evidence for the archive gallery and Badge Studio, Studio upload/reprocess and candidate selection, 3D front/edge/back views, multiple light positions and zoom levels, activation ceremony, GPU fallback, and reduced-motion behavior at more than one desktop-like viewport.
- Keep application modules aligned with the dependency direction documented in `docs/architecture/ARCHITECTURE.md`; domain and application logic remain independent of React, persistence, file APIs, and model providers.
