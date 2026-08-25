# Design QA — earned Collection cabinet

## Source truth

The selected visual source is `C:\Users\38909\.codex\generated_images\01a03515-8f32-76d0-830b-c70326122a34\exec-b6995f2a-0c21-4d85-b936-b487a11cec9a.png` at `1487 × 1058` pixels.

The implementation source of truth is `tmp/collection-build-evidence/collection-earned-wide.png` at `1295 × 921` pixels. Both frames use the same `1.405` aspect ratio and the same populated Collection state with Yosemite earned.

The required combined comparison inputs are `tmp/collection-build-evidence/design-qa-full-side-by-side.png` for the complete surface and `tmp/collection-build-evidence/design-qa-shelves-side-by-side.png` for the cabinet focus.

## Intentional product deviations

The reference shows unearned artwork, `planned`, and generic badge counts. The owner explicitly superseded those details: Collection now renders activated artifacts only, empty sets have quiet vacant bays, and each set shows only `x / y collected`.

The implementation adds collection search and four derived statistics because the owner asked for search and interesting collection stats. Badge Studio appears as the fourth primary destination rather than a utility action.

## Full-view comparison

Layout preserves the reference's warm paper field, restrained top navigation, large editorial archive title, right-side search, three deep framed horizontal shelves, left artifact bay, centered set identity, rust action, and circular disclosure. The statistics strip adds useful density without competing with the cabinet.

Typography preserves the existing Archive display serif and compact uppercase metadata language. The implementation's title, set names, and counts maintain the reference hierarchy, while body copy stays larger and darker than the reference's faint microcopy for readability.

Color and surfaces retain cream paper, quiet ink, rust accents, inset shelf shading, rails, and restrained elevation. Potential art never appears in the cabinet, so empty bays remain visually calm rather than simulating content.

The earned artifact uses the real activation-pinned Yosemite image and shape. No placeholder, custom SVG illustration, CSS-drawn badge art, or substitute imagery was introduced.

## Focused cabinet comparison

The first comparison pass found one P2 fidelity issue: a single collected artifact had less visual weight than the reference. The compact shelf artifact was increased from `142 × 142` to `166 × 166` pixels, with proportional rectangle and shield variants, then the implementation and combined comparison were recaptured.

The corrected artifact now anchors its bay while preserving title balance, disclosure clearance, shelf depth, and compact overflow behavior. Empty Books Read and Life Milestones shelves keep the same cabinet structure and truthful zero progress.

## States and interaction

Browser verification covered the empty cabinet, restored one-memory cabinet, default-closed shelves, expansion, collection search, exact replay, replay-to-set handoff, independent Discover browsing, Discover search to one result, collected full color, published and unpublished potentials in grey with explicit text status, compact Collection and replay, forced renderer fallback, and the Studio header.

The final interaction pass also proved that preparation focuses its stable heading and returns to the exact originating badge action with its search query and one-result context intact, Archive Back and Forward synchronize both the visible section and URL hash, replay locks both document scroll roots while isolating the background, replay close restores the prior styles and exact trigger focus, and a selected secondary set remains the visible identity for a multi-set badge.

The replay exposes occurrence range, sealed timestamp, exact quotation, historical figure, Wikipedia biography when applicable, quotation source, note, and every set membership. It uses the control-free passive single-turn presentation; forced fallback shows the truthful static front.

## Responsiveness and accessibility

The wide browser surface was measured directly at a `1440` CSS-pixel viewport before judgment. Compact verification used a `640 × 900` override, produced no horizontal document overflow, retained all four primary destination labels, stacked statistics cleanly, kept practical disclosure targets, and converted replay into a scrollable full-height sheet.

Collection statistics use a description list, occurrence and sealed values use machine-readable `time` elements, shelf controls expose `aria-expanded` and `aria-controls`, status is never communicated by color alone, modal focus is trapped with Escape and exact return-focus behavior, the compact replay has one modal scrollbar with background scroll locked, and reduced motion is covered by the shared single-turn lifecycle gates.

## Browser health

The exercised flow produced zero browser errors. The only warning was the pre-existing Three.js `Clock` deprecation emitted by the renderer dependency.

## Final result

passed
