# Devlog — 2026-09-02

## Badge Studio became a per-badge editor and adjustments became Archive state

**Timestamp:** 2026-09-02 19:30–21:05 PDT

**Action:** Removed Badge Studio from the Archive's navigation and rebuilt it as an editor for one badge opened from that badge's page in Discover, at `#studio/<recordId>`. It now offers exactly the picture, shape, material, border colour, border width, tags, quote, and collection membership. Deleted the art-direction library, candidate generation and selection, release and replacement state, pack publishing and download, and their tests. Added a nullable `BadgeAdjustment` overlay to `ArchiveRecord`, a `@badge/studio-adjustment-contract` handoff, and a module-level Archive bridge the host imports on demand.

**Result:** An adjustment saves into the Archive and is visible everywhere immediately — the badge's own page, the Collection shelves and their totals, Discover's set filters and progress counts, and Discover's search, where a tag the owner wrote is a word they can search for. It survives a reload, rides along in the `.badgearchive` backup together with any image the owner supplied, and survives a catalogue reseed or visual upgrade because it sits over `publishedVisual` rather than replacing it. Activation folds the effective visual into the record so the sealed pin and the record still agree byte for byte; afterwards the badge face and quote are refused any change while tags and collections stay editable.

**Reasoning:** The owner directed all three parts of this: Studio openable only from Discover, exactly those eight adjustable things, and new badges created by chatting with Claude rather than in Studio. Three follow-up decisions were the owner's too — adjustments as Archive-local state rather than a Studio draft that needs installing, the quote chosen from the badge's own reviewed two-quotation bank rather than free text, and the entry point on the badge's page rather than on every card in the grid.

The overlay shape was not asked for and is worth stating. Mutating `publishedVisual` directly would have been simpler and wrong: `reconcileCatalogueRecords` reseeds a drifted unearned record from the shipped catalogue, so the next catalogue refresh would have silently reverted the owner's badge, and "reset to catalogue default" would have meant reconstructing values nobody had recorded. Both reconcile paths spread the existing record, so an overlay survives them by construction — which is now a test rather than an observation.

**Validation:** `170` test files, `1058` passed and 1 skipped; typecheck, lint, build, boundaries, docs, format and audit green. Five mutations run and reverted against the new gates: earned-only backup closure, a reseed that drops the overlay, activation comparing against the unadjusted visual, collection options that stop deduplicating by set id, and a save that only announces. Each turned exactly the matching test red.

Test count fell from `180` files and `1101` tests to `170` and `1058` because the deleted Studio surfaces took their tests with them. One real reduction in coverage: `scripts/catalogue-lineage.test.mjs` compared the generator's theme-pack bytes against Badge Studio's own compiler, and Studio no longer has one. The remaining check re-admits the shipped bytes, which is a weaker claim, and its header now says so rather than implying two independent compilers still agree.

## Looking at the rendered result found five defects the suite did not

**Timestamp:** 2026-09-02 20:05–21:00 PDT

**Action:** Swept Discover, a badge's page and Badge Studio at `1440 × 900`, `1024 × 768`, `375 × 812`, the exact `320 × 720` floor, and `720 × 400` short landscape, then ran a separate cold-start and activation flow in a clean browser profile.

**Result:** Five defects, none of which any passing test saw.

Two were structural and would have shipped as broken behaviour. Opening Badge Studio cold — a reload or a shared link straight into `#studio/<recordId>` — left an empty workspace beside an Archive stuck on `Opening your private archive…`, because opening the archive lived in the Archive surface's effect and the host hides that surface while Studio is open, and a hidden `<Activity>` runs no effects. Then, having fixed that: adjusting a badge, returning, and activating it was refused with `Yosemite changed since activation was opened`, and the badge page showed the pre-adjustment picture, because the re-shown Archive surface heard no announcement while hidden and came back holding the old record. Opening moved beside the archive singleton, memoized; a save now refreshes that memoized result, which is what the surface actually re-reads when the host shows it again.

Three were visual. The construction bench scrolled away and left half the desktop page empty while the owner changed a shape they could no longer see. At the `320px` floor the mark, the badge name and both header actions landed in one grid row on top of each other. The tag entry's row `flex: 1 1 220px` became a `220px` height once the entry stacked into a column, giving a field three times its intended size.

**Reasoning:** All five were invisible to the suite for the same reason: the tests exercise the units, and every one of these lives in how the composed document behaves — which surface is mounted, which effects are suspended, what a grid does at a width nothing asserts on. The two structural ones also only appear on the honest path. The warm path — Discover, then a badge, then Studio — works, and it is the path a test writes; the cold path is the one a person hits on reload.

**Validation:** No document overflowed horizontally at any of the fifteen swept states and no browser console reported an error. The forced `?fallback` build keeps Front, Edge and Back inspection of the adjusted shield. A collected badge's face stayed inert under a forced click while tags and collections still saved. The two structural defects are gated by `apps/archive-web/src/studio-bridge-host.test.ts`, whose two mutations — a bridge that reads without opening, and a save that only announces — each turned it red. The three visual ones are held by the mobile layout contract and the promoted references, which is a weaker gate: it pins the CSS rules and the reference dimensions, not what the pixels show.
