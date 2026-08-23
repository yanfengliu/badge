# Architecture

## Status

The repository contains a runnable foundation implementation plus the product and target-architecture documentation that bounds later slices.

This document distinguishes the implemented foundation from the remaining target and names provisional choices explicitly so a scaffold decision does not accidentally become a permanent contract.

## Architectural shape

The target is a Node 24 npm workspace with strict TypeScript, React, and Vite, containing two independently built desktop-first web applications served as one local website: the everyday Archive at `/` and developer-only Badge Studio at `/studio/`.

The 2026-08-23 foundation implements that workspace, the two route-scoped builds on one remembered localhost origin, separate IndexedDB repositories, inward-facing contract packages, an explicit fixture-backed saying proposal and acceptance controller, the exact provider-neutral saying prompt and payload contract, deterministic fixture art, a PNG-only canonical pack compiler and hostile dependency-closed admission module, reproducible and independently admitted starter catalogue and theme pack bytes, self-contained backup of the current Archive records and exact fully decoded earned visual bytes, qualified-identity refusal before restore, state-preserving corrupt-source repair, and a shared React Three Fiber renderer candidate. Durable Archive source images are restricted to strict PNG. Studio and tracked developer fixtures may use WebP or JPEG before publication or deterministic local derivation normalizes their decoded pixels to PNG outside Git. It does not yet implement installed-pack storage or ledgers, complete backup closure for arbitrary installed but unearned packs, Studio project backup or durable release history, `.badgebrief` UI, live provider adapters or disclosure sheet, service workers, the renderer stress/performance gate, or later roadmap scope.

The foundation's built-in catalogue still enters Archive as validated fixture state rather than through the future install UI. Its offline generator nevertheless compiles actual canonical `badge.theme.heirloom@1.0.0` and `badge.catalogue.starter@1.0.0-alpha.3` containers, pins their exact digests, independently admits both, and proves the catalogue's exact dependency graph and fallback-template closure. The Studio publishing fixture similarly offers its targeted `.badgepack` together with the exact validated `.badgetheme`; this executable closure must not be described as durable release history or Archive installation.

Archive and Studio share one browser origin but own separate route entry points, versioned IndexedDB database names, repositories, Blob stores, service-worker scopes, content-security policy surfaces, navigation trees, build outputs, and backup formats, with File System Access API export when available and a download fallback.

The local route host mounts the independently built Studio entry point at `/studio/`, but the Archive bundle has no Studio lazy chunk, database access, visual-generation port, art prompt recipe, art-provider SDK, or art-provider endpoint. Studio transfers finished work to Archive only through a closed, data-only published pack that Archive independently validates and installs. Archive may explicitly export a minimal data-only authoring request for Studio, but neither application reads the other's database or receives the other's private state. The separately bounded Archive saying-proposal port does not weaken this visual-authoring boundary.

Live visual generation exists behind a Studio application port. If its provider requires a privileged long-lived credential, an optional loopback-only Studio companion or later desktop wrapper may implement that port. Live saying proposals use a different Archive application port and, when browser-safe authorization is unavailable, a separately capability-scoped Archive saying companion. Neither browser build embeds a privileged credential, and neither companion has the other application's authority.

The primary dependency directions are:

`archive-web → archive-application → archive-domain`

`archive-application → authoring-request-contract + pack-contract + render-recipe + saying-contract`

`studio-web → studio-application → studio-domain`

`studio-application → authoring-request-contract + pack-compiler + pack-contract + render-recipe + art-generation-contract`

`pack-compiler → pack-contract + render-recipe`

`renderer-web → render-recipe`

`studio-companion → art-generation-contract`

`studio-companion/provider-adapter → art-generation-contract`

`archive-saying-companion → saying-contract`

`archive-saying-companion/provider-adapter → saying-contract`

Persistence, file I/O, image processing, 3D rendering, and model generation are adapters behind their owning application or UI boundary. Domain and contract packages remain independent of React, IndexedDB, browser file APIs, image canvases, WebGL or WebGPU, Three.js, and provider SDKs.

## Target source layout

```text
apps/
  host-web/             one-origin route host for Archive at `/` and Studio at `/studio/`
  archive-web/          gallery, goals, activation, memories, pack admission, and archive backup
  studio-web/           projects, candidates, upload, processing, construction, validation, and publish
  studio-companion/     optional loopback art-provider and credential boundary
  archive-saying-companion/  optional loopback saying-provider and credential boundary
packages/
  archive-application/  Archive use cases, repositories, saying port, and pack-install orchestration
  archive-domain/       records, occurrences, activation, visibility, and composite rules
  studio-application/   Studio use cases, generation port, processing, validation, and publish orchestration
  studio-domain/        mutable projects, candidates, derivations, selection, and review state
  authoring-request-contract/  minimal Archive-to-Studio definition brief and validation
  pack-contract/        closed schemas, canonicalization, validation, admission, and compatibility
  pack-compiler/        Studio-only pure compiler from frozen release candidate to immutable pack
  render-recipe/        engine-neutral geometry, material, fallback, and appearance contracts
  renderer-web/         shared live WebGL and renderer-independent fallback adapters
  art-generation-contract/  Studio and art-companion request-response schemas only
  saying-contract/      Archive and saying-companion request-response schemas only
tests/
  browser/archive/      Archive Playwright journeys and visual evidence
  browser/studio/       Studio Playwright journeys and visual evidence
  boundaries/           dependency graph, bundle graph, route, persistence, pack, and wrong-format gates
```

Do not create a package merely to match the tree, but do not collapse Archive and Studio into one application package or runtime bundle. Package exports, TypeScript project references, restricted-import lint rules, and bundle-graph gates enforce the boundary. Contract packages never import a companion or provider adapter; implementations depend inward on their contract.

## Domain model

### ProfileSettings

One seeded local profile with a stable `ownerId`, default visibility, accessibility preferences, and later Archive interface display defaults. It never stores badge-construction appearance.

The stable owner identifier costs little now and prevents a destructive identity migration if accounts arrive later.

### Entity references and pack lineage

Pack-owned entity IDs are stable only inside their immutable `packId` namespace. Archive represents identity through closed unions: `DefinitionRef = LocalDefinitionRef { namespace: "local", definitionId } | PackDefinitionRef { namespace: "pack", packId, definitionId }` and the analogous `CollectionRef`. A later version with the same `packId` is an explicit update to that lineage and may retain IDs, while an unrelated pack must use a different `packId`. Exact version pinning remains a separate `PackRef`. Phase 1 composite rules reference definitions within their own pack, and any later cross-pack rule must use exact qualified references and declared dependencies.

