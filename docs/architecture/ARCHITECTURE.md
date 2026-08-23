# Architecture

## Status

The repository contains product and architecture documentation only; no application modules or persistence schema exist yet.

This document describes the target for the first implementation and names provisional choices explicitly so code does not accidentally turn a guess into a permanent contract.

## Architectural shape

Phase 1 is a single-package desktop-first web application using Node 24 tooling, strict TypeScript, React, and Vite.

The browser owns the user experience and local data through versioned IndexedDB repositories and Blob records, with File System Access API export when available and a download fallback.

Live model generation is behind an application port. If a provider requires a privileged long-lived credential, a later local companion service or desktop wrapper may implement that port; the browser must not embed such a credential.

The primary dependency direction is:

`app → ui → application → domain`

Persistence, file I/O, image processing, 3D rendering, and model generation are adapters that implement ports owned by the application or UI boundary.

Domain and application code remain independent of React, IndexedDB, browser file APIs, image canvases, WebGL or WebGPU, Three.js, and provider SDKs.

## Target source layout

```text
src/
  app/                 composition root, providers, routes, and global styles
  domain/              collections, badges, records, occurrences, rules, and visibility
  application/         author, select, activate, compute, back up, and restore use cases
  catalog/             Git-tracked definitions, collections, rule sets, and prompt recipes
  art/                 validation, crop, texture-map derivation, masks, and thumbnails
  rendering/           engine-neutral recipes, parametric geometry, materials, lighting, and viewer adapter
  persistence/         IndexedDB repositories, transactions, migrations, and save queue
  generation/          provider-neutral ports, deterministic fake, and later live adapters
  io/                  upload, backup export, restore import, and file-system adapters
  ui/
    components/        reusable polished product primitives
    features/
      gallery/
      goals/
      badge-atelier/
      candidate-picker/
      activation/
      settings/
tests/
  browser/             Playwright journeys and visual evidence
```

Do not create a layer merely to match the tree; keep the ownership boundary and collapse empty folders until behavior exists.

## Domain model

### ProfileSettings

One seeded local profile with a stable `ownerId`, default visibility, accessibility preferences, and later appearance defaults.

The stable owner identifier costs little now and prevents a destructive identity migration if accounts arrive later.

### CollectionDefinition

A Git-tracked catalogue collection with stable ID, version, title, description, source metadata, ordered badge references, and optional composite definitions.

It contains no owner visibility choice.

### CollectionSettings

A local owner record keyed by owner and collection IDs, containing the collection visibility override and later local presentation preferences.

Custom local collections use the same local authority and may reference or overlay catalogue definitions.

### BadgeDefinition

A catalogue or local definition with stable ID, title, criterion, description, collection relationships, repeatability metadata, prompt recipe, and optional goal rule.

Locally created definitions are overlays or forks rather than silent edits to catalogue files.

### AchievementRecord

Local owner state for a definition: lifecycle state, occurrence references, activation, selected appearance, accepted saying text and source, note, visibility override, and archive metadata.

Do not enforce uniqueness on `(ownerId, definitionId)` until repeat-achievement cardinality is decided. The schema must represent either multiple records for a definition or several occurrences under one record without destructive migration.

### Occurrence

A real-life event with stable ID, `occurredStart`, `occurredEnd`, precision or approximation metadata, optional occurrence note, and `recordedAt`.

Supporting multiple occurrences in storage does not settle how repeated achievements appear in the UI.

### Activation

An immutable first-earned event for one achievement-record instance, with `activatedAt`, triggering occurrence, selected art and appearance snapshot, and source indicating explicit or computed activation.

Corrections create audited updates or replacement records rather than silently changing the meaning of the original timestamp.

### GoalRule

Initially a small versioned `allOf` rule over stable badge-definition IDs.

Do not introduce a general expression language until a real collection needs more than explicit conjunction and a decision records the cost.

### Appearance

An engine-neutral, serializable render recipe containing crop, position, shape preset, geometry version, thickness, edge profile, relief settings, material preset and parameters, border color, border width, texture-map references, and render version.

