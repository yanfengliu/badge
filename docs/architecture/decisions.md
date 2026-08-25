# Architectural Decisions

Append decisions newest first. Never rewrite history; add a superseding entry that links to the decision it replaces.

## 2026-08-25 — D-050: Make Badge Studio a root-document primary section

**Status:** Owner-confirmed and implemented for the current root host, superseding D-033's route, entry-document, runtime-marker, CSP, and service-worker-scope topology plus the route-specific portions of D-046 and D-048 while preserving their product, visual, persistence, and independent-build boundaries.

Badge has one canonical HTML document at `/`. Collection is the default primary section, while Timeline, Discover, and Badge Studio use `/#timeline`, `/#discover`, and `/#studio`; direct hashes, back and forward navigation, focus transfer, and document theme are host-owned location behavior. Legacy HTML requests beneath `/studio` redirect to `/#studio` instead of mounting a second application document.

The root host composer is the only production module allowed to import both Archive and Studio surfaces. Each surface retains its own application composition, IndexedDB name, repository interfaces and adapters, Blob ownership, backup format, CSS ownership, and standalone isolation build; neither imports the other surface nor opens the other's database. The composed document has one CSP, and Badge makes no route-specific service-worker claim.

Leaving Studio is blocked while a Studio operation is busy and otherwise flushes the exact current draft before the host changes section. The launcher requires the versioned unified marker, root mount, and exactly one supported same-origin live or built host module at `/`, requires `/studio` to remain only the canonical `308` redirect, refuses marker-only, missing-root, broken-entry, external-entry, hybrid, Archive-only, and Studio-only listeners, and reuses one remembered origin. The existing `.badge-local/site.json` origin remains valid because IndexedDB is origin-scoped rather than path-scoped; this composition change requires no data migration.

## 2026-08-25 — D-049: Make every Discover badge card its own action

**Status:** Owner-confirmed and implemented for the current safe Discover projection; it supersedes only the non-actionable-card presentation in D-043, D-046, and D-047 without granting source studies runtime badge authority.

Every rendered Discover badge card owns one stretched native button covering the complete card surface, so its artwork, title, criterion, status, and visible action copy all lead to the same destination with one tab stop. A collected published card opens its exact earned-memory replay; a published unearned card opens the existing preparation flow inside Discover; an unpublished source-study card opens a focus-contained read-only preview of the same safe metadata and integrity-bound `128 × 128` derivative already admitted to the list.

The source-study preview is catalogue inspection, not installation or badge detail. It exposes no full Studio source, prompt, provenance, candidate, visual construction, quote, 3D recipe, plan, activation, provider, authoring control, personal record, or persistence write, and it explicitly says that those runtime capabilities do not yet exist. Escape or Close restores focus to the exact originating card, background content is inert while the preview is open, and phone portrait plus short landscape keep the preview internally bounded without document overflow.

This interaction adds no catalogue, persistence, pack, quotation, backup, or Archive-domain shape. It preserves the grey `Potential` and `Not yet published` truth while making every visual concept in Discover genuinely clickable.

## 2026-08-25 — D-048: Keep the desktop-first archive complete and usable on phones

**Status:** Owner-confirmed and implemented for the current Archive, Badge Studio, and shared interactive viewer; it strengthens the presentation and verification requirements without changing domain, persistence, pack, catalogue, or publication authority.

Archive and Badge Studio retain the quiet field-archive visual language and desktop information density, but neither route may depend on a desktop-width floor. Both independently support a `320px` CSS viewport in portrait and short landscape, advertise edge-to-edge safe-area support, use dynamic viewport height for full-height surfaces, keep Collection, Timeline, Discover, and Badge Studio visible in one equal phone navigation row, and prohibit document-level horizontal overflow. Dense ordered content becomes an explicit horizontal rail only for Collection artifacts, Discover sets, and Studio candidates; Timeline headings, detail panes, forms, dialogs, appearance controls, publication actions, and library search reflow or bound themselves to the phone measure.

Ordinary phone actions retain at least a `44 × 44px` target and form controls retain `16px` text. Safe-area insets reach headers, page edges, overlays, notices, and dialog actions; short-landscape inspection surfaces are bounded so the surrounding content remains reachable. These behaviors live in final route-owned responsive CSS layers and one cross-application CSSOM contract rather than in domain models or shared persistence.

The shared live viewer no longer captures touch on contact. Touch begins pending, yields a predominantly vertical gesture to page scrolling, captures only after predominantly horizontal intent, and always disengages on release; mouse and keyboard inspection semantics remain unchanged, replay remains passive, and the viewport keeps browser-owned vertical-pan and pinch behavior. Contract tests cover the direction threshold, release class, conditional target floor, symmetric safe-area ownership, live plus fallback stage bounds, all four shape-derived fallback fit lengths, and exact promoted PNG references. Browser evidence covers Archive and Studio at the `320px` floor, intermediate portrait widths, short landscape, an actual activation and populated Collection, live and forced-fallback ceremony and replay, all four fallback shape ratios on both surfaces, simulated nonzero safe insets, and protocol-level touch page scrolling with no document overflow.

## 2026-08-25 — D-047: Expand Discover with a fifty-state source-study edition and keep future editions planning-only

**Status:** Owner-confirmed and implemented for the fifty-state authoring and safe Discover projection, Collection scaling, Discover progressive reveal, and versioned planning briefs; it supersedes D-043 and D-046 only where their catalogue counts and empty-shelf behavior described the smaller prior projection.

The current safe Discover catalogue contains exactly `116` unique visualized concepts across four canonical sets: four published starters, sixty-two additional national-park source studies after Yosemite deduplication, and fifty U.S.-state source studies. Only the four starters retain existing Archive record targets and runtime authority. Every park or state study remains non-actionable `Potential` and `Not yet published`: a selected image and thumbnail do not create an admitted definition, published visual, installed pack, quotation bank, personal record, preparation action, activation path, Timeline memory, or 3D artifact.

The state authoring edition is `2021-10-08.census-ansi` and follows the U.S. Census Bureau ANSI/FIPS table's exact fifty-state scope, excluding the District of Columbia, Puerto Rico, and insular areas. Census provenance establishes state identity, abbreviation, and FIPS code only; landmark, ecology, motif, and art-direction facts are marked as curated editorial input. Each state has three deterministic candidate directions, one natively reviewed `896 × 896` JPEG selected source study, one integrity-bound `128 × 128` derivative, and one source-linked default quotation from a reviewed real historical figure with an English-Wikipedia biography URL when applicable. The fifty primary selections distribute all `24` immutable creator-neutral styles, and neither this variety nor quotation preparation implies runtime publication.

Archive still imports no catalogue-authoring implementation. Its closed fixture projection carries only safe display identity and qualified thumbnail keys; the exact production manifest binds `113` park-and-state thumbnails totaling `682,741` bytes, the resolver preserves the same qualified source identity, and the build emits each derivative beneath its catalogue-qualified path before a full-decoder and exact-key hash gate rejects header-only, swapped, drifting, or full-size authoring inputs. Collection projects in the opposite direction from personal state: it renders a collapsed shelf only for a set represented by at least one earned record, so adding potential sets cannot manufacture empty cabinet furniture. Discover searches and filters all `116` concepts but mounts only the first `24` matching cards until the user explicitly reveals another batch; search, filter, reveal count, shelf presence, and shelf expansion remain ephemeral.