Archive never resolves a raw definition or collection ID across namespaces. Admission treats an existing `packId` as an update, requires the same pack kind and coherent lineage metadata, shows an entity-level diff, and refuses same-version forks; a new unrelated pack with coincident raw entity IDs coexists under its own namespace without rebinding records or rules.

### CollectionDefinition

A versioned semantic collection with stable ID, version, title, description, source metadata, ordered badge references, and optional composite definitions. Curated built-ins may originate as Git-tracked catalogue source, but Archive runtime consumes their compiled installed-pack form; Studio may also author a release without making its mutable project a Git authority.

It contains no owner visibility choice.

### CollectionSettings

A local owner record keyed by owner ID and one qualified `CollectionRef`, containing the collection visibility override and later Archive layout, sorting, or display preferences, never badge-construction properties.

Custom local collections use the same local authority and may reference or overlay catalogue definitions.

### BadgeDefinition

A published-pack or Archive-local semantic definition with stable ID, title, criterion, description, collection relationships, repeatability metadata, and optional goal rule. Runtime definitions contain no art prompt, candidate, provider, or generate-later field.

Locally created definitions are overlays or forks rather than silent edits to catalogue files.

### ThemePack, BadgePack, and PublishedBadgeVisual

`ThemePack` versions the declarative shapes, geometry, materials, lighting, fallback templates, restrained collection presentation tokens, and renderer compatibility available to related badges.

`BadgePack` is a closed union with exact theme dependencies. A `CatalogueBadgePack` carries versioned collections, composite rules, and one or more `OwnedBadgeEntry` values, each containing a complete packaged `BadgeDefinition` and one `PublishedBadgeVisual`. A `TargetedVisualPack` carries exactly one `TargetedBadgeEntry` containing only `BadgeDefinitionTarget { localDefinitionId, semanticRevision, requestId, requestDigest }` and one published visual; that pack variant is forbidden from carrying definitions, collections, composite rules, title, criterion, description, collection settings, lifecycle, or personal fields.

A published visual has an immutable visual-edition ID and version, exact selected source-art hash, complete render recipe, required map and fallback references, accessible description, minimal sanitized provenance and license metadata, and compatibility bounds. It contains no executable code, remote URL, arbitrary shader, prompt, candidate, provider action, or unresolved selection.

Archive pack admission returns branded installed definitions and `InstalledPublishedVisual` values only after the whole pack and dependency graph validate. Resolution combines a pack definition or an Archive-local semantic definition with one admitted visual into a branded `RenderableBadge`; ordinary Archive gallery, detail, and activation code accept that type rather than raw definitions, unresolved bindings, or untrusted bytes.

### BadgePresentationBinding

An Archive-local binding connects one exact `LocalDefinitionRef` and semantic revision to an installed `PackRef` and visual-edition ID. A missing, incompatible, superseded, or uninstalled target keeps the current definition revision out of the browseable and activatable catalogue. Phase 1 accepts the binding only when a `TargetedVisualPack` explicitly targets that local definition and revision; a reusable visual-template capability requires resolution of the open product decision and a versioned contract rather than silent cross-definition cloning.

### BadgeAuthoringRequest

Archive can explicitly export a versioned `.badgebrief` file for one local semantic definition after previewing its contents. The minimal request payload contains a random request ID, local definition ID, current semantic revision, title, criterion, optional description deliberately included for authoring, and schema version. It contains no visual direction, prompt, owner ID, occurrence, activation, date, note, saying, visibility, collection settings, installed asset, provider data, credential, or direct Archive object reference. `requestDigest` is SHA-256 over the canonical UTF-8 JSON payload with the digest field omitted.

Archive persists the exact canonical issued payload, digest, issue time, and `active`, `superseded`, or `fulfilled` status in an `IssuedAuthoringRequest` repository. Any semantic edit creates a new immutable definition revision and atomically supersedes an active request and invalidates the current presentation binding after warning that existing Studio work and visual fit are stale. A fulfilled request and its exact binding remain historical evidence for the old revision rather than changing status; exporting a replacement request for the new revision requires confirmation. Studio imports a request as untrusted data into a new or existing project and records its immutable request ID, semantic revision, and digest, then authors all visual direction itself.

A returned `TargetedVisualPack` carries the request ID, semantic revision, and digest. Archive compares them with both its durable issued state and the current local definition revision before binding the presentation, without letting the pack overwrite local semantic or personal fields. Installation atomically marks an active request fulfilled with the exact `PackRef`; a replay is idempotent only for that same pack digest, while a stale or superseded request, a different pack for a fulfilled request, or a local-definition target without a matching issued request fails before mutation and must be republished correctly. Editing after fulfillment therefore makes the new revision non-browseable until a new request is fulfilled; it never silently reuses art authored for different semantics.

### AchievementRecord

Local owner state for one qualified `DefinitionRef`: lifecycle state, pinned semantic revision or immutable semantic snapshot, occurrence references, activation, pinned pack and visual-edition identity, accepted saying text and source, note, visibility override, and archive metadata. Editing a local definition never rewrites the semantics or visual pinned by an existing planned or earned record.

Do not enforce uniqueness on `(ownerId, DefinitionRef)` until repeat-achievement cardinality is decided. The schema must represent either multiple records for one qualified definition or several occurrences under one record without destructive migration.

### Occurrence

A real-life event with stable ID, `occurredStart`, `occurredEnd`, precision or approximation metadata, optional occurrence note, and `recordedAt`.

Supporting multiple occurrences in storage does not settle how repeated achievements appear in the UI.

### Activation

An immutable first-earned event for one achievement-record instance, with `activatedAt`, triggering occurrence, pinned pack ID, version and digest, visual-edition ID, source-art hash, render-recipe version, and source indicating explicit or computed activation.

Corrections create audited updates or replacement records rather than silently changing the meaning of the original timestamp.

### GoalRule

Initially a small versioned `allOf` rule. A catalogue manifest uses pack-relative definition IDs that admission resolves only inside the owning pack; the admitted Archive model stores qualified `DefinitionRef` values. Any cross-pack reference requires an exact declared dependency and an explicit `PackDefinitionRef`, while local composite rules always store qualified references.

Do not introduce a general expression language until a real collection needs more than explicit conjunction and a decision records the cost.

### Appearance

An engine-neutral, serializable render recipe containing crop, position, shape preset, geometry version, thickness, edge profile, relief settings, material preset and parameters, border color, border width, texture-map references, and render version. Studio edits it; a published visual freezes it; Archive renders it read-only.

Appearance is independent of source art so Studio can edit it without destructive regeneration before publication. Persist no Three.js objects, GPU resources, shaders compiled at runtime, canvas state, or other renderer-specific scene objects.

