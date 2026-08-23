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

Persistence, file I/O, image processing, and model generation are adapters that implement ports owned by the application layer.

Domain and application code remain independent of React, IndexedDB, browser file APIs, image canvases, and provider SDKs.

## Target source layout

```text
src/
  app/                 composition root, providers, routes, and global styles
  domain/              collections, badges, records, occurrences, rules, and visibility
  application/         author, select, activate, compute, back up, and restore use cases
  catalog/             Git-tracked definitions, collections, rule sets, and prompt recipes
  art/                 validation, crop, masks, materials, borders, previews, and thumbnails
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

Local owner state for a definition: lifecycle state, occurrence references, activation, selected appearance, saying, note, visibility override, and archive metadata.

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

Structured crop, position, shape preset, material preset, border color, border width, and render-version data.

Appearance is independent of source art so it can be edited without destructive regeneration.

### ArtAsset

Metadata for a locally stored binary: content hash, MIME type, dimensions, byte size, role, provenance, local Blob reference, created time, and lifecycle state.

### ArtCandidateSet and AssetDerivation

A candidate set records the approved input specification, candidate asset IDs, selection, generation status, and provider metadata without secrets.

A derivation records source asset, operation, parameters, tool or recipe version, and result asset; uploaded originals have no parent and are immutable.

## Authority boundary

| Git-tracked system authority | Local private authority |
| --- | --- |
| Application source and tests | Planned and earned state |
| Schemas and migrations | Occurrence dates and activation timestamps |
| Catalogue collections and badge definitions | Personal notes, sayings, and visibility choices |
| Composite goal rules and catalogue versions | Local collection settings, custom definitions, and catalogue overlays |
| Prompt recipes and material or shape manifests | Uploaded originals and generated candidates |
| Intentionally promoted small visual inputs | Selected art, derivatives, thumbnails, and backups |

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

## Generation boundary

The application port accepts a normalized art brief, approved source asset references, candidate count, appearance context when relevant, and cancellation signal.

It returns candidate descriptors and provenance without deciding selection or activation.

Tests and Phase 1 use a deterministic fake with fixture candidates so product work does not spend model budget or require network access.

Live adapters disclose when uploaded media leaves the device, exclude private notes by default, support cancellation, and keep provider credentials in an environment or OS credential boundary rather than application data, backups, prompts, or Git.

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

Export a versioned portable bundle containing a consistent database snapshot or canonical record export, local definitions, uploaded originals, selected artwork, required non-reproducible derivatives, a manifest, schema and catalogue versions, and checksums.

Use the native file picker when available and a browser download fallback elsewhere.

Restore first parses into an isolated staging area, validates checksums and references, migrates supported versions, reports the full plan, and then replaces current state atomically after explicit confirmation.

Never partially merge a corrupt archive into healthy state.

## Future multi-user migration

Stable owner and entity IDs, catalogue-versus-personal separation, nullable visibility overrides, and provider-independent asset references keep the model migratable.

A future server can implement the existing repositories and generation ports without moving product rules into React or changing the meaning of activation.

Accounts, remote object storage, permissions, and sync conflict behavior are new architecture work and are not to be prebuilt into Phase 1 screens.

## Test and observability contracts

Pure domain tests cover lifecycle transitions, composite eligibility, visibility precedence, stable ID behavior, and date-range validation without a browser environment.

Persistence tests use an isolated IndexedDB implementation and cover every migration, corrupt-row refusal, transaction atomicity, asset deduplication, and backup and restore round trip.

Component tests cover candidate comparison, uploads, non-destructive selection, appearance controls, activation confirmation, focus order, and reduced motion.

Playwright covers the Yosemite acceptance journey, upload and processing failure, activation reload safety, composite completion, and restore into a clean profile.

Visual evidence compares the chosen references with implementation screenshots at matched state and at least two desktop-like viewports, then sweeps all primary surfaces for unrelated defects.

Actionable structured debug output should expose current route, selected collection and badge IDs, lifecycle state, asset references, pending write or generation status, and effective visibility without exposing notes, credentials, or raw personal media.
