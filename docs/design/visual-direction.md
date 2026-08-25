# Visual Direction

## Selected family

The owner selected the third explored direction: a warm, modern field archive with substantial engraved artifacts, fine topographic linework, mineral accents, exact typography, and a restrained editorial interface.

The follow-up Badge Atelier mock is retained as the visual seed for the separate developer-only Badge Studio: candidate comparison, upload and reprocessing, 3D construction, and publishing. It is not an archive screen and can still be refined before implementation.

## Promoted visual inputs

- [Selected collection and activation direction](assets/selected-gallery-direction.webp)
- [Badge Studio candidate and construction direction](assets/badge-atelier-direction.webp)

These files are intentionally promoted layout, mood, and finish references, not source-art specifications or final renderer output. Their pictured metal rims and lighting must be reconstructed as live geometry and material response rather than copied into generated candidates; the optimized files stay below the fleet's ordinary binary ceiling, and original multi-megabyte generations remain outside Git.

## Experience character

The interface should feel like opening a private cabinet of meaningful artifacts: quiet, premium, warm, and emotionally substantial.

The UI recedes around the collection through generous space, precise alignment, strong typography, subtle dividers, and restrained color.

Badges feel physically heavy through credible thickness, relief, edge treatment, texture, controlled highlights, and deep but readable shadows.

The product is not beholden to a single circle or metal finish. Art may be diverse, and shape and material are configurable by the Studio developer before publication, while craftsmanship, lighting discipline, and interface behavior create coherence. The archive receives that construction read-only.

## Reference translation

The owner's mood references include carefully finished consumer hardware, expansive European science-fiction linework, the contemplative scale and warm solitude of _Journey_, and the readable crafted world of _Outlanders_ 1 and 2.

Translate those references into original qualities: precision, restraint, meticulous finishing, contemplative scale, elegant silhouettes, fine editorial linework, luminous but controlled color, and a sense of discovery.

Do not copy recognizable characters, compositions, logos, product trade dress, interface layouts, or source artwork, and do not ask a generator to reproduce a living or named creator's exact style.

## Badge art grammar

Badge Studio generates text-free artwork that remains legible both as a large hero artifact and a collection thumbnail.

Generated candidates are flat source illustrations without a finished badge silhouette, rim, bevel, thickness, cast shadow, presentation background, or object-level material and studio highlight. Scene lighting inside an illustration is allowed; physical badge lighting belongs exclusively to the construction renderer.

Candidate concepts are meaningfully different rather than three random seeds of the same composition.

For a typical request, propose a literal or subject-led composition, a symbolic or emotional metaphor, and a map, pattern, or narrative composition, then compare all three through the same live 3D construction recipe.

The chosen source image remains separate from the artifact construction layer so the same art can be cropped into a circle, square, rectangle, shield, or later preset and rendered as metal, wool, enamel, or another material.

Titles, clever sayings, dates, notes, progress, and collection names are rendered by the UI with crisp typography.

## Diverse art-direction library

The first tracked authoring library contains `24` immutable creator-neutral style revisions spanning pixel clusters, thread-painted embroidery, historical impressionist qualities through broken color and atmospheric light, relief and intaglio printmaking, ink, cartography, gouache, tapestry, cut paper, cyanotype, watercolor, charcoal and pastel, screenprint, mosaic, fresco, geometric symbolism, ceramic underglaze, wood marquetry, scratchboard, and luminous clear-line illustration.

This diversity is intentional. A national-parks collection may move between media when the medium strengthens the place, while exact briefs, restrained interface framing, consistent source-art rules, and the shared physical renderer preserve product coherence.

The complete style list, candidate-role grammar, deterministic prompt assembly, and expansion policy live in [art-style-catalogue.md](art-style-catalogue.md).

Every catalogue expansion reviews visual-family gaps before assigning styles. A missing capability receives a new style ID under the current v1 lookup; sufficient existing coverage is recorded in the release decision or devlog; a later revision requires versioned references and retained old-revision dispatch, and existing `{ styleId, revision }` prompt behavior is never edited silently.