### Render recipe semantics

Recipe coordinates are right-handed with `+X` right, `+Y` up, and the front face normal along `+Z`; the normalized badge width or diameter is `1.0`, and thickness, bevel, border, and relief values are fractions of that size.

Persisted crop and UV coordinates use a top-left origin with `u` increasing right and `v` increasing down; a renderer adapter performs any engine-specific vertical flip exactly once. The front and back winding, tangent basis, and OpenGL-style normal maps with positive green `Y` are fixed by golden geometry and UV fixtures.

Source framing first computes a shape-aware cover rectangle from decoded source dimensions and the exact target aspect: circle and square are `1:1`, rectangle follows its authored geometry, and shield follows its effective silhouette frame. Crop focus and scale then refine that rectangle. Live UV repeat and offset plus fallback image placement derive from the same normalized rectangle, so capability changes preserve aspect, crop, and framing for non-square sources.

Albedo assets normalize to sRGB, lighting calculations occur in linear space, output is sRGB, and normal, height, roughness, metalness, and masks remain non-color data. Persisted alpha is straight rather than premultiplied; adapters may premultiply only at their runtime boundary.

Every versioned material or geometry manifest defines defaults and valid numeric ranges, and schema validation rejects values outside them. The provisional base ranges are thickness `0.02–0.18`, bevel `0–min(0.04, thickness / 2)`, relief `0–0.05`, border width `0–0.20`, and normalized material channels `0–1`; changing meaning or ranges requires a render-recipe version and migration.

Small engine-neutral golden fixtures cover every shape with asymmetric source art, labeled front and back, UV corners, known crop, normal direction, and boundary values so a new adapter cannot mirror, invert, or materially reinterpret an old badge while accepting its recipe.

### ViewerState

Ephemeral UI state for camera orbit, zoom, key-light orbit, active interaction mode, and pointer or keyboard gesture state.

It resets to a versioned studio preset when a viewer opens or its authoritative source changes. Ordinary material, border, thickness, relief, shape, and crop edits preserve the mounted viewer's pose, zoom, light, interaction mode, engagement, capability, and selected fallback view so Studio can compare appearance without snapping the inspection session back to its preset. Viewer state is not part of `AchievementRecord`, backup, or catalogue state; a future explicitly saved showcase pose requires a new persisted type and migration rather than quietly promoting incidental viewer state.

### ArtAsset

Metadata for a content-addressed binary: content hash, MIME type, dimensions, byte size, role, sanitized provenance, local object reference, created time, and lifecycle state. Studio working assets and Archive installed-pack objects live in separate stores even when hashes match.

### StudioProject, ArtCandidateSet, and AssetDerivation

A Studio project is mutable developer state for a theme or badge release: source definitions or references, visual brief, uploaded originals, generation jobs, candidates, derivations, selection, appearance, validation state, and publish history.

A candidate set records the approved Studio input specification, candidate asset IDs, selection, generation status, and provider metadata without secrets.

A derivation records source asset, operation, parameters, tool or recipe version, and result asset; uploaded originals have no parent and are immutable. None of these Studio types are exported by `pack-contract` or readable by Archive.

### SayingDraft

The Archive saying draft stores the current accepted one-line saying, whether its latest accepted form was generated or directly authored, its update time, and optional generation provenance without secrets.

A regenerated line is a pending proposal, not an in-place mutation. Accepting a proposal or editing the text is an explicit user action, and neither operation changes the selected art or appearance.

Saving a planned or activated badge copies the accepted text and source into its `AchievementRecord`; an unaccepted proposal remains draft-only and never becomes the displayed saying by accident.

## Authority boundary

| Git and release authority                                 | Archive-local authority                                                        | Studio-local authority                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Application, contract, compiler, and renderer source      | Planned and earned state                                                       | Mutable projects and release candidates                  |
| Schemas, migrations, validators, and tests                | Occurrences and activation timestamps                                          | Uploads, candidates, and derivation graphs               |
| Catalogue source, composite rules, and pack-index records | Notes, sayings, visibility, collection settings, and issued authoring requests | Prompt and provider provenance without credentials       |
| Prompt recipes and versioned renderer manifests           | Local definitions and exact installed pack references                          | Selected working art and editable appearance recipes     |
| Deliberately promoted small fixtures and source assets    | Installed pack objects, Archive caches, and Archive backups                    | Studio object store, publish history, and Studio backups |

Never serialize personal state into catalogue files as a convenience.

Never store large images as base64 inside JSON, `localStorage`, or Git.

Published `.badgepack` or `.badgetheme` files are immutable distribution artifacts on local disk, release storage, or a future object store, not a bridge between the two private databases. Git may track a small registry entry with version, size, digest, and distribution metadata without tracking a heavy pack binary.

## Persistence

Archive IndexedDB stores personal structured records and installed content-addressed objects through Archive repositories. Studio IndexedDB stores projects and its own content-addressed objects through Studio repositories. UI components never open transactions directly, and no package may open the other application's database.

Every persisted shape has an explicit schema version, validated read path, migration path, and corruption error that distinguishes missing, unsupported, and unreadable data.

An unreadable store is not an empty store. Preserve it, stop automatic writes that could destroy recovery evidence, and offer backup or diagnostic guidance.

An IndexedDB open that is blocked by another Archive connection fails with actionable close-and-retry guidance instead of hanging. Rejected opens are not cached, version-change blocking closes only the repository-owned connection, and abnormal termination clears that connection so the next operation can reopen without a page reload.

Writes that affect one user action use a transaction boundary. Archive activation commits the occurrence, record state, activation timestamp, exact pack and visual-edition references, selected saying, and derived composite updates before animation begins.

Archive authoring-request export first persists the exact canonical payload and active lifecycle state, then emits those same bytes; a canceled file save can be retried without minting a different request. A confirmed replacement records the new request and supersedes the prior active request atomically. Targeted-pack installation binds the exact definition revision and marks the matching request fulfilled with its exact `PackRef` in the same transaction. A later semantic edit appends the new revision and removes its current-revision binding atomically while preserving prior fulfilled requests and the semantic and visual pins of existing records.

Studio publish freezes a release candidate, compiles and validates exact bytes without mutating the draft, and first persists a `PreparedRelease` containing its `PackRef`, canonical bytes, source-project revision, and `prepared` status. That transaction also appends `(packId, version) → packDigest` to the Studio `ReservedPackRelease` ledger before any external file handoff, so cancellation, project deletion, or an unobservable browser download cannot permit a same-version fork within that Studio data lineage.