Appearance is independent of source art so it can be edited without destructive regeneration. Persist no Three.js objects, GPU resources, shaders compiled at runtime, canvas state, or other renderer-specific scene objects.

### Render recipe semantics

Recipe coordinates are right-handed with `+X` right, `+Y` up, and the front face normal along `+Z`; the normalized badge width or diameter is `1.0`, and thickness, bevel, border, and relief values are fractions of that size.

Persisted crop and UV coordinates use a top-left origin with `u` increasing right and `v` increasing down; a renderer adapter performs any engine-specific vertical flip exactly once. The front and back winding, tangent basis, and OpenGL-style normal maps with positive green `Y` are fixed by golden geometry and UV fixtures.

Albedo assets normalize to sRGB, lighting calculations occur in linear space, output is sRGB, and normal, height, roughness, metalness, and masks remain non-color data. Persisted alpha is straight rather than premultiplied; adapters may premultiply only at their runtime boundary.

Every versioned material or geometry manifest defines defaults and valid numeric ranges, and schema validation rejects values outside them. The provisional base ranges are thickness `0.02–0.18`, bevel `0–min(0.04, thickness / 2)`, relief `0–0.05`, border width `0–0.20`, and normalized material channels `0–1`; changing meaning or ranges requires a render-recipe version and migration.

Small engine-neutral golden fixtures cover every shape with asymmetric source art, labeled front and back, UV corners, known crop, normal direction, and boundary values so a new adapter cannot mirror, invert, or materially reinterpret an old badge while accepting its recipe.

### ViewerState

Ephemeral UI state for camera orbit, zoom, key-light orbit, active interaction mode, and pointer or keyboard gesture state.

It resets to a versioned studio preset when a viewer opens and is not part of `AchievementRecord`, backup, or catalogue state. A future explicitly saved showcase pose requires a new persisted type and migration rather than quietly promoting incidental viewer state.

### ArtAsset

Metadata for a locally stored binary: content hash, MIME type, dimensions, byte size, role, provenance, local Blob reference, created time, and lifecycle state.

### ArtCandidateSet and AssetDerivation

A candidate set records the approved input specification, candidate asset IDs, selection, generation status, and provider metadata without secrets.

A derivation records source asset, operation, parameters, tool or recipe version, and result asset; uploaded originals have no parent and are immutable.

### SayingDraft

The authoring draft stores the current accepted one-line saying, whether its latest accepted form was generated or directly authored, its update time, and optional generation provenance without secrets.

A regenerated line is a pending proposal, not an in-place mutation. Accepting a proposal or editing the text is an explicit user action, and neither operation changes the selected art or appearance.

Saving a planned or activated badge copies the accepted text and source into its `AchievementRecord`; an unaccepted proposal remains draft-only and never becomes the displayed saying by accident.

## Authority boundary

| Git-tracked system authority | Local private authority |
| --- | --- |
| Application source and tests | Planned and earned state |
| Schemas and migrations | Occurrence dates and activation timestamps |
| Catalogue collections and badge definitions | Personal notes, sayings, and visibility choices |
| Composite goal rules and catalogue versions | Local collection settings, custom definitions, and catalogue overlays |
| Prompt recipes and versioned geometry, material, lighting, or shape manifests | Uploaded originals and generated candidates |
| Renderer source and intentionally promoted small visual inputs | Selected art, texture-map derivatives, chosen render recipes, thumbnails, and backups |

Never serialize personal state into catalogue files as a convenience.

Never store large images as base64 inside JSON, `localStorage`, or Git.

## Persistence

IndexedDB stores structured records and Blobs through repository interfaces; UI components never open transactions directly.

Every persisted shape has an explicit schema version, validated read path, migration path, and corruption error that distinguishes missing, unsupported, and unreadable data.

An unreadable store is not an empty store. Preserve it, stop automatic writes that could destroy recovery evidence, and offer backup or diagnostic guidance.

Writes that affect one user action use a transaction boundary. Activation commits the occurrence, record state, activation timestamp, selected appearance, selected art reference, and derived composite updates before animation begins.

A sequential save queue coalesces safe redundant writes and prevents a slow earlier write from replacing newer state.

