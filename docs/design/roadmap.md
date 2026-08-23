# Roadmap

The phases establish the Archive–Studio release boundary before either application gains live generative calls or sharing scope.

**Implementation status on 2026-08-23:** the first runnable foundation now covers the two strict local origins, deterministic fixture catalogue, atomic Archive activation with exact visual pins and self-contained fully decoded earned-source backup, monotonic restore with qualified starter-identity refusal, two-step safety-copy confirmation, state-preserving corrupt-source repair, bounded Studio upload and derivative persistence, synchronous publication exclusion, candidate selection, editable render recipes, content-addressed PNG-only pack compilation, closed-object and aggregate-memory hostile admission, actual canonical starter and theme artifacts with exact graph and fallback-template closure, and a shared interactive renderer with forced fallback. Phase 0 remains open on installed-pack ledgers, complete backup closure for arbitrary installed but unearned packs, hostile install UI, durable Studio prepared-release history, cross-platform golden packs, renderer performance and 50-cycle resource measurements, and context restoration; later-phase items demonstrated in the fixture UI are not claimed complete.

## Phase 0 — Boundary and rendering foundation

- Scaffold a Node 24 npm workspace with strict TypeScript, React, Vite, Vitest, Playwright, ESLint, and Prettier, containing independently built Archive and Badge Studio applications.
- Give Archive and Studio separate strict origins, development fixtures, build outputs, CSPs, service-worker scopes, navigation trees, IndexedDB databases, Blob stores, and visibly distinct backup formats.
- Establish the package and dependency boundaries in `docs/architecture/ARCHITECTURE.md`, restricted imports, bundle-graph checks, and real commands in `AGENTS.md` before feature implementation.
- Implement the minimal authoring-request contract and issued-request repository plus the canonical closed pack contract, Studio-only deterministic compiler, hostile Archive admission fixtures, exact `PackRef`, same-version-fork rejection, immutable installed versions, and pinning rules before using either handoff as application data.
- Fail closed on unreadable stores, corrupt packs, wrong backup formats, or unresolved visuals and preserve useful recovery evidence.
- Create one deterministic built-in fixture pack with already selected Yosemite, _Sapiens_, bachelor's-degree, and all-parks visuals plus complete 3D recipes; no Archive fixture may contain a prompt or generate-later state.
- Add the selected Archive gallery and Badge Studio mockups to separate visual comparison tooling.
- Spike the shared engine-neutral WebGL2 3D renderer, with Three.js and React Three Fiber as the leading implementation candidate, against the complete fixture pack before recording the dependency choice.
- Measure geometry and UV fidelity, texture memory, context recovery, forced initialization failure, first-run and post-restore CPU fallback, pointer and keyboard input, reduced motion, and representative desktop performance.
- Start with provisional hero limits of `2048px` per texture map, `512px` gallery thumbnails, device pixel ratio capped at `2`, active-interaction p95 frame time at or below `20ms` over a warmed `10s` run on the documented reference desktop, and zero continuous animation frames `500ms` after settling.
- Run the instrumented `50`-cycle renderer-session stress gate and require all owned and shared resource counts to return to their recorded baseline before selecting an engine.

### Exit criteria

- Archive and Studio boot only at their own strict durable origins, disposable fixtures remain isolated on their development origins, schema upgrades and corrupt-store handling are tested, an origin change cannot make data silently disappear, and no personal data enters Git.
- Studio compiles the same frozen fixture into byte-identical packs across repeated supported-platform runs and a clean Archive independently validates and installs it. Wrong, corrupt, hostile, incomplete, same-version-different-digest, and cross-format inputs fail atomically with actionable errors.
- Dependency and bundle inspection proves Archive contains no Studio route, compiler, candidate, upload processor, appearance editor, art prompt, art provider, or visual-generation endpoint.
- Separate Archive and Studio fixture backups restore into clean instances with every referenced authoritative object; the Archive fixture includes an entirely unplanned installed pack. Attempting to restore either format into the other application is refused before mutation.
- The spike report names the reference hardware, browser, quality tier, measurements, failures, and chosen or rejected engine; D-012 is accepted or superseded with explicit performance and resource budgets before Phase 1 depends on that engine.
- Evidence covers front, edge, and back views at two desktop-like viewports, multiple light and zoom positions, real pointer and keyboard commands, reduced motion, context loss and restoration, clean resource disposal, and forced GPU failure on both first run and clean restore with an empty cache.
- A budget miss blocks renderer selection unless the decision records a measured alternative or revised threshold and its product-quality tradeoff.

## Phase 1 — Complete Archive vertical slice

- Browse installed collections and distinguish suggested, planned, earned, and archived states, with every visible badge resolving exactly one admitted published visual.
- Create and edit local collections over installed definitions. Under the provisional Archive-first recommendation pending open decision 19, a local semantic badge draft stays outside browse, plan, and activation flows; Archive previews and explicitly exports its minimal authoring request, persists the exact issued payload and lifecycle, and can reproduce it after reload or restore. Semantic edits append a revision, invalidate the new revision's current visual, and preserve any earlier planned or earned record's pinned semantics and visual. Phase 1 does not assume cross-definition visual reuse before open decision 16 is resolved.
- Import, preview, validate, install, pin, and safely retain versioned published packs without exposing visual-authoring controls.
- Generate deterministic one-line saying proposals, try another without losing the accepted line, explicitly accept a proposal, and author or replace the line directly.
- Render the published appearance read-only as a live 3D object with genuine thickness and relief, mouse drag rotation, bounded wheel or trackpad zoom, separate inspection-light adjustment, reset controls, keyboard equivalents, reduced-motion behavior, context-loss recovery, and a renderer-independent front, edge, and back fallback that needs no prior GPU cache.
- Activate a badge with occurrence range, immutable activation timestamp, clever or edited saying, optional note, and local visibility override.
- Deliver the sharp activation ceremony plus reduced-motion behavior.
- Reload without state loss and complete an Archive backup and restore round trip with personal state, active or superseded authoring requests, the immutable seen-pack-release ledger, every installed pack including an entirely unplanned collection, and exact pinned published visuals intact.

