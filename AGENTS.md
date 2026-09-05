# AGENTS.md — badge

## What this is

Badge is a desktop-first, phone-capable, local-first web app for one person to plan, create, activate, and revisit meaningful life achievements.

The first version has no accounts, server, social graph, external verification, or public publishing; those are later possibilities, not implicit scope.

The repository contains a first runnable Node 24 + TypeScript + React + Vite vertical slice with separate Archive and Studio applications, strict shared contracts, browser-local persistence, pack compilation and admission, deterministic fixture art, and a React Three Fiber renderer; distinguish this implemented foundation from later roadmap scope.

Read the repo-specific rules in [docs/policies/local-rules.md](docs/policies/local-rules.md). They add repository constraints consistent with the Fleet Orchestration Policy below.

<!-- FLEET-CANON:BEGIN sha=e2cb4ac06499 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

### Fleet Orchestration Policy

Deliver the requested outcome with verified correctness, coherent architecture, and minimal necessary complexity. Optimize for useful progress—not agent count, code volume, or maximum reasoning. Adapt rigor to risk. This policy grants no additional permissions or capabilities.

#### Roles

Only an explicitly designated agent acts as coordinator. Use one accountable integration owner per scope. The coordinator owns planning, dependencies, shared interfaces, architectural consistency, integration, and acceptance. It may implement small changes directly.

Workers own bounded outcomes and local implementation decisions. They may use subagents within their scope and budget, but remain accountable. Organize threads around deliverables, not permanent departments. Avoid recursive manager hierarchies.

#### Plan and delegate

Inspect applicable instructions, relevant code/docs, working-tree state, and active tasks before changing anything. Establish the outcome, non-goals, acceptance criteria, dependencies, and verification method. Resolve routine ambiguity through evidence and reversible defaults.

Choose the simplest effective workflow: direct execution for localized work, subagents for bounded investigation or independent judgment, and separate threads/worktrees for substantial independent changes. Agree on shared contracts before parallel implementation. Avoid duplicate or blocked work.

Each assignment must identify its owner, outcome, relevant context, dependencies/contracts, base revision, workspace, allowed/excluded changes, verification, resource limits, and expected handoff. Specify read-only versus implementation work. Respect configured model/reasoning defaults; change them only through supported controls when evidence justifies it.

#### Coordinate safely

Use only capabilities actually available. Never assume visibility into other chats, shared memory, automatic messaging, workspace isolation, or persistent monitoring. Distinguish prepared assignments from dispatched work and observed status from assumptions. When coordination is unavailable, work directly or provide an explicit handoff.

Isolate concurrent edits with worktrees or equivalent mechanisms; otherwise serialize overlapping writes. Account for shared services, databases, ports, and compute limits. Never overwrite or discard another participant's work. Track delegated work through completion, cancellation, or handoff, and release only resources you own without losing work.

#### Preserve state and decision boundaries

Keep essential memory in the repository or existing tracker, not conversation history. Reuse conventions and maintain only useful documentation. Record owners, dependencies, revisions, status, blockers, and consequential decisions. The coordinator owns canonical status; workers supply scoped updates. Explicitly propagate changed contracts and revalidate stale information.

Distinguish intended requirements from actual behavior. Preserve evidence, unresolved issues, and next steps at handoff or interruption. Exclude secrets and unnecessary private data.

Workers act autonomously within scope. Escalate cross-task interfaces, persistent formats, security boundaries, major dependencies, and scope changes. The coordinator resolves these within the approved mandate. Unapproved major architecture/product changes and consequential external actions require human authorization. Continue safe independent work while blocked.

#### Implement and verify

Inspect, implement a coherent increment, run relevant checks, diagnose, fix, and recheck. Preserve established architecture; avoid unrelated rewrites, speculative abstractions, and unnecessary dependencies. Proceed beyond planning when implementation is requested.

Use task-appropriate evidence and establish baselines when needed. Inspect actual user flows for interactive products. For games/simulations, check relevant invariants, save compatibility, and realistic-scale performance. Prototype uncertain ideas before generalizing. For research, cite evidence and distinguish hypotheses, measurements, and conclusions.

Obtain independent, preferably read-only review for substantial or high-risk changes when available. Review the exact revision against acceptance criteria. Evaluate findings, fix justified issues, and rerun affected checks. Never weaken tests or conceal failures to claim success.

#### Integrate, report, and stop

Workers hand off outcomes, changes/revisions, checks and results, risks, blockers, and integration requirements. The integration owner inspects actual changes, integrates in dependency order, and verifies the combined result. Worker success alone does not establish integration success. Respect merge, push, deployment, and publication permissions.

After two failures for the same reason, reassess rather than repeat. Unless another budget is specified, cap automatic repair at five substantive attempts, then report evidence, blockers, and next steps.

Keep updates brief and decision-relevant. Clearly distinguish implemented, verified, reviewed, integrated, and blocked work. Stop when acceptance criteria and material findings are resolved; do not invent follow-up work. Report partial completion and unavailable verification honestly.

### Fleet conventions