Request persistent browser storage where supported, report when the browser refuses it, and keep disk backup visible because browser storage is not the only durable copy.

### Stable origin contract

IndexedDB is scoped to the full browser origin, including port, so the personal archive must run from a canonical stable production-like origin rather than whichever Vite port happens to be free.

The provisional Phase 1 contract is `http://127.0.0.1:4173` on a strict port for the user-owned archive. Development on `http://127.0.0.1:5173` uses disposable fixtures and must not be presented as the durable archive.

If the production origin, protocol, port, installed-PWA scope, local service, or desktop wrapper changes, ship an explicit export, import, or origin-migration path before cutover and test that intact data cannot merely appear lost.

Startup must display an actionable error when the canonical port is unavailable rather than silently selecting another origin.

## Media pipeline

Store binaries by content hash to deduplicate identical uploads, generated outputs, and derivatives.

Preserve selected art and uploaded originals as authoritative data. Thumbnails, materialized previews, and other caches are disposable only when they can be regenerated from an authoritative asset and versioned parameters.

Validate MIME type, decoded dimensions, byte size, and supported format before admission; do not trust the file extension.

Processing is non-destructive and produces a derivation graph. A failed, canceled, or superseded derivation never changes the selected asset.

Candidate cleanup operates on explicit asset lifecycle state and reference counts, not directory age or broad folder deletion.

Selected two-dimensional art maps onto the 3D front surface through versioned UV and crop parameters. Normal, height, roughness, mask, and other maps derived for relief or material response reference the immutable source and remain regenerable when their recipe is deterministic.

## 3D rendering boundary

The renderer consumes a serializable appearance recipe, resolved local asset URLs, a studio-light preset, ephemeral viewer state, and capability information. It returns pixels and interaction events without changing domain records or owning user data.

Use parametric geometry for ordinary circle, square, rectangle, and shield bodies rather than storing a unique heavy mesh per badge.

Each mounted live viewer owns a `RendererSession` that registers every animation frame, event listener, observer, pointer capture, asynchronous loader and abort controller, object URL, decoded `ImageBitmap`, geometry, material, texture, render target, environment or PMREM target, and rendering context it creates. Shared resources belong to an explicit reference-counted cache owner rather than an arbitrary viewer.

`RendererSession.dispose()` is idempotent: it stops future frames, aborts loaders, releases pointer capture, removes listeners and observers, revokes object URLs, closes decoded images, decrements shared references, and disposes session-owned CPU and GPU resources. Recipe replacement uses the same cleanup for superseded resources, and a dedicated context may be deliberately lost only when its ownership is exclusive.

WebGL2 is the provisional supported baseline; WebGPU may be an optimization later but cannot be the only path. Three.js with React Three Fiber is the leading Phase 0 candidate, not yet an accepted dependency, and the persisted recipe must survive replacing it.

Render on demand while idle and continuously only during direct manipulation, material transition, or activation motion. Clamp device pixel ratio, texture resolution, camera distance, and light range to preserve clarity without exhausting memory or allowing the object to clip, disappear, black out, or blow out.

Viewer input has explicit `unengaged`, `focused`, `engaged`, `object-drag`, and `light-drag` states. `Tab` focus enters `focused` and announces instructions without intercepting page navigation; handled `Enter` or `Space` prevents its default and enters `engaged`; `Escape` cancels a drag and returns to `focused`; blur or outside focus returns to `unengaged`.

Pointer-down focuses and engages the viewer, captures that pointer, and begins the drag selected by the visible mode. Every transition out of `object-drag` or `light-drag`—including pointer-up, pointer-cancel, lost capture, mode change, `Escape`, blur, and outside focus—releases capture when held and clears queued pointer and wheel deltas before entering the destination state; a mode change completes that cleanup before activating the new mode.

Wheel or trackpad input prevents page scrolling only while the engaged viewer is under the pointer; otherwise it remains ordinary page scroll. Orbit, zoom, light, and reset keys prevent their browser defaults only in `engaged` or drag states. Convert `deltaMode` to CSS pixels, aggregate once per animation frame, cap each frame to `100` pixels, and map that cap to a `10%` multiplicative zoom step within `0.65–2.5` times the fitted-object scale.