Later catalogue categories are recorded as planning-only research contracts rather than invented completion claims. The current plans bound `281` Washington incorporated municipalities, `483` California incorporated cities and towns, PBS's fixed 2018 _Great American Read_ `100`, a non-exhaustive `34`-place GO TOKYO-informed editorial seed whose item-level authority links remain mandatory before authoring, and `64` optional non-normative life-milestone prompts. None is a selected study, Discover entry, published definition, user history, or promise that its source scope is a universal canon.

Michelin dining remains one generic user-entered milestone for the restaurant, location, visit date, and rating observed at that visit. Badge ships no scraped U.S. or Japan restaurant directory, current-rating lookup, guide prose, logos, star pictograms, red trade dress, restaurant brand assets, or photography; an enumerated edition remains blocked on permission or a licensed source, and later rating changes must not rewrite a date-specific personal memory.

This decision preserves D-040's immutable style and prompt rules, D-041 and D-045's source-checked historical-quotation standard, D-043's safe-projection and non-publication boundary, and D-046's separation of earned Collection from complete-set Discover. It changes catalogue breadth and scalable presentation only; publication, installation, authenticated runtime quotation banks, renderer closure, backup closure, and computed state-completion semantics remain later release work.

## 2026-08-24 — D-046: Separate earned Collection from set-complete Discover

**Status:** Owner-confirmed and implemented for the current Archive and Studio navigation, superseding D-043's available-entry handoff into the former mixed-lifecycle Collection surface.

Collection is the owner's earned cabinet, not the place where unearned catalogue records are prepared. It derives only activated records from `ArchiveState`, groups each record under every qualified `CollectionRef`, maps the current starter pack's known refs into a closed canonical Discover set registry, and retains qualified fallback keys for unknown future installed or local collections. Each canonical shelf exists even when empty, starts collapsed, shows collected artifacts only, and reports only `x / y collected`; search, expansion state, collected count, represented-set count, occurrence-year span, and latest memory are ephemeral projections and add no persisted collection-layout or statistics state.

Discover owns complete set browsing. Its closed safe projection now gives every created visual concept one or more canonical set IDs and exposes three current sets with exact populations of sixty-four, one, and one. An earned published entry is overlaid from its existing Archive record and appears in full color with an exact-memory action. Every unearned entry is grey with explicit non-color status: published entries remain `Ready to collect` and enter the existing pre-generated-quotation preparation and activation flow inside Discover, while source studies remain non-actionable `Potential` entries labeled `Not yet published`. This changes no source study into a published visual and adds no personal state to catalogue fixtures.

Selecting a collected artifact opens one memory replay overlay rather than the old mixed-lifecycle detail workbench. Replay presents the activation-pinned passive turn, occurrence range, separate sealed time, exact accepted quotation, recoverable historical-figure biography and quotation-source links, note, and every set membership. A set action closes replay and opens Discover with that mapped set selected; primary Discover navigation clears the transient set context. Timeline uses the same exact replay. Legacy accepted text that cannot be recovered from the trusted starter quotation bank remains visible without invented provenance.

The visible primary navigation has exactly four destinations in both route-scoped applications: Collection, Timeline, Discover, and Badge Studio. The first three remain ephemeral Archive sections at `/` with URL hashes for cross-route return; Badge Studio remains the independently built and persisted `/studio/` application. Visual peer placement does not authorize either application to import the other's implementation or database.

This decision borrows category progress, earned color versus potential grey, earned timestamps, and detail-to-category drill-down from mature achievement systems without introducing points, rewards, completion pressure, game chrome, social comparison, or a new durable achievement model. It narrows D-043's presentation and navigation behavior while retaining its safe-projection, privacy, publication, and bundle boundaries.

## 2026-08-24 — D-045: Standardize unearned starter quotations and separate figure biography provenance

**Status:** Owner-confirmed and implemented for the current four starter records, superseding D-041's preservation of every non-null legacy saying while retaining D-042's sealed-memory boundary.

On initialization, restore, and readable-state recovery, an unearned compatible starter record keeps an accepted saying only when its complete formatted value exactly matches one quotation in that record-bound trusted bank. A `null` saying or unmatched legacy prose is standardized locally to that starter's designated curated default, and its opaque quotation revision rotates so stale regeneration or activation work cannot survive the change. This reconciliation makes no provider call and does not relabel arbitrary text as verified provenance. Every earned or activated saying is preserved exactly, including historical legacy prose and the incompatible earned-null evidence governed by D-042.

Quotation contract v3 adds an optional `personWikipediaUrl` field for the historical figure's English-Wikipedia biography. When present it is exact-bound with the selected quotation metadata, accepts only an HTTPS `en.wikipedia.org/wiki/…` article URL on the standard port, and remains distinct from the required quotation `sourceUrl` that supports the quoted wording, attribution, and work or occasion. The contract also requires every bank entry to have a unique normalized persisted saying value, so exact string recovery cannot silently choose different provenance metadata. All twelve current starter quotation entries carry the biography URL, while the field stays optional so a future reviewed historical figure without an applicable English-Wikipedia article is not excluded.

The Archive quotation presentation uses two quiet provenance rows: `Historical figure` names the person and offers `Wikipedia` only when that optional biography URL exists, while `Quote source` names the source title and always offers `View quote source`. The persisted accepted value remains the normalized string `“text” — Person, Source`; the starter bank recovers both links only by an unambiguous exact full-value match, so this change requires no Archive schema or backup-format migration.

## 2026-08-24 — D-044: Make activation replay one passive badge turn

**Status:** Owner-confirmed and implemented for earned-state Archive replay.

Earned-state replay is presentation, not another inspection surface. Once the current live source texture is visibly ready, the badge advances monotonically around its vertical axis by exactly `2π` over one restrained ease, returns visually to its deliberate starting pose, and stops every animation frame. The shared ceremony component selects this presentation only for replay; first activation keeps the existing interactive presentation.

The replay presentation has no object-versus-light toggle, zoom or scale controls, reset controls, interaction instructions, application role or tab stop, pointer capture, wheel ownership, or keyboard manipulation. Close remains its only ordinary action. First activation, Archive detail, Timeline inspection, and Badge Studio keep D-011 and D-012's complete rotation, zoom, responsive-light, reset, keyboard, and fallback inspection controls; this decision narrows only replay.

Motion begins only after WebGL capability and the exact current texture are ready, owns one cancellable request-animation-frame chain, and restarts only when a new replay or renderer session genuinely begins. Closing, fallback, source or session replacement, and a motion-preference change cancel that chain. Reduced motion schedules no automatic turn and shows the stable pose immediately; enabling it mid-turn or while the preference subscription attaches restores that pose. Automatic renderer recovery resets before remount and waits for the replacement texture before restarting. The passive Canvas owns the image name while loading statuses remain outside that image. Forced or failed live rendering shows the badge's static front without front-edge-back switching or a retry utility inside replay, while interactive surfaces retain their truthful fallback.

