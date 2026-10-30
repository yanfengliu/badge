# AGENTS.md — badge

## What this is

Badge is a desktop-first, phone-capable, local-first web app for one person to plan, create, activate, and revisit meaningful life achievements.

The first version has no accounts, server, social graph, external verification, or public publishing; those are later possibilities, not implicit scope.

The repository contains a first runnable Node 24 + TypeScript + React + Vite vertical slice with separate Archive and Studio applications, strict shared contracts, browser-local persistence, pack compilation and admission, deterministic fixture art, and a React Three Fiber renderer; distinguish this implemented foundation from later roadmap scope.

Read the repo-specific rules in [docs/policies/local-rules.md](docs/policies/local-rules.md). They add repository constraints consistent with the Fleet Orchestration Policy below.

<!-- FLEET-CANON:BEGIN sha=e54f2a9ae007 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

Reasons and evidence per `[Rn]`: `../fleet/docs/canon-rationale.md`. `../fleet/` is fleet's checkout beside the repo's primary checkout, also from a worktree. The designated coordinator reads `../fleet/docs/skills/coordinator.md` before planning and after each compaction, and any agent reads that file's "Delegate" section before delegating. Before these kinds of work, read the matching section of `../fleet/docs/work-rules.md`: visual and interactive work; games, simulations and research; measuring, debugging and slow steps; writing error messages; toolchains, dependencies and model calls; standing loops and unattended runs; pushing executable changes; a user-reported defect; editing skills, agent instructions or rules; run output and files over 256 KiB; handing off or stopping mid-task.

### Fleet Orchestration Policy

Deliver the requested outcome with verified correctness, coherent architecture and minimal necessary complexity. Optimize useful progress, not agent count, code volume or maximum reasoning. Adapt rigor to risk. This policy grants no new permissions or capabilities. [R1]

**Roles.** Only an explicitly designated agent coordinates; each scope has one accountable integration owner. [R2]

Workers own bounded outcomes and local implementation decisions. [R3]

Inspect instructions, code, docs, tree state and active tasks; set outcome, non-goals, acceptance criteria, dependencies and verification; settle ambiguity with evidence and reversible defaults. [R4]

**Session size** (owner directives, 2026-09-23 and 2026-10-22). Sessions run long: take new requests as separate assignments in the same session, and never hand off to a successor session to shed context; auto-compaction carries the session. Split tasks expected to exceed about 200k context tokens into milestones within that budget, each committed and merged to main once green. Milestones are task boundaries; a compaction never justifies wrapping up or handing off. [R6]

**Coordinate safely.** Beyond a trivial read, each session or agent defaults to its own worktree; serialize overlapping writes only when none is available, and say why. Finish each bounded increment in its session: merge to main, push, then `git worktree remove`, remove completed task-owned branches and unneeded temporary files, and explicitly transfer the ownership and location of still-needed resources. Report any merged worktree left and its location as a defect. Never overwrite or discard another participant's work. On resumption, first inspect surviving worktrees, artifacts and task status, assuming nothing survived until checked; recover what exists and preserve unfinished work. [R7]