## Material vocabulary

Metal should feel noble and durable: blackened steel, nickel, bronze, titanium, enamel inset, or restrained patina rather than glossy plastic or toy gold.

Wool and armband treatments should have believable weave, stitching, compression, and edge construction without turning into cartoon patches or novelty merch.

Border color and width are deliberate construction controls, not merely decorative CSS outlines; the preview must communicate how they alter the physical artifact.

Uploaded photography should remain recognizable when desired. Processing can translate it into the collection's art language, but the original is preserved and the Studio developer chooses every replacement.

## Three-dimensional physicality and lighting

The badge is built as real geometry with credible thickness, bevels, seams, relief, recesses, and a considered reverse face. A flat plane with a perspective transform does not satisfy the direction.

Materials use physically based response: metals carry disciplined roughness and reflections, enamel has controlled depth and edge transitions, and wool communicates fiber, compression, stitching, and softer shadow response.

The default studio rig uses restrained environment light plus key, fill, and rim separation so the silhouette reads without theatrical glow. Rotating the object changes specular highlights and shadows continuously, revealing construction rather than merely moving a baked image.

`Adjust light` is a separate explicit interaction mode that orbits the key light. It should feel like moving a photographer's lamp around a small artifact, with enough range to inspect relief but sensible bounds that avoid a fully black or blown-out object.

The initial pose is a calm, slightly oblique presentation that makes thickness legible. There is no perpetual showroom spin; motion begins from direct manipulation or a brief activation transition and settles immediately.

## Interface surfaces

### Collection gallery

The gallery is a warm archival cabinet for earned memories only. Each represented collection is one deep framed shelf that starts closed, keeps collected artifacts in full color, and expands to a considered memory grid; sets with no earned records do not render as empty furniture, and an empty archive uses one deliberate callout rather than a cabinet of grey potential art.

The surface retains the selected fancy Option 2 character through paper, inset shelf depth, fine rails, rust details, editorial serif hierarchy, and real badge imagery. Search and four derived collection statistics sit above the cabinet, while each set says only `x / y collected`; lifecycle copy, `planned`, and generic `x badges` labels do not appear.

Every picture and presentation is already decided by an installed pack. The gallery never shows prompts, candidates, uploads, processing, appearance construction, provider state, or calls to create missing art.

### Discovery catalogue

Discover is the complete set browser rather than another personal gallery. A generous catalogue heading, wrapping canonical set rail, `x / y collected` progress, one search field, a responsive card grid, and bounded progressive reveal make all created visual concepts findable without turning the surface into a dashboard. The hierarchy borrows the useful category-progress, earned timestamp, and earned-versus-unearned scan cues of mature achievement systems while retaining Badge's quiet archival materials rather than game chrome, points, or rewards.

Every badge card is one coherent click and keyboard target rather than a passive card with a small CTA. Earned badges use full color, state `Collected`, and open the exact memory replay. Every potential badge is grey: a published unearned entry says `Ready to collect` and opens preparation in place, while a selected study says `Potential` and `Not yet published` and opens a read-only editorial preview of its admitted list art and safe metadata without false activation, quotation, 3D, install, provider, or authoring capability. Missing thumbnails retain the complete searchable card with an explicit preview fallback rather than hiding the concept.

### Memory timeline

The Timeline uses the same warm editorial archive language as Collection: generous margins, one quiet chronological rule, restrained date markers, and substantial memory cards rather than a dense activity feed. Real-world occurrence dates lead; the later sealed timestamp remains secondary. Each card shows the frozen badge artifact through its pinned shape, material, border, crop, and source rather than presenting the source picture as a rectangular illustration. A restrained persistent inspection control swaps only the chosen preview into the live 3D or fallback viewer, so a long memory history never becomes a wall of canvases or repeated viewer controls.