## 2026-08-24 — D-043: Make every created visual badge discoverable without manufacturing personal records

**Status:** Owner-confirmed and implemented for the current tracked catalogue projection; full parks publication and discovery of future private Studio work remain separate release work.

Archive has a third read-only `Discover` section that exposes every unique visualized badge concept currently created in tracked product inputs: the four published starter badges plus the other sixty-two national-park source studies, with Yosemite represented once by its usable Archive entry. The fifty-seven text-only common-achievement ideas, unselected Yosemite candidates, and private browser-local Studio assets are not called created badges and remain outside this catalogue until a selected visual or an explicit privacy-scrubbed handoff makes them eligible.

Discovery is not installation. Published starter entries may reopen their existing Collection records; source-study entries are labeled `Selected study` and `Not yet published` and expose no plan, activation, quotation, 3D, install, provider, or authoring action. The projection is ephemeral presentation data and adds no `ArchiveState` records, IndexedDB schema, migration, backup content, quotation bank, or pack identity.

Archive still imports no Studio or `catalogue-authoring` implementation. A closed Git-tracked `catalogue-fixtures/discovery` projection contains only stable identity, title, criterion, availability, accessible preview copy, place or collection label, and either an existing Archive record target or one reviewed thumbnail filename. An exact drift test compares all sixty-six entries with the authoring and starter authorities, forbids personal and authoring fields, and deduplicates Yosemite. The Archive bundle carries only the sixty-three integrity-bound `128 × 128` list thumbnails, exactly `373,657` bytes with an `8,004`-byte per-file ceiling; a production gate rejects a missing, changed, additional, or full-size Studio JPEG.

This narrows D-040's Studio-only browsing statement without treating selected studies as `PublishedBadgeVisual` values or weakening D-013's prohibition on visual authoring in Archive. Future private Studio creations still require an explicit scrubbed export or ordinary publish-and-install flow; sharing one browser origin never authorizes Archive to inspect Studio persistence.

## 2026-08-24 — D-042: Preserve unquotable earned evidence and reclassify recovery from fresh state

**Status:** Implemented for the starter Archive compatibility, restore, and readable-state replacement boundaries; this supersedes D-030's source-failure-only state-rescue eligibility paragraph and applies D-041's quotation requirement without rewriting already sealed history.

An unearned compatible starter record with no accepted saying can receive its designated reviewed default before the user acts because that operation completes creation-time initialization. An earned record with no saying cannot: assigning later words would falsely claim that a quotation belonged to an already sealed memory. The record remains structurally readable and exportable as evidence, but starter compatibility rejects it, startup routes it to state rescue, normal restore and replacement recovery reject it before writes, and activation cannot proceed without an admitted non-null quotation. The `.badgeevidence.json` handoff says plainly that it is non-restorable and excludes source art, records a typed rescue reason plus the affected record IDs, and never presents this incomplete history as a valid backup.

Normal restore always requires the exact current-state checkpoint returned with its safety backup; the final repository transaction compares that checkpoint before monotonic validation or any write. Readable-state replacement similarly rechecks its evidence checkpoint and then attempts a fresh full backup. If another tab has made that current snapshot compatible, the flow abandons replacement and reclassifies to normal restore or source repair. If it changed to a different incompatible snapshot, the operation refuses with `RESTORE_CONFLICT`; if full backup fails for any reason other than missing source material, that exact error propagates. Only an unchanged incompatible snapshot that cannot be truthfully represented by a restorable safety backup may produce state-only rescue evidence.

## 2026-08-24 — D-041: Create badges with historical quotations and regenerate by exact selection

**Status:** Owner-confirmed product mandate; implemented for the starter Archive quotation bank and live selection boundary, superseding D-037's model-written and optional-shortlist behavior while general installed-pack quotation provenance remains Phase 1 contract work.

Every newly created Archive badge begins with one preselected source-checked quotation from a curated bank of words attributed to a real historical figure. Creation selects that local release input without a provider-model call, so the quote is already visible when the badge first appears and no personal data leaves the device during initialization. A compatible existing unearned starter record whose saying is still `null` receives only that default through an idempotent compare-and-swap initialization step; any existing non-null personal or historical value is preserved rather than relabeled or overwritten, and D-042 separately governs earned-null evidence.

Before activation the Archive saying surface shows the accepted quotation and one `Regenerate quote` action. That explicit action authorizes one latest-request-wins provider attempt and replacement on success; the accepted quotation remains visible and durable during disclosure, pending work, cancellation, stale completion, malformed output, provider failure, or persistence failure. A successful exact selection is committed before the new quotation appears as accepted, so there is no separate proposal card, `Use this saying` step, manual editor, or source-unverified generation/proposal branch; preserved legacy prose may still render with an explicit source-unverified label. Activation atomically consumes and freezes the durable quotation; earned records expose no regeneration action, and domain plus repository boundaries reject stale or direct replacement attempts.

Each record carries an opaque durable quotation revision token. Regeneration and activation compare the exact token reviewed by their caller, every successful quotation replacement rotates it, and restore or readable-state replacement refreshes it for every unearned record, closing stale cross-tab and text-ABA writes even when a quote changes away and back. Archive IndexedDB v3 materializes fresh tokens for structurally readable v2 rows inside the version-upgrade transaction; version-change handling closes older repository connections, v2 code cannot reopen the upgraded database, tokenless v3 rows stop automatic writes, and legacy tokenless backups remain readable without weakening canonical payload validation. Earned records reconcile this concurrency-only token during restore before their substantive frozen memory is compared exactly.

Prompt v3 and quotation contract v2 require a nonempty disclosed `allowedQuotations` list. Claude returns only one exact opaque quotation ID, Badge hydrates every word, person, source title, and HTTPS source link from that same request, and the application controller rebinds the complete result against a private immutable request before persistence. The repository accepts no caller-supplied bank and independently admits defaults, replacements, and activation against construction-time trusted lists bound to exact starter record identities. The current accepted quotation is removed from the regeneration shortlist so a request cannot select the identical ID; every created badge therefore needs more than one independently reviewed quotation before regeneration is enabled. Source review, rather than model output or structural URL validation, establishes that each person is historical and each quote, attribution, work or occasion, and link is authentic; an exact manifest test locks all twelve current starter quotation records. The model never recalls, writes, edits, shortens, combines, translates, completes, or attributes quotation text.

The foundation still persists the accepted presentation as the existing normalized string `“text” — Person, Source` so this owner-directed UI change does not silently reinterpret old backups or overwrite legacy personal text. For current starter records the exact curated bank recovers the source link by full-value match; a future general installed-pack contract must carry the quotation bank and durable selected identity before claiming the same provenance guarantee for arbitrary installed or custom definitions. New generation and authoring paths may create only source-checked historical quotations even while legacy non-null strings remain readable history.