File System Access export advances the history to `file-write-confirmed` only after the writable closes successfully; the browser-download fallback can record only `download-offered`, not disk success. A canceled, failed, or repeated export preserves the prepared release and re-emits the exact same bytes. Studio never claims an atomic destination write it cannot observe and never installs the release into Archive implicitly.

A sequential save queue coalesces safe redundant writes and prevents a slow earlier write from replacing newer state.

Each application uses its own sequential save queue, requests persistent browser storage where supported, reports when the browser refuses it, and keeps its distinct disk backup visible because browser storage is not the only durable copy.

### Stable origin contract

IndexedDB is scoped to the full browser origin, including port, so local startup treats one selected Badge site port as durable data identity rather than rotating to arbitrary Vite ports. Archive and Studio share that origin but use different versioned database names and repository adapters; sharing an origin does not authorize either build to open the other's database.

The launcher prefers one site at `http://127.0.0.1:4173`, with Archive at `/` and Studio at `/studio/`. When no machine-local origin record exists and unrelated software owns the preferred port, it finds one free non-reserved port beginning at `4180`, prints an explicit warning that any prior-origin data remains at its old address, and exclusively records the selected port in ignored `.badge-local/site.json`. Optional provider-companion ports `4175` and `4176` and disposable fixture origins `5173` and `5174` are excluded from fallback selection.

Every later start probes the Archive identity at `/` and the Studio identity at `/studio/` on the remembered origin. A complete existing Badge site is reused; a free origin starts the whole site; and an unrelated, unidentified, incomplete, or route-swapped listener produces actionable refusal instead of an origin change or partial second process. Archive-to-Studio and Studio-to-Archive links preserve the current origin and select the fixed route. The machine-local record owns only the address, never application data, and malformed records are preserved rather than replaced silently.

Each optional provider companion accepts only the exact remembered Badge site origin for its owning application route and requires a separate short-lived unguessable launch capability. Neither service is a cross-application API or filesystem bridge, and compromise of one capability grants no authority over the other service or database.

Lifecycle, browser, and terminal verification never use the canonical interactive record. The runner admits a branded task-owned target confined to an ignored `tmp/local-startup/` path, waits up to five seconds for Vite's active request work to become idle, attempts to close its owned server even when that barrier fails, cleans its owned record and listener on success and failure, and leaves an absent or legitimate pre-existing canonical `.badge-local/site.json` byte-for-byte untouched; repository gates therefore never require the canonical record to be absent. The launcher reads no other neighboring state file.

If the production origin, protocol, port, installed-PWA scope, local service, or desktop wrapper changes, ship an explicit export, import, or origin-migration path before cutover and test that intact data cannot merely appear lost.

Deliberate relocation requires explicit backup, restore, or another migration mechanism before the remembered site port changes. Separate route-specific HTML identity markers, entry points, Vite configs, output directories, CSP surfaces, service-worker scopes, database names, and persistence adapters prevent one build or an unrelated HTTP listener from masquerading as the complete site. Runtime identity requires the Archive marker without the Studio marker at `/` and the Studio marker without the Archive marker at `/studio/`.

## Media pipeline

Studio stores uploads, generated outputs, and derivatives by content hash in its private object store. Archive separately deduplicates admitted published objects by content hash without acquiring access to Studio storage.

Studio candidate identity is distinct from content identity. A version-2 original object carries a bounded set of admitted generated or uploaded candidate identities, and a version-2 derivative object carries a bounded set of exact parent-identity, operation, and result-identity lineages. This lets byte-identical generated and uploaded sources and their deterministic treatments coexist without duplicate binary storage, provenance loss, or duplicate UI keys. Every write validates the prospective complete derivation graph inside the transaction before mutation, and restore recomputes lineage identities before presenting them.

Legacy version-1 originals and derivatives remain preserved. A fixture-hash original is migration-ambiguous and retains both plausible original identities; a legacy draft whose hash matches more than one candidate restores with no selection and cannot autosave, process, or publish until the developer explicitly chooses. A version-1 derivative lacks a parent candidate identity and therefore remains evidence rather than a publishable candidate; the developer recreates an exact version-2 lineage by selecting a trusted source and applying the operation again.

Studio preserves uploaded originals and selected working art as authoritative private project data. Publication never copies an uploaded container blindly: Studio applies orientation, decodes the selected pixels, normalizes them to the approved color space and format, strips filenames, EXIF, GPS, XMP, IPTC, embedded thumbnails, opaque text or application chunks, and other ancillary metadata, and creates a content-addressed publish-safe derivative. Explicit license and sanitized provenance live in bounded manifest fields rather than image metadata. The developer previews the outgoing dimensions, format, byte size, and retained manifest metadata before publication.

The foundation upload boundary accepts only declared PNG, JPEG, or WebP files at most `16 MiB`, parses dimensions from bounded container headers before invoking the browser decoder, and rejects an axis above `8192` pixels or more than `16,777,216` pixels. It validates decoded dimensions against the parsed header, allowing only an exact width-and-height swap to accommodate browser-applied orientation, closes every decoded bitmap, and refuses invalid stored assets before further persistence. A synchronous Studio operation gate excludes upload, processing, selection, appearance edits, and competing publication while one asynchronous operation is active. Integrity-checked built-in candidates and local candidates carry an immutable Blob snapshot, and processing and publication use that Blob rather than re-fetching the display URL; publication also snapshots the selected bytes and render recipe before its first asynchronous boundary so later mutation cannot change what the validated release contains.

A published pack preserves only the publish-safe runtime source and required non-reproducible maps, and every object in its manifest must be reachable from a runtime manifest field. Archive preserves every authoritative object in every installed pack and exact dependency, not only objects currently referenced by planned or earned records; thumbnails and other caches are disposable only when reproducible from those authoritative inputs.

Validate MIME type, decoded dimensions, byte size, supported format, and forbidden ancillary metadata before publication and again during Archive admission; do not trust the file extension or Studio's earlier validation.

Studio processing is non-destructive and produces a derivation graph. A failed, canceled, or superseded derivation never changes the Studio selection.

Studio candidate cleanup operates on explicit asset lifecycle state and reference counts, not directory age or broad folder deletion. Archive pack uninstall refuses or defers removal while any personal record pins the version or object.

Selected two-dimensional art maps onto the 3D front surface through versioned UV and crop parameters. Normal, height, roughness, mask, and other maps derived for relief or material response reference the immutable source and remain regenerable when their recipe is deterministic.

## 3D rendering boundary

The renderer consumes a serializable appearance recipe, resolved local asset URLs, a studio-light preset, ephemeral viewer state, and capability information. It returns pixels and interaction events without changing domain records or owning user data.