Each earned entry keeps the frozen badge art, title, saying, and optional note legible, with one low-emphasis action back to the full Collection memory. The empty state is composed and invitational rather than looking disabled or unfinished, and primary Archive navigation remains visible at narrow desktop widths.

### Badge Studio

The dedicated developer surface separates the creative comparison area from a large live construction preview and visually identifies itself as Studio rather than the personal archive.

Generation, upload, and process actions are clearly related but do not compete with the candidate-level `Use selected design` action that advances the chosen source into construction.

Candidate selection uses a precise keyline, check state, and keyboard focus, never color alone.

Shape, material, border color, and border width are grouped compactly beside the live preview; advanced controls stay progressive rather than crowding the first view.

The live preview is the dominant 3D examination surface. It provides direct drag rotation, wheel or trackpad zoom, a clearly selected object-versus-light mode, and quiet reset controls without surrounding the artifact with game-editor chrome.

The final action is `Validate and publish pack`, not activation. Validation summarizes selected presentations, missing assets, asset sizes, fallback readiness, compatibility, sanitized provenance, and the exact export destination before emitting an immutable bundle.

### Archive badge detail

The archive detail view uses the published 3D presentation without exposing construction controls. It keeps rotation, zoom, lighting, reset, dates, memory, and quotation selection visually calm and personal.

The badge quotation sits with the published preview and is already present when the badge first appears. Before activation it uses semantic quotation typography followed by two quiet provenance rows: `Historical figure` names the person and offers `Wikipedia` only when the exact curated record has an applicable English-Wikipedia biography URL, while `Quote source` names the source title and always offers the neutral `View quote source` action for the reviewed evidence page. It offers one restrained `Regenerate quote` action rather than an editor, empty state, proposal card, or multi-step action cluster. After activation the same quotation and provenance become read-only memory text and the regeneration action disappears.

On first live regeneration, `Regenerate quote` opens a calm review sheet without sending anything. The sheet names the provider, displays every outbound field and value including the required source-checked historical-quotation shortlist, shows exact prompt v3, and ends with `Regenerate with Claude`; it is a privacy checkpoint, not a technical console or recurring modal after unchanged scope has been acknowledged.

While regeneration is pending, the accepted quotation remains fully visible and the one action communicates progress without shifting the artifact preview. Claude selects only an exact disclosed quotation ID and never composes or attributes words; Badge supplies the quotation marks, person, source title, required quotation-source link, and optional separately bound English-Wikipedia biography link from the reviewed record, persists the validated replacement, and then updates the display. Failure, cancellation, malformed output, or stale completion leaves the prior quotation untouched and keeps the retry path in place.

The read-only quotation, attribution, source action, error copy, and activation ceremony wrap even uninterrupted text and remain vertically reachable at narrow or short desktop viewports rather than truncating the passage or reducing it below the accessible type scale.

### Activation

The activation moment should feel like a crafted object seating into place.

The earned-state replay action should feel like an intentional coda rather than a generic utility button: a compact replay emblem, clear primary label, quiet explanatory line, precise focus treatment, and restrained directional response invite the ceremony without competing with the badge or memory text.

A recommended first-activation sequence is: commit state → brief alignment or pressure beat → crisp material impact or traveling highlight → relief resolves → saying appears → calm final hold that hands control to the same live 3D viewer. When the earned-state replay is invoked, the badge and saying are present together while the badge makes one complete passive turn and rests; replay exposes only close, while object-versus-light mode, zoom or scale, reset, fallback-view switching, and direct manipulation remain on inspection surfaces and the first activation ceremony.

If one action also completes a composite badge, reveal the individual badge first, close the collection progress state, then present the composite artifact.

## Implemented Archive and phone-capable surface record — 2026-08-25

### Status and capture contract

This dated record preserves the implemented Collection, Discover, and phone-capable Archive and Studio visual system so later catalogue work can distinguish accepted interface behavior from a new design proposal; the promoted collection and Atelier mockups remain mood, layout, and finish seeds rather than pixel specifications for these implemented surfaces.