This decision supersedes D-010's direct-writing and separate-acceptance behavior, D-035's proposal and manual-writing behavior, and D-037's model-written original branch and optional quotation shortlist. It retains D-035 and D-036's explicit provider-call, disclosure, minimal-payload, cancellation, containment, and no-automatic-retry boundaries; initialization, selection, activation, ceremony, reload, restore, and background work still make zero provider-model calls.

## 2026-08-23 — D-040: Treat the parks artwork as a versioned Studio authoring campaign before publication

**Status:** Implemented for catalogue authoring and selected source studies only; Phase 3 pack construction, publication, admission, installation, and computed-achievement release remain open.

The initial parks authoring edition uses the official National Park Service `National Parks (63)` section from the page last updated 2026-07-01 and retrieved 2026-08-23, with catalogue edition `2026-07-01.nps`. Each park has one raw authoring ID independent of potentially shared NPS site codes, one semantic and visual brief, three planned role-distinct candidates, and one deliberately selected `896 × 896` Studio source study with exact asset and recorded-prompt provenance. Sanitized provenance declares the owner-directed OpenAI image-generation workflow through Codex imagegen, trained-algorithm content origin, rights basis, exact-prompt association, and `national-park-study-jpeg@1` System.Drawing normalization recipe and quality ladder; hashes prove the frozen association, not historical call causation. Those raw IDs remain planned pack-local IDs, not qualified Archive identity, until Phase 3 assigns and reconciles an exact `packId` lineage.

Candidate prompts compile deterministically through `badge-source-art@1` from normalized reference data, one immutable candidate-role revision, one immutable creator-neutral style revision, and a fixed output contract. The initial `24` v1 style entries intentionally span pixel, fiber, paint, print, ink, cartographic, paper, mosaic, geometric, ceramic, and wood approaches; the prompt contract requires text-free full-bleed source art, while shape, crop, border, edge, material, relief, depth, reverse face, and movable physical lighting remain renderer-owned.

Every curated catalogue expansion now performs an explicit style-coverage review. Under the current ID-only v1 lookup, a missing medium, mood, subject, palette, or composition capability receives a new style ID; sufficient existing coverage is recorded in the decision or devlog; no used `{ styleId, revision }`, role revision, or prompt-recipe behavior is edited in place. A later revision of an existing ID requires versioned references and compiler dispatch that preserve the prior implementation before it can coexist.

The selected studies are intentionally promoted Git-tracked authoring inputs under the binary policy, not ordinary candidates and not `PublishedBadgeVisual` values. Rejected candidates, mutable Studio workspaces, provider responses, and heavy pack binaries retain their existing non-Git authority.

Publication is deliberately not inferred from source selection. The sixty-three selected `896 × 896` JPEG studies are each at or below `256 KiB` and total exactly `15,211,909` bytes, about `14.51 MiB`, as tracked authoring inputs; their sixty-three integrity-bound `128 × 128` list thumbnails total `373,657` bytes and keep browsing from decoding an original in every row. Direct strict-PNG runtime use of the sources at full resolution would still charge about `193 MiB` under decoded-image admission before the composite or additional maps, above the current `64 MiB` aggregate cap. Applying the current decoded-image admission formula to `448 × 448` derivatives leaves a plausible route under the cap alongside the current historical sources, but Phase 3 must still build the canonical derivatives and admit the complete pack before relying on that route; this unit does not choose or publish it.

Phase 3 must still prove the chosen quality tier and lazy-loading behavior, finish every renderer recipe and fallback input, select the composite presentation, implement runtime pack installation and independent admission, reconcile starter and future parks lineage without raw-ID rebinding, migrate Archive backup to carry the installed closure, resolve composite eligibility and catalogue-update semantics, and compile canonical bytes. The compact source-study set does not authorize weakening hostile-input limits, silently fragmenting collection identity, or claiming publication from authoring progress.

The accompanying `57` common-achievement ideas are a broader Studio curation queue with stable criteria, cues, and suggested styles. They do not become runtime suggestions, badge definitions, published visuals, or personal records until later curation and ordinary pack publication make each entry complete.

## 2026-08-23 — D-039: Render Timeline badges from frozen recipes with one live inspector

**Status:** Implemented for the current Archive Timeline; refines D-038's pinned-visual presentation without changing its earned-record projection or the unresolved repeat-occurrence boundary.

An earned memory owns an exact activation-pinned source and render recipe, not merely a rectangular source picture. Timeline therefore composes every card's default artifact preview from that frozen recipe, including shape, material, border, crop, and framing, and does not substitute the definition's current published appearance if it later differs.

Timeline may expose full rotation, zoom, and dynamic-light examination, but eagerly mounting one complete viewer per memory would make Canvas, WebGL-context, animation, and keyboard-control counts grow with personal history. Each card instead keeps one persistent inspection toggle, one ephemeral selected-record ID permits at most one live viewer in the whole Timeline, selecting another record transfers that inspector, and closing it restores the recipe preview without moving focus. The toggle precedes its controlled artifact slot in DOM order so opening with `Enter` makes forward `Tab` enter the 3D viewport, while CSS keeps the artifact visually above the toggle; preview images use browser-native lazy loading and asynchronous decoding so full authoritative art is not eagerly decoded for every offscreen memory. The same slot uses the renderer-independent front, edge, and back inspector when GPU rendering is unavailable or deliberately forced off.

The static preview is a renderer-owned recipe projection rather than cached user data, a new persistence format, or simulated interactive 3D. Timeline navigation, preview rendering, inspection, and replay remain provider-free and cannot change the frozen recipe, camera pose, light pose, activation, or accepted saying.

## 2026-08-23 — D-038: Make Timeline an earned-record projection before deciding repeat occurrences

**Status:** Implemented for the current Archive slice; it does not resolve open decision 1 about repeat occurrences.

The visible Timeline navigation cannot remain a disabled promise. The current Archive already persists one activation with a real-world occurrence range, an activation instant, frozen semantics, an accepted saying, an optional note, visibility, and an exact visual pin for every earned record, so its first useful Timeline is a read-only projection over that existing state rather than a new repository or migration.

Timeline includes only earned records with a non-null activation. It orders them by occurrence end descending, occurrence start descending, actual activation instant descending, and stable record ID; the visible occurrence date or range is primary, while the activation instant is separately labeled `sealed`. Cards use only record-owned text and resolved pinned visuals, and opening one selects that record in Collection. The section choice remains ephemeral, and opening or navigating Timeline has no provider-model-call path.

This projection deliberately contributes at most one entry per current badge record. It does not add another-visit, reread, repeat-memory, delete-occurrence, or secondary-ceremony controls and therefore does not preempt the unresolved repeat-cardinality decision. A future repeat model requires its own schema, migration, restore, composite-progress, and UI decision.

## 2026-08-23 — D-037: Permit compact model-written paragraphs and source-checked historical quotations

