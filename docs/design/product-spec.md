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

A definition contains a stable ID, title, criterion, description, collection relationships, optional composite rule, prompt recipe, and catalogue provenance.

### Personal achievement record

A local record instance for a badge definition, including its state, occurrence information, activation timestamp, selected saying, optional note, visibility override, and chosen appearance.

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

An art asset is an uploaded original, generated image, processed derivative, or selected final stored locally by content hash.

A candidate set records one generation or processing request, its distinct proposals, their provenance, and the user's selected candidate if any.

### Appearance

An engine-neutral versioned 3D render recipe applied non-destructively to source art: crop, position, shape, thickness, bevel or edge profile, relief, material parameters, border color, border width, and texture mapping.

At minimum, shapes include circle, square, and rectangle; the selected mock also includes a shield preset.

At minimum, materials include substantial metal and wool or armband fabric; additional finishes such as enamel may be added through the same system.

Source art remains an immutable input. Generated albedo, normal, roughness, height, mask, or other render maps are replaceable derivatives with recorded provenance.

## Interactive 3D artifact

Badge Atelier and the badge detail view render the badge as a real-time 3D object, not a flat image with simulated tilt. It has visible silhouette, thickness, edge construction, front relief, a coherent back, and material response that holds up from front, oblique, edge, and back views.

Primary mouse drag rotates the badge around its center, and the wheel or trackpad gesture zooms within limits that prevent clipping or losing the object. Rotation permits genuine edge and back inspection rather than a shallow two-dimensional wobble.

A separate visible `Adjust light` mode lets pointer drag orbit the key light while leaving ordinary drag dedicated to the object. Rotation and lighting update highlights, reflections, self-shadow, and relief in real time; the effect is not baked into the source image.

The viewer provides visible `Reset view` and `Reset light` actions, concise interaction instructions, pointer capture during drag, and an obvious way to release focus so wheel zoom does not trap page scrolling.

Pointer-down focuses and engages the viewer, then begins object or light drag according to the visible mode. Keyboard focus alone shows instructions without intercepting navigation; `Enter` or `Space` engages keyboard control, `Escape` disengages it while retaining focus, and focus moving outside returns the viewer to rest. Pointer-up, pointer-cancel, lost capture, or a mode change ends any active drag.

Camera orbit, zoom, and light position are session viewer state and reset to a deliberate studio default when reopened. Saving a personal showcase pose is deferred and must not be inferred from ordinary examination.

Gallery grids may use version-addressed cached renders for performance, but selecting or opening a badge reveals the live 3D artifact. When GPU initialization fails, a renderer-independent SVG or Canvas 2D fallback composes the immutable source art with versioned front, edge, and back templates from the same recipe; it labels the degraded view and works on first run, after clean restore, and without any prior GPU cache.

Direct manipulation never auto-saves a changed badge appearance, never modifies source art, and never affects activation, notes, sayings, or visibility.

## Recommended lifecycle

- `suggested`: offered by a catalogue or model and not yet accepted.
- `draft`: locally created and still being authored.
- `planned`: intentionally kept as a visible future goal.
- `earned`: activated by the user.
- `archived`: a recommended retained-but-hidden state whose exact recovery and deletion behavior remains open.

Do not default to punitive `locked` language.

A badge may exist before it is earned, be created retrospectively after the event, or be suggested and pre-generated by the system.

## Gallery experience

The collection is the primary emotional surface, not a metrics dashboard.

The opening experience emphasizes beautifully rendered badges, meaningful collection progress, recent memories, and a small number of useful next actions.

The selected gallery direction uses a warm editorial field archive with a large crafted badge, concise metadata, restrained topographic detail, and generous space.

Navigation should make collection browsing, goals, and creation easy without advertising every feature at once.

Earned and planned badges must remain visually distinguishable without making planned badges feel like failures.

## Badge authoring: Badge Atelier

The authoring flow starts from a catalogue suggestion, an app suggestion, an existing definition, or a blank local badge.