### Exit criteria

The Yosemite Archive journey in `product-spec.md` works with a prepublished deterministic pack and no visual-generation network access; its picture and 3D presentation are decided before it enters the gallery. Front, edge, and back inspection plus zoom and light movement feel physically coherent; the exact pinned visual survives reload and restore while viewer pose resets; a canonical authoring request can be exported, re-exported after reload, and restored without leaking excluded fields; saying regeneration never changes the visual or overwrites accepted text; and the complete journey passes visual, pointer, keyboard, reduced-motion, bundle-boundary, admission, backup-completeness, and GPU-fallback testing.

## Phase 2 — Badge Studio and live generation

- Build the dedicated Badge Studio project and minimal authoring-request import, candidate comparison, upload, non-destructive processing, crop, shape, material, border, relief, lighting, validation, and publish surfaces outside Archive navigation and bundles.
- Define and implement the Studio art-provider adapter without coupling published packs or Archive records to one provider; use a loopback companion only if credential handling requires it.
- Generate genuinely distinct candidates, refine one candidate, upload the user's own art, process it only after outbound disclosure, and cancel or retry without changing the working selection. Preserve the private original while publication re-encodes a previewed metadata-free runtime derivative.
- Track Studio-local provenance, provider, model, prompt-recipe version, source asset, derivations, settings, and output hash without storing secrets in Git, packs, or backups.
- Add actionable generation errors, offline fixture or upload paths, size limits, thumbnail generation, deduplication, reference-aware candidate cleanup, and a complete Studio backup and restore path containing the immutable reserved-pack-release ledger plus the actual selected and necessary derivative bytes.
- Freeze, validate, and prepare immutable pack bytes before file handoff, reserving their exact version and truthfully distinguishing confirmed file-handle writes from browser downloads merely offered. An imported authoring request produces the closed single-entry `TargetedVisualPack` variant, then installs through the same hostile Archive admission boundary used for any untrusted pack and fulfills the durable issued request atomically.
- Implement live Archive saying generation behind its separate provider-neutral port and separately capability-scoped companion when browser-safe authorization is unavailable, while preserving manual writing without it. Retrying copy cannot invoke Studio or art generation; disclose the exact minimal outbound text fields and exclude personal notes, dates, occurrences, accepted sayings, visibility, art, and unrelated draft state by default.

### Exit criteria

The Studio publishing and custom handoff slices in `product-spec.md` produce closed immutable packs from generated or uploaded art, restore the actual authoritative project objects and prepared-release bytes independently, and install cleanly into Archive without transferring drafts, prompts, rejected candidates, credentials, image metadata, or personal Archive data. Export → Archive reload or restore → Studio import → targeted publish → Archive install succeeds; edited definitions, superseded requests, mismatched digests, ID collisions, and different-pack replays fail before mutation, while same-pack replay is idempotent. Edit-after-fulfillment and edit-after-activation tests prove the new revision requires republishing while existing records retain their historical semantic and visual pins. File cancellation and download fallback preserve exact-byte re-export without a same-version fork or false disk-success claim. Archive still has no visual-authoring modules or controls. Live adapters can be replaced by deterministic fakes; multiline saying output normalizes to one logical line; stale, canceled, failed, empty, and over-limit saying responses preserve accepted and pending copy; the manual saying path works without a companion; and no secret or personal media appears in Git.

## Phase 3 — Catalogue and computed achievements

- Ship a sourced, versioned U.S. National Parks pack whose individual and all-parks composite visuals were selected and published in Studio before release.
- Support Archive suggestions and curated starter collections only from installed validated packs without making them mandatory.
- Display computed progress and automatically qualify the all-parks badge without invoking visual generation; activation uses its prepublished composite visual.
- Resolve catalogue expansion, rename, retirement, and previously earned composite semantics before the first catalogue update.
- Support catalogue overlays and coexisting immutable pack versions so personal edits and pinned presentations survive system updates.

### Exit criteria

The all-parks journey completes deterministically, records its rule, catalogue version, exact `PackRef`, and published visual edition, survives catalogue reloading, and never loses personal history or silently restyles an earned badge during an update.

## Phase 4 — Presentation and sharing

- Define what local `public` and `private` settings expose.
- Build a presentation view and explicit export or share artifact before adding accounts.
- Design accounts, multiple owners, cloud storage, other-user browsing, and permissions only after the local data and exposure contracts are stable.

### Exit criteria

The user can inspect exactly what will be shared, private notes remain excluded by default, and no upload occurs without an explicit action and destination.

## Deliberately deferred

Points, streaks, leaderboards, external verification, competitive rankings, social reactions, cloud-first storage, crypto or financial rewards, and scarcity mechanics are not roadmap items.

The unresolved decisions at the end of `product-spec.md` are decision gates, not hidden backlog; resolve each when its phase reaches it.