**Status:** Implemented; supersedes D-010's one-line and short-output wording while preserving its independent user-control and non-destructive proposal boundary, supersedes D-035 only for prompt v1, its short-line output contract, and its title-criterion-direction-only payload, and updates D-036's disclosed field scope and fingerprint without changing that decision's explicit-call, provider, transport, credential, or containment boundaries.

Prompt v2 may return a new compact paragraph targeting one to three sentences with no word-count target and a `600`-grapheme ceiling. Sentence count remains a writing target rather than a brittle punctuation gate. Model-written and supplied quotation text also carries `2,048`-code-point and `7,680`-byte ceilings; accepted generated or directly authored saying strings use the existing persistence shape with `800`-grapheme, `3,072`-code-point, `10,240`-byte, and `6,144`-raw-UTF-16-unit ceilings, so the change admits richer text without a data migration or silent truncation or allowing pathological combining-mark input into segmentation and backup.

A request may include a bounded source-checked historical-quotation shortlist containing exact opaque IDs, text, person, source title, and HTTPS source URL. In the quotation-selection branch Claude can only choose an exact supplied ID; it cannot supply, rewrite, shorten, combine, translate, complete, or attribute quotation text. The adapter hydrates the selection from the request, the application boundary compares every hydrated field with that same originating shortlist, and the proposal UI supplies quotation marks, person, source, and source link. If no supplied quotation clearly fits, the prompt requires a source-unverified model-written suggestion instead. Best-effort guards reject quotation-styled output, common explicit attribution patterns naming a supplied person, and contained or close matches to the request shortlist, but without retrieval the freeform branch cannot prove originality or provenance against all historical writing and is labeled accordingly.

Acceptance persists a quotation as the existing string form `“text” — Person, Source` while the source URL remains transient proposal metadata; Badge does not infer structured provenance for older or directly entered text. Any accepted quote-and-attribution-shaped string is protected across reload and backup restore from accidental word edits under its retained attribution: its action reads `Replace with my own`, starts a blank personal editor, and changes nothing until save. Manual quotations remain text-first and require the user to include quotation marks and attribution explicitly.

The exact prompt and disclosure advance to v2. The first-request disclosure shows the complete optional quotation shortlist and a quotation-contract version covering its executable record grammar, strictness, uniqueness, HTTPS-source rule, and semantic validation; any change to those rules must bump that version. The fingerprint invalidates its session acknowledgment when the provider, destination, model, prompt, field scope, quotation-contract version, normalization, or limits change; later explicit requests may carry different per-achievement values under that acknowledged scope. Canonical model JSON is capped at `12 KiB` inside the same-origin route's `16 KiB` request-body ceiling.

## 2026-08-23 — D-036: Use explicit same-site Claude Code calls for live sayings

**Status:** Implemented; resolves product-spec open decision 18 and supersedes D-035 only where that decision left the live provider, disclosure sheet, and credential boundary open.

The first live adapter uses the owner's already signed-in local Claude Code subscription, pins `claude-sonnet-4-6`, and mounts a capability-scoped saying endpoint on the existing Badge listener. Archive still depends on the provider-neutral saying application contract; the route host owns the concrete adapter, model pin, subprocess, and shutdown lifecycle. No second port, browser credential, API key, provider SDK, or durable disclosure acknowledgment is introduced.

The first explicit generate action in each page session fetches a same-origin disclosure and opens a no-provider-model-call review showing Claude Code, Anthropic as the destination, the pinned model, exact system prompt, exact canonical outbound values, excluded fields, and a fingerprint over provider, destination, model, prompt version, prompt text, field scope, normalization, and limits. Closing sends no provider-model request. The final `Generate with Claude` action acknowledges that fingerprint in memory and makes one POST; later explicit retries may call directly only while that fingerprint remains current.

The browser refuses redirects and non-same-origin fetch mode. The loopback endpoint requires its exact listener authority and same-origin fetch metadata, additionally requires exact Origin on POST, accepts only bounded canonical JSON with the current disclosure fingerprint, permits one active call, validates pinned response provenance, never retries or falls back, and returns bounded errors without provider output. It launches a native Claude executable in a fresh private temporary directory with an environment allowlist, tools, settings, MCP, sessions, browser integration, and dynamic prompt additions disabled. On Windows, atomic Job Object creation contains the descendant tree; on Unix, cancellation, timeout, response limits, listener shutdown, and client disconnect terminate and await the initial detached process group, with the explicit trusted-CLI limitation that a descendant which deliberately starts a new session or group can escape until a real supervisor is added. Failure to prove the owned containment barrier preserves the private workspace and makes cleanup failure sticky. Fixture and test builds keep curated in-process sayings and mount no HTTP provider surface.

## 2026-08-23 — D-035: Generate sayings only after an explicit runtime request

**Status:** Implemented in the provider-neutral contract, Archive controller, and explicit fixture-backed UI; the live provider, first-use disclosure sheet, and credential mechanism remain open decision 18.

The owner chose explicit serving-time generation. Only the final `Generate saying` action or `Try another` may call the Archive saying provider, and one action starts at most one attempt without automatic retries or fan-out; app load, badge selection, detail or activation-form opening, activation, ceremony or replay, reload, restore, and background work must make zero provider-model calls. On first use or after provider or field-scope change, the initial generate action opens the exact provider-and-payload review without a provider-model call, and only the review sheet's final generate action may send achievement data to the provider model.

The model prompt contains only title, criterion, and optional saying-specific direction; internal request identity and cancellation state remain outside it. That closed direction may contain bounded curated non-personal theme cues, voice, variation, and deliberately supplied user direction so copy can be unmistakably related to the badge. User direction may contain personal text and must be previewed verbatim, while no direction is inferred from notes, dates, occurrence history, accepted sayings, visibility, artwork, or other private state. The exact prompt v1, strict size ceilings, closed JSON request shape, and closed JSON response validation live in `docs/design/product-spec.md`.

Generation remains a non-destructive proposal. The accepted or handwritten line survives requests, retries, malformed output, cancellation, failure, and stale completion until the user explicitly chooses `Use this saying`; manual writing remains available without any provider.

## 2026-08-23 — D-034: Start the one-site launcher without a pre-release migration surface

**Status:** Implemented; supersedes only D-033's recovery path and reservation of port `4174`, while retaining D-033's one-site topology, origin continuity, verification isolation, and application boundaries.

The owner clarified that Badge has just been built and no released two-origin installation exists. No evidence ties user data to the pair record created during development verification; it was task output, not a product format that needs compatibility behavior. Building a recovery command around it invented migration scope and made the current product harder to understand.

The launcher now reads and writes only the existing `.badge-local/site.json` record. Its version remains unchanged so a site origin already selected by the one-site release stays reachable. Neighboring files are not startup inputs, there is no second recovery command or injected cross-origin navigation mode, and port `4174` is an ordinary valid port. Ports `4175` and `4176` remain reserved for optional provider companions, while `5173` and `5174` remain reserved for disposable fixture servers.