Archive rendering accepts only a branded resolved `RenderableBadge` and exposes camera, zoom, and inspection-light commands without appearance mutation. Studio rendering accepts a validated Studio preview type and exposes construction controls; both use the same recipe semantics and renderer adapters without sharing persistence.

Use parametric geometry for ordinary circle, square, rectangle, and shield bodies rather than storing a unique heavy mesh per badge.

Each mounted live viewer owns a `RendererSession` that registers every animation frame, event listener, observer, pointer capture, asynchronous loader and abort controller, object URL, decoded `ImageBitmap`, geometry, material, texture, render target, environment or PMREM target, and rendering context it creates. Shared resources belong to an explicit reference-counted cache owner rather than an arbitrary viewer.

`RendererSession.dispose()` is idempotent: it stops future frames, aborts loaders, releases pointer capture, removes listeners and observers, revokes object URLs, closes decoded images, decrements shared references, and disposes session-owned CPU and GPU resources. Ordinary recipe replacement disposes only superseded geometry, material, and framing resources while preserving the Canvas and graphics context; source-texture framing invalidates only for a new decoded source, graphics context, shape, or crop. A dedicated context may be deliberately lost only when its ownership is exclusive, and an explicit recovery generation rather than a recipe scalar keys a live renderer remount.

WebGL2 is the provisional supported baseline; WebGPU may be an optimization later but cannot be the only path. Three.js with React Three Fiber is the leading Phase 0 candidate, not yet an accepted dependency, and the persisted recipe must survive replacing it.

Render on demand while idle and continuously only during direct manipulation, material transition, or activation motion. Clamp device pixel ratio, texture resolution, camera distance, and light range to preserve clarity without exhausting memory or allowing the object to clip, disappear, black out, or blow out.

Viewer input has explicit `unengaged`, `focused`, `engaged`, `object-drag`, and `light-drag` states. `Tab` focus enters `focused` and announces instructions without intercepting page navigation; handled `Enter` or `Space` prevents its default and enters `engaged`; `Escape` cancels a drag and returns to `focused`; blur or outside focus returns to `unengaged`.

Pointer-down focuses and engages the viewer, captures that pointer, and begins the drag selected by the visible mode. Every transition out of `object-drag` or `light-drag`—including pointer-up, pointer-cancel, lost capture, mode change, `Escape`, blur, and outside focus—releases capture when held and clears queued pointer and wheel deltas before entering the destination state; a mode change completes that cleanup before activating the new mode.

Wheel or trackpad input uses one viewer-owned native listener registered with `{ passive: false }`; it prevents page scrolling only while the engaged viewer is under the pointer and otherwise leaves ordinary page scroll untouched. Cleanup removes that exact listener. Orbit, zoom, light, and reset keys prevent their browser defaults only in `engaged` or drag states. Convert `deltaMode` to CSS pixels, aggregate once per animation frame, cap each frame to `100` pixels, and map that cap to a `10%` multiplicative zoom step within `0.65–2.5` times the fitted-object scale.

Arrow keys orbit the active object or key light by `5°`, and `Shift` reduces the step to `1°`. Physical `Equal` and `Minus` codes, displayed as `=` and `-`, plus `NumpadAdd` and `NumpadSubtract`, zoom by `10%`; `Shift` reduces those commands to `2%`. Visible reset buttons remain the discoverable keyboard path and list the active bindings. Object yaw is continuous with pitch clamped to `±85°`, and key-light elevation stays within `5–85°`. Pointer, keyboard, and touch adapters emit the same renderer-neutral orbit, zoom, light, engage, disengage, and reset commands.

Recover from WebGL context loss by disposing the failed session and rebuilding resources from the recipe and authoritative assets under a new explicit recovery generation. Forced fallback skips the WebGL2 capability probe and live Canvas entirely on first render; disabling that control performs one cancellable probe before attempting live construction. If capability initialization still fails, a renderer-independent SVG or Canvas 2D adapter composes source art with versioned front, edge, and back templates from the recipe; it works with an empty cache on first run and after clean restore, labels the degraded result, and never shows an empty canvas as success. Its front, edge, and back representations share one responsive shape-aware frame so every view retains the same physical object height.

The CPU fallback is reproducible from the backed-up recipe, source assets, and Git-tracked versioned templates, so its outputs are disposable caches rather than required backup payload. Unsupported old template versions are a migration error, not permission to reinterpret or flatten the badge silently.

Gallery thumbnails and GPU snapshots use a versioned `RenderFingerprint` covering adapter and build, geometry, material, shader, and template manifest hashes, source and derivative hashes, environment or studio asset hash, tone mapping, exposure, output color space, quality tier, actual pixel dimensions, device-pixel-ratio tier, and relevant capabilities. Badge Studio construction and Archive detail views remain live 3D surfaces.

A matching fingerprint means cached inputs are still valid, not that different GPUs or drivers produce byte-identical pixels. Canonical visual regression uses a pinned capture environment with tolerance-based comparison; cross-device review checks geometry, crop, orientation, material, and interaction invariants rather than exact pixels.

## Generation boundaries

The Studio art-generation application port accepts a normalized art brief, approved Studio source-asset references, candidate count, appearance context when relevant, request identity, and cancellation signal.

It returns untrusted candidate descriptors and provenance without deciding selection, publication, installation, or activation.

The art brief and candidate role require source artwork rather than a composed badge render: no physical rim, thickness, bevel, reverse face, cast shadow, presentation background, or badge-level material and studio lighting. Studio candidate comparison applies the current live 3D recipe uniformly, and a composed preview is always a derivative rather than the authoritative source asset.

A separate Archive saying-generation port accepts only the badge title, criterion, optional saying-specific direction, request ID, and cancellation signal, then returns a proposed line and provenance. Adding description or any other field requires a new explicit outbound-data decision and disclosure surface; the port cannot import Studio or art-generation code.

Only the final `Generate saying` command and `Try another` may invoke that port, and one command creates at most one provider attempt with no automatic retry, repair, or fan-out. The first generate command opens the provider-and-payload review without calling the port, and the review sheet's final generate command performs the attempt; changing provider or outbound scope invalidates that acknowledgment. Initialization, badge selection, detail or activation-form opening, activation commit, ceremony or replay, reload, restore, and background processes have no dependency path to the port and must remain negative-call contract cases.

