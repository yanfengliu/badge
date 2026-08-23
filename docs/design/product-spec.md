# Product Specification

## Status and authority

This document combines owner-confirmed intent with repository design decisions and explicit recommendations.

Statements attributed to the owner or repeated as product scope are confirmed; language marked `recommended`, `provisional`, or `open` is guidance that future work may supersede through the decision process rather than an owner mandate.

The open decisions at the end are hard boundaries future agents must not silently guess.

The initial user is the repository owner, using the app locally with no account or server.

## Domain language

### Collection

A thematic set such as `U.S. National Parks`, `Books I Have Read`, or `Life Milestones`.

A collection can come from the Git-tracked catalogue or be created locally by the user.

### Badge definition

The durable concept that can be planned or earned, such as `Visited Yosemite` or `Read Sapiens`.

A definition contains a stable ID, title, criterion, description, collection relationships, optional composite rule, and catalogue provenance. Studio prompt recipes and visual briefs are release-authoring data rather than Archive definition fields.

Every definition exposed in the archive resolves through an installed published pack to one final badge presentation before it can appear in the gallery or be activated.

### Published badge pack and theme

A theme is a versioned visual family for a collection or related definitions. A published badge pack is the immutable, validated output of Badge Studio. A catalogue pack owns collections, composite rules, and complete packaged definitions with exactly one presentation each. A targeted visual pack instead contains exactly one local Archive definition ID, semantic revision, issued request ID, request digest, and presentation; it cannot carry definitions, collections, composite rules, semantic fields, or personal fields. Each presentation contains one selected publish-safe source-art asset, an engine-neutral 3D render recipe, fallback-template references, sanitized provenance, asset hashes, and compatibility metadata.

Prompts, rejected candidates, provider credentials, raw provider responses, and unfinished appearance choices are Studio workspace data and never enter a published pack.

Pack-owned collection and definition IDs are qualified by `packId`. Later versions of the same pack lineage may retain them; unrelated packs use different pack IDs, so coincident raw IDs never rebind personal records, progress rules, or catalogue entries.

### Personal achievement record

A local record instance for a qualified local-or-pack definition reference, including its pinned semantic revision or snapshot, state, occurrence information, activation timestamp, selected saying, optional note, visibility override, exact `PackRef { packId, version, packDigest }`, and published visual-edition identity captured for that memory.

Storage permits more than one record for the same owner and definition until repeat-achievement cardinality is decided; it must also permit several occurrences to reference one record.

Personal records never enter the Git-tracked catalogue automatically.

### Occurrence

A dated real-life instance of an achievement, such as a particular Yosemite trip or rereading a book.

The domain can associate an occurrence with a record without requiring either one record per occurrence or one record per definition, because the exact repeat-achievement cardinality remains open.

### Local collection settings

The owner's local settings or overlay for a catalogue or custom collection, including visibility override and later presentation preferences.

Collection visibility is personal state and never lives in a Git-tracked collection definition.

### Activation

The explicit event in which the user marks an achievement earned.

The activation timestamp records when the action happened in the app and is distinct from when the real-life achievement occurred.

### Composite achievement

A badge whose eligibility is derived from other activations, such as `Visited every U.S. national park`.

Composite eligibility is deterministic; the user does not manually edit its progress count.

### Art asset and candidate set

An art asset is an uploaded original, generated image, processed derivative, selected Studio final, or installed published source stored locally by content hash.

A candidate set records one Studio generation or processing request, its distinct proposals, their provenance, and the developer's selected candidate if any. Candidate sets never enter archive persistence or archive backup.

### Appearance

An engine-neutral versioned 3D render recipe applied non-destructively to source art: crop, position, shape, thickness, bevel or edge profile, relief, material parameters, border color, border width, and texture mapping.

At minimum, shapes include circle, square, and rectangle; the selected mock also includes a shield preset.

At minimum, materials include substantial metal and wool or armband fabric; additional finishes such as enamel may be added through the same system.

Source art remains an immutable input. Generated albedo, normal, roughness, height, mask, or other render maps are replaceable derivatives with recorded provenance.

Badge Studio edits and publishes appearance. The archive treats the published picture and appearance as read-only presentation data; object rotation, zoom, and light movement examine it without changing it.

## Interactive 3D artifact

Badge Studio and the archive badge-detail view render the badge as a real-time 3D object, not a flat image with simulated tilt. It has visible silhouette, thickness, edge construction, front relief, a coherent back, and material response that holds up from front, oblique, edge, and back views.