The user supplies or edits the title, criterion, collection, optional description, and visual direction.

The app proposes multiple genuinely different art candidates, defaulting to three in the selected design.

The current art-direction recommendation is to vary them across literal, symbolic, and map, pattern, or narrative compositions; that taxonomy is not an owner-mandated product rule.

Candidates appear at a useful comparison size with clear keyboard-reachable selection state. The user can select one, regenerate the set, refine one candidate, or leave without losing the current draft.

The user can upload an image instead of generating one.

An uploaded original is preserved unchanged. Optional processing creates new candidates or derivatives and must disclose before an image leaves the device for model processing.

The user can apply shape, material, border color, border width, crop, position, and supported depth or edge settings to the selected or uploaded art without regenerating the art, while the live 3D preview updates immediately.

The final review shows the composed badge, UI-rendered title, generated or user-authored saying, and relevant metadata before saving it as planned or continuing to activation.

The one-line saying has its own authoring control, independent from art generation and appearance. The user can request an initial proposal, ask for another proposal, or type the line directly without using a model.

Regeneration is non-destructive: a new saying remains a proposal while the current accepted or handwritten line stays intact, and only an explicit `Use this saying` action replaces it. Regenerating or changing art, uploading or processing an image, and changing shape or material never alter the saying.

Before the first live saying request, and again whenever provider or outbound scope changes, the UI identifies the destination and previews the fields that will leave the device. The default payload is limited to title, criterion, and optional saying-specific direction; it excludes description, notes, dates, occurrence data, accepted sayings, visibility, art, and unrelated draft state.

`Try another` preserves the accepted line and the current pending proposal while the new request runs. Only the newest active request may offer a replacement; late, canceled, and failed responses cannot displace either value, and failures leave a clear retry path.

One-line means one logical line with no stored newline characters. Input trims outer whitespace and collapses internal whitespace, including pasted or generated line breaks, to single spaces. The provisional Phase 1 limit is 120 Unicode grapheme clusters: an over-limit direct draft remains editable with an accessible validation message but cannot be accepted or saved, while an invalid generated response is rejected without truncation or changing current text.

## Art generation behavior

Generation is an explicit user action and returns candidate proposals rather than silently replacing a current selection.

Generated art contains no title, date, saying, logo, seal text, or other typography; the interface renders all language cleanly.

Generated and reprocessed candidates are source artwork for the 3D construction layer, not pictures of finished badges. They contain no badge rim, border, thickness, bevel, reverse face, cast shadow, presentation background, or object-level metal, wool, enamel, highlight, reflection, and patina treatment baked around the composition.

Artwork may contain lighting that belongs inside the depicted scene, such as sunlight over Yosemite, but not global lighting that pretends to illuminate the physical badge. Candidate comparison composes every source through the same live geometry, material, border, and studio-light recipe before selection.

Candidate generation and upload processing share a provider-independent application boundary so deterministic fixtures can exercise the entire UI without paid calls.

Rejected candidates are local temporary data until a retention rule is chosen. Selected finals and uploaded originals are durable user data and are always included in a complete backup.

## Activation flow

Before activation, the app collects or confirms the real-life occurrence range, selected artwork and appearance, an explicitly accepted generated saying or directly authored one-line saying, an optional personal note, and a visibility override when that surface exists.

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

Rules reference stable definition IDs and record their catalogue version so later catalogue changes can be explained and migrated safely.

Whether a previously earned `all parks` badge remains permanently earned when the catalogue expands is unresolved; the recommended behavior is to preserve the historical completion and show new progress against the latest edition.

## Visibility

Visibility uses three-state local overrides: `inherit`, `public`, and `private`.

Effective visibility is evaluated in a collection presentation context and resolves from achievement override to that collection's local settings to local profile default.

If no collection context is present, use the achievement override and then profile default. A future standalone share involving an achievement in several collections defaults private until its multi-collection precedence is explicitly designed.

The model may include the settings now, but the first version must not imply that `public` has published anything. Public presentation, export, and account behavior are deferred until their exposure semantics are designed.

