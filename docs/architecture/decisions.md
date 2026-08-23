# Architectural Decisions

Append decisions newest first. Never rewrite history; add a superseding entry that links to the decision it replaces.

## 2026-08-22 — D-016: Use revisioned semantic briefs for custom Archive-to-Studio work

**Status:** Provisional repository architecture until the custom-definition handoff slice proves revision, replay, and recovery behavior.

Archive may hand Studio only an explicitly previewed canonical `.badgebrief` for a local semantic definition. The request is minimal and contains a random request ID, local definition ID, immutable semantic revision, title, criterion, optional deliberately included description, schema version, and digest; it excludes personal state, assets, visual direction, prompts, provider data, credentials, and database references. Archive persists the exact issued bytes and lifecycle, and Studio treats the import as untrusted data rather than receiving database access.

A targeted visual binds only the matching request and semantic revision. Semantic edits append a revision, supersede active work, and invalidate the new revision's current visual rather than silently reusing art authored for different meaning. Fulfilled requests remain historical, and existing planned or earned records retain their pinned semantic revision and exact visual. Install, replay, and restore are transactional and digest-aware.

## 2026-08-22 — D-015: Canonicalize pack lineage and prepare exact release bytes before handoff

**Status:** Provisional repository architecture until cross-platform golden compilation and hostile Archive admission pass.

Pack entity identity is qualified by immutable `packId` lineage, while exact installed content is pinned by `PackRef { packId, version, packDigest }`. Unrelated packs may reuse raw entity IDs without collision, same-lineage updates may retain them, exact bytes install idempotently, and reusing a version for different bytes is rejected. Archive and Studio keep small independent append-only release ledgers across uninstall or project deletion and union them during restore so an older backup cannot authorize a known same-version fork. Closed packs embed content-addressed runtime objects and exact self-contained dependencies; no loose sidecar participates in admission.

Studio canonicalizes and independently validates a frozen release, then persists a `PreparedRelease` with the exact bytes and reserves its version before offering any file handoff. File-handle export records success only after close; browser fallback records only that a download was offered. Cancellation and retry re-emit the prepared bytes and cannot create a same-version fork or false disk-success claim.

## 2026-08-22 — D-014: Separate Archive and Studio with immutable published packs

**Status:** Provisional repository architecture until the two-build scaffold and pack admission slice prove the boundary.

Archive and Badge Studio are independently built browser applications with separate strict origins, persistence, service-worker scopes, navigation, security policy, backup formats, and capability-scoped provider companions when needed. Their only Studio-to-Archive visual-content handoff is a closed, data-only, immutable published pack that Studio compiles and Archive independently validates before explicit installation; Archive-to-Studio custom work uses only an explicitly exported minimal semantic authoring request.

Archive records pin exact admitted pack and visual editions; new versions coexist rather than silently restyling personal history. Build and dependency gates reject Studio routes, candidate state, upload processing, appearance editors, art prompts, art-provider code, and visual-generation endpoints from Archive.

This supersedes D-007's single-package topology while retaining its browser-local persistence and disk-export direction. It narrows D-003 so Git owns curated catalogue source and optional release registry records while admitted packs own runtime release definitions and Studio-local projects remain private; scopes the visual state in D-004, D-005, and D-008 to Studio and published packs; and narrows D-006's activation payload from mutable selection data to exact admitted pack, visual-edition, source-hash, and render-recipe references. D-010's independently bounded saying proposals remain an Archive feature.

## 2026-08-22 — D-013: Keep visual creation out of the everyday Archive

**Status:** Owner-confirmed product mandate.

When the user browses, plans, activates, or examines a badge, its theme picture and complete 3D presentation are already decided. The Archive does not generate, upload, reprocess, compare, crop, reshape, rematerial, reborder, or publish visuals, and missing art is an installation error rather than a runtime creation prompt.

The developer-only Badge Studio owns candidate generation and selection, user-supplied image ingestion, non-destructive processing, shape and material construction, 3D validation, and pack publication. The Archive may still edit personal dates, notes, visibility, lifecycle, and sayings and may rotate, zoom, and relight the published object for inspection without changing its appearance recipe.

## 2026-08-22 — D-012: Keep 3D persistence independent from the renderer

**Status:** Provisional repository architecture until the Phase 0 spike records the renderer decision and budgets.

