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

## Curated catalogue authoring

Git may track a deliberately promoted compact catalogue source study when it is a reviewed release-authoring input with stable identity, exact asset and prompt digests, bounded provenance, an explicit reason for promotion, and compliance with the fleet binary ceilings. This exception does not admit rejected candidates, ordinary generation batches, private uploads, raw provider output, mutable Studio drafts, or a heavy published pack.

Each promoted generated source declares an accessible visual description, sanitized generation workflow and content origin, owner-directed rights basis, recorded exact-prompt association, and deterministic normalization and thumbnail recipes. Digests prove immutable association, not historical model-call causation; never describe a refreshed hash as proof that the current prompt produced arbitrary bytes.

Catalogue result lists use integrity-bound small derivatives and reserve the full source for the selected detail. Regenerate and verify every derivative whenever a parent changes; a later catalogue expansion must measure request counts, decoded dimensions, and the worst-case pixel bound at each required viewport rather than relying on `loading="lazy"` alone.

Curated art styles and prompt recipes are versioned contracts. Once a `{ styleId, revision }`, candidate-role revision, or prompt-recipe revision has compiled a curated candidate, never mutate its directives or semantics in place so prior prompts and selected-source provenance remain reproducible.

Every curated catalogue expansion must review gaps across style family, medium, mood, subject, palette, and composition. Under the current v1 ID-only lookup, a useful missing capability receives a new creator-neutral style ID; if existing coverage is sufficient, record why in that expansion's decision or devlog rather than silently skipping the review.

A later revision of an existing style ID, candidate role, or prompt recipe may be introduced only after its references and compiler dispatch carry the complete revision and keep the prior implementation callable. Never overwrite v1 and label the changed behavior v1.

Style language may use broad historical movements, media, and techniques as visual qualities, but it never asks a generator to imitate a named creator or copy a recognizable work, character, composition, logo, or trade dress.

Every generated catalogue candidate remains text-free, full-bleed source art. Physical badge shape, crop, border, edge, material, relief, depth, reverse face, cast shadow, and movable inspection lighting remain renderer-owned structured appearance and are never baked into the authoritative source study.

A collection contact sheet proves coverage and broad cohesion, not candidate conformance. Before promotion, inspect every selected source at native resolution: examine all four edges for inset paper, rough work boundaries, frames, or presentation backgrounds; verify the depicted landmark, geology, ecology, and architecture against its brief; and reject typography, logos, signatures, physical badge construction, and generation artifacts that thumbnails can hide.

A selected Studio source study is not a published or installed Archive badge. A closed, privacy-scrubbed discovery projection may expose its stable concept metadata, accessible description, and integrity-bound `128 × 128` list thumbnail as a non-actionable `Selected study` card; it becomes a browseable, plannable, or activatable Archive artifact only after complete construction, quotation-bank review, fallback readiness, immutable pack compilation, independent admission, explicit installation, and every applicable capacity and catalogue-semantic gate pass.

## Archive and Studio boundary

The everyday archive at `/` and developer-only Badge Studio at `/studio/` are separate application entry points and builds served by one local site. They retain separate navigation trees, versioned IndexedDB database names, repositories, persistence namespaces, service-worker scopes, content-security policy surfaces, and backup formats; sharing an origin never authorizes either build to import or open the other's private implementation or database.

The archive never exposes art generation, upload, reprocessing, prompt, candidate, provider, crop, shape, material, border, or publish controls. Every Collection, detail, planning, activation, Timeline, or 3D badge resolves to exactly one validated published source image and presentation recipe before the pack can be installed. Discover may show a clearly labeled non-actionable selected-study thumbnail without granting any of those runtime capabilities.

Badge Studio owns visual creation and publishes versioned immutable badge packs through an explicit validated export. Drafts, rejected candidates, provider metadata beyond sanitized provenance, and credentials never cross into the archive pack.

Archive Discover consumes only the Git-tracked safe projection of deliberately promoted catalogue studies and their bounded list thumbnails. It never imports Studio or catalogue-authoring code, opens Studio persistence, exposes prompts or provenance, copies full source studies, or discovers private browser-local projects automatically. Future private Studio work crosses only through an explicit privacy-scrubbed handoff or the ordinary validated publish-and-install path.