Arrow keys orbit the active object or key light by `5°`, and `Shift` reduces the step to `1°`. Physical `Equal` and `Minus` codes, displayed as `=` and `-`, plus `NumpadAdd` and `NumpadSubtract`, zoom by `10%`; `Shift` reduces those commands to `2%`. Visible reset buttons remain the discoverable keyboard path and list the active bindings. Object yaw is continuous with pitch clamped to `±85°`, and key-light elevation stays within `5–85°`. Pointer, keyboard, and touch adapters emit the same renderer-neutral orbit, zoom, light, engage, disengage, and reset commands.

Recover from WebGL context loss by disposing the failed session and rebuilding resources from the recipe and authoritative assets. If capability initialization still fails, a renderer-independent SVG or Canvas 2D adapter composes source art with versioned front, edge, and back templates from the recipe; it works with an empty cache on first run and after clean restore, labels the degraded result, and never shows an empty canvas as success.

The CPU fallback is reproducible from the backed-up recipe, source assets, and Git-tracked versioned templates, so its outputs are disposable caches rather than required backup payload. Unsupported old template versions are a migration error, not permission to reinterpret or flatten the badge silently.

Gallery thumbnails and GPU snapshots use a versioned `RenderFingerprint` covering adapter and build, geometry, material, shader, and template manifest hashes, source and derivative hashes, environment or studio asset hash, tone mapping, exposure, output color space, quality tier, actual pixel dimensions, device-pixel-ratio tier, and relevant capabilities. Badge Atelier and detail views remain live 3D surfaces.

A matching fingerprint means cached inputs are still valid, not that different GPUs or drivers produce byte-identical pixels. Canonical visual regression uses a pinned capture environment with tolerance-based comparison; cross-device review checks geometry, crop, orientation, material, and interaction invariants rather than exact pixels.

## Generation boundaries

The art-generation application port accepts a normalized art brief, approved source asset references, candidate count, appearance context when relevant, and cancellation signal.

It returns candidate descriptors and provenance without deciding selection or activation.

The art brief and candidate role require source artwork rather than a composed badge render: no physical rim, thickness, bevel, reverse face, cast shadow, presentation background, or badge-level material and studio lighting. Candidate comparison applies the current live 3D recipe uniformly, and a composed preview is always a derivative rather than the authoritative source asset.

A separate saying-generation port accepts only the badge title, criterion, optional saying-specific direction, request ID, and cancellation signal, then returns a proposed line and provenance. Adding description or any other field requires a new explicit outbound-data decision and disclosure surface.

The application keeps the accepted saying and pending proposal separate. Retrying a saying request never invokes art generation, changes the selected asset, or overwrites accepted text; only explicit acceptance or direct editing updates the draft. Art generation, upload, processing, selection, and appearance edits likewise preserve both saying values.

The saying controller assigns a monotonically increasing request ID and applies results only from the latest active request. Starting a retry retains the existing pending proposal; stale, canceled, invalid, and failed results are ignored or reported without replacing it.

Normalize proposals and direct input by trimming outer whitespace and collapsing internal whitespace, including line breaks, to one space. Count Unicode grapheme clusters through one shared domain validator, reject empty values and values over the provisional 120-grapheme limit, and never truncate stored or displayed text silently.

Tests and Phase 1 use deterministic fakes with fixture art candidates and saying proposals so product work does not spend model budget or require network access.

Live adapters disclose the destination and exact outbound fields before uploaded media or private badge text leaves the device, exclude description, notes, dates, occurrence data, accepted sayings, visibility, art, and unrelated draft fields from saying requests by default, support cancellation, and keep provider credentials in an environment or OS credential boundary rather than application data, backups, prompts, or Git.

Pin a product-called model only in the adapter's repo-owned configuration when live integration is implemented; do not scatter model IDs through UI or domain code.

## Catalogue behavior

Catalogues are versioned, read-mostly inputs. Personal overlays reference stable IDs and survive catalogue updates.