The executable values remain authoritative in Archive CSS, while this section records their semantic roles, component states, interaction hierarchy, and responsive intent so a mechanical restyle cannot silently erase the accepted design.

The following optimized fixture-only captures are current implementation references, not aspirational mockups:

- [Collection reference](assets/archive-collection-2026-08-25.png): route `/#collection`, `1440 × 1000` browser viewport override, one earned Yosemite fixture, one represented U.S. National Parks shelf expanded, inherent shelf browse surface hovered, captured 2026-08-25.
- [Discover reference](assets/archive-discover-2026-08-25.png): route `/#discover`, `1440 × 1000` browser viewport override, U.S. States selected, `0 / 50 collected`, first bounded page of reviewed potential badges, captured 2026-08-25.
- [Archive phone reference](assets/archive-discover-mobile-2026-08-25.png): route `/#discover`, exact `390 × 844` CSS viewport and decoded PNG bitmap, fixture-only U.S. States selected with `0 / 50 collected`, four primary destinations visible and the set selector represented as a horizontal touch rail, captured 2026-08-25.
- [Discover study phone reference](assets/archive-discover-study-mobile-2026-08-25.png): route `/#discover`, exact `390 × 844` CSS viewport and decoded PNG bitmap, fixture-only Acadia source-study preview with no personal state, showing the bounded selected-study art, truthful nonpublication status, set membership, capability note, and close action, captured 2026-08-25.
- [Studio phone reference](assets/studio-mobile-2026-08-25.png): visual-only reference captured on the superseded `/studio/` document at an exact `390 × 844` CSS viewport and decoded PNG bitmap, with deterministic Yosemite fixture candidate selection, all four primary destinations visible, and the candidate comparison represented as a horizontal touch rail; the current Studio surface is `/#studio`, and this asset has not yet been recaptured on the single-root host.

Both desktop Archive states were also inspected at a `900 × 900` browser viewport override. The compact Collection shelf starts closed, the five Discover set segments wrap without an empty pseudo-segment, neither page overflows horizontally, and all 24 initially rendered state thumbnails decode successfully.

Phone verification covered Archive and Studio at `320 × 568`, Archive at `430 × 932`, Discover at `390 × 844`, and both surfaces in short landscape at `844 × 390`. The inspected documents had no horizontal overflow; their four primary destinations remained visible; internal set, candidate, and collected-artifact rails retained deliberate horizontal touch scrolling; ordinary inspected controls met the `44px` target floor; and all inspected form fields retained `16px` text. A fresh Yosemite activation then proved the complete phone ceremony, populated Collection shelf, passive live replay, and forced live-renderer fallback in portrait and short landscape. The first fallback pass exposed a width-sized static badge spilling into replay details; the corrected fallback stage and art frame now have equal client and scroll heights and remain wholly inside the viewer. A dedicated browser harness then rendered circle, square, rectangle, and shield in both interactive ceremony and passive replay at the phone floor and short landscape: all sixteen frames stayed contained and preserved their recipe aspect ratio within `0.000143`. Studio's live viewer accepted a protocol-level vertical touch swipe that advanced the page while retaining `pan-y pinch-zoom`, the conditional restore-recommendation target measured `44px`, and simulated `37px` left plus `41px` right safe insets reached both library panes without document overflow. All three promoted mobile reference files are exact `390 × 844` PNG bitmaps and are fully decoded by the promoted-asset gate; the Studio file remains visual-only until it is recaptured on the current `/#studio` host section.

### Shared tokens