- Repository rules add concrete local constraints consistent with the Fleet Orchestration Policy; they do not override its permissions, adaptive workflow, or stopping limits.
- Verify visual work visually: capture the rendered result — screenshot, frame, recording — and look at it, because a passing test says nothing about what the pixels do. Work with no visual surface runs headlessly. For 3D work, one framing is not a check: sweep several camera angles and zoom levels, since a defect the chosen view happens to hide is the normal case. For 2D interfaces and artwork, inspect relevant viewport sizes, scales, and states. For games and other interactive visual deliverables, exercise real controls and representative user flows, and inspect how the rendered result responds over time. For static scenes and assets, inspect applicable viewpoints, using orbit, pan, or zoom in a viewer when available and useful. Use headless interaction and rendering when they provide adequate evidence; use a visible session only when necessary to verify behavior. An aggregate view — a contact sheet, grid, montage, or proof sheet — answers "is there one of each" and never "is each one right", and answers the first just as confidently when the second answer is no: inspect each item at the artifact's own native resolution, and bind the review to the digest of the bytes inspected, so regenerating the artifact strands its review instead of inheriting it. Badge's 63-source contact sheet read as cohesive while ten sources were wrong, and the lesson recurred four days after it was written down, against 48px proof sheets. For visual tasks, inspect the affected user flows and the surrounding rendered result for material regressions; choose the coverage from the change's risk and acceptance criteria.
- A defect the user reports is recorded and gated, never only fixed: an entry in `docs/learning/defect-register.md` — symptom as they saw it, investigation, root cause, and how it is checked from now on — plus a check that covers the defect's whole class rather than the one instance. Unlike a lesson, the entry stays after it becomes a gate: the register is the standing list of what the gates could not see, which is where the next defect comes from.
- Gates pass before any commit that touches code; a dependency change re-runs the audit gate. Commit, merge, push, deploy, and publish only within the user's authorization.
- For an authorized push, inspect the remote gate through completion when available. Read job steps and runner assignment before treating a failed run as a code failure: exhausted Actions allowance can fail before any job starts. Report unavailable remote verification and use the local gate as evidence within its bounds. Resolve failures that block the requested outcome within the repair budget; report unrelated failures without silently expanding scope.
- A repo chooses its own language and toolchain — Node, Python, and Rust all run here. Each pins its version where its own tooling reads it (`.nvmrc`, `requires-python`, `rust-toolchain.toml`) and names it in Gates, so a version mismatch is not read as a code failure. Node repos baseline at 24; an older major keeps a CI job proving it.
- Runtime model calls are authorized and already paid for — this fleet has one user, with Claude Code and Codex subscriptions — so a program here may call a model at runtime, vision included.
- Use `../fleet/docs/skills/hard-problem.md` to search across different approaches after repeated failure, within the orchestration policy's attempt and resource limits.
- For substantial or high-risk changes, use independent review when available. High-risk areas include persistence/migrations, security/auth, concurrency, money, supply chain, and edits that reach sibling repos; `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics.
- Error messages are a product surface: check the affected class and relevant adjacent paths. Each names what happened, which input caused it, and what would satisfy it — never a bare `Validation failed`.
- When blocked, hand over the relevant artifact — screenshot, rendered page, log line, data row — with secrets and unnecessary private data removed, as soon as the blocker is named rather than after the analysis: your description of it is filtered through the misunderstanding that caused the block, so it cannot contain what you failed to notice.
- Task-run evidence lives only under ignored paths and is deleted once no active task, unresolved issue, or handoff needs it; it enters Git only when review promotes it into a repository input — a fixture, golden, snapshot, or contract. Tracked docs keep conclusions and provenance only. Blob ceilings for anything promoted: over 256 KiB needs a stated reason, over 512 KiB binary or 1 MiB of anything never enters ordinary Git, and an asset store or LFS needs the user's approval.
- Use the common word where it says the same thing as the rare one. This covers chat, docs, commit subjects and PR titles, comments, and error messages. One idea per sentence, unless another rule asks one line to carry more. Cut length, not facts: keep exact terms, numbers, and the evidence a claim rests on. It applies to sentences you write, not to text you quote or paste. Do not copy this canon's style.
- Write prose one line per paragraph (no hard wrapping).
- Keep a devlog: one short dated line per behaviour-changing session in `docs/devlog/summary.md`, newest first, and a section in `docs/devlog/detailed/` for anything a later session could trip over — what was believed and proved false, what a reviewer caught that the author missed, what number moved and from what. It is history, not status. Both shapes are in `../fleet/docs/devlog-template.md`.
- A lesson is prose only until it is a gate. It lands the session it is learned in `docs/learning/lessons.md` — read at session start — anchored to a measurement, commit, or test id, and naming the gate that will retire it: a test, a lint rule, a schema check, a fixed command. That file is a queue: an entry is deleted in the commit landing its gate, and a gate counts only once it has been made to go red by reintroducing the defect. Deleting the prose is safe only because the deletion is recoverable, so the gate carries the claim in its own header and `docs/learning/gate-proofs.md` carries the mutation, the failure it produced, and the pre-retirement commit that `git show <sha>:docs/learning/lessons-evidence.md` reads the whole evidence file back out of. A gate and the claim in its header can be wrong together and look exactly like a gate that is right, and auditing one means reaching what was believed, measured and abandoned at the time — never the sentence the gate carries about itself. An entry that can name no gate is not a lesson — fleet-wide knowledge is staged in `canon-candidates.md` for this constitution, repo-only knowledge goes to `docs/policies/local-rules.md`, and the rest is folklore and is dropped. An index that only grows is a list of things that failed to graduate: aoe2's reached 84 entries, none naming a gate. An index already holding ungated entries is emptied entry by entry as each one's area is next touched, not kept as a standing exception. Shape: `../fleet/docs/lessons-template.md`.
- A green gate proves less than it looks like. Every gate is bounded by something — a seed set, a tick window, a resolution, a fixture that ends early, an include list, a shared flag any one case can satisfy — and proves nothing past that bound, so name the bound in the gate's own header and pin every input that reproduces the defect, not just the one you thought of. Past its bound a gate does not merely miss the defect — it can measure a different phenomenon entirely and report it just as confidently: aoe2's stone-mining window opened at tick 11,000 on a fixture that resolves by conquest at 11,442, so it was reading a decided match, and a finished match and a deadlocked one are pixel-identical. A gate that cannot tell "passed" from "did not run" reports the second as the first, and a check built from the same symbol as the thing it checks proves only that the code agrees with itself. Retiring 356 lessons across 14 repos found **more than 40 whose evidence named a live, passing test that did not catch the defect** — every repo's `docs/learning/gate-proofs.md` records its own: an 800-decision rollout window hid a divergence that starts at 3,000, a Rust-side struct pin stayed green while the WGSL side it mirrors gained a field, and `replaceFootprintOwner(…, undefined)` passed all 873 tests.
- A command's exit status is a claim about the command, not about the work: a pipeline exits with its last stage's status, so `npm run x | tail` reports tail's success over any failure; `git add` fails all-or-nothing while the `commit` after it still succeeds and ships a message that lies about its contents; and a tool reporting that it applied a fix reports a no-op identically to a refusal — read the artifact it should have changed. Red deserves the same suspicion as green: a non-zero exit is equally a claim about the command, and a missing dev dependency, an unresolvable binary or a wrong working directory fails identically to a broken product — aoe2's `playtest:corpus` went red on a merge because `tsx` was gone from `node_modules`, not because the code was wrong. A blocker you inherited is the same kind of claim: retest it before repeating it, because its whole effect is to stop work. A RETURN VALUE is a claim of the same kind: a search that cannot match hands back a sentinel the next call uses without complaint, and an `indexOf` miss fed to `slice` deleted 319 lines of a tracked spec in one edit.
- Verify the instrument before trusting the measurement, because a critic is a backstop and not the first line. Confirm the flag took effect, the denominator is the population you meant, the control reproduces, and the claim you are relying on is still true rather than remembered. A whole session's conclusions were built on labels chosen with knowledge of the future, agreement quoted over a population that was 99.8% forced no-ops, a `--eval-episodes` flag silently ignored so every checkpoint was picked by a five-sample lottery, and a review lane declared unavailable from a three-week-old memory that was wrong. Each was one command away from being caught. An A/B comparison asks one more thing: that the tree HOLD STILL. Edits landing between the two arms make them differ by more than the variable under test, and the result reads as a finding — aoe2 read a boot-map regression off two arms it had edited between. A repo that ships a debugging instrument — a session replayer, a recorder and bundle differ, a capture script, a profiler, a debug probe — is asked FIRST, and the task's first probe names which of them answers the question or why none does. aoe2 skipped its engine's replay harness twice with the rule in prose (2026-06-13, 2026-09-05), the second time with a memory stating the rule loaded in the same session; what held was a hook that refuses to write or run a scratch probe without a `harness:` line naming the tool. A rule that must be remembered at the moment of writing a probe is enforced at that moment, not read at session start.

- A standing loop sources its next task by running the artifact the way its user does — the default entry point, the real configuration — never by reading code for something to improve. A repo with no runnable entry point has no standing loop.
- This harness compacts context mid-task: a compaction is a harness event, not a task boundary, and never a reason to wrap up or hand off to a fresh session.

- Before resuming interrupted work, inspect surviving worktrees, artifacts, and task status. Recover what exists and preserve unfinished work; do not assume that a worktree, transcript, or shared memory survived.

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
- Visual work includes separate evidence for the archive gallery and Badge Studio, Studio upload/reprocess and candidate selection, 3D front/edge/back views, multiple light positions and zoom levels, activation ceremony, GPU fallback, reduced-motion behavior, wide and compact desktop, phone portrait down to `320px`, and short landscape.
- Keep application modules aligned with the dependency direction documented in `docs/architecture/ARCHITECTURE.md`; domain and application logic remain independent of React, persistence, file APIs, and model providers.
