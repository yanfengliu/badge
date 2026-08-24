# Badge local policy

These repo-specific rules bind alongside the fleet constitution and make its boundaries concrete for Badge.

## Git delivery authorization

The owner explicitly authorizes agents to push verified, in-scope commits to `https://github.com/yanfengliu/badge.git` without requesting approval for each ordinary push.

This standing authorization is limited to non-force delivery for this repository after its required gates pass. It does not authorize force-pushes, history rewrites, bypassing review or secret checks, changing remotes, or pushing to another repository.

## Personal data and Git

Git tracks product code, schemas, migrations, curated catalogue source, computed-goal rules, Studio prompt templates, published renderer manifests, optional small pack registry records, tests, and deliberately promoted small source assets.

Never commit activations, dates, notes, sayings, visibility choices, user-created private definitions, Studio uploads, ordinary generated candidates, selected personal artwork, backups, provider credentials, account selectors, session details, or logs containing personal prompts or memories.

New definitions created in the archive and their issued authoring requests remain local and outside browse, plan, and activation flows until an explicitly imported Studio pack targets them with a published visual. Reusing another definition's installed presentation is not assumed until the open product decision permits it. Badge Studio may explicitly export only prepared immutable validated pack bytes; neither application mutates Git implicitly.

The sole Archive-to-Studio handoff is an explicitly previewed `.badgebrief` containing a random request ID, local definition ID, semantic revision, title, criterion, optional deliberately included description, schema version, and canonical digest. It contains no visual direction, prompt, owner identity, dates, occurrences, activation, notes, sayings, visibility, collection settings, assets, provider data, credentials, or database references. Editing the definition supersedes any active request and invalidates any current-revision visual binding; planned and earned records retain their pinned historical semantic revision and visual. Local `.badgebrief`, pack, and backup exports are ignored and rejected by the staged-delivery gate.

Generated and uploaded Studio media is heavyweight local data by default. Each published pack embeds its own content-addressed objects and may depend only on exact other self-contained packs; heavy pack files are distributed outside ordinary Git, while Git may track a small registry record. Git LFS or another store is not implied and requires an explicit decision and user approval.

## Archive and Studio boundary

The everyday archive at `/` and developer-only Badge Studio at `/studio/` are separate application entry points and builds served by one local site. They retain separate navigation trees, versioned IndexedDB database names, repositories, persistence namespaces, service-worker scopes, content-security policy surfaces, and backup formats; sharing an origin never authorizes either build to import or open the other's private implementation or database.

The archive never exposes art generation, upload, reprocessing, prompt, candidate, provider, crop, shape, material, border, or publish controls. Every runtime-visible badge resolves to exactly one validated published source image and 3D presentation recipe before the pack can be installed.

Badge Studio owns visual creation and publishes versioned immutable badge packs through an explicit validated export. Drafts, rejected candidates, provider metadata beyond sanitized provenance, and credentials never cross into the archive pack.

## Persistence and recovery

Persistence is schema-versioned, exportable, and migration-tested. Corrupt or unsupported data is preserved and reported with a recovery path; never treat an unreadable store as empty and overwrite it.

Local startup probes Archive at `/` and Studio at `/studio/` on one site every run. It may select and remember one free non-reserved port when no machine-local origin record exists, and it reuses only a complete Badge site serving both exact and mutually exclusive route identities. Once remembered, the site origin is durable browser-data identity: an unrelated, unidentified, incomplete, or route-swapped listener produces an actionable refusal rather than automatic relocation, and deliberate origin changes require backup or another explicit migration path. The machine-local `.badge-local/site.json` record contains no personal achievement state, stays outside Git, and must not be silently discarded or replaced.

Launcher lifecycle, browser, and terminal verification use branded task-owned state targets confined under ignored `tmp/local-startup/` paths and clean only their own records and listeners in a `finally` path. Verification never uses, creates, deletes, replaces, restores over, or requires absence of the canonical `.badge-local/site.json`; a legitimate interactive record may exist while every repository gate passes. No other neighboring file is a launcher state input.

Archive and Studio backups live outside the repository as distinct `.badgearchive` and `.badgestudio` formats. An Archive backup includes personal records, issued authoring requests, the seen-pack-release ledger, and every object in every installed pack and dependency; a Studio backup includes its reserved-pack-release ledger, draft database, actual uploaded-original, retained-candidate, selected-art, necessary non-reproducible derivative, and prepared-release bytes. Restore validates the complete target archive and monotonically unions that application's release ledger without merging one application's private store into the other. A `.badgeevidence.json` rescue export is a privacy-sensitive, state-only diagnostic for the exceptional case where damaged historical art makes a self-contained Archive backup impossible; it is explicitly non-restorable, omits source art, and remains outside Git under the same handoff rules.

Do not delete an original, selected asset, or backup merely because the current screen no longer references it. Candidate and cache cleanup must use explicit lifecycle rules and must never sweep broad shared output paths.