| Role            | Implemented value                                                                | Use                                                                    |
| --------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Paper           | `#f3eee4`                                                                        | Primary Archive page field                                             |
| Bright paper    | `#faf7f0`                                                                        | Inputs, active catalogue set, callouts, and lifted card surfaces       |
| Deep paper      | `#e7dfd2`                                                                        | Artifact and image wells                                               |
| Ink             | `#28261f`                                                                        | Primary text and active navigation                                     |
| Soft ink        | `#5f5a50`                                                                        | Supporting prose and secondary labels                                  |
| Faint ink       | `#6f685e`                                                                        | Metadata, counts, and quiet empty-state copy                           |
| Rule            | `#d3cabd`                                                                        | Dividers and restrained control boundaries                             |
| Rust            | `#ae4d2d`                                                                        | Active navigation, set selection, category labels, and primary accents |
| Dark rust       | `#913c22`                                                                        | Readable rust action text                                              |
| Mineral         | `#2f716d`                                                                        | Reserved cool mineral accent                                           |
| Focus           | `#17656b`                                                                        | Global two-pixel focus outline with a three-pixel offset               |
| Success         | `#536b58`                                                                        | Collected-state text and framing                                       |
| Danger          | `#963c32`                                                                        | Actionable failure text                                                |
| Display type    | `Iowan Old Style`, `Palatino Linotype`, `Book Antiqua`, Palatino, Georgia, serif | Headings, artifact titles, statistics, and reflective copy             |
| Interface type  | Aptos, `Segoe UI Variable`, `Segoe UI`, system UI, sans serif                    | Controls, labels, status, and utility copy                             |
| Controlled ease | `cubic-bezier(0.2, 0.72, 0.2, 1)`                                                | Short disclosure and surface-state transitions                         |

The shared desktop content measure is at most `1480px`; the Archive header is `74px` high on wide desktop, becomes a `118px` two-row header at `1180px` and below, becomes `108px` high at `640px` and below, and resolves to a compact `102px` identity-and-navigation shell at `480px` and below before safe-area padding.

### Collection state contract

Collection is the personal earned-memory cabinet: potential and unpublished badge pictures never fill its shelves, and a canonical set appears only after at least one earned record represents it.

| State                                 | Visual contract                                                                                                                                                                                                | Behavior contract                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Page masthead                         | Rust uppercase eyebrow, very large regular-weight editorial serif title, reflective serif introduction, one search field, and a four-cell ruled statistics strip                                               | Search and statistics remain visually secondary to the archive title                                     |
| Empty archive                         | One bright-paper ruled callout says that the cabinet is waiting; no result count, search-miss copy, canonical shelf, or empty bay competes with it                                                             | The only invitation leads to Discover and does not create or activate anything by itself                 |
| Closed canonical shelf                | Inset warm-paper bay, substantial upper and lower rails, restrained shadow depth, set title, description, and only `x / y collected`                                                                           | Shelves begin closed and disclosure state remains ephemeral                                              |
| Canonical shelf browse hover or focus | The ordinary shelf segment alone receives `rgba(170, 73, 42, 0.07)` tint and a two-pixel inset rust highlight                                                                                                  | It opens the exact set in Discover; replay and disclosure targets never trigger or advertise this action |
| Collected artifact preview            | Up to three full-color shaped artifacts carry a deep-paper well, substantial border, and shadow; compact circle and square previews are `166 × 166px`, rectangle is `238 × 142px`, and shield is `166 × 178px` | Selecting an artifact opens the exact earned memory replay                                               |
| Expanded shelf                        | A slightly deeper paper field sits below a fine rule and contains a considered memory grid                                                                                                                     | Every collected record in the set becomes reachable without changing durable state                       |
| Resolving art                         | The shaped artifact well remains present with explicit quiet resolution copy                                                                                                                                   | Missing asynchronous source resolution does not collapse the shelf geometry                              |
| Search miss                           | A centered, generous empty field names the failed collected-memory search and suggests valid search dimensions                                                                                                 | Search never opens a shelf or exposes potential catalogue entries                                        |

### Discover state contract

Discover is the complete created-concept browser: a generous editorial hero and one ruled progress summary lead into a canonical set selector, one search field, a result heading, and a responsive card grid.

