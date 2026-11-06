# AGENTS.md — badge

## What this is

Badge is a desktop-first, phone-capable, local-first web app for one person to plan, create, activate, and revisit meaningful life achievements.

The first version has no accounts, server, social graph, external verification, or public publishing; those are later possibilities, not implicit scope.

The repository contains a first runnable Node 24 + TypeScript + React + Vite vertical slice with separate Archive and Studio applications, strict shared contracts, browser-local persistence, pack compilation and admission, deterministic fixture art, and a React Three Fiber renderer; distinguish this implemented foundation from later roadmap scope.

Read the repo-specific rules in [docs/policies/local-rules.md](docs/policies/local-rules.md). They add repository constraints consistent with the fleet constitution below.

<!-- FLEET-CANON:BEGIN sha=926530db9933 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

Shared rules for every repo under `github/`, kept in `../fleet/FLEET.md`; `../fleet/` is fleet's checkout beside this repo's primary checkout. Where a rule gives its reason, use the reason to judge cases the rule does not name; each `[Rn]`'s history is in `../fleet/docs/canon-rationale.md`. This repo's `docs/policies/local-rules.md` may add rules but cannot change these permissions or limits. [R13]

The designated coordinator reads `../fleet/docs/skills/coordinator.md` before planning and after each compaction, and any agent reads that file's "Delegate" section before delegating. Before these kinds of work, read the matching section of `../fleet/docs/work-rules.md`: standing loops and unattended runs; editing skills, agent instructions or rules; handing off or stopping mid-task.

### Permissions

- Commit, merge to main and push without asking. Force-pushing and rewriting history (they destroy history), and deploying and publishing (they reach other people), need the owner's OK. [R14]
- Ask before a major architecture or product change, a new major dependency, a change to a persistent format or a security boundary, or any other consequential action outside this machine, such as posting or sending something. [R8]
- Change fleet rules (FLEET.md, fleet skills and runbooks, agent memory) or add a rule to a repo's `docs/policies/local-rules.md` only when the owner asks, because the owner sets policy. You may add a proposal with its evidence to `../fleet/canon-candidates.md`, but not edit its entries. [R8]

### Sharing the machine

- Other Claude and Codex sessions may be working in this checkout, and you cannot see them. Do anything beyond a quick read in your own worktree, because two sessions in one tree spoil each other's gates and commits. Never revert, overwrite or delete changes you did not make. When resuming, check which worktrees, branches and files already exist. [R7]
- Done means merged to main and pushed: the owner archives sessions, and work left on a branch is lost. Merge on your branch, get the gates passing there, then move main, because other worktrees build on local main. Judge the merged result itself, not a worker's summary. Then remove your worktree and branch, and report where any unmerged work is. [R14]

### Doing the work

- The repo's gates must pass before any commit that touches code. Docs-only changes need content checks and any gate the repo names for docs, not runtime tests or CI waits. [R14]
- Check the thing that should have changed (the file, the page, the number), not just the exit code or a tool's report: both can pass over a defect. Retest a blocker you inherit before repeating it. Never weaken a test or hide a failure to get green. [R9]
- Look at visual and interactive work rendered at full resolution, through the real controls, from fixed and random views, because passing tests say nothing about pixels. Run it headless unless a visible window is needed. [R16]
- Slowness on the critical path, such as a gate rendering on the CPU of a machine with a GPU, is a defect to fix. [R22]
- After pushing code, follow CI to the end; read a failed job's steps before blaming the code, since a billing limit fails jobs before any step runs. [R15]
- If a fix fails twice for one reason, rethink it. After five real repair attempts at one problem, whatever the approach and counting earlier sessions, stop and report, unless the owner set another limit; for a problem that keeps winning, run the search in `../fleet/docs/skills/hard-problem.md`. Stop when the task's criteria are met; do not invent follow-up work. [R11]
- For substantial or high-risk changes, use independent review when available. High-risk includes persistence and migrations, security and auth, concurrency, money, supply chain, and code changes in another repo. Review the exact revision against the task's criteria, and say so when review was unavailable. Fix the findings that matter and have those fixes checked; note minor ones instead of starting another round. `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics. [R10]
- A defect the owner reports gets a test for its whole class and an entry in `docs/learning/defect-register.md`, because a fix without a check tends to come back. [R17]
- Sessions run long: take new requests in the same session, and never hand off to a new session to shed context. Split work expected to need more than about 200k tokens of context into milestones, each merged to main. [R6]

### Records, sized to the work

- Read `docs/learning/lessons.md` at session start; it lists this repo's known traps, and its header says how to add one. [R18]
- Every change that alters behaviour adds a dated line to `docs/devlog/summary.md` (`../fleet/docs/devlog-template.md`) when it lands, because later sessions orient from its newest entries. Work that spans sessions, has several agents writing, or gets an independent review also keeps its plan and review records in `docs/work/` (`../fleet/docs/work-docs.md`); other work needs none. [R24]
- Raw output (logs, captures, screenshots) stays in ignored folders. Never commit a binary over 512 KiB or any file over 1 MiB; LFS needs the owner's OK. [R23]

### Style and environment

- Plain words; one line per paragraph, no hard wrapping. A report says what changed, how it was checked (including any check skipped or failed) and what is not done. [R25]
- Node 24 is the baseline. Products pin the model IDs they call in their own repo, and nowhere else. Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`. Runtime model calls are allowed and paid for; make per-item calls one-shot, not agent sessions. [R28, R29]
<!-- FLEET-CANON:END -->

## Gates

Use Node 24 (`.nvmrc`). Run `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` · `npm run check:boundaries` · `npm run check:docs` · `npm run format:check` · `npm run audit`; visual changes also require the headless browser-flow and multi-angle screenshot sweep described below.

Before commit, stage the exact unit, then run `node scripts/check-staged-secrets.mjs` and `git diff --cached --check`.

## Session start

Read `docs/policies/local-rules.md` and the section maps at the top of `docs/design/product-spec.md` and `docs/architecture/ARCHITECTURE.md` before changing product behavior, then only the sections the work needs.

Read the rest when the work reaches it, each long one from the section map at its top: `docs/design/vision.md` before changing what the product is for or its scope, `docs/design/visual-direction.md` for any visual change, `docs/design/art-style-catalogue.md` for catalogue art, `docs/design/roadmap.md` for phase order and exit criteria, and the newest entries at the top of `docs/devlog/summary.md` for recent history. `docs/README.md` names the doc that owns each kind of decision.

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
- Visual work includes separate evidence for the archive gallery and Badge Studio, Studio upload/reprocess and candidate selection, 3D front/edge/back views, multiple light positions and zoom levels, activation ceremony, GPU fallback, reduced-motion behavior, wide and compact desktop, phone portrait down to `320px`, and short landscape.
- Keep application modules aligned with the dependency direction documented in `docs/architecture/ARCHITECTURE.md`; domain and application logic remain independent of React, persistence, file APIs, and model providers.