Saying-specific direction is a closed optional object containing curated non-personal theme cues, voice, variation, and deliberately supplied user direction, with the exact field and total-payload ceilings in `docs/design/product-spec.md`. User direction may contain personal text and therefore remains part of the visible outbound disclosure. The internal port request also carries request identity and cancellation state, but those values are never serialized into the model prompt. The adapter owns the exact versioned system and user prompt recorded in the product spec; it never derives prompt context from personal notes, dates, occurrences, accepted sayings, visibility, art, or other Archive state.

`saying-contract` is the provider-neutral executable boundary for that prompt: it canonicalizes and caps the outbound JSON, strictly admits bounded provider JSON, normalizes its one logical line, rejects unsafe Unicode controls and invisible-only content, redacts raw malformed output from public errors, and carries provider, model, prompt-version, and generation-time provenance without credentials.

Archive keeps the accepted saying and pending proposal separate. Retrying a saying request never invokes art generation, changes the published visual binding, or overwrites accepted text; only explicit acceptance or direct editing updates the draft. Studio cannot read either saying value, while installing or updating a pack in Archive preserves both without mutation.

The saying controller assigns a monotonically increasing request ID and applies results only from the latest active request. Starting a retry retains the existing pending proposal; stale, canceled, invalid, and failed results are ignored or reported without replacing it.

Normalize proposals and direct input by trimming outer whitespace and collapsing internal whitespace, including line breaks, to one space. Count Unicode grapheme clusters through one shared domain validator, reject empty values and values over the provisional 120-grapheme limit, and never truncate stored or displayed text silently.

Tests use separate deterministic Studio art candidates and Archive saying proposals so product work does not spend model budget or require network access.

Live Studio adapters disclose the destination and exact outbound visual fields before media leaves the device. Live Archive saying adapters disclose the destination and exact minimal text fields and exclude description, notes, dates, occurrence data, accepted sayings, visibility, art, and unrelated draft fields by default. Both support cancellation. Privileged Studio credentials remain in the Studio companion, OS credential boundary, or later wrapper; privileged saying credentials remain independently in the Archive saying companion, OS credential boundary, or later wrapper. Neither credential enters browser code, application data, backups, packs, prompts, or Git, and the feature remains manual or fixture-backed when no safe authorization path exists.

Pin a product-called model only in its owning adapter's repo-owned configuration when live integration is implemented; do not scatter model IDs through UI or domain code. Archive bundle-graph and blocked-network tests prove no visual provider, prompt recipe, provider SDK, or art endpoint enters the everyday build.

## Pack publication and admission

`pack-contract` defines bounded `.badgetheme` and `.badgepack` containers with `ThemePack`, `CatalogueBadgePack`, and `TargetedVisualPack` kinds. The canonical manifest includes pack ID, semantic version, schema version, minimum Archive version, exact dependency `PackRef` values, ordered object table, compatibility data, licenses, sanitized provenance, and the fields allowed by that closed pack variant. `PackRef` is exactly `{ packId, version, packDigest }`.

Pack objects are embedded binary entries addressed by SHA-256, never base64 or remote URLs. Packs contain no JavaScript, HTML, executable SVG, arbitrary shader, provider instruction, filesystem path, network location, candidate set, pending proposal, or generate-later placeholder.

The canonical container is an uncompressed ZIP with normalized forward-slash NFC entry names ordered by their UTF-8 bytes, fixed `1980-01-01T00:00:00` entry timestamps, fixed attributes, no comments, no extra fields, and no encryption. `manifest.json` is UTF-8 without a byte-order mark and uses the repo-owned canonical JSON serializer covered by golden byte vectors; binary entries appear at `objects/<lowercase-sha256>`. `packDigest` is SHA-256 over the complete container bytes and is deliberately not stored inside the container it identifies. Object hashes remain inside the manifest.

The Studio-only compiler transforms a frozen release candidate into those canonical bytes and must produce byte-identical output across repeated supported-platform runs. Compilation success is not trust: Archive stages the complete file, computes its pack digest, and applies independent container, schema, object-reachability, object-hash, MIME, forbidden-metadata, decoded-dimension, per-object, aggregate decoded-memory, entry-count, total-size, archive-expansion, traversal, and compatibility validation. It then validates the admitted root and explicitly staged dependencies as one exact graph, rejecting missing or extra packs, duplicates, cycles, same-version forks, kind mismatches, recipe shapes or materials absent from the exact theme, and visual fallback IDs absent from that theme before previewing and atomically installing the closure after confirmation.

Every runtime-visible badge must resolve exactly one selected source-art object, complete render recipe, accessible description, fallback-compatible inputs, and exact theme dependency. Missing or corrupt data creates a damaged-pack repair state and never exposes a generate button.

A `TargetedVisualPack` must include the matching authoring-request ID, local definition ID, semantic revision, and digest and may contain no semantic or collection fields. Admission compares those values with durable issued-request state and the current `LocalDefinitionRef`: the pack cannot replace the local title, criterion, description, lifecycle, or any personal field. An ID collision without an active matching request fails before installation and reports whether Studio must republish with the original request or a new definition ID.

Installed versions are immutable by `PackRef`. Installing the same bytes is idempotent, while reusing `(packId, version)` with a different digest is a rejected same-version fork; a changed artifact must increment its version. Archive appends every admitted mapping to an immutable `SeenPackRelease` ledger before installation, and Studio uses its independent `ReservedPackRelease` ledger before export. These small ledgers survive uninstall and project deletion and are unioned, never rolled back, during restore, with any conflicting mapping rejected before mutation. Updates coexist with versions pinned by planned or earned records until an explicit reviewed migration creates a new reference, and uninstall cannot orphan a personal record or delete its required objects.

Each pack is self-contained for the objects in its manifest and may depend only on exact other self-contained packs through `PackRef`; there is no loose asset sidecar. Git contains pack schemas, compiler and admission code, small synthetic source fixtures, source metadata, built-in manifest source, and optional small registry records containing version, byte size, and digest. Heavy curated pack files ship on local disk or release storage outside ordinary Git until an explicitly chosen object store exists.

## Catalogue behavior

Catalogues are versioned, read-mostly inputs admitted from built-in or explicitly imported published packs. Every starter definition, suggested badge, and composite arrives with one complete published visual; there is no generate-on-first-view or generate-on-activation fallback.

Personal overlays reference qualified `DefinitionRef` and `CollectionRef` values and survive catalogue updates without raw-ID lookup. A locally created definition must bind to an already installed published visual edition, or remain outside the browseable and activatable catalogue until an explicit Studio-authored pack is installed.

Composite eligibility resolves a prepublished composite visual from the installed pack. Reaching the rule threshold never invokes Studio, an art provider, or an appearance editor.

Composite activation records the rule version, qualifying `DefinitionRef` values, exact qualifying record IDs, and catalogue `PackRef` used to reach eligibility.