Contracts prove that the canonical runtime target exposes exactly one state path, a neighboring `ports.json` file cannot alter startup, the package exposes only unified local-site start, development, and preview commands, same-origin navigation has no companion-origin override, the current one-site record remains readable, and `4174` is eligible when explicitly considered. Historical D-032 and D-033 text remains as development history, but D-034 is the current rule.

## 2026-08-23 — D-033: Serve Archive and Studio as one remembered local site

**Status:** Implemented for the local launcher and route host; supersedes D-032's adjacent-pair topology and D-014's separate-browser-origin requirement while retaining D-009's data-continuity rule and the Archive–Studio build, persistence, backup, and publication boundaries.

The owner confirmed one local website rather than two port-addressed websites. Archive is mounted at `/`, Badge Studio is mounted at `/studio/`, and both independently built applications are served by one strict loopback listener on one remembered browser origin.

`npm start` probes both route identities before launching. A complete Badge site is reused; a free remembered port starts the whole site; and an unrelated, unidentified, incomplete, or route-swapped listener at the remembered port produces actionable refusal rather than relocation or a second partial process.

When no machine-local record exists, Badge prefers `http://127.0.0.1:4173`; if unrelated software owns it, the launcher selects one free non-reserved port beginning at `4180` and exclusively records that port in ignored `.badge-local/site.json`. The legacy Studio port `4174`, optional companion ports `4175` and `4176`, and disposable fixture ports `5173` and `5174` are excluded from fallback selection. Later starts reuse the recorded origin because IndexedDB includes the port; deliberate relocation still requires explicit backup or migration. The superseded `.badge-local/ports.json` remains preserved legacy evidence, and `npm run recover:legacy` reopens its exact pair without creating or changing the one-site record so old-origin Studio data remains reachable until Studio backup exists.

Sharing an origin does not merge the applications or make origin separation a security claim. Archive and Studio retain distinct entry points, build outputs, dependency graphs, versioned IndexedDB database names, repositories, navigation surfaces, service-worker scopes, content-security policy surfaces, and backup formats; neither build imports or opens the other's private implementation or database, and their only content handoffs remain minimal authoring requests and independently validated immutable packs.

Launcher lifecycle and browser verification use branded task-owned state targets confined to ignored `tmp/` paths rather than the canonical `.badge-local` record. Gates prove verification leaves an absent or legitimate pre-existing canonical record untouched on success and failure; no gate treats the canonical record's presence as task residue. Legacy recovery fails closed when its pair record cannot be inspected, accepts only the adjacent non-reserved loopback origins the prior launcher could have emitted, refuses a one-site host masquerading as a legacy Archive, injects exact cross-origin companion links, and serializes pair startup before it reuses or starts either application. It attempts every owned close and surfaces cleanup failures rather than silently discarding or reinterpreting the pair as permission to expose an empty origin.

## 2026-08-23 — D-032: Select a free durable origin pair once and make local startup idempotent

**Status:** Implemented for the local launcher; supersedes D-009's fixed canonical-port requirement without weakening its data-continuity rule.

`npm start` probes both applications before launching. If the exact Badge Archive and Studio are already present, it reuses them; if only one is present and its adjacent companion port is free, it starts only the missing application. This makes repeated startup successful without killing or duplicating an existing Badge process.

When no machine-local origin record exists, Archive and Studio prefer `4173` and `4174`; if unrelated software owns either port, the launcher reserves an adjacent free pair, starts both strict servers there, and exclusively records that pair in ignored `.badge-local/ports.json`. Cross-application links derive the selected adjacent companion instead of hardcoding the preferred pair.

The selection is dynamic only before a pair is remembered. Because IndexedDB includes the port in its origin, later occupation by unrelated software is an actionable startup error rather than permission to rotate to an apparently empty profile. A listener that fails or times out before returning the exact expected application marker is not guessed to be unrelated and blocks fallback with retry-or-stop guidance. Pair search checks every adjacent start rather than imposing undocumented parity. A malformed record is preserved, concurrent first writers publish a fully fsynced candidate through an atomic no-replace link, an older-origin warning accompanies first selection away from the preferred pair, and deliberate relocation still requires explicit backup or migration. The record stores addresses only and never personal or Studio state.

## 2026-08-23 — D-031: Separate candidate identity from content identity

**Status:** Implemented for the foundation Studio store and restore path; this strengthens D-022's non-destructive asset model and D-027's reviewed-source snapshot.

Content hashes identify immutable bytes, but they do not identify why those bytes are a candidate. One source may legitimately be both an admitted generated fixture and a user upload, and a deterministic treatment may produce the same output bytes from both. Version-2 original rows therefore keep a bounded set of exact admitted candidate identities, while version-2 derivative rows keep a bounded set of exact `(parentHash, operation, parentCandidateIdentity, candidateIdentity)` lineages. Candidate identities use a bounded transform digest rather than recursively embedding their ancestors, and generated-original identities are accepted only when they match known fixture contracts.

Every derivative identity is recomputed from its exact parent identity and operation during write and read validation. A transaction validates the complete asset-store snapshot plus the proposed add or lineage merge before mutation, so missing parents, substitutions, and cycles—including output bytes equal to an ancestor—fail without changing the graph. Content deduplication may merge exact lineages into one binary row, but candidate restore emits each identity separately and React keys use candidate identity rather than content hash.

Version-1 rows remain readable and preserved. A legacy fixture original is promoted with both plausible generated and uploaded identities instead of silently choosing one; an ambiguous legacy draft restores with no selection and suppresses autosave, processing, and publication until an explicit choice. Version-1 derivatives do not bind parent candidate provenance strongly enough to publish, so they remain stored but are not relabeled or selectable; applying the treatment again creates a version-2 lineage.

## 2026-08-23 — D-030: Couple every destructive restore confirmation to its exact safety snapshot

**Status:** Implemented for normal foundation restore and readable-state replacement; this strengthens D-026's safety handoff and D-025's recovery ordering.

The safety export operation returns the exact structured-clone-normalized Archive state from the same repository snapshot used to create the downloaded bytes. Final normal restore compares the current state with that checkpoint inside its write transaction before monotonic validation or any write. Readable incompatible-state replacement requires the checkpoint, compares it before recovery inspection, and retains the separate inspection-to-commit compare-and-swap. A second tab or intervening local action therefore produces an actionable `RESTORE_CONFLICT` that requires a new safety export and confirmation instead of silently overwriting even an unearned saying or lifecycle change.

Startup audits every earned visual source before classifying readable state compatibility. When state is both incompatible and source-damaged, the first explicit recovery repairs and quarantines source evidence without replacing readable state; the clean post-repair audit can then promote a new, separately confirmed readable-state replacement. This ordering keeps a damaged earned source from making the required safety export impossible while preserving both recovery stages and their evidence.

If an earned historical source is unavailable even to trusted repair inputs, a complete current backup is impossible. For readable but incompatible state, Archive then offers a separate `.badgeevidence.json` state rescue containing the exact readable state and digest, the omitted earned-source hashes, and a fixed declaration that it is non-restorable and excludes source art. The final replacement remains bound to that exact state checkpoint and a second saved-copy confirmation. This privacy-sensitive evidence file is ignored and explicitly rejected by the staged-delivery gate just like a backup.