Primary mouse drag rotates the badge around its center, and the wheel or trackpad gesture zooms within limits that prevent clipping or losing the object. Rotation permits genuine edge and back inspection rather than a shallow two-dimensional wobble.

A separate visible `Adjust light` mode lets pointer drag orbit the key light while leaving ordinary drag dedicated to the object. Rotation and lighting update highlights, reflections, self-shadow, and relief in real time; the effect is not baked into the source image.

The viewer provides visible `Reset view` and `Reset light` actions, concise interaction instructions, pointer capture during drag, and an obvious way to release focus so wheel zoom does not trap page scrolling.

Pointer-down focuses and engages the viewer, then begins object or light drag according to the visible mode. Keyboard focus alone shows instructions without intercepting navigation; `Enter` or `Space` engages keyboard control, `Escape` disengages it while retaining focus, and focus moving outside returns the viewer to rest. Pointer-up, pointer-cancel, lost capture, or a mode change ends any active drag.

Camera orbit, zoom, and light position are session viewer state and reset to a deliberate studio default when reopened. Saving a personal showcase pose is deferred and must not be inferred from ordinary examination.

Gallery grids may use version-addressed cached renders for performance, but selecting or opening a badge reveals the live 3D artifact. When GPU initialization fails, a renderer-independent SVG or Canvas 2D fallback composes the immutable source art with versioned front, edge, and back templates from the same recipe; it labels the degraded view and works on first run, after clean restore, and without any prior GPU cache.

Direct manipulation never auto-saves a changed badge appearance, never modifies source art, and never affects activation, notes, sayings, or visibility.

## Recommended lifecycle

- `suggested`: an installed-pack definition offered by the catalogue or ranked from installed definitions by a model and not yet accepted; a model idea without an admitted published visual is not an Archive badge state.
- `draft`: locally created and still being authored.
- `planned`: intentionally kept as a visible future goal.
- `earned`: activated by the user.
- `archived`: a recommended retained-but-hidden state whose exact recovery and deletion behavior remains open.

Do not default to punitive `locked` language.

A badge may exist before it is earned, be created retrospectively after the event, or be suggested through an installed pack. Visual generation and presentation selection occur only in Badge Studio before the archive receives it.

## Gallery experience

The collection is the primary emotional surface, not a metrics dashboard.

The opening experience emphasizes beautifully rendered badges, meaningful collection progress, recent memories, and a small number of useful next actions.

The selected gallery direction uses a warm editorial field archive with a large crafted badge, concise metadata, restrained topographic detail, and generous space.

Navigation should make collection browsing, goals, and creation easy without advertising every feature at once.

Earned and planned badges must remain visually distinguishable without making planned badges feel like failures.

The archive has no art-generation, upload, reprocessing, candidate, prompt, crop, material, border, or publish controls. Each visible badge arrives with one decided picture and complete 3D presentation; loading, missing, corrupt, or incompatible pack assets are actionable installation errors rather than invitations to generate in place.

**Provisional Archive-first recommendation pending open decision 19:** creating a local semantic definition in the archive does not make it a browseable badge. The user explicitly exports a minimal Studio authoring request containing a random request ID, local definition ID, current semantic revision, title, criterion, optional deliberately included description, schema version, and a digest of those canonical fields; it excludes visual direction, prompts, owner identity, dates, occurrences, activation, notes, sayings, visibility, collection settings, and assets. Archive durably records the exact issued request as active. Editing the definition creates a new immutable revision, supersedes any active request, and invalidates the current revision's visual binding after warning that Studio work and visual fit are stale; prior fulfilled requests and planned or earned records retain their pinned historical semantics and visuals. A returned Studio target entry must match both durable request state and the current semantic revision before the new revision can enter planning or activation, and it cannot overwrite local semantic or personal fields. Installation marks the request fulfilled with the exact `PackRef`, same-pack replay is idempotent, and stale, superseded, or conflicting returns fail before mutation. Directly reusing another definition's presentation is not assumed until open decision 16 is resolved.

## Badge Studio developer mode

Badge Studio is a dedicated developer and curator application, not a route, drawer, advanced panel, or hidden button inside the everyday archive.

A Studio project starts from a theme, packaged catalogue definition, explicitly imported minimal Archive authoring request, or blank developer draft. The request is previewed before export and validated as untrusted on import; Studio never opens the Archive database. A project contains visual direction and publishing metadata, never owner identity, personal activation, dates, occurrences, notes, sayings, visibility choices, or collection settings.

Studio proposes multiple genuinely different art candidates, defaulting to three in the selected design. The current recommendation is to vary them across literal, symbolic, and map, pattern, or narrative compositions; that taxonomy is not an owner-mandated product rule.