Composite activation records the rule version, qualifying badge IDs, and catalogue edition used to reach eligibility.

Renames and retirements preserve stable IDs. Removing a tracked definition never orphans or deletes a personal record silently.

The exact historical behavior when a catalogue expands remains a product decision; storage preserves enough provenance to show both historical completion and current-edition progress.

## Visibility

Persist visibility as a nullable override rather than a flattened boolean.

Collection overrides live in `CollectionSettings`, never `CollectionDefinition`.

Effective visibility is presentation-context-specific and resolves `achievement override → current collection settings → profile default`; without a collection context it resolves `achievement override → profile default`.

An achievement appearing in several collections is evaluated independently in each collection. Standalone multi-collection sharing is undefined and therefore private until a product decision supplies a safe precedence rule.

Notes remain separately private by default, and a future presentation adapter must select allowed fields explicitly rather than serializing an entire achievement record.

## Backup and restore

Export a versioned portable bundle containing a consistent database snapshot or canonical record export, local definitions, uploaded originals, selected artwork, chosen engine-neutral 3D render recipes, required non-reproducible derivatives, a manifest, schema and catalogue versions, and checksums.

Use the native file picker when available and a browser download fallback elsewhere.

Restore first parses into an isolated staging area, validates checksums and references, migrates supported versions, reports the full plan, and then replaces current state atomically after explicit confirmation.

Never partially merge a corrupt archive into healthy state.

## Future multi-user migration

Stable owner and entity IDs, catalogue-versus-personal separation, nullable visibility overrides, and provider-independent asset references keep the model migratable.

A future server can implement the existing repositories and generation ports without moving product rules into React or changing the meaning of activation.

Accounts, remote object storage, permissions, and sync conflict behavior are new architecture work and are not to be prebuilt into Phase 1 screens.

## Test and observability contracts

Pure domain tests cover lifecycle transitions, composite eligibility, visibility precedence, stable ID behavior, date-range validation, render-recipe validation, and viewer command clamping without a browser environment.

Golden recipe tests load asymmetric front and back fixtures through every adapter and assert handedness, winding, UV orientation, crop, color-space declarations, normal direction, alpha convention, and numeric boundaries before visual comparison.

Persistence tests use an isolated IndexedDB implementation and cover every migration, corrupt-row refusal, transaction atomicity, asset deduplication, and backup and restore round trip.

Component tests cover candidate comparison, uploads, non-destructive selection, latest-request saying concurrency, retry failure and cancellation, saying normalization and length validation, proposal acceptance, direct saying edits, reciprocal art and saying isolation, appearance controls, engagement and scroll-release states, pointer cancellation and mode changes, normalized wheel deltas, object-versus-light interaction mode, keyboard increments, reset behavior, activation confirmation, focus order, and reduced motion.

An instrumented renderer stress test runs at least `50` mount → recipe replacement → context loss → restore and rebuild → render → dispose cycles and proves session, animation-frame, listener, observer, pointer-capture, loader, object-URL, decoded-image, shared-reference, geometry, material, texture, render-target, environment-target, and context counts return to their recorded baseline after every completed cycle. A separate `50`-cycle forced-initialization-failure branch proves fallback creation and disposal without entering restoration.

Playwright covers the Yosemite acceptance journey including real pointer rotation, wheel zoom and page-scroll release, light adjustment, keyboard equivalents, context-loss recovery, a forced WebGL-initialization failure on first run with an empty cache, the same failure after clean restore with front, edge, and back fallback views, saying retry and direct editing, provider disclosure, multiline paste, over-limit validation, narrow-layout wrapping, art and saying isolation, upload and processing failure, activation reload safety, composite completion, and restore into a clean profile.

Visual evidence compares the chosen references with implementation screenshots at matched state and at least two desktop-like viewports, captures front, oblique, edge, and back views across representative materials and light positions, includes a short rotation, zoom, and light-manipulation recording, then sweeps all primary surfaces for unrelated defects.

Actionable structured debug output should expose current route, selected collection and badge IDs, lifecycle state, asset references, pending write or generation status, and effective visibility without exposing notes, credentials, or raw personal media.