Personal notes default to private and must never enter an art-generation prompt or shared presentation implicitly.

## Backup and restore

The user can export a versioned backup to local disk and restore it later.

A complete backup contains the structured local database, user-created definitions, uploaded originals, selected artwork, appearance data, prompt and provenance metadata needed to understand selected assets, a manifest, and checksums.

Including unselected generated candidates is a size-management option and remains unresolved.

Restore validates the whole archive, reports actionable errors, migrates supported old schemas, and never partially overwrites healthy current data.

## Canonical acceptance journeys

### Yosemite vertical slice

Open the prebuilt parks collection → find or accept the Yosemite goal → generate three candidates or upload a photo → select and customize the artifact → rotate through front, edge, and back views → zoom into relief and move the key light across the material → reset the studio view → generate and retry a saying or write one directly → accept the final line → enter the trip range and optional note → activate → see the restrained ceremony → reload → find the same earned badge and updated collection progress → export and restore it with its art, saying, and 3D render recipe intact.

### Sapiens vertical slice

Create or accept the book badge → choose art → generate and retry a one-line saying or write one directly → accept the final line → record a reading range → activate → add a later reread if repeat occurrences are approved.

### Bachelor's degree vertical slice

Create a singular milestone → record a multi-year occurrence range → choose a non-cliche visual metaphor → activate without requiring a precise day.

### All-parks vertical slice

Activate the last required park → commit that activation → update the composite rule deterministically → finish the individual reveal → reveal the composite badge → preserve the qualifying rule and catalogue version.

## Accessibility requirements

- Full keyboard access covers gallery navigation, candidate comparison, uploads, crop and position, every appearance control, 3D rotation, zoom, light adjustment, reset, activation, and backup or restore.
- Visible focus and selected states do not rely on color alone.
- Badge art has a text equivalent derived from the title and description rather than attempting to interpret generated typography.
- User-selected borders and materials cannot reduce surrounding control contrast below the product's accessibility target.
- Generation, upload, processing, backup, and restore status is announced to assistive technology.
- Saying generation identifies a pending proposal, keeps the editable accepted line reachable, and announces success or failure without moving focus unexpectedly.
- Saying length and empty-value errors identify the field, explain the 120-grapheme limit, and never discard the user's editable draft.
- `prefers-reduced-motion` produces a crisp success state without disorienting travel, flashing, or parallax.
- Reduced motion disables inertia, automatic orbit, and decorative camera travel but preserves immediate user-controlled 3D rotation, zoom, and light adjustment.
- The viewer exposes concise instructions and current interaction mode to assistive technology, and a textual badge description remains available when the canvas is unavailable or not useful.

## Explicit open decisions

Future agents must resolve or deliberately defer these rather than inventing an answer:

1. Confirm one badge with multiple occurrences versus separate badge copies for revisits and rereads.
2. Decide whether the Phase 1 browser app remains sufficient or needs a local companion service or desktop wrapper for generation, credentials, disk access, and very large libraries.
3. Choose the runtime art provider, credential boundary, cost controls, cancellation behavior, and offline fallback.
4. Define upload processing beyond crop and appearance: generative restyling, background removal, cleanup, or other operations.
5. Decide whether custom shapes are presets only or can include arbitrary masks.
6. Decide whether material affects only rendering, generation prompts, or both.
7. Define catalogue expansion semantics for already earned composite badges.
8. Decide whether automatic composite eligibility triggers its ceremony immediately or waits for user acknowledgment.
9. Finalize date precision, unknown dates, open-ended ranges, and timezone handling.
10. Decide how long rejected candidates live and whether backups may include them.
11. Define deletion, undo, archive, and recovery semantics.
12. Define what `public` means before any sharing or account work begins.
13. Decide whether a camera and light pose can be deliberately saved for a future showcase; ordinary viewer state is ephemeral until then.
14. Select the 3D renderer after the Phase 0 capability and performance spike; keep persisted recipes independent of that choice.