Candidates appear at a useful comparison size with clear keyboard-reachable selection state. The developer can select one, regenerate the set, refine one candidate, upload an image, process an upload, or leave without losing the Studio draft.

An uploaded original is preserved unchanged in Studio. Optional processing creates new candidates or derivatives and must disclose before an image leaves the device for model processing.

Before publication, Studio applies orientation, decodes the chosen pixels, normalizes them to an approved color space and format, and creates a publish-safe derivative with filenames, EXIF, GPS, XMP, IPTC, embedded thumbnails, and opaque ancillary metadata removed. The developer previews the outgoing dimensions, format, byte size, and sanitized manifest metadata; the private original never enters the pack.

Studio applies shape, material, border color, border width, crop, position, and supported depth or edge settings to selected source art without regenerating it, while the live 3D preview updates immediately.

Publishing requires exactly one selected source image and complete 3D presentation per runtime-visible badge. The publisher validates schemas, stable IDs, asset hashes, compatibility, text-free source art, fallback inputs, binary policy, missing references, and forbidden Studio-only fields before exporting an immutable pack.

Publish first freezes and stores the exact canonical pack bytes and `PackRef` as a prepared release, permanently reserving that pack ID and version for those bytes. File-handle export may become `file write confirmed`; browser download can report only `download offered`, not pretend disk success. Canceling or retrying re-exports the same prepared bytes. Publish never activates an achievement, writes personal Archive state, commits to Git, or installs itself into Archive automatically.

## Runtime saying authoring

The archive's one-line saying has its own personal authoring control, independent from Studio and the published picture. The user can request an initial proposal, ask for another proposal, or type the line directly without using a model.

Regeneration is non-destructive: a new saying remains a proposal while the current accepted or handwritten line stays intact, and only an explicit `Use this saying` action replaces it. Installing or updating a published pack never alters a personal saying.

Before the first live saying request, and again whenever provider or outbound scope changes, the UI identifies the destination and previews the fields that will leave the device. The default payload is limited to title, criterion, and optional saying-specific direction; it excludes description, notes, dates, occurrence data, accepted sayings, visibility, art, and unrelated draft state.

`Try another` preserves the accepted line and the current pending proposal while the new request runs. Only the newest active request may offer a replacement; late, canceled, and failed responses cannot displace either value, and failures leave a clear retry path.

One-line means one logical line with no stored newline characters. Input trims outer whitespace and collapses internal whitespace, including pasted or generated line breaks, to single spaces. The provisional Phase 1 limit is 120 Unicode grapheme clusters: an over-limit direct draft remains editable with an accessible validation message but cannot be accepted or saved, while an invalid generated response is rejected without truncation or changing current text.

## Art generation behavior

Art generation is an explicit Badge Studio developer action and returns candidate proposals rather than silently replacing the Studio selection. No art-generation action or provider adapter is available in the archive build.

Generated art contains no title, date, saying, logo, seal text, or other typography; the interface renders all language cleanly.

Generated and reprocessed candidates are source artwork for the 3D construction layer, not pictures of finished badges. They contain no badge rim, border, thickness, bevel, reverse face, cast shadow, presentation background, or object-level metal, wool, enamel, highlight, reflection, and patina treatment baked around the composition.

Artwork may contain lighting that belongs inside the depicted scene, such as sunlight over Yosemite, but not global lighting that pretends to illuminate the physical badge. Candidate comparison composes every source through the same live geometry, material, border, and studio-light recipe before selection.

Candidate generation and upload processing share a provider-independent Studio application boundary so deterministic fixtures can exercise the complete developer flow without paid calls.

Rejected candidates are Studio-local temporary data until a retention rule is chosen. Selected working finals and uploaded originals are durable Studio project data and belong in a complete Studio backup; the archive receives only the published final, render recipe, sanitized provenance, and required runtime derivatives.

## Activation flow

Before activation, the archive resolves and displays the one published picture and appearance from the installed pack, then collects or confirms the real-life occurrence range, an explicitly accepted generated saying or directly authored one-line saying, an optional personal note, and a visibility override when that surface exists.

The user does not select, generate, upload, crop, process, or restyle badge art during activation. The activation snapshot records the exact `PackRef { packId, version, packDigest }`, presentation ID, source-asset hash, and render-recipe version so later pack updates cannot rewrite the remembered artifact silently.

The app records at least `occurredStart`, `occurredEnd`, `recordedAt`, and immutable `activatedAt` values, with enough date precision metadata to represent an exact date, a range, a year, or an approximate memory.