Renames and retirements preserve stable qualified identity. Removing a tracked definition never orphans or deletes a personal record silently.

The exact historical behavior when a catalogue expands remains a product decision; storage preserves enough provenance to show both historical completion and current-edition progress. Catalogue and visual updates coexist with immutable versions pinned by planned and earned records until an explicit reviewed migration says otherwise.

## Visibility

Persist visibility as a nullable override rather than a flattened boolean.

Collection overrides live in `CollectionSettings`, never `CollectionDefinition`.

Effective visibility is presentation-context-specific and resolves `achievement override → current collection settings → profile default`; without a collection context it resolves `achievement override → profile default`.

An achievement appearing in several collections is evaluated independently in each collection. Standalone multi-collection sharing is undefined and therefore private until a product decision supplies a safe precedence rule.

Notes remain separately private by default, and a future presentation adapter must select allowed fields explicitly rather than serializing an entire achievement record.

## Backup and restore

Archive and Studio have distinct, visibly labeled `.badgearchive` and `.badgestudio` backup formats. Neither application accepts the other's backup as a partial import, and a published pack is a transfer artifact rather than a substitute for either backup.

An Archive backup is self-contained for the personal archive: it contains a consistent canonical record export, profile and collection settings, local definitions, all issued authoring-request payloads and lifecycle state, the complete `SeenPackRelease` ledger, every installed pack manifest, every authoritative object and exact dependency for every installed pack, accepted sayings, notes, dates, activation data, visibility choices, schema and catalogue versions, a manifest, and checksums. It excludes Studio projects, prompts, uploads, rejected candidates, raw provider responses, and credentials.

A Studio backup contains its consistent project database, uploaded-original bytes, every retained candidate object, the derivation graph and every selected or non-reproducible derivative object it references, working selections, editable appearance recipes, the complete `ReservedPackRelease` ledger, publish history and exact prepared-release bytes, sanitized provenance, a manifest, schema versions, and checksums. It contains no Archive profile, occurrence, activation, note, saying, or visibility data.

Each application uses the native file picker when available and a browser download fallback elsewhere. Reproducible thumbnails and renderer caches are omitted from both formats.

Restore first checks the format discriminator, parses into an isolated staging area, validates checksums and references, migrates supported versions, and unions the incoming and current immutable release ledgers. A conflicting digest for an already seen or reserved `(packId, version)` aborts before mutation. The application reports the full plan and, after explicit confirmation, atomically replaces mutable state while retaining that monotonic ledger union.

The current foundation implements the narrower `.badgearchive` v2 record slice before installed-pack storage exists. Its UI accepts exactly the four starter record IDs and rejects any missing or additional record. Within those IDs, an incoming record that remains unearned must match the complete immutable starter lineage; an earned snapshot may preserve historical semantics, version, digest, edition, recipe, and source only when its complete qualified definition and the `packId` lineage of both published and activated visuals remain unchanged. Repository restore preserves every existing earned record exactly and raises `BACKUP_CATALOGUE_MISMATCH` when a current unearned record would be rebound, while permitting a matching-identity self-contained earned transition. Backup size is refused before browser allocation. Normal restore and readable-incompatible-state replacement each offer a safety backup in one action before a separate explicit saved-copy confirmation can mutate state; the exact exported state is retained as a checkpoint and compared in the final write path, so any intervening tab or local mutation refuses with `RESTORE_CONFLICT` and requires a fresh handoff. Replacement eligibility is reclassified from that fresh checkpoint: a compatible healthy snapshot returns to normal monotonic restore with a full backup, and a compatible damaged snapshot returns to repair. When damaged historical art makes a self-contained backup of an exact incompatible checkpoint impossible, replacement instead offers a privacy-sensitive `.badgeevidence.json` export containing the exact readable state, its digest, omitted earned-source hashes, and explicit non-restorable limitations; the same checkpoint comparison and second confirmation still apply, and the evidence file is ignored and rejected by Git delivery gates. Corruption repair that cannot export a valid current archive remains a distinct quarantining path.

Normal restore validates every source byte carried for incoming earned records. Backup parsing proves source-manifest closure before image work and charges required PNGs against one aggregate `64 MiB` decoded budget before inflation. Explicit corrupt-store recovery audits every reference recoverable from readable current state or, when state is unusable, from incoming state; structured-clone-aware compare-and-swap detects concurrent changes to binary and built-in container values while keeping the transaction active. Earned-source integrity is audited before starter compatibility classification, so a combined damaged-source and incompatible-state case repairs source evidence first and only then promotes a separately confirmed readable replacement after the post-repair check. Source-only repair quarantines corrupt bytes but preserves readable state even when the repair backup is older, repairs trusted built-in sources only from hash-checked fixture inputs, and fails without mutation when a required source is unavailable. If the missing source is not reconstructable and the readable state is also incompatible, the UI promotes the already validated incoming backup into the separately confirmed state-rescue replacement flow rather than pretending a complete safety backup exists. Unreadable state is quarantined and replaced from the backup; readable but starter-incompatible state is replaced only through its separately labeled safety handoff and confirmation flow, records the reason in quarantine evidence, and must pass visual audit plus compatibility again before the UI opens.

Never partially merge a corrupt archive into healthy state.

## Future multi-user migration

Stable owner and entity IDs, catalogue-versus-personal separation, nullable visibility overrides, immutable pack references, and provider-independent asset references keep the model migratable.

A future server can implement Archive repositories and the saying-proposal port without moving product rules into React or changing the meaning of activation. Studio authoring, pack publication, pack distribution, and any art-generation service remain separate developer and release concerns rather than user-account features by default.

Accounts, remote object storage, permissions, and sync conflict behavior are new architecture work and are not to be prebuilt into Phase 1 screens.

## Test and observability contracts

Pure Archive domain tests cover lifecycle transitions, composite eligibility, visibility precedence, qualified identity, two unrelated packs with coincident raw definition and collection IDs across settings, records, overlays, and progress, date-range validation, pinned visual editions, saying proposals, and viewer command clamping without a browser environment. Pure Studio domain tests separately cover candidate and derivation state, non-destructive selection, appearance edits, release freezing, and publish-state transitions.

Golden recipe tests load asymmetric front and back fixtures through every adapter and assert handedness, winding, UV orientation, crop, color-space declarations, normal direction, alpha convention, and numeric boundaries before visual comparison.