Workers act autonomously in scope; escalate cross-task interfaces, persistent formats, security boundaries, major dependencies and scope changes to the coordinator for resolution within the approved mandate. Unapproved major architecture or product changes and consequential external actions need human authorization. Fleet rules (FLEET.md, the fleet's skills and runbooks, canon candidates, and agent memory) change only when the owner asks (owner directive, 2026-10-28). Agents propose changes instead of making them. The one exception: they may add a proposal to `../fleet/canon-candidates.md`, with the lesson, its evidence and the rule it would change (owner directive, 2026-10-29). They never change, promote or delete an entry: the owner decides each one, and the session the owner asks makes the change. Never reset consumed allowances. [R8]

**Implement and verify.** Inspect, implement a coherent increment, check, diagnose, fix, recheck. Preserve architecture; no unrelated rewrites, speculative abstractions or unnecessary dependencies. Implement when requested. Use task-appropriate evidence and baselines; prototype uncertain ideas before generalizing. Never weaken tests or conceal failures to claim success. Docs-only work uses content and version checks; skip runtime tests and CI waits. [R9]

During authorized work and within scope and budget, proactively improve products and the task's orchestration, learn from recorded outcomes and propose improvements to fleet rules. Read `../fleet/docs/skills/self-improvement/SKILL.md` when proposing a fleet-rule change or turning a mistake into a gate (owner directive, 2026-10-29). [R33]

Obtain independent, preferably read-only review for substantial or high-risk changes when available. Review the exact revision against acceptance criteria. Report unavailable review; fix justified findings, rerun affected checks, and obtain focused re-review when fixes invalidate earlier review. [R10]

**Integrate, report, and stop.** Reassess after two failures for one reason. Unless another budget is set or the user authorizes more, cap automatic repair at five substantive attempts, then report; explicit overrides hold for their stated scope without asking again. Keep updates brief and decision-relevant. Stop when acceptance criteria and material findings are resolved; invent no follow-up work. [R11]

**Final acceptance gate.** The integration owner integrates in dependency order and on the final integrated revision's actual changes and evidence, not worker summaries, checks every acceptance criterion, runs relevant automated checks and exercises affected end-to-end behavior and cross-task interactions. Substantial or high-risk work gets independent read-only review of the integrated changes, integration fixes included. Confirm the merge to main; report that revision, review status and every failed, skipped or unavailable check and unmet criterion. Nothing is fully verified with an open material finding or required check. [R12]

### Fleet conventions

- Repository rules add local constraints consistent with this policy; they cannot override its permissions, adaptive workflow or stopping limits. [R13]
- Gates pass before any commit touching code, a merge included: merge on a detached HEAD or its own branch and move main to it once its gate passes. The user's standing grant covers committing, merging to main and pushing in their repos; force-pushing, rewriting history, deploying and publishing still need authorization. Work is done only once merged to main, regardless of green branch or worktree gates; report unmerged work's location. [R14]
- For substantial or high-risk changes, use independent review when available. High-risk includes persistence and migrations, security and auth, concurrency, money, supply chain, and executable changes in sibling repos; `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics. [R10]
- Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`; every model a product calls is pinned in its calling repo. No model IDs are hardcoded elsewhere. [R29]
- Read `docs/learning/lessons.md` at session start. Record the session's lessons there; each names its retiring gate and is deleted in the commit landing it. A gate counts only after going red with the defect reintroduced, following `../fleet/docs/lessons-template.md`. [R18]
- Gates prove nothing beyond their bounds: name the bound in the header and pin every reproducing input. Distinguish passed from did-not-run; a check built from its checked symbol proves only self-agreement. [R19]
- Verify outcomes beyond exit status, red or green, and return values: read the artifact that should have changed. Retest inherited blockers before repeating them. [R20]
- Keep plans and every authored review round in permanent `docs/work/<id>_<theme>/` folders (`../fleet/docs/work-docs.md`). Record history, not status: a dated devlog line per behaviour-changing session in `docs/devlog/summary.md` (`../fleet/docs/devlog-template.md`). [R24]
- Use common words with the same meaning in chat, docs, commits, PRs, comments and errors. One idea per sentence unless a rule needs more. Cut length, not facts: keep exact terms, numbers and evidence. Quotes and pastes are exempt; do not copy this canon's style. One line per paragraph, no hard wrapping. [R25]
- When blocked, immediately hand over the redacted artifact with the named blocker, before analysis; continue safe independent work. [R27]
- The owner's directions that outlive a task land that session in `../fleet/FLEET.md` if fleet-wide, otherwise the repo's `docs/policies/local-rules.md`; report where. [R31]
- When a hard problem blocks progress, run the search in `../fleet/docs/skills/hard-problem.md`. [R32]
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
- Visual work includes separate evidence for the archive gallery and Badge Studio, Studio upload/reprocess and candidate selection, 3D front/edge/back views, multiple light positions and zoom levels, activation ceremony, GPU fallback, reduced-motion behavior, wide and compact desktop, phone portrait down to `320px`, and short landscape.
- Keep application modules aligned with the dependency direction documented in `docs/architecture/ARCHITECTURE.md`; domain and application logic remain independent of React, persistence, file APIs, and model providers.