Activation persists atomically before its animation begins so a reload, crash, skip, or reduced-motion preference cannot lose or duplicate the event.

The ceremony is sharp, clean, and satisfying: a restrained sense of pressure, minting, seating, stamping, or revealing a heavy crafted object, followed by a calm hold and the saying.

There is no confetti, bouncing loot, slot-machine motion, rarity burst, or noisy score increase.

The repository recommendation is that the ceremony be replayable and skippable, have a reduced-motion form, and not require sound. Any future sound is optional and user-controlled.

## Repeat occurrences

The recommended model is one durable badge with a timeline of occurrence memories, so a second Yosemite visit or reread does not create visual badge duplicates.

Under that recommendation, the first occurrence receives the full activation ceremony and later occurrences receive a smaller `memory added` moment.

The owner has not confirmed this recommendation, so future agents may implement storage support but must not finalize the repeat UI without resolving the open decision.

## Collections and computed progress

Collections can be handmade or prepopulated.

The initial U.S. National Parks catalogue contains an individual definition for every park in a sourced, versioned edition.

`Visited every U.S. national park` completes automatically when the active rule's required badge records are activated.

The UI presents progress as encouragement, such as `23 explored`, rather than as points or rank.

Rules reference pack-qualified stable definition IDs and record their catalogue version so later catalogue changes can be explained and migrated safely; Phase 1 rules remain within one pack namespace.

Whether a previously earned `all parks` badge remains permanently earned when the catalogue expands is unresolved; the recommended behavior is to preserve the historical completion and show new progress against the latest edition.

## Visibility

Visibility uses three-state local overrides: `inherit`, `public`, and `private`.

Effective visibility is evaluated in a collection presentation context and resolves from achievement override to that collection's local settings to local profile default.

If no collection context is present, use the achievement override and then profile default. A future standalone share involving an achievement in several collections defaults private until its multi-collection precedence is explicitly designed.

The model may include the settings now, but the first version must not imply that `public` has published anything. Public presentation, export, and account behavior are deferred until their exposure semantics are designed.

Personal notes default to private and must never enter an art-generation prompt or shared presentation implicitly.

## Backup and restore

The archive user and Studio developer can each export a versioned backup to local disk and restore only into the matching application.

A complete Archive backup is self-contained: it contains personal records, local definitions, issued authoring requests and lifecycle state, the immutable seen-pack-release ledger, exact installed pack manifests, and every immutable published object and exact dependency for every installed pack, plus a manifest and checksums. It restores even entirely unplanned installed collections without reacquisition and contains no Studio project, prompt, rejected candidate, provider response, or credential.

A complete Studio backup contains the Studio database, theme drafts, actual uploaded-original bytes, every generated candidate retained by policy, every selected working-art object and necessary non-reproducible derivative object, derivation graphs, appearance recipes, the immutable reserved-pack-release ledger, publish history and exact prepared-release bytes, prompt and sanitized provenance metadata, a manifest, and checksums. Whether it includes every rejected candidate remains a size-management decision.

Restore validates the whole target backup, reports actionable errors, migrates supported old schemas, and never partially overwrites healthy current data or imports one application's private records into the other.

When a browser can only offer a download without confirming that it reached disk, normal restore presents the safety-backup offer and the user's explicit saved-copy acknowledgment as separate actions; source-only repair preserves readable current state instead of treating recovery as unchecked replacement.

## Canonical acceptance journeys

### Yosemite vertical slice

Install or load the published parks pack → open the prebuilt collection → find or accept the Yosemite goal with its picture already decided → rotate through front, edge, and back views → zoom into relief and move the key light across the material → reset the view → generate and retry a saying or write one directly → accept the final line → enter the trip range and optional note → activate → see the restrained ceremony → reload → find the same earned badge and updated collection progress → export and restore it with its pack identity, art, saying, and 3D render recipe intact.

### Badge Studio publishing slice

Open a parks theme project in Badge Studio → generate three text-free Yosemite source candidates or upload an image → compare every candidate through the shared 3D construction pipeline → choose and refine one → set crop, shape, metal, border, relief, and fallback inputs → inspect front, edge, back, zoom, and lighting → validate the entire pack → export an immutable version → explicitly install it in a clean archive → confirm the archive shows only the decided Yosemite presentation and no Studio controls or draft data.

### Custom badge handoff slice