## Product integrity

The initial product is single-user and local-first. Accounts, cloud sync, public publishing, other-user browsing, proof systems, points, streaks, leaderboards, rarity tiers, and social reactions are out of scope unless the user explicitly promotes them.

Achievement activation rests on personal honesty. Archive models may rank installed goals or propose sayings, and Studio models may propose definitions and art, but no model decides that an achievement was earned.

The badge saying remains directly editable and independent from the art. Regeneration creates a proposal and never overwrites accepted or user-authored text until the user explicitly chooses the replacement.

Live saying generation discloses the provider and exact outbound fields before private badge text leaves the device. By default it sends only the badge title, criterion, saying-specific direction, and an optional bounded source-checked historical-quotation shortlist containing exact IDs, text, people, source titles, and HTTPS source links; notes, dates, occurrences, accepted sayings, and unrelated draft fields are excluded.

A live saying request occurs only after the final `Generate with Claude` approval or `Try another`, and each action starts at most one provider attempt without automatic retries or fan-out; page load, selection, activation, ceremony, reload, restore, and background work never call a saying provider. First use and provider or field-scope changes require a no-provider-model-call disclosure review before the final generate action is enabled; opening that review may fetch its disclosure metadata from the same local Badge listener. Theme cues, voice, and variation are curated non-personal direction; deliberately entered user direction may contain personal text, must be previewed verbatim, and is never inferred from personal Archive state or image pixels.

Prompt and disclosure v2 ask for a new compact paragraph targeting one to three sentences with no word-count target and enforce at most `600` graphemes, `2,048` code points, and `7,680` UTF-8 bytes, or selection of one exact ID from the disclosed quotation shortlist. Sentence count is a writing target rather than a punctuation-based hard gate. In the historical-selection branch the model never supplies, edits, completes, paraphrases, or attributes quotation text; Badge resolves the selected ID to the supplied text, person, source, and link, and the application rebinds every hydrated quote field to the originating shortlist. Freeform output is labeled source-unverified and receives best-effort rejection for quotation styling, common explicit attribution patterns naming a supplied person, and contained or close matches to supplied quotation text; without retrieval it is not claimed original or sourced against all historical writing. Accepted persisted saying strings may contain at most `800` graphemes, `3,072` code points, and `10,240` UTF-8 bytes and receive a `6,144`-UTF-16-unit preflight before segmentation. An accepted quote-and-attribution-shaped string is never preloaded for in-place personal editing; replacement starts blank and preserves the accepted string until save, including after reload and restore. Direct manual quotation entry is text-first and must include its own quotation marks and attribution rather than relying on Badge to infer a source.

The canonical saying request is capped at `12 KiB` within a `16 KiB` same-origin route body. The disclosure fingerprint covers provider, destination, model, prompt, field scope, quotation-contract version, normalization, and limits; any executable quotation-record grammar, strictness, uniqueness, HTTPS-source, or semantic-validation change must bump that version. Per-achievement title, criterion, direction, and shortlist values remain explicit request inputs under the acknowledged scope.

Badge Studio keeps generated artwork text-free. It preserves every uploaded source unchanged; crop, restyle, background removal, material treatment, and other processing create derived assets. Publication decodes and re-encodes selected pixels into a metadata-free approved format, strips filenames, EXIF, GPS, XMP, IPTC, embedded thumbnails, and opaque ancillary chunks, and previews the sanitized derivative and manifest metadata before export.

Shape, material, border color, border width, crop, and positioning remain editable structured properties in Badge Studio rather than being baked irreversibly into the only copy of the art. Publication freezes them, and the archive renders them read-only.

The badge itself is a real-time 3D artifact in Badge Studio and archive detail views. Preserve source art separately, derive texture or relief maps non-destructively, and store an engine-neutral versioned render recipe rather than a flattened badge or renderer-specific scene data.

Mouse rotation, bounded zoom, responsive lighting, a separate light-adjustment control, keyboard equivalents, reset, reduced-motion behavior, and a clear GPU fallback are product requirements rather than optional polish.

Activation data commits before its ceremony begins. The ceremony is replayable or skippable, respects reduced motion, and never substitutes spectacle for persistence correctness.

## Visual quality

The selected product language is a quiet premium field archive with substantial crafted objects, exact typography, generous space, restrained color, and clean motion.

Avoid cartoon rendering, careless generated art, souvenir-shop kitsch, cheap gradients, glassmorphism, confetti, loot effects, excessive glow, fake rarity, cluttered dashboards, and typography embedded in generated images.

Do not fake the required object with CSS perspective on a flat image or bake highlights and shadows into the only authoritative preview. Material response must change as the object or key light moves.

Visual changes are not complete until the relevant full flow is exercised in a real browser and inspected at more than one desktop-like viewport, including loading, empty, error, keyboard, and reduced-motion states when applicable.
