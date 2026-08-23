# Roadmap

The phases are ordered to produce a durable local vertical slice before adding live generative calls or sharing scope.

## Phase 0 — Foundation

- Scaffold Node 24, TypeScript, React, Vite, Vitest, Playwright, ESLint, and Prettier as one package unless a measured requirement changes the decision.
- Establish the module boundaries in `docs/architecture/ARCHITECTURE.md` and real commands in `AGENTS.md` before the first code commit.
- Add versioned IndexedDB storage, migration tests, content-addressed Blob storage, persistent-storage requests, and an explicit local backup format.
- Establish a strict canonical archive origin and a separate disposable development origin; prove restart behavior and the export or import path required for any supported origin transition.
- Fail closed on unreadable data and preserve it for recovery.
- Create deterministic fixtures for Yosemite, _Sapiens_, a bachelor's degree, and the all-parks composite.
- Add the selected gallery and Badge Atelier mockups to visual comparison tooling.

### Exit criteria

The app boots locally at its strict durable origin, fixtures remain isolated on the development origin, schema upgrades and corrupt-store handling are tested, an origin change cannot make data silently disappear, no personal data enters Git, and browser screenshots can be captured at two desktop-like viewports.

## Phase 1 — Complete local vertical slice

- Browse collections and distinguish suggested, planned, earned, and archived states.
- Create and edit local badges and collections.
- Compare three deterministic art candidates, select one, and preserve an unfinished draft.
- Generate deterministic one-line saying proposals, try another without losing the accepted line, explicitly accept a proposal, and author or replace the line directly.
- Upload an image, preserve the original, crop and position it, and create non-destructive derivatives.
- Customize circle, square, rectangle, and shield shapes; metal, wool, and enamel materials; border color; and border width.
- Activate a badge with occurrence range, immutable activation timestamp, clever or edited saying, optional note, and local visibility override.
- Deliver the sharp activation ceremony plus reduced-motion behavior.
- Reload without state loss and complete a backup and restore round trip with selected art intact.

### Exit criteria

The Yosemite acceptance journey in `product-spec.md` works entirely offline with deterministic fixtures, saying regeneration never changes art or overwrites accepted text, every art and appearance action preserves accepted and pending saying text, direct saying edits survive reload and restore, and the complete journey passes visual comparison and keyboard testing.

## Phase 2 — Generated and processed art

- Define and implement a provider adapter without coupling domain records to one API.
- Implement live saying generation behind its separate provider-neutral port so retrying copy cannot invoke or mutate art generation.
- Keep provider credentials outside Git and outside backup archives.
- Generate genuinely distinct candidates, refine one candidate, and cancel or retry safely.
- Process uploaded images only after disclosing when data will leave the device.
- Disclose the live saying provider and exact minimal outbound fields, and exclude personal notes, dates, occurrences, accepted sayings, and unrelated draft state by default.
- Track provenance, provider, model, prompt-recipe version, source asset, settings, and output hash without storing secrets.
- Add actionable generation errors, offline fallback to upload or fixture candidates, size limits, thumbnail generation, deduplication, and candidate cleanup policy.

### Exit criteria

Live generation can be replaced by deterministic fakes in tests; multiline saying output normalizes to one logical line; stale, canceled, failed, empty, and over-limit saying responses preserve accepted and pending copy; cancellation never changes selected art; failed processing preserves the upload; and no secret or personal media appears in Git.

## Phase 3 — Catalogue and computed achievements

- Ship a sourced, versioned U.S. National Parks catalogue.
- Support app suggestions and curated starter collections without making them mandatory.
- Display computed progress and automatically qualify the all-parks badge.
- Resolve catalogue expansion, rename, retirement, and previously earned composite semantics before the first catalogue update.
- Support catalogue overlays so personal edits survive system updates.

### Exit criteria

The all-parks journey completes deterministically, records its rule and catalogue version, survives catalogue reloading, and never loses personal history during an update.

## Phase 4 — Presentation and sharing

- Define what local `public` and `private` settings expose.
- Build a presentation view and explicit export or share artifact before adding accounts.
- Design accounts, multiple owners, cloud storage, other-user browsing, and permissions only after the local data and exposure contracts are stable.

### Exit criteria

The user can inspect exactly what will be shared, private notes remain excluded by default, and no upload occurs without an explicit action and destination.

## Deliberately deferred

Points, streaks, leaderboards, external verification, competitive rankings, social reactions, cloud-first storage, crypto or financial rewards, and scarcity mechanics are not roadmap items.

The unresolved decisions at the end of `product-spec.md` are decision gates, not hidden backlog; resolve each when its phase reaches it.