## Persistence and recovery

Persistence is schema-versioned, exportable, and migration-tested. Corrupt or unsupported data is preserved and reported with a recovery path; never treat an unreadable store as empty and overwrite it.

Local startup probes Archive at `/` and Studio at `/studio/` on one site every run. It may select and remember one free non-reserved port when no machine-local origin record exists, and it reuses only a complete Badge site serving both exact and mutually exclusive route identities. Once remembered, the site origin is durable browser-data identity: an unrelated, unidentified, incomplete, or route-swapped listener produces an actionable refusal rather than automatic relocation, and deliberate origin changes require backup or another explicit migration path. The machine-local `.badge-local/site.json` record contains no personal achievement state, stays outside Git, and must not be silently discarded or replaced.

Launcher lifecycle, browser, and terminal verification use branded task-owned state targets confined under ignored `tmp/local-startup/` paths and clean only their own records and listeners in a `finally` path. Verification never uses, creates, deletes, replaces, restores over, or requires absence of the canonical `.badge-local/site.json`; a legitimate interactive record may exist while every repository gate passes. No other neighboring file is a launcher state input.

Archive and Studio backups live outside the repository as distinct `.badgearchive` and `.badgestudio` formats. An Archive backup includes personal records, issued authoring requests, the seen-pack-release ledger, and every object in every installed pack and dependency; a Studio backup includes its reserved-pack-release ledger, draft database, actual uploaded-original, retained-candidate, selected-art, necessary non-reproducible derivative, and prepared-release bytes. Restore validates the complete target archive and monotonically unions that application's release ledger without merging one application's private store into the other. A `.badgeevidence.json` rescue export is a privacy-sensitive, state-only diagnostic for readable Archive state that cannot be safely restored or truthfully represented by a complete restorable backup, including an earned record with no sealed quotation or unreconstructable historical art; it is explicitly non-restorable, omits source art, records the typed reason and affected record IDs, and remains outside Git under the same handoff rules.

Do not delete an original, selected asset, or backup merely because the current screen no longer references it. Candidate and cache cleanup must use explicit lifecycle rules and must never sweep broad shared output paths.

## Product integrity

The initial product is single-user and local-first. Accounts, cloud sync, public publishing, other-user browsing, proof systems, points, streaks, leaderboards, rarity tiers, and social reactions are out of scope unless the user explicitly promotes them.

Achievement activation rests on personal honesty. Archive models may rank installed goals or select among source-checked historical quotations, and Studio models may propose definitions and art, but no model decides that an achievement was earned.

Every newly created badge begins with one preselected source-checked quotation attributed to a real historical figure. Creation selects that quotation from local curated release data without calling a model; a compatible existing unearned record whose accepted saying is still `null` may receive only that default, while every non-null legacy or accepted value is preserved. An earned record with no quotation is incompatible evidence: never invent words for an already sealed memory, backfill it, activate it, or admit it through normal restore or replacement recovery.

The saying remains independent from the art, but it is no longer freeform authoring. Before activation the Archive shows the accepted quotation and one `Regenerate quote` action. That explicit action authorizes replacement only after one latest-request result has been hydrated from the disclosed source list, validated, and persisted; disclosure, pending work, cancellation, stale completion, malformed output, provider failure, or persistence failure leaves the accepted quotation unchanged. Activation atomically seals the already persisted quotation with the earned memory, and every later update path rejects replacement. There is no model-written original, manual editor, proposal card, separate acceptance step, or earned-state regeneration action.

Live quotation regeneration discloses the provider and exact outbound fields before badge text leaves the device. It sends only the badge title, criterion, optional saying-specific direction, and a required bounded source-checked historical-quotation shortlist containing exact IDs, text, people, source titles, and HTTPS source links; notes, dates, occurrences, accepted sayings, and unrelated draft fields are excluded. The current known quotation is removed from the shortlist so a successful request cannot choose the identical ID.