Pack contract tests compile the same frozen input repeatedly on every supported platform and compare exact golden container bytes and digests. They round-trip canonical fixtures and attack admission with wrong object or pack digests, noncanonical JSON or ZIP metadata, same-version forks, unknown fields, illegal catalogue-versus-target variant mixtures, unreferenced objects, missing or extra dependencies, invalid exact-theme fallback IDs, duplicate entries, cycles, traversal paths, decompression bombs, hostile dimensions, per-image and aggregate decoded-memory overruns including grayscale-to-RGBA expansion, mislabeled MIME types, EXIF or GPS payloads, opaque ancillary chunks, executable formats, remote references, arbitrary shaders, and unresolved visuals. Lineage fixtures prove same-pack updates retain qualified definition and collection identity, unrelated packs with coincident raw IDs cannot rebind each other, and composite references cannot escape their allowed namespace or undeclared dependency. A Studio compiler success never substitutes for an independent Archive admission test.

Persistence tests use isolated IndexedDB implementations and cover every Archive and Studio migration, corrupt-row refusal, transaction atomicity, blocked and terminated connection recovery, rejected-open retry, structured-clone compare-and-swap, qualified-reference round trips, two-pack raw-ID collisions, asset deduplication, and the absence of cross-database access. Authoring-request tests cover export, exact re-export after cancellation or reload, semantic edit after export, automatic stale-request supersession, edit after fulfillment, edit after planning or activation, preservation of prior semantic and visual pins, restore, active-request fulfillment in the pack-install transaction, same-pack idempotency, different-pack replay refusal, and ID collision refusal. Studio release tests prove preparation reserves an exact version and bytes before handoff, failed or canceled file saves re-export those bytes, file-handle close and browser download produce distinct truthful statuses, and no path creates a same-version fork. Ledger tests cover uninstall or project deletion followed by conflicting reuse, exact reinstall, older-backup restore merged with newer local history, clean-profile restore, and conflict refusal. Backup tests restore an entirely unplanned installed pack with every dependency and a Studio project with the actual selected, non-reproducible derivative, and prepared-release bytes; cross-format restore is refused.

Archive component tests cover gallery states backed only by admitted visuals, damaged-pack recovery routing, pre-allocation backup refusal, two-step restore safety confirmation, latest-request saying concurrency, retry failure and cancellation, saying normalization and length validation, proposal acceptance, direct saying edits, engagement and scroll-release states, native non-passive wheel ownership, pointer cancellation and mode changes, normalized wheel deltas, object-versus-light interaction mode, keyboard increments, reset behavior, activation confirmation, focus order, and reduced motion. Shared renderer contracts additionally prove that live and fallback map the same non-square source rectangle, every shape keeps equal front, edge, and back physical height, repeated recipe edits preserve Canvas, texture-framing inputs, pose, light, mode, engagement, capability, and fallback view, source replacement starts a new session, explicit recovery changes the Canvas generation, and forced fallback invokes no capability probe. Studio component tests separately cover candidate comparison, synchronous upload-processing-publication exclusion, non-destructive processing and selection, appearance controls, validation, frozen publication, and preservation of drafts after failed or canceled work.

An instrumented renderer stress test runs at least `50` mount → recipe replacement → context loss → restore and rebuild → render → dispose cycles and proves session, animation-frame, listener, observer, pointer-capture, loader, object-URL, decoded-image, shared-reference, geometry, material, texture, render-target, environment-target, and context counts return to their recorded baseline after every completed cycle. Recipe-edit controls also prove that Canvas and context counts remain unchanged while only superseded recipe resources turn over. A separate `50`-cycle forced-initialization-failure branch proves fallback creation and disposal without invoking the capability probe or entering restoration.

Local-startup contracts cover one-port selection across the valid non-reserved range, exact and mutually exclusive Archive and Studio route identity, Studio document deep-link routing, free, Badge, unrelated, unresolved, incomplete, and route-swapped listeners, remembered-origin continuity, malformed-record preservation, concurrent first publication, read-during-publication invisibility, interrupted-publication and listener-cleanup failure, bounded request-idle draining with an unconditional owned-close attempt, terminal listener disposal, and the rule that `.badge-local/site.json` is the sole startup record. Verification-target contracts admit only branded paths under ignored `tmp/local-startup/`, exercise absent and sentinel canonical state, and prove exact canonical-state invariance; a source-boundary check proves executable verification can call only the verification-target factory and never references `.badge-local`.

Archive Playwright starts from `/` on the remembered Badge site and covers installation of a deterministic prepublished pack and the Yosemite acceptance journey with no Studio controls: real pointer rotation, native engaged-only wheel zoom and disengaged page-scroll release, light adjustment, keyboard equivalents, context-loss recovery, forced first-run and post-restore WebGL initialization failure with zero capability-probe calls, equal-height front, edge, and back fallback views, saying retry and direct editing, saying-provider disclosure, multiline paste, over-limit validation, narrow-layout wrapping, activation reload safety, composite completion, and Archive restore into a clean profile. Network interception proves browsing, inspection, and activation never request visual generation.

Studio Playwright separately starts from `/studio/` on the same remembered origin and covers three genuinely distinct fixtures, direct deep-route reload, navigation to Archive and back without changing origin, explicit import of a minimal `.badgebrief`, upload and processing success or failure, publish-safe metadata stripping and preview, crop and appearance construction, cancellation, validation, immutable publication, Studio restore, and explicit installation of the resulting target pack into a clean or restored Archive. The launcher browser control occupies preferred port `4173` with unrelated software, selects one fallback listener, loads and reloads both routes, reuses the site from a second launch, emits no console errors, and then closes only its task-owned listener; a separate terminal-input contract proves `Ctrl+C` requests exit and disposes its listener. Boundary tests prove request-field minimization, supersession and replay behavior, conflict refusal, provider-contract dependency direction, companion capability and owning-site-origin restriction, route identity, separate service-worker scopes, database names, repositories, backups, and build outputs, plus Archive dependency and bundle graphs that reject Studio, pack compiler, art prompt, art provider, candidate, upload-processing, and appearance-editor modules.

Visual evidence compares the chosen references with implementation screenshots at matched state and at least two desktop-like viewports. Archive evidence captures the gallery, detail, activation, damaged-pack, and fallback states without authoring controls; Studio evidence captures candidates, upload processing, construction, validation, and publication. Both capture front, oblique, edge, and back views across representative materials and light positions and include a short rotation, zoom, and light-manipulation recording before a sweep for unrelated defects.

Actionable Archive debug output may expose current route, selected collection and badge IDs, lifecycle state, admitted pack references, pending write or saying status, and effective visibility without exposing notes, credentials, raw personal media, Studio project IDs, candidates, prompts, or art-provider state. Studio debug output is separate and may expose project, candidate, derivation, validation, and publish status without credentials or raw media bytes.
