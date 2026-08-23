# Architectural Decisions

Append decisions newest first. Never rewrite history; add a superseding entry that links to the decision it replaces.

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