| State                      | Visual contract                                                                                                                               | Behavior contract                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| All sets                   | The `All sets` segment is bright paper with a three-pixel rust underline; the hero reports Archive progress                                   | All created visual concepts participate in search and results                                |
| Selected set               | The selected segment uses the same bright-paper and rust-underline treatment, and the hero adopts that set's title, description, and progress | `aria-pressed` and explicit `x / y collected` text communicate selection without color alone |
| Collected badge            | Full-color art, collected-success framing, explicit `Collected` pill, and whole-card hover or focus lift                                      | The complete card opens the exact earned replay                                              |
| Published unearned badge   | Quiet grey art with explicit `Ready to collect` pill and whole-card hover or focus lift                                                       | The complete card opens the existing preparation flow in place                               |
| Selected source study      | Quiet grey art with explicit `Potential` pill, `Not yet published` copy, and whole-card hover or focus lift                                   | The complete card opens a focus-contained read-only preview with no runtime badge capability |
| Missing reviewed thumbnail | The complete card and copy remain, with an explicit `Preview unavailable` image fallback                                                      | Missing list art never hides the concept or invents an action                                |
| Progressive reveal         | The first 24 matching cards render with explicit `Showing x of y` copy and one quiet `Show n more` action                                     | Each action adds at most 24 cards; changing the set or query resets the bounded window       |
| Search miss                | A centered, generous empty field names the failed search and suggests valid catalogue dimensions                                              | Set selection remains intact while the query changes                                         |

Potential art uses `grayscale(1) saturate(0.1) contrast(0.88)` at `0.52` opacity; the explicit state pill and action or non-action copy remain the primary truth rather than the filter alone.

At wide desktop the set selector uses five flexible segments for `All sets` and the four recorded sets, while the result grid uses three columns; each card reserves a `156px` art column containing a `128 × 128px` reviewed list image and keeps status as a compact paper pill over that image.

### Interaction precedence

| Surface                                     | Primary action                        | Independent neighboring action                        |
| ------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| Collection ordinary canonical shelf segment | Browse that exact set in Discover     | None                                                  |
| Collection shaped artifact                  | Replay that exact earned memory       | It must not browse or expand the shelf                |
| Collection circular disclosure              | Expand or collapse collected memories | It must not browse or replay                          |
| Discover set segment                        | Select one catalogue set              | It must not prepare or replay a badge                 |
| Discover collected badge card               | View exact memory                     | One stretched native button covers the complete card  |
| Discover published-unearned badge card      | Prepare exact badge                   | One stretched native button covers the complete card  |
| Discover source-study badge card            | View safe read-only study preview     | It cannot plan, activate, inspect 3D, or enter Studio |

Keyboard focus uses the shared focus token, selected states retain text or semantics in addition to color, and overlapping shelf controls preserve the same action boundaries for pointer, keyboard, and assistive-technology users.

### Responsive and reduced-motion record

| Width or preference                 | Implemented response                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `1180px` and below                  | Archive header becomes two rows; Collection masthead becomes one column; Collection memory grids and Discover badge results become two columns                                                                                                                                                                                                                           |
| `900px` and below                   | Discover hero becomes one column and its five set segments wrap into balanced flexible rows without leaving a false empty segment                                                                                                                                                                                                                                        |
| `820px` and below                   | Collection shelf copy and disclosure form the first row while the artifact strip becomes a second, horizontally scrollable row                                                                                                                                                                                                                                           |
| `640px` and below                   | Header becomes `108px`; Collection statistics become a two-by-two matrix; Collection memory grids, Discover set segments, and Discover results become one column                                                                                                                                                                                                         |
| `480px` and below                   | Archive and Studio use a `102px` two-row safe-area shell with four equal primary destinations; set, candidate, and collected-artifact rows become intentional touch rails; Timeline headings and forms stack; 3D viewers, dialogs, controls, and publication actions fit the phone measure; ordinary controls retain a `44px` target floor and inputs retain `16px` text |
| `420px` and below                   | Discover cards reserve a `112px` art column with a `96 × 96px` image and compact status and copy spacing                                                                                                                                                                                                                                                                 |
| `430px` high and below in landscape | Archive and Studio use a `96px` shell and bound inspection surfaces to `220px`; replay uses `58dvh`, while the activation ceremony bounds its stage to `min(280px, 72dvh)` and lets instructions and controls flow below it so the surrounding action and memory surfaces remain reachable                                                                               |
| `prefers-reduced-motion: reduce`    | Collection browse and disclosure transitions and Discover art-filter transitions are removed without changing state, focus, or direct control response                                                                                                                                                                                                                   |