A live provider call occurs only after the final `Regenerate with Claude` approval or a later `Regenerate quote` action, and each action starts at most one attempt without automatic retries or fan-out; creation, page load, selection, activation, ceremony, reload, restore, and background work never call a saying provider. First use and provider or field-scope changes require a no-provider-model-call disclosure review before the final action is enabled; opening that review may fetch its disclosure metadata from the same local Badge listener. Theme cues, voice, and variation are curated non-personal direction; deliberately entered user direction may contain personal text, must be previewed verbatim, and is never inferred from personal Archive state or image pixels.

Prompt v3 and quotation contract v2 permit only the closed response `{ quotationId }` selecting one exact ID from the disclosed shortlist. The model never supplies, edits, completes, paraphrases, translates, combines, or attributes quotation text; Badge resolves the selected ID to the supplied text, person, source, and link, and the application controller rebinds every hydrated field to its private immutable originating request. The Archive repository accepts no caller-supplied quotation bank: it revalidates defaults, replacements, and activation against construction-time trusted banks bound to the exact record ID, title, and criterion before persistence. Curated release review—not the model or a URL-shape check—establishes that every admitted person is historical and every wording, attribution, source title, and link matches the reviewed source; the current starter manifest is locked by an exact-value regression gate. Accepted persisted saying strings retain the existing `800`-grapheme, `3,072`-code-point, `10,240`-UTF-8-byte, and `6,144`-UTF-16-unit safety ceilings, and new paths store the normalized presentation `“text” — Person, Source` only after exact-source validation.

The canonical saying request is capped at `12 KiB` within a `16 KiB` same-origin route body. The disclosure fingerprint covers provider, destination, model, prompt, field scope, quotation-contract version, normalization, and limits; any executable quotation-record grammar, strictness, uniqueness, HTTPS-source, or semantic-validation change must bump that version. Per-achievement title, criterion, direction, and shortlist values remain explicit request inputs under the acknowledged scope.

Badge Studio keeps generated artwork text-free. It preserves every uploaded source unchanged; crop, restyle, background removal, material treatment, and other processing create derived assets. Publication decodes and re-encodes selected pixels into a metadata-free approved format, strips filenames, EXIF, GPS, XMP, IPTC, embedded thumbnails, and opaque ancillary chunks, and previews the sanitized derivative and manifest metadata before export.

Shape, material, border color, border width, crop, and positioning remain editable structured properties in Badge Studio rather than being baked irreversibly into the only copy of the art. Publication freezes them, and the archive renders them read-only.

The badge itself is a real-time 3D artifact in Badge Studio and archive detail views. Preserve source art separately, derive texture or relief maps non-destructively, and store an engine-neutral versioned render recipe rather than a flattened badge or renderer-specific scene data.

Mouse rotation, bounded zoom, responsive lighting, a separate light-adjustment control, keyboard equivalents, reset, reduced-motion behavior, and a clear GPU fallback are product requirements rather than optional polish.

Those examination controls remain available in Archive detail, Timeline inspection, Badge Studio, and the first activation ceremony. The earned-state activation replay is passive: after live artwork is ready the badge makes one complete 360-degree turn and rests, with no object-versus-light toggle, zoom or scale action, reset action, fallback-view switcher, or direct-manipulation input; reduced motion and renderer fallback show the stable badge without autoplay.

Activation data commits before its ceremony begins. The ceremony is replayable or skippable, respects reduced motion, and never substitutes spectacle for persistence correctness.

## Visual quality

The selected product language is a quiet premium field archive with substantial crafted objects, exact typography, generous space, restrained color, and clean motion.

Avoid cartoon rendering, careless generated art, souvenir-shop kitsch, cheap gradients, glassmorphism, confetti, loot effects, excessive glow, fake rarity, cluttered dashboards, and typography embedded in generated images.

Do not fake the required object with CSS perspective on a flat image or bake highlights and shadows into the only authoritative preview. Material response must change as the object or key light moves.

Visual changes are not complete until the relevant full flow is exercised in a real browser and inspected at more than one desktop-like viewport, including loading, empty, error, keyboard, and reduced-motion states when applicable.