Persist a versioned engine-neutral render recipe over immutable source art and derived maps. Camera, zoom, key-light, scene graph, and GPU state stay ephemeral; gallery snapshots are version-addressed caches, and a renderer-independent template adapter supplies the first-run fallback.

The current interaction design adds a separate key-light mode, keyboard equivalents, bounded controls, and explicit engagement on top of the owner-confirmed product mandate. The Phase 0 gate may refine those implementation details with evidence but cannot weaken real 3D, mouse rotation, zoom, or physically responsive lighting.

## 2026-08-22 — D-011: Treat every badge as an interactive 3D artifact

**Status:** Owner-confirmed product mandate.

Each badge is a three-dimensional object that feels real under lighting and can be examined by rotating it, zooming in or out with the mouse, and manipulating the light used to inspect it.

This mandate does not choose the renderer, persistence shape, fallback, gallery optimization, saved camera behavior, or exact lighting gesture; those are repository decisions and remain separately reviewable.

## 2026-08-22 — D-010: Keep the saying independently user-controlled

**Status:** Accepted owner decision.

The badge's one-line saying can be generated, regenerated, accepted, or written directly through a boundary independent from art generation.

A regeneration result is a proposal and cannot replace accepted or handwritten text until the user explicitly accepts it; saying actions never mutate selected art or appearance, and reciprocal art actions never mutate saying state.

Live generation uses a disclosed minimal payload and latest-request-wins concurrency. A shared validator stores one logical line, preserves invalid direct drafts for correction, and rejects invalid provider output without truncation or state replacement.

## 2026-08-22 — D-009: Give the durable browser archive one stable origin

**Status:** Provisional until the scaffold verifies launch behavior.

The user-owned Phase 1 archive runs at `http://127.0.0.1:4173` with a strict port; `http://127.0.0.1:5173` development data is disposable fixture state.

Any later origin, PWA scope, service, or wrapper transition requires an explicit data migration before cutover because IndexedDB does not follow the app automatically.

## 2026-08-22 — D-008: Keep live art generation behind a provider adapter

**Status:** Accepted.

Domain and UI behavior must work with deterministic candidate fixtures, while a later browser-safe or local-service adapter owns live provider calls, cancellation, provenance, and credentials.

This avoids coupling the product to one model and keeps paid generation out of ordinary tests.

## 2026-08-22 — D-007: Use a browser-local Phase 1 architecture

**Status:** Provisional until the scaffold vertical slice validates storage size, backup, and disk-access behavior.

Start with a single-package Node 24 + TypeScript + React + Vite app, versioned IndexedDB repositories, Blob media storage, and File System Access export with download fallback.

Add a local companion service or desktop wrapper only when live credentialed generation, storage scale, or file-system behavior proves the browser boundary insufficient.

## 2026-08-22 — D-006: Persist activation before ceremony

**Status:** Accepted.

Occurrence, activation, selected asset, appearance, and derived composite updates commit atomically before visual celebration starts.

Animation interruption, refresh, skip, and reduced-motion behavior therefore cannot lose or duplicate the achievement.

## 2026-08-22 — D-005: Make appearance a non-destructive layer

**Status:** Accepted.

Crop, position, shape, material, border color, and border width remain structured data applied to an immutable source asset.

Changing physical presentation never requires replacing the only copy of uploaded or selected art.

## 2026-08-22 — D-004: Store media locally by content hash

**Status:** Accepted.

Uploaded originals, generated candidates, selected finals, and derivatives are local Blob data addressed by content hash; ordinary generated media does not enter Git.

Authoritative originals and selections are backed up, while reproducible thumbnails and previews may be caches.

## 2026-08-22 — D-003: Separate catalogue definitions from personal records

**Status:** Accepted.

Git owns versioned collections, badge definitions, prompt recipes, and composite rules; local repositories own the user's plans, occurrences, activations, notes, visibility, overlays, and art.

Local custom definitions require an explicit sanitized promotion workflow before becoming catalogue content.

## 2026-08-22 — D-002: Model one seeded owner without building accounts

**Status:** Accepted.

The initial product has one local profile and stable `ownerId`; there is no authentication, cloud sync, public publishing, or other-user browsing.

Stable ownership identifiers preserve a migration path without expanding the current UI scope.

## 2026-08-22 — D-001: Use personal honesty as the activation authority

**Status:** Accepted product boundary.

Only the user activates an ordinary achievement. Model suggestions, imported definitions, metadata, and artwork never prove or award it.

Computed achievements derive from those explicit activations through versioned rules.