Phone layout uses `viewport-fit=cover`, `env(safe-area-inset-*)`, and `100dvh` for both independently built applications. The document itself never scrolls horizontally at the `320px` supported floor; only the named ordered rails may do so. Interactive badge canvases declare browser-owned vertical pan and pinch behavior. Touch begins unclaimed, yields to a predominantly vertical page gesture, and captures only after a predominantly horizontal drag establishes viewer intent.

### Catalogue scaling trigger

This record captures an implementation designed and visually verified with four canonical sets and 116 created concepts; those numbers describe the snapshot rather than a permanent catalogue limit.

The first scaling decision is implemented: Collection renders only sets represented by earned records, while Discover searches the complete catalogue and places no more than 24 matching cards in the DOM before an explicit progressive-reveal action. Further set growth must group or otherwise restructure the wrapping selector before it becomes an unbounded taxonomy rail.

The scale proof must measure DOM and card counts, list-image request counts, decoded dimensions and worst-case pixel bounds, document horizontal overflow, keyboard and touch reachability, and empty, mixed-state, filtered, and missing-preview layouts at the required wide, compact desktop, phone portrait, and short-landscape viewports; `loading="lazy"` alone is not evidence that the expanded catalogue remains bounded.

## Motion and sound

Motion is sharp, controlled, and short. It avoids bouncy easing, confetti, particle explosions, spinning loot, excessive zoom, and fake rarity rays.

Reduced motion replaces spatial travel with an immediate material and typography state change while preserving the emotional beat.

Reduced motion also removes camera inertia, autoplay orbit, the replay's single automatic turn, and delayed light sweeps; direct object and light manipulation on inspection surfaces remains responsive and one-to-one.

Sound is not required. If added later, it is restrained, optional, and separately disabled; no activation depends on it.

## Anti-patterns

- Cartoon rendering, mascot language, bubbly forms, stickers, or cheap mobile-game ornament.
- Souvenir-shop coin kitsch, excessive gold, fake heraldry, generic trophy or graduation-cap imagery, and faux prestige.
- Careless or visibly low-detail generated art.
- Text embedded inside generated imagery.
- Flat CSS tilt presented as 3D, baked highlights that do not move with the object, weightless paper-thin edges, uncontrolled bloom, or plastic-looking metal.
- Glassmorphism, cheap gradients, glow-heavy cyberpunk, crowded dashboards, cards inside cards, or decorative panels without hierarchy value.
- Confetti, streak pressure, points, leaderboards, loot-box language, rarity colors, and slot-machine spectacle.
- Literal imitation of the named reference products, games, or artists.

## Visual verification contract

Inspect the archive gallery, planned and earned states, badge detail, activation start and end states, and pack-installation failures without any Studio controls; separately inspect Badge Studio projects, candidates, upload processing, every shape and material preset, validation, publish success and failure, and clean installation into the archive. Across both builds inspect front, oblique, edge, and back camera angles, near and far zoom bounds, several key-light positions, narrow and wide desktop layouts, phone portrait at the `320px` floor, short landscape, safe-area and dynamic-height behavior, touch page-scroll ownership, reduced motion, GPU fallback, loading, empty, and actionable error states.

Screenshots are evidence inputs, not the conclusion: compare the rendered implementation with the selected mockups at matched viewport and state, capture a short interaction recording for rotation, zoom, and light movement, fix visible differences, and then sweep the full surface for defects outside the changed area.
