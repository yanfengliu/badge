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

The gallery favors one strong collection or badge focal point and a quiet supporting strip rather than grids of equal-weight cards and metrics.

Collection progress is visible but subordinate to the artifact and memory.

Every picture and presentation is already decided by an installed pack. The gallery never shows prompts, candidates, uploads, processing, appearance construction, provider state, or calls to create missing art.

### Badge Studio

The dedicated developer surface separates the creative comparison area from a large live construction preview and visually identifies itself as Studio rather than the personal archive.

Generation, upload, and process actions are clearly related but do not compete with the candidate-level `Use selected design` action that advances the chosen source into construction.

Candidate selection uses a precise keyline, check state, and keyboard focus, never color alone.

Shape, material, border color, and border width are grouped compactly beside the live preview; advanced controls stay progressive rather than crowding the first view.

The live preview is the dominant 3D examination surface. It provides direct drag rotation, wheel or trackpad zoom, a clearly selected object-versus-light mode, and quiet reset controls without surrounding the artifact with game-editor chrome.

The final action is `Validate and publish pack`, not activation. Validation summarizes selected presentations, missing assets, asset sizes, fallback readiness, compatibility, sanitized provenance, and the exact export destination before emitting an immutable bundle.

### Archive badge detail

The archive detail view uses the published 3D presentation without exposing construction controls. It keeps rotation, zoom, lighting, reset, dates, memory, and saying authoring visually calm and personal.

The one-line saying editor sits with the published preview. It pairs a direct text field with restrained `Generate saying` or `Try another` and `Use this saying` actions, and a pending proposal never makes the current line disappear.

On first live use, `Generate saying` opens a calm review sheet without sending anything. The sheet names the provider, displays every outbound field and value, and ends with the final generate action; it is a privacy checkpoint, not a technical console or recurring modal after unchanged scope has been acknowledged.

The saying is one logical line, but the read-only composed preview may wrap it at narrow desktop widths rather than truncate it or reduce it below the accessible type scale. Editing shows the full text, remaining allowance, and inline validation without shifting the artifact preview.

### Activation

The activation moment should feel like a crafted object seating into place.

A recommended sequence is: commit state → brief alignment or pressure beat → crisp material impact or traveling highlight → relief resolves → saying appears → calm final hold that hands control to the same live 3D viewer.

If one action also completes a composite badge, reveal the individual badge first, close the collection progress state, then present the composite artifact.

## Motion and sound

Motion is sharp, controlled, and short. It avoids bouncy easing, confetti, particle explosions, spinning loot, excessive zoom, and fake rarity rays.

Reduced motion replaces spatial travel with an immediate material and typography state change while preserving the emotional beat.

Reduced motion also removes camera inertia, autoplay orbit, and delayed light sweeps; direct object and light manipulation remains responsive and one-to-one.

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

Inspect the archive gallery, planned and earned states, badge detail, activation start and end states, and pack-installation failures without any Studio controls; separately inspect Badge Studio projects, candidates, upload processing, every shape and material preset, validation, publish success and failure, and clean installation into the archive. Across both builds inspect front, oblique, edge, and back camera angles, near and far zoom bounds, several key-light positions, narrow and wide desktop layouts, reduced motion, GPU fallback, loading, empty, and actionable error states.

Screenshots are evidence inputs, not the conclusion: compare the rendered implementation with the selected mockups at matched viewport and state, capture a short interaction recording for rotation, zoom, and light movement, fix visible differences, and then sweep the full surface for defects outside the changed area.