Replacement eligibility is rederived from the exact state exported at the safety handoff rather than trusted from the tab that opened the dialog. If another tab has made that snapshot compatible and its earned sources are complete, Archive cancels replacement, offers the full backup, and continues only through normal monotonic restore. If the snapshot is compatible but its sealed art is incomplete, Archive cancels replacement and returns to explicit repair. Only an exact incompatible snapshot whose source failure prevents a complete backup can produce state-only rescue evidence; the later compare-and-swap covers changes after that classification.

## 2026-08-23 — D-029: Preserve one inspection session across appearance comparison

**Status:** Implemented for the shared Archive and Studio renderer foundation; this strengthens D-017's renderer-candidate lifecycle and fallback claims.

Live 3D and static fallback derive one normalized source rectangle from the decoded source aspect, the exact circle, square, rectangle, or shield framing aspect, and the recipe crop focus and scale. The live texture transform and fallback image placement consume that same rectangle, so a wide or tall source cannot stretch or reframe when capability changes. Front, edge, and back fallback views occupy one responsive shape-aware object frame, including border-box edge sizing, so they represent one physical height.

Ordinary recipe edits preserve the mounted Canvas and WebGL context plus ephemeral yaw, pitch, zoom, light position, interaction mode, engagement, capability, and fallback view while Studio compares appearance. Source replacement starts a new viewer session, while within a continuously live surface an explicit recovery generation rather than recipe content changes the renderer remount key. Source-texture clones invalidate only for a new decoded source, graphics context, shape, or crop; border, color, thickness, relief, and material edits reuse the existing texture framing. Wheel input belongs to one exact native `{ passive: false }` listener that prevents page scrolling only while the viewer is engaged and removes that same listener during cleanup.

Forced fallback is a genuine no-GPU control: first render skips the WebGL2 capability probe and never mounts a live Canvas. Disabling that control schedules one cancellable probe before live construction. Renderer contracts cover non-square source framing equivalence, every shape's fallback geometry, non-passive engaged-only wheel ownership, a twenty-step recipe edit without Canvas or texture-framing churn, viewer-session preservation, explicit recovery remount identity, source-change reset, and zero probe invocation in forced mode.

## 2026-08-23 — D-028: Close Archive backup references before one aggregate image budget

**Status:** Implemented for `.badgearchive` v2 creation and parsing; this extends D-024's decoded-memory rule to the personal backup boundary.

Archive backup parsing compares the canonical state references with the manifest source table before hashing, PNG structure validation, or inflation, so missing and unreferenced payloads fail before hostile image work. Every required PNG is then charged against one conservative `64 MiB` aggregate decoded-image budget, and the source that would cross the remaining budget is refused before inflation. Backup creation applies the same closure and aggregate invariant so Archive cannot emit a file its own parser must reject.

## 2026-08-23 — D-027: Bind each Studio publication to its reviewed source snapshot and exact theme capabilities

**Status:** Implemented for foundation fixture and uploaded candidates; this strengthens D-022 and D-024.

The exact admitted theme must declare every published recipe's shape and material as well as the visual's front, edge, and back fallback template IDs. Studio attaches each integrity-checked built-in candidate Blob to the candidate state at startup, and processing and publication fail closed when that verified snapshot is unavailable; a display URL is never re-fetched as authoritative release input. Uploaded and derived candidates already carry their immutable Blob snapshots, so the bytes reviewed, normalized, hashed, and compiled share one content lineage.

## 2026-08-23 — D-026: Replace readable but incompatible Archive state only after a safety handoff

**Status:** Implemented for the four-record foundation UI; this narrows D-025's statement that only unreadable state is replaced.

Source-repair recovery still preserves every readable compatible personal value. When schema-valid local state fails the current Archive's starter compatibility contract, the UI may instead enter an explicit readable-state replacement mode: it first validates a compatible incoming backup, offers a self-contained backup of the current readable Archive without mutation, and only a second confirmation that the file was saved may quarantine the exact prior row with an incompatible-readable-state reason and atomically install the selected state. The recovered state then passes the starter-identity assertion and earned-visual audit again before the Archive opens; a failed safety export or post-recovery check never authorizes the UI to continue.

## 2026-08-23 — D-025: Repair damaged Archive data without rewriting readable personal state

**Status:** Implemented for the foundation Archive restore and recovery boundary; this supersedes D-021 where it permitted an earned starter record to carry an unrelated qualified identity.

An earned backup may preserve its historical title, criterion, description, source hash, visual edition, version, and digest only while its complete qualified `DefinitionRef` and the `packId` lineage of both its published visual and activation pin remain the expected starter identity. Archive renders the self-contained earned record's historical semantics instead of silently substituting current fixture copy. A same-record rebind to another definition or pack fails before startup or restore mutation.

Explicit recovery is a repair operation, not an alternate unchecked restore. When current state is readable, recovery preserves its validated personal values without applying incoming state and only quarantines and repairs damaged referenced source rows; only unreadable state is quarantined and replaced from the backup. Startup audits earned visual sources so this path is reachable, file size is refused before browser allocation, structured-clone compare-and-swap distinguishes binary and built-in container values, and a normal restore separates offering a safety backup from the user's later explicit confirmation that it was saved.

## 2026-08-23 — D-024: Admit only dependency-closed runtime bytes within one decoded-memory budget

**Status:** Implemented for canonical foundation packs; this strengthens D-020's executable closure claim without implementing Archive installation or durable release ledgers.

Every object named in a pack manifest must be reachable from a runtime manifest field, so rejected candidates, private originals, and arbitrary side media cannot hitchhike in an otherwise valid pack. Independently admitted root and dependency bytes are then checked as one exact graph: every declared `PackRef` must be supplied, extras, cycles, duplicates, and same-version forks fail, and every visual's front, edge, and back fallback template IDs must exist in its exact admitted theme.

PNG admission charges the larger of its exact scanline decode size and conservative browser RGBA footprint against both the per-image and aggregate `64 MiB` decoded-image budget before inflation. Badge Studio takes a synchronous operation lock before upload, processing, or publication crosses its first asynchronous boundary, preventing pending work or edits from changing the displayed selection while different release bytes are frozen. Both fixture generation and Studio publication run the dependency-closure validator before offering files.

## 2026-08-23 — D-023: Run the same admission source in plain Node and application builds

**Status:** Implemented for the pack-contract boundary.

The fixture generator imports the real `@badge/pack-contract` TypeScript source and runs `admitPack` under the repository's pinned Node 24 runtime before writing either artifact. Production-relative imports inside that package use explicit `.ts` specifiers, the no-emit root TypeScript config permits them, and the transitive Node-loaded path uses erasable TypeScript syntax so Node's built-in type stripping needs no loader or transform flag. The direct `node scripts/generate-pack-fixtures.mjs` build step is the regression gate because Vitest and Vite otherwise mask plain-Node resolution differences.