Under the provisional Archive-first recommendation, create a semantic badge draft in Archive → preview the minimal fields and explicitly export its authoring request → confirm that no personal state is included → import the request into Badge Studio without database access → generate or upload and construct its visual → publish a pack carrying the matching request ID, semantic revision, and digest → install it in Archive → bind without overwriting the local title, criterion, or personal fields → only then allow the badge to be planned or activated. Editing after export supersedes the request; editing after fulfillment invalidates the new revision's visual until republished; editing after planning or activation preserves the prior record's pinned semantic revision and visual. Stale, mismatched, replay-conflicting, or colliding packs fail before mutation and explain how to republish correctly.

### Sapiens vertical slice

Install or accept the published _Sapiens_ definition and design → generate and retry a one-line saying or write one directly → accept the final line → record a reading range → activate → add a later reread if repeat occurrences are approved.

### Bachelor's degree vertical slice

Install or accept the published bachelor's-degree definition and design → record a multi-year occurrence range → activate without requiring a precise day.

### All-parks vertical slice

Activate the last required park → commit that activation → update the composite rule deterministically → resolve the already published composite visual from the pinned parks pack without generation → finish the individual reveal → reveal the composite badge → preserve the qualifying rule, catalogue version, exact `PackRef`, and visual edition.

## Accessibility requirements

- Archive keyboard access covers gallery navigation, local-definition draft navigation and authoring-request export, 3D rotation, zoom, light adjustment, reset, saying authoring, activation, and archive backup or restore.
- Studio keyboard access separately covers projects, candidate comparison, uploads, crop and position, every appearance control, validation, publishing, and Studio backup or restore.
- Visible focus and selected states do not rely on color alone.
- Badge art has a text equivalent derived from the title and description rather than attempting to interpret generated typography.
- Studio-selected borders and materials cannot reduce surrounding archive or Studio control contrast below the product's accessibility target.
- Studio generation, upload, processing, validation, publishing, backup, and restore status is announced to assistive technology without leaking into archive navigation.
- Saying generation identifies a pending proposal, keeps the editable accepted line reachable, and announces success or failure without moving focus unexpectedly.
- Saying length and empty-value errors identify the field, explain the 120-grapheme limit, and never discard the user's editable draft.
- `prefers-reduced-motion` produces a crisp success state without disorienting travel, flashing, or parallax.
- Reduced motion disables inertia, automatic orbit, and decorative camera travel but preserves immediate user-controlled 3D rotation, zoom, and light adjustment.
- The viewer exposes concise instructions and current interaction mode to assistive technology, and a textual badge description remains available when the canvas is unavailable or not useful.

## Explicit open decisions

Future agents must resolve or deliberately defer these rather than inventing an answer:

1. Confirm one badge with multiple occurrences versus separate badge copies for revisits and rereads.
2. Decide whether the Studio browser entry point remains sufficient or needs a local companion service or desktop wrapper for art generation, credentials, disk access, and very large workspaces; this must not pull provider code into the archive build.
3. Choose the Studio art provider, credential boundary, cost controls, cancellation behavior, and offline fixture fallback.
4. Define Studio upload processing beyond crop and appearance: generative restyling, background removal, cleanup, or other operations.
5. Decide whether Studio custom shapes are presets only or can include arbitrary masks.
6. Decide whether Studio material affects only rendering, generation prompts, or both.
7. Define catalogue expansion semantics for already earned composite badges.
8. Decide whether automatic composite eligibility triggers its ceremony immediately or waits for user acknowledgment.
9. Finalize date precision, unknown dates, open-ended ranges, and timezone handling.
10. Decide how long rejected Studio candidates live and whether Studio backups may include them; Archive never stores candidate sets.
11. Define deletion, undo, archive, and recovery semantics.
12. Define what `public` means before any sharing or account work begins.
13. Decide whether a camera and light pose can be deliberately saved for a future showcase; ordinary viewer state is ephemeral until then.
14. Select the 3D renderer after the Phase 0 capability and performance spike; keep persisted recipes independent of that choice.
15. Choose the distribution channel and update policy for published packs whose required assets are too large for ordinary Git.
16. Decide whether several local definitions may intentionally reuse one published presentation or whether every custom definition must receive a unique Studio-published design.
17. Confirm how the developer enters Badge Studio: a separate local launcher or URL is the current architecture recommendation, while any Archive link, deep link, or access guard remains an explicit product choice and may not collapse the builds or private stores.
18. Confirm the live saying credential boundary: the current architecture recommends a separately capability-scoped Archive saying companion when browser-safe authorization is unavailable, with manual writing and deterministic fixtures remaining usable without it.
19. Confirm where a completely custom achievement begins: the current recommendation creates its semantic draft in Archive and exports a privacy-scrubbed `.badgebrief` to Studio, while the alternative begins the entire definition and visual project in Studio before publication.