This was selected after plain Node failed first on extensionless imports and then on `.js` specifiers that had no emitted sibling. The deliberately different alternatives were a pinned but experimental Vite runner and a task-local TypeScript compilation; both worked, but each added a runtime tool boundary or temporary build lifecycle. Executing one validator source directly avoids validator drift, extra processes, shared generated code, and experimental runtime hooks.

## 2026-08-23 — D-022: Refuse unsafe image geometry before browser decode and freeze publication inputs

**Status:** Implemented for the foundation Studio boundary.

Studio accepts declared PNG, JPEG, or WebP uploads no larger than `16 MiB` and parses their bounded container headers before invoking `createImageBitmap`. It rejects either axis above `8192` pixels or more than `16,777,216` pixels, then verifies that decoded geometry matches the header directly or by an exact width-and-height swap to accommodate browser-applied orientation. Every created bitmap is closed, and a stored asset that fails the same checks is refused rather than trusted because it previously passed a write path.

Publication copies the selected bytes and schema-parses a detached render recipe before its first asynchronous step, then uses only those snapshots for validation, hashing, versioning, and compilation. These constraints prevent a compact decompression bomb from reaching native decode before a geometry decision and prevent mutable `Uint8Array` or recipe aliases from changing the release after validation but before canonical bytes are frozen.

## 2026-08-23 — D-021: Preserve frozen earned lineage while refusing unearned starter substitution

**Status:** Implemented for the four-record foundation Archive; the general installed-pack restore contract remains D-015 and the backup target.

Foundation restore accepts exactly the four starter record IDs. An incoming record that remains unearned must match the current complete immutable starter definition and published-visual lineage, while an earned record under one of those IDs may preserve divergent historical lineage because its exact source bytes and frozen recipe travel in the self-contained backup. Existing earned records can never be omitted or changed by normal restore; an unearned current record may become an earned self-contained replacement but may not be replaced by different unearned catalogue content.

Normal restore validates every source byte carried for incoming earned records; corrupt-store recovery inspects every reference recoverable from valid current state plus every incoming reference. Corrupt bytes are quarantined; only an exact hash-checked built-in source may repair a trusted starter reference, and an unavailable or unknown required source fails before state mutation. This deliberately favors preservation of an honestly earned historical edition without letting an old or crafted backup silently rewrite the current unearned catalogue.

## 2026-08-23 — D-020: Make fixture pack identity executable and closed

**Status:** Implemented for the foundation fixture path; D-015's durable reservation and install ledgers remain required.

The built-in fixture generator compiles and independently admits actual canonical `badge.theme.heirloom@1.0.0` bytes with digest `92ec4fd60efdabbc925e3e1077c4a1f1f05ccfad79466d9f386e027e815ca910` and actual canonical `badge.catalogue.starter@1.0.0-alpha.3` bytes with digest `5b7135a70477130907050a9921da342e927980838ee9b1ae03a4d41809c6ffe3`. The catalogue manifest depends on that exact theme `PackRef`; any mutable fixture input that changes either digest fails generation and requires a reviewed version bump rather than creating a same-version fork.

Studio fixture publication now offers the independently admitted targeted `.badgepack` and its exact independently admitted `.badgetheme` dependency together. Generated binaries remain ignored build artifacts reproducible from tracked small source inputs and compiler code. From a clean clone, `npm run generate:fixtures` first derives Archive PNG inputs and then writes `tmp/generated/pack-fixtures/heirloom-<digest>.badgetheme` and `tmp/generated/pack-fixtures/starter-<digest>.badgepack` after compilation, pin checks, and independent admission. This proves real bytes, canonical identity, and dependency closure without claiming the still-unimplemented Archive pack installer, seen-release ledger, Studio prepared-release persistence, cross-platform golden result, or confirmed disk write.

## 2026-08-23 — D-019: Admit durable source formats only after bounded full decoding

**Status:** Implemented for the foundation Archive boundary.

Archive accepts durable source art only as strict PNG validated independently and locally before every write and during visual reads, backup creation, restore, and corrupt-data recovery. The validator performs bounded inflate, exact DEFLATE framing, chunk CRC, Adler-32, dimension, scanline-length, filter, and canonical-chunk checks. Studio may ingest WebP or JPEG before PNG publication. The four tracked Archive artwork inputs remain compact WebP developer sources, but a pinned offline build tool verifies their exact hashes, decodes them sequentially, and writes deterministic filter-0 RGBA PNG derivatives into an ignored directory; fixed output hashes and strict PNG validation prevent generated bytes from changing a published pin silently.

This decision followed a fixed adversarial benchmark: a corrupt PNG whose IDAT CRC and whole-file hash were recomputed passed header-only validation, Chromium's image APIs also accepted it, and a local WebP decoder returned pixels while ignoring malformed trailing bitstream bytes. Tracking 896-pixel strict PNGs exceeded the Git blob ceiling, while smaller conversions visibly lost engraving detail. Build-derived PNGs preserve the decoded 896-pixel artwork exactly without entering Git, and the everyday Archive contains no WebP decoder, WASM, or relaxed script policy. This is a pre-release contract correction in the repository's first code commit; no supported user WebP state or backup format was released.

## 2026-08-23 — D-018: Use content-addressed prerelease versions and canonical PNG objects in the foundation

**Status:** Implemented interim release rule; D-015's durable prepared-release and reservation ledgers remain required before general pack installation.

The first Studio slice normalizes selected pixels to a metadata-free PNG, validates the PNG structure from bytes in both compiler and admission, and derives the prerelease version from the complete unversioned canonical manifest. Repeating identical input produces identical bytes and a changed manifest produces a different version, so this single-project browser handoff cannot create a same-version fork merely by changing art, recipe, provenance, or accessibility copy.

The downloaded pack is frozen and its exact bytes can be offered again during the current publish state while the working draft remains separate. A reload reopens the editable local draft; the foundation does not claim a durable `PreparedRelease`, `ReservedPackRelease` ledger, publish history, or file-write confirmation until the later D-015 slice implements and backs them up.

## 2026-08-23 — D-017: Implement React Three Fiber as the measured renderer candidate

**Status:** Experimental implementation; D-012 remains provisional until the complete Phase 0 renderer gate passes.

The first runnable slice uses Three.js with React Three Fiber for demand-rendered live geometry, immutable source textures, physical material response, shadows, pointer and keyboard rotation, bounded zoom, independent light movement, reset controls, context-loss fallback, and deterministic CSS front, edge, and back fallback views. Only the engine-neutral `RenderRecipe` persists; camera, light, loader, texture, geometry, material, canvas, and GPU state remain renderer-owned and ephemeral.

Headless Chromium proved live front, oblique, edge, back, zoom, light-mode, recipe replacement, forced fallback, and reduced-origin reload flows across two desktop-like viewports, and unit tests prove renderer-neutral state bounds and geometry construction. This evidence is enough to keep the candidate in the scaffold but not enough to accept the engine: the instrumented performance budget, 50-cycle lifecycle and forced-failure stress gates, true context rebuild, resource counters, and reference-hardware report remain mandatory.

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
